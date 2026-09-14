import type { FilterQuery, HydratedDocument, Types } from "mongoose";

import type { StorageUploadInput } from "@/services/s3.service";

import { PAGINATION } from "@/constants/app.constants";
import { env } from "@/env";
import { Activity } from "@/modules/activity/activity.model";
import { Ad } from "@/modules/ads/ads.model";
import { Event } from "@/modules/event/event.model";
import { Media } from "@/modules/media/media.model";
import { ReportService } from "@/modules/report/report.service";
import { s3Service } from "@/services/s3.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import {
  buildGeographyFilter,
  getUserGeography,
} from "@/utils/geography.utils";
import { TransactionHelper } from "@/utils/transaction.utils";

import type { ICommunityComment } from "./community-comment.model";
import type { ICommunityPost } from "./community-post.model";
import type {
  CommunityActivitySummary,
  CommunityAuthorResponse,
  CommunityCommentResponse,
  CommunityEventSummary,
  CommunityLikeResult,
  CommunityLocation,
  CommunityMediaResponse,
  CommunityPaginationInput,
  CommunityPostResponse,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
  CreateCommunityReplyInput,
  ListCommunityPostsInput,
  PopulatedCommunityActivity,
  PopulatedCommunityEvent,
  PopulatedCommunityMedia,
  PopulatedCommunityUser,
  UpdateCommunityPostInput,
} from "./community.type";

import { CommunityComment } from "./community-comment.model";
import { CommunityLike } from "./community-like.model";
import { CommunityPost } from "./community-post.model";

type CommunityPostDocument = HydratedDocument<ICommunityPost> & {
  authorId: Types.ObjectId | PopulatedCommunityUser;
  media: Array<Types.ObjectId | PopulatedCommunityMedia>;
  eventId?: Types.ObjectId | PopulatedCommunityEvent | null;
  eventIds?: Array<Types.ObjectId | PopulatedCommunityEvent>;
  activityId?: Types.ObjectId | PopulatedCommunityActivity | null;
  activityIds?: Array<Types.ObjectId | PopulatedCommunityActivity>;
};

type CommunityCommentDocument = HydratedDocument<ICommunityComment> & {
  authorId: Types.ObjectId | PopulatedCommunityUser;
  eventId?: Types.ObjectId | PopulatedCommunityEvent | null;
  activityId?: Types.ObjectId | PopulatedCommunityActivity | null;
};

const POST_AUTHOR_SELECT = "fullName email profileImageUrl";
const MEDIA_SELECT = "type url";
const EVENT_SELECT = "title type category startAt location creatorId media";
const ACTIVITY_SELECT = "title type category startAt location hostId media";
const ATTACHMENT_MEDIA_SELECT = "url";
const ALLOWED_PREFIXES = ["image/", "video/"] as const;

export class CommunityService {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  async listPosts(input: ListCommunityPostsInput) {
    const page = input.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = input.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const filter: FilterQuery<ICommunityPost> = { isDeleted: false };
    const viewerGeography = await getUserGeography(input.currentUserId);
    const adFilter: FilterQuery<any> = {
      status: "active",
      ...buildGeographyFilter({
        country: viewerGeography.country,
      }),
    };

    if (input.q) {
      filter.text = new RegExp(this.escapeRegex(input.q), "i");
      adFilter.name = new RegExp(this.escapeRegex(input.q), "i");
    }

    const [posts, totalPosts, ads] = await Promise.all([
      this.populatePostQuery(CommunityPost.find(filter))
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .exec() as Promise<CommunityPostDocument[]>,
      CommunityPost.countDocuments(filter),
      Ad.find(adFilter).sort({ createdAt: -1 }).limit(limit * 2).exec(),
    ]);

    const postIds = posts.map(post => post._id);
    const likeRows = postIds.length
      ? await CommunityLike.find({
          postId: { $in: postIds },
          userId: input.currentUserId,
        })
          .select("postId")
          .lean()
      : [];

    const likedPostIds = new Set(
      likeRows.map((row: { postId: Types.ObjectId }) => row.postId.toString()),
    );

    const postItems = posts.map(post =>
      this.mapPostResponse(post, likedPostIds.has(post._id.toString())));
    const adItems = ads.map((item: any) => this.mapAdResponse(item));
    const merged = this.injectAdsIntoFeed(postItems, adItems);
    const totalItems = totalPosts + adItems.length;

    return {
      data: merged.slice(skip, skip + limit),
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async getPostById(postId: string, currentUserId: string) {
    const post = await this.getPopulatedPost(postId);
    const like = await CommunityLike.findOne({
      postId: post._id,
      userId: currentUserId,
    })
      .select("_id")
      .lean();

    return this.mapPostResponse(post, Boolean(like));
  }

  async createPost(input: CreateCommunityPostInput) {
    const eventIds = input.eventIds ?? (input.eventId ? [input.eventId] : []);
    const activityIds = input.activityIds ?? (input.activityId ? [input.activityId] : []);

    const created = await CommunityPost.create({
      authorId: input.authorId,
      text: input.text,
      media: input.mediaIds ?? [],
      location: input.location ?? undefined,
      eventId: eventIds[0] ?? null,
      eventIds,
      activityId: activityIds[0] ?? null,
      activityIds,
      link: input.link,
      isDeleted: false,
    });

    const post = await this.getPopulatedPost(created._id.toString());
    return this.mapPostResponse(post, false);
  }

  async updatePost(input: UpdateCommunityPostInput) {
    const uploadedMedia = await this.processUploadedMedia(input.userId, input.files ?? []);

    try {
      const updatedId = await TransactionHelper.withTransaction(async (session) => {
        const post = await CommunityPost.findOne({
          _id: input.postId,
          isDeleted: false,
        })
          .session(session)
          .exec();

        if (!post) {
          throw new NotFoundException("Community post not found");
        }
        if (post.authorId.toString() !== input.userId) {
          throw new ForbiddenException("Only author can edit this community post");
        }

        if (input.mediaIds !== undefined && input.mediaIds !== null) {
          await this.validateExistingMedia(input.userId, input.mediaIds);
          post.media = [
            ...input.mediaIds,
            ...uploadedMedia.map(item => item.id),
          ] as any;
        }
        else if (uploadedMedia.length) {
          const existingMediaIds = Array.isArray(post.media)
            ? post.media.map((mediaId: any) => mediaId.toString())
            : [];
          post.media = [
            ...existingMediaIds,
            ...uploadedMedia.map(item => item.id),
          ] as any;
        }

        if (input.text !== undefined) {
          post.text = input.text?.trim() || null;
        }
        if (input.location !== undefined) {
          post.location = input.location === null
            ? undefined
            : this.normalizeLocationInput(input.location) ?? undefined;
        }
        if (input.link !== undefined) {
          post.link = input.link?.trim() || null;
        }

        const currentEventIds = this.getEntityIds(post.eventIds, post.eventId);
        const currentActivityIds = this.getEntityIds(post.activityIds, post.activityId);
        const hasEventInput = input.eventId !== undefined || input.eventIds !== undefined;
        const hasActivityInput = input.activityId !== undefined || input.activityIds !== undefined;
        let nextEventIds = hasEventInput
          ? this.normalizeEntityIds(input.eventIds, input.eventId)
          : currentEventIds;
        let nextActivityIds = hasActivityInput
          ? this.normalizeEntityIds(input.activityIds, input.activityId)
          : currentActivityIds;

        if (hasEventInput && nextEventIds.length)
          nextActivityIds = [];
        if (hasActivityInput && nextActivityIds.length)
          nextEventIds = [];

        if (nextEventIds.length && nextActivityIds.length) {
          throw new BadRequestException("eventId/eventIds and activityId/activityIds cannot both be supplied");
        }

        if (hasEventInput) {
          if (nextEventIds.length) {
            await this.validateEventOwnershipMany(input.userId, nextEventIds);
          }
          post.eventId = nextEventIds[0] ? nextEventIds[0] as any : null;
          post.eventIds = nextEventIds as any;
          if (nextEventIds.length) {
            post.activityId = null;
            post.activityIds = [];
          }
        }

        if (hasActivityInput) {
          if (nextActivityIds.length) {
            await this.validateActivityOwnershipMany(input.userId, nextActivityIds);
          }
          post.activityId = nextActivityIds[0] ? nextActivityIds[0] as any : null;
          post.activityIds = nextActivityIds as any;
          if (nextActivityIds.length) {
            post.eventId = null;
            post.eventIds = [];
          }
        }

        if (!this.hasPostContent({
          text: post.text,
          mediaIds: post.media?.map((id: any) => id.toString()) ?? [],
          location: post.location ?? null,
          eventIds: this.getEntityIds(post.eventIds, post.eventId),
          activityIds: this.getEntityIds(post.activityIds, post.activityId),
          link: post.link,
        })) {
          throw new BadRequestException("Community post must include at least one content field");
        }

        await post.save({ session });
        return post._id.toString();
      });

      const post = await this.getPopulatedPost(updatedId);
      const like = await CommunityLike.findOne({
        postId: post._id,
        userId: input.userId,
      }).select("_id").lean();

      return this.mapPostResponse(post, Boolean(like));
    }
    catch (error) {
      await this.cleanupUploadedMedia(uploadedMedia);
      throw error;
    }
  }

  async deletePost(postId: string, userId: string) {
    await TransactionHelper.withTransaction(async (session) => {
      const post = await CommunityPost.findOne({ _id: postId, isDeleted: false })
        .session(session)
        .exec();
      if (!post) {
        throw new NotFoundException("Community post not found");
      }
      if (post.authorId.toString() !== userId) {
        throw new ForbiddenException("Only author can delete this community post");
      }

      post.isDeleted = true;
      post.deletedAt = new Date();
      post.deletedBy = userId as any;
      post.likeCount = 0;
      post.commentCount = 0;
      await post.save({ session });

      await Promise.all([
        CommunityLike.deleteMany({ postId }, { session }).exec(),
        CommunityComment.deleteMany({ postId }, { session }).exec(),
      ]);
    });
  }

  async togglePostLike(postId: string, userId: string): Promise<CommunityLikeResult> {
    const result = await TransactionHelper.withTransaction(async (session) => {
      const post = await CommunityPost.findOne({ _id: postId, isDeleted: false })
        .select("likeCount")
        .session(session)
        .exec();
      if (!post) {
        throw new NotFoundException("Community post not found");
      }

      const existing = await CommunityLike.findOne({ postId, userId })
        .session(session)
        .exec();

      if (existing) {
        const deleted = await CommunityLike.deleteOne({ _id: existing._id }, { session }).exec();
        if (deleted.deletedCount > 0) {
          await CommunityPost.updateOne(
            { _id: postId, likeCount: { $gt: 0 } },
            { $inc: { likeCount: -1 } },
            { session },
          ).exec();
        }
        return { isLikedByCurrentUser: false };
      }

      try {
        await CommunityLike.create([{ postId, userId }], { session });
        await CommunityPost.updateOne(
          { _id: postId },
          { $inc: { likeCount: 1 } },
          { session },
        ).exec();
      }
      catch (error: unknown) {
        const maybeMongoError = error as { code?: number };
        if (maybeMongoError.code !== 11000) {
          throw error;
        }
      }

      return { isLikedByCurrentUser: true };
    });

    const authoritativePost = await CommunityPost.findOne({
      _id: postId,
      isDeleted: false,
    })
      .select("likeCount")
      .lean();

    if (!authoritativePost) {
      throw new NotFoundException("Community post not found");
    }

    return {
      postId,
      likeCount: Math.max(0, authoritativePost.likeCount),
      isLikedByCurrentUser: result.isLikedByCurrentUser,
    };
  }

  async reportPost(
    postId: string,
    reporterId: string,
    payload: { reason: string; details?: string },
  ) {
    const post = await CommunityPost.findOne({ _id: postId, isDeleted: false })
      .select("_id")
      .lean();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    return this.reportService.create(reporterId, {
      entityType: "community_post",
      entityId: postId,
      reason: payload.reason,
      details: payload.details,
    });
  }

  async listComments(
    postId: string,
    pagination: CommunityPaginationInput,
  ) {
    const post = await CommunityPost.findOne({ _id: postId, isDeleted: false })
      .select("authorId")
      .lean();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    const page = pagination.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = pagination.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [comments, totalItems] = await Promise.all([
      this.populateCommentQuery(CommunityComment.find({
        postId,
        parentCommentId: null,
      }))
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec() as Promise<CommunityCommentDocument[]>,
      CommunityComment.countDocuments({
        postId,
        parentCommentId: null,
      }),
    ]);

    const commentIds = comments.map(comment => comment._id);
    const previewReplyIds = commentIds.length
      ? await CommunityComment.aggregate<{ _id: Types.ObjectId }>([
          { $match: { parentCommentId: { $in: commentIds } } },
          { $sort: { createdAt: 1 } },
          { $group: { _id: "$parentCommentId", replyId: { $first: "$_id" } } },
          { $project: { _id: "$replyId" } },
        ])
      : [];

    const previewReplies = previewReplyIds.length
      ? await this.populateCommentQuery(CommunityComment.find({
        _id: { $in: previewReplyIds.map(item => item._id) },
      })).exec() as CommunityCommentDocument[]
      : [];

    const firstReplyByParent = new Map<string, CommunityCommentDocument>();
    for (const reply of previewReplies) {
      const parentId = reply.parentCommentId?.toString();
      if (parentId && !firstReplyByParent.has(parentId)) {
        firstReplyByParent.set(parentId, reply);
      }
    }

    return {
      data: comments.map((comment) => {
        const previewReply = firstReplyByParent.get(comment._id.toString());
        return this.mapCommentResponse(
          comment,
          post.authorId.toString(),
          previewReply ? [previewReply] : [],
        );
      }),
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async createComment(input: CreateCommunityCommentInput) {
    await this.validateCommentAttachment(input);
    const text = input.text?.trim() || undefined;

    const created = await TransactionHelper.withTransaction(async (session) => {
      const post = await CommunityPost.findOne({ _id: input.postId, isDeleted: false })
        .select("authorId")
        .session(session)
        .exec();

      if (!post) {
        throw new NotFoundException("Community post not found");
      }

      const [comment] = await CommunityComment.create([{
        postId: input.postId,
        authorId: input.authorId,
        parentCommentId: null,
        text,
        eventId: input.eventId ?? null,
        activityId: input.activityId ?? null,
      }], { session });

      await CommunityPost.updateOne(
        { _id: input.postId },
        { $inc: { commentCount: 1 } },
        { session },
      ).exec();

      return {
        commentId: comment._id,
        postAuthorId: post.authorId.toString(),
      };
    });

    const comment = await this.populateCommentQuery(
      CommunityComment.findById(created.commentId),
    ).exec() as CommunityCommentDocument | null;

    if (!comment) {
      throw new NotFoundException("Community comment not found");
    }

    return this.mapCommentResponse(comment, created.postAuthorId, []);
  }

  async listReplies(commentId: string, pagination: CommunityPaginationInput) {
    const parentComment = await CommunityComment.findById(commentId)
      .select("postId parentCommentId")
      .lean();

    if (!parentComment) {
      throw new NotFoundException("Community comment not found");
    }

    if (parentComment.parentCommentId) {
      throw new BadRequestException("Replies can only be listed for top-level comments");
    }

    const post = await CommunityPost.findOne({
      _id: parentComment.postId,
      isDeleted: false,
    })
      .select("authorId")
      .lean();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    const page = pagination.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = pagination.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [replies, totalItems] = await Promise.all([
      this.populateCommentQuery(CommunityComment.find({ parentCommentId: commentId }))
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec() as Promise<CommunityCommentDocument[]>,
      CommunityComment.countDocuments({ parentCommentId: commentId }),
    ]);

    return {
      data: replies.map(reply =>
        this.mapCommentResponse(reply, post.authorId.toString(), [])),
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async createReply(input: CreateCommunityReplyInput) {
    await this.validateCommentAttachment(input);
    const text = input.text?.trim() || undefined;

    const created = await TransactionHelper.withTransaction(async (session) => {
      const parentComment = await CommunityComment.findById(input.commentId)
        .select("postId parentCommentId")
        .session(session)
        .exec();

      if (!parentComment) {
        throw new NotFoundException("Community comment not found");
      }

      if (parentComment.parentCommentId) {
        throw new BadRequestException("Replying to a reply is not supported");
      }

      const post = await CommunityPost.findOne({
        _id: parentComment.postId,
        isDeleted: false,
      })
        .select("authorId")
        .session(session)
        .exec();

      if (!post) {
        throw new NotFoundException("Community post not found");
      }

      const [reply] = await CommunityComment.create([{
        postId: parentComment.postId,
        authorId: input.authorId,
        parentCommentId: input.commentId,
        text,
        eventId: input.eventId ?? null,
        activityId: input.activityId ?? null,
      }], { session });

      await CommunityComment.updateOne(
        { _id: input.commentId },
        { $inc: { replyCount: 1 } },
        { session },
      ).exec();

      await CommunityPost.updateOne(
        { _id: parentComment.postId },
        { $inc: { commentCount: 1 } },
        { session },
      ).exec();

      return {
        replyId: reply._id,
        postAuthorId: post.authorId.toString(),
      };
    });

    const reply = await this.populateCommentQuery(
      CommunityComment.findById(created.replyId),
    ).exec() as CommunityCommentDocument | null;

    if (!reply) {
      throw new NotFoundException("Community comment not found");
    }

    return this.mapCommentResponse(reply, created.postAuthorId, []);
  }

  async validateExistingMedia(userId: string, mediaIds: string[]) {
    if (!mediaIds.length)
      return [];

    const mediaDocs = await Media.find({ _id: { $in: mediaIds } })
      .select("ownerId type")
      .lean();
    const mediaById = new Map(mediaDocs.map(media => [media._id.toString(), media]));

    return mediaIds.map((mediaId) => {
      const media = mediaById.get(mediaId);
      if (!media)
        throw new NotFoundException("Media not found");
      if (media.ownerId.toString() !== userId) {
        throw new ForbiddenException("You do not have access to this media");
      }
      if (media.type !== "image" && media.type !== "video") {
        throw new BadRequestException("Unsupported media type");
      }
      return mediaId;
    });
  }

  async processUploadedMedia(userId: string, files: Express.Multer.File[]) {
    if (!files.length)
      return [];

    for (const file of files) {
      if (!ALLOWED_PREFIXES.some(prefix => file.mimetype.startsWith(prefix))) {
        throw new BadRequestException("Only image and video uploads are supported");
      }
    }

    const uploadsInput: StorageUploadInput[] = files.map(file => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }));

    const uploads = await s3Service.uploadFiles(uploadsInput, {
      prefix: `community/${userId}`,
    });

    try {
      const mediaDocs = await Media.insertMany(
        uploads.map((upload, index) => ({
          ownerId: userId,
          type: uploadsInput[index].mimeType.startsWith("video/") ? "video" : "image",
          s3Bucket: env.AWS_S3_BUCKET,
          s3Key: upload.key,
          url: upload.url,
          mimeType: uploadsInput[index].mimeType,
          sizeBytes: uploadsInput[index].buffer.length,
        })),
      );

      return mediaDocs.map((doc, index) => ({
        id: doc._id.toString(),
        s3Key: uploads[index].key,
      }));
    }
    catch (error) {
      await Promise.allSettled(uploads.map(upload => s3Service.deleteFile(upload.key)));
      throw error;
    }
  }

  async validateEventOwnership(userId: string, eventId?: string | null) {
    if (!eventId)
      return undefined;
    await this.validateEventOwnershipMany(userId, [eventId]);
    return eventId;
  }

  async validateActivityOwnership(userId: string, activityId?: string | null) {
    if (!activityId)
      return undefined;
    await this.validateActivityOwnershipMany(userId, [activityId]);
    return activityId;
  }

  async validateEventOwnershipMany(userId: string, eventIds: string[]) {
    if (!eventIds.length)
      return [];

    const events = await Event.find({ _id: { $in: eventIds } }).select("_id creatorId").exec();
    const eventsById = new Map(events.map(event => [event._id.toString(), event]));

    return eventIds.map((eventId) => {
      const event = eventsById.get(eventId);
      if (!event)
        throw new NotFoundException("Event not found");
      if (event.creatorId.toString() !== userId) {
        throw new ForbiddenException("You do not have access to this event");
      }
      return eventId;
    });
  }

  async validateActivityOwnershipMany(userId: string, activityIds: string[]) {
    if (!activityIds.length)
      return [];

    const activities = await Activity.find({ _id: { $in: activityIds } }).select("_id hostId").exec();
    const activitiesById = new Map(
      activities.map(activity => [activity._id.toString(), activity]),
    );

    return activityIds.map((activityId) => {
      const activity = activitiesById.get(activityId);
      if (!activity)
        throw new NotFoundException("Activity not found");
      if (activity.hostId.toString() !== userId) {
        throw new ForbiddenException("You do not have access to this activity");
      }
      return activityId;
    });
  }

  hasPostContent(input: {
    text?: string | null;
    mediaIds?: string[];
    location?: CommunityLocation | null;
    eventId?: string | null;
    eventIds?: string[];
    activityId?: string | null;
    activityIds?: string[];
    link?: string | null;
  }) {
    return Boolean(
      input.text?.trim()
      || input.mediaIds?.length
      || input.location
      || input.eventId
      || input.eventIds?.length
      || input.activityId
      || input.activityIds?.length
      || input.link?.trim(),
    );
  }

  normalizeLocationInput(value: unknown): CommunityLocation | null {
    if (value === null || value === undefined || value === "" || value === "null") {
      return null;
    }

    const parsed = typeof value === "string" ? this.parseJson(value) : value;
    if (!parsed || typeof parsed !== "object") {
      throw new BadRequestException("Invalid location");
    }

    const location = parsed as {
      label?: string;
      latitude?: number | string;
      longitude?: number | string;
      coordinates?: [number, number];
    };

    const coordinates = Array.isArray(location.coordinates)
      ? location.coordinates
      : location.longitude !== undefined && location.latitude !== undefined
        ? [Number(location.longitude), Number(location.latitude)] as [number, number]
        : null;

    if (!coordinates) {
      throw new BadRequestException("Invalid location");
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (
      !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
      || longitude < -180
      || longitude > 180
      || latitude < -90
      || latitude > 90
    ) {
      throw new BadRequestException("Invalid location");
    }

    return {
      label: location.label?.trim() || `${latitude},${longitude}`,
      coordinates: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    };
  }

  mapPostResponse(
    post: CommunityPostDocument,
    isLikedByCurrentUser: boolean,
  ): CommunityPostResponse {
    return {
      id: post._id.toString(),
      author: this.mapAuthor(post.authorId),
      text: post.text?.trim() || null,
      media: this.mapMediaList(post.media),
      location: post.location ?? null,
      event: this.mapEventSummaryList(post.eventIds, post.eventId)[0] ?? null,
      events: this.mapEventSummaryList(post.eventIds, post.eventId),
      activity: this.mapActivitySummaryList(post.activityIds, post.activityId)[0] ?? null,
      activities: this.mapActivitySummaryList(post.activityIds, post.activityId),
      link: post.link?.trim() || null,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLikedByCurrentUser,
      createdAt: post.createdAt.toISOString(),
    };
  }

  private mapAdResponse(ad: any) {
    return {
      kind: "ad",
      id: ad._id.toString(),
      name: ad.name,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      country: ad.country || null,
      state: ad.state || null,
      city: ad.city || null,
      createdAt: ad.createdAt,
    };
  }

  private injectAdsIntoFeed(contentItems: any[], adItems: any[]) {
    if (!adItems.length)
      return contentItems;
    if (!contentItems.length)
      return adItems;

    const merged: any[] = [];
    let contentIndex = 0;
    let adIndex = 0;
    const interval = 3;

    while (contentIndex < contentItems.length || adIndex < adItems.length) {
      for (let i = 0; i < interval && contentIndex < contentItems.length; i += 1) {
        merged.push(contentItems[contentIndex]);
        contentIndex += 1;
      }

      if (adIndex < adItems.length) {
        merged.push(adItems[adIndex]);
        adIndex += 1;
      }
    }

    return merged;
  }

  mapCommentResponse(
    comment: CommunityCommentDocument,
    postAuthorId: string,
    replies: CommunityCommentDocument[] = [],
  ): CommunityCommentResponse {
    return {
      id: comment._id.toString(),
      postId: comment.postId.toString(),
      parentCommentId: comment.parentCommentId?.toString() || null,
      author: this.mapAuthor(comment.authorId),
      text: comment.text?.trim() || null,
      event: this.mapEventSummary(comment.eventId),
      activity: this.mapActivitySummary(comment.activityId),
      isPostAuthor: this.getAuthorId(comment.authorId) === postAuthorId,
      replyCount: comment.replyCount,
      replies: replies.map(reply => this.mapCommentResponse(reply, postAuthorId, [])),
      createdAt: comment.createdAt.toISOString(),
    };
  }

  mapActivitySummary(
    activity: Types.ObjectId | PopulatedCommunityActivity | null | undefined,
  ): CommunityActivitySummary | null {
    if (!activity || !this.isPopulatedActivity(activity)) {
      return null;
    }

    const host = this.isPopulatedUser(activity.hostId) ? activity.hostId : null;
    const firstMedia = Array.isArray(activity.media) ? activity.media[0] : null;
    const firstMediaUrl = firstMedia && this.isPopulatedMedia(firstMedia)
      ? firstMedia.url || null
      : null;

    return {
      id: activity._id.toString(),
      title: activity.title || null,
      type: activity.type || activity.category || null,
      startAt: activity.startAt ? activity.startAt.toISOString() : null,
      location: activity.location?.label || null,
      hostName: host?.fullName || null,
      hostUsername: host?.email ? String(host.email).split("@")[0] : null,
      hostProfileImageUrl: host?.profileImageUrl || null,
      imageUrl: firstMediaUrl,
    };
  }

  private async validateCommentAttachment(input: {
    authorId: string;
    text?: string;
    eventId?: string;
    activityId?: string;
  }) {
    if (input.eventId && input.activityId) {
      throw new BadRequestException("eventId and activityId cannot both be supplied");
    }
    if (!input.text?.trim() && !input.eventId && !input.activityId) {
      throw new BadRequestException("Comment must include text, eventId, or activityId");
    }
    if (input.eventId) {
      await this.validateEventOwnership(input.authorId, input.eventId);
    }
    if (input.activityId) {
      await this.validateActivityOwnership(input.authorId, input.activityId);
    }
  }

  private async cleanupUploadedMedia(media: Array<{ id: string; s3Key: string }>) {
    if (!media.length)
      return;
    await Promise.allSettled([
      Media.deleteMany({ _id: { $in: media.map(item => item.id) } }).exec(),
      ...media.map(item => s3Service.deleteFile(item.s3Key)),
    ]);
  }

  private async getPopulatedPost(postId: string) {
    const post = await this.populatePostQuery(
      CommunityPost.findOne({ _id: postId, isDeleted: false }),
    ).exec() as CommunityPostDocument | null;

    if (!post) {
      throw new NotFoundException("Community post not found");
    }
    return post;
  }

  private populatePostQuery(query: any) {
    return query
      .populate("authorId", POST_AUTHOR_SELECT)
      .populate("media", MEDIA_SELECT)
      .populate({
        path: "eventId",
        select: EVENT_SELECT,
        populate: [
          { path: "creatorId", select: POST_AUTHOR_SELECT },
          { path: "media", select: ATTACHMENT_MEDIA_SELECT },
        ],
      })
      .populate({
        path: "eventIds",
        select: EVENT_SELECT,
        populate: [
          { path: "creatorId", select: POST_AUTHOR_SELECT },
          { path: "media", select: ATTACHMENT_MEDIA_SELECT },
        ],
      })
      .populate({
        path: "activityId",
        select: ACTIVITY_SELECT,
        populate: [
          { path: "hostId", select: POST_AUTHOR_SELECT },
          { path: "media", select: ATTACHMENT_MEDIA_SELECT },
        ],
      })
      .populate({
        path: "activityIds",
        select: ACTIVITY_SELECT,
        populate: [
          { path: "hostId", select: POST_AUTHOR_SELECT },
          { path: "media", select: ATTACHMENT_MEDIA_SELECT },
        ],
      });
  }

  private populateCommentQuery(query: any) {
    return query
      .populate("authorId", POST_AUTHOR_SELECT)
      .populate({
        path: "eventId",
        select: EVENT_SELECT,
        populate: [
          { path: "creatorId", select: POST_AUTHOR_SELECT },
          { path: "media", select: ATTACHMENT_MEDIA_SELECT },
        ],
      })
      .populate({
        path: "activityId",
        select: ACTIVITY_SELECT,
        populate: [
          { path: "hostId", select: POST_AUTHOR_SELECT },
          { path: "media", select: ATTACHMENT_MEDIA_SELECT },
        ],
      });
  }

  private mapAuthor(author: Types.ObjectId | PopulatedCommunityUser): CommunityAuthorResponse {
    if (!this.isPopulatedUser(author)) {
      return {
        id: author.toString(),
        name: null,
        username: null,
        avatarUrl: null,
      };
    }

    return {
      id: author._id.toString(),
      name: author.fullName || null,
      username: author.email ? String(author.email).split("@")[0] : null,
      avatarUrl: author.profileImageUrl || null,
    };
  }

  private mapMediaList(
    media: Array<Types.ObjectId | PopulatedCommunityMedia>,
  ): CommunityMediaResponse[] {
    return media.map((item, index) => {
      if (!this.isPopulatedMedia(item)) {
        return {
          id: item.toString(),
          type: "IMAGE",
          url: null,
          thumbnailUrl: null,
          order: index,
        };
      }

      return {
        id: item._id.toString(),
        type: item.type === "video" ? "VIDEO" : "IMAGE",
        url: item.url || null,
        thumbnailUrl: null,
        order: index,
      };
    });
  }

  private mapEventSummary(
    event: Types.ObjectId | PopulatedCommunityEvent | null | undefined,
  ): CommunityEventSummary | null {
    if (!event || !this.isPopulatedEvent(event)) {
      return null;
    }

    const creator = this.isPopulatedUser(event.creatorId) ? event.creatorId : null;
    const firstMedia = Array.isArray(event.media) ? event.media[0] : null;
    const firstMediaUrl = firstMedia && this.isPopulatedMedia(firstMedia)
      ? firstMedia.url || null
      : null;

    return {
      id: event._id.toString(),
      title: event.title || null,
      type: event.type || event.category || null,
      startAt: event.startAt ? event.startAt.toISOString() : null,
      location: event.location?.label || null,
      creatorName: creator?.fullName || null,
      creatorUsername: creator?.email ? String(creator.email).split("@")[0] : null,
      creatorProfileImageUrl: creator?.profileImageUrl || null,
      imageUrl: firstMediaUrl,
    };
  }

  private mapEventSummaryList(
    events: Array<Types.ObjectId | PopulatedCommunityEvent> | null | undefined,
    fallback?: Types.ObjectId | PopulatedCommunityEvent | null,
  ): CommunityEventSummary[] {
    const items = events?.length ? events : fallback ? [fallback] : [];
    return items
      .map(event => this.mapEventSummary(event))
      .filter((event): event is CommunityEventSummary => Boolean(event));
  }

  private mapActivitySummaryList(
    activities: Array<Types.ObjectId | PopulatedCommunityActivity> | null | undefined,
    fallback?: Types.ObjectId | PopulatedCommunityActivity | null,
  ): CommunityActivitySummary[] {
    const items = activities?.length ? activities : fallback ? [fallback] : [];
    return items
      .map(activity => this.mapActivitySummary(activity))
      .filter((activity): activity is CommunityActivitySummary => Boolean(activity));
  }

  private normalizeEntityIds(ids?: string[] | null, legacyId?: string | null) {
    const values = [
      ...(ids ?? []),
      ...(legacyId ? [legacyId] : []),
    ];
    return [...new Set(values.map(id => id.trim()).filter(Boolean))];
  }

  private getEntityIds(
    ids?: Array<Types.ObjectId | PopulatedCommunityEvent | PopulatedCommunityActivity> | null,
    legacyId?: Types.ObjectId | PopulatedCommunityEvent | PopulatedCommunityActivity | null,
  ) {
    const values = ids?.length ? ids : legacyId ? [legacyId] : [];
    return values.map((id) => {
      if (this.isPopulatedEvent(id) || this.isPopulatedActivity(id)) {
        return id._id.toString();
      }
      return String(id);
    });
  }

  private getAuthorId(author: Types.ObjectId | PopulatedCommunityUser) {
    return this.isPopulatedUser(author) ? author._id.toString() : author.toString();
  }

  private isPopulatedUser(
    value: Types.ObjectId | PopulatedCommunityUser | null | undefined,
  ): value is PopulatedCommunityUser {
    return Boolean(value && typeof value === "object" && "_id" in value && "email" in value);
  }

  private isPopulatedMedia(
    value: Types.ObjectId | PopulatedCommunityMedia | null | undefined,
  ): value is PopulatedCommunityMedia {
    return Boolean(value && typeof value === "object" && "_id" in value && "url" in value);
  }

  private isPopulatedEvent(
    value: Types.ObjectId | PopulatedCommunityEvent,
  ): value is PopulatedCommunityEvent {
    return typeof value === "object" && "_id" in value && "title" in value;
  }

  private isPopulatedActivity(
    value: Types.ObjectId | PopulatedCommunityActivity,
  ): value is PopulatedCommunityActivity {
    return typeof value === "object" && "_id" in value && "title" in value;
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    }
    catch {
      return value;
    }
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
