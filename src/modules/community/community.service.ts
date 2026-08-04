import { PAGINATION } from "@/constants/app.constants";
import { EventService } from "@/modules/event/event.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { TransactionHelper } from "@/utils/transaction.utils";
import type { FilterQuery, HydratedDocument, Types } from "mongoose";
import { CommunityComment, type ICommunityComment } from "./community-comment.model";
import { CommunityLike } from "./community-like.model";
import { CommunityPost, type ICommunityPost } from "./community-post.model";
import type {
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
  PopulatedCommunityEvent,
  PopulatedCommunityMedia,
  PopulatedCommunityUser,
} from "./community.type";

type CommunityPostDocument = HydratedDocument<ICommunityPost> & {
  authorId: Types.ObjectId | PopulatedCommunityUser;
  media: Array<Types.ObjectId | PopulatedCommunityMedia>;
  eventId?: Types.ObjectId | PopulatedCommunityEvent | null;
};

type CommunityCommentDocument = HydratedDocument<ICommunityComment> & {
  authorId: Types.ObjectId | PopulatedCommunityUser;
};

const POST_AUTHOR_SELECT = "fullName email profileImageUrl";
const MEDIA_SELECT = "type url";
const EVENT_SELECT = "title type category startAt location creatorId media";
const EVENT_MEDIA_SELECT = "url";

export class CommunityService {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async listPosts(input: ListCommunityPostsInput) {
    const page = input.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = input.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const filter: FilterQuery<ICommunityPost> = {};

    if (input.q) {
      filter.text = new RegExp(this.escapeRegex(input.q), "i");
    }

    const [posts, totalItems] = await Promise.all([
      CommunityPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("authorId", POST_AUTHOR_SELECT)
        .populate("media", MEDIA_SELECT)
        .populate({
          path: "eventId",
          select: EVENT_SELECT,
          populate: [
            { path: "creatorId", select: POST_AUTHOR_SELECT },
            { path: "media", select: EVENT_MEDIA_SELECT },
          ],
        })
        .exec() as Promise<CommunityPostDocument[]>,
      CommunityPost.countDocuments(filter),
    ]);

    const postIds = posts.map((post) => post._id);
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

    return {
      data: posts.map((post) =>
        this.mapPostResponse(post, likedPostIds.has(post._id.toString()))),
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
    const post = await CommunityPost.findById(postId)
      .populate("authorId", POST_AUTHOR_SELECT)
      .populate("media", MEDIA_SELECT)
      .populate({
        path: "eventId",
        select: EVENT_SELECT,
        populate: [
          { path: "creatorId", select: POST_AUTHOR_SELECT },
          { path: "media", select: EVENT_MEDIA_SELECT },
        ],
      })
      .exec() as CommunityPostDocument | null;

    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    const like = await CommunityLike.findOne({
      postId: post._id,
      userId: currentUserId,
    })
      .select("_id")
      .lean();

    return this.mapPostResponse(post, Boolean(like));
  }

  async createPost(input: CreateCommunityPostInput) {
    if (input.eventId) {
      await this.eventService.getById(input.eventId);
    }

    const created = await CommunityPost.create({
      authorId: input.authorId,
      text: input.text,
      media: input.mediaIds ?? [],
      location: input.location ?? undefined,
      eventId: input.eventId ?? null,
      link: input.link,
    });

    const post = await CommunityPost.findById(created._id)
      .populate("authorId", POST_AUTHOR_SELECT)
      .populate("media", MEDIA_SELECT)
      .populate({
        path: "eventId",
        select: EVENT_SELECT,
        populate: [
          { path: "creatorId", select: POST_AUTHOR_SELECT },
          { path: "media", select: EVENT_MEDIA_SELECT },
        ],
      })
      .exec() as CommunityPostDocument | null;

    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    return this.mapPostResponse(post, false);
  }

  async likePost(postId: string, userId: string): Promise<CommunityLikeResult> {
    const post = await CommunityPost.findById(postId).select("likeCount").exec();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    let createdLike = false;
    try {
      await CommunityLike.create({ postId, userId });
      createdLike = true;
    } catch (error: unknown) {
      const maybeMongoError = error as { code?: number };
      if (maybeMongoError.code !== 11000) {
        throw error;
      }
    }

    const updatedPost = createdLike
      ? await CommunityPost.findByIdAndUpdate(
          postId,
          { $inc: { likeCount: 1 } },
          { new: true },
        )
          .select("likeCount")
          .exec()
      : await CommunityPost.findById(postId).select("likeCount").exec();

    if (!updatedPost) {
      throw new NotFoundException("Community post not found");
    }

    return {
      postId,
      likeCount: updatedPost.likeCount,
      isLikedByCurrentUser: true,
    };
  }

  async unlikePost(postId: string, userId: string): Promise<CommunityLikeResult> {
    const post = await CommunityPost.findById(postId).select("likeCount").exec();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    const deleted = await CommunityLike.findOneAndDelete({ postId, userId }).lean();

    const updatedPost = deleted
      ? await CommunityPost.findOneAndUpdate(
          { _id: postId, likeCount: { $gt: 0 } },
          { $inc: { likeCount: -1 } },
          { new: true },
        )
          .select("likeCount")
          .exec()
      : await CommunityPost.findById(postId).select("likeCount").exec();

    const authoritativePost = updatedPost
      ?? await CommunityPost.findById(postId).select("likeCount").exec();

    if (!authoritativePost) {
      throw new NotFoundException("Community post not found");
    }

    return {
      postId,
      likeCount: Math.max(0, authoritativePost.likeCount),
      isLikedByCurrentUser: false,
    };
  }

  async listComments(
    postId: string,
    pagination: CommunityPaginationInput,
  ) {
    const post = await CommunityPost.findById(postId).select("authorId").lean();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    const page = pagination.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = pagination.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [comments, totalItems] = await Promise.all([
      CommunityComment.find({
        postId,
        parentCommentId: null,
      })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("authorId", POST_AUTHOR_SELECT)
        .exec() as Promise<CommunityCommentDocument[]>,
      CommunityComment.countDocuments({
        postId,
        parentCommentId: null,
      }),
    ]);

    const commentIds = comments.map((comment) => comment._id);
    const previewReplyIds = commentIds.length
      ? await CommunityComment.aggregate<{ _id: Types.ObjectId }>([
          {
            $match: {
              parentCommentId: { $in: commentIds },
            },
          },
          {
            $sort: { createdAt: 1 },
          },
          {
            $group: {
              _id: "$parentCommentId",
              replyId: { $first: "$_id" },
            },
          },
          {
            $project: {
              _id: "$replyId",
            },
          },
        ])
      : [];

    const previewReplies = previewReplyIds.length
      ? await CommunityComment.find({
          _id: { $in: previewReplyIds.map((item) => item._id) },
        })
          .populate("authorId", POST_AUTHOR_SELECT)
          .exec() as CommunityCommentDocument[]
      : [];

    const firstReplyByParent = new Map<string, CommunityCommentDocument>();
    for (const reply of previewReplies) {
      const parentId = reply.parentCommentId?.toString();
      if (parentId && !firstReplyByParent.has(parentId)) {
        firstReplyByParent.set(parentId, reply);
      }
    }

    const data = comments.map((comment) => {
      const previewReply = firstReplyByParent.get(comment._id.toString());
      return this.mapCommentResponse(
        comment,
        post.authorId.toString(),
        previewReply ? [previewReply] : [],
      );
    });

    return {
      data,
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
    const created = await TransactionHelper.withTransaction(async (session) => {
      const post = await CommunityPost.findById(input.postId)
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
        text: input.text,
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

    const comment = await CommunityComment.findById(created.commentId)
      .populate("authorId", POST_AUTHOR_SELECT)
      .exec() as CommunityCommentDocument | null;

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

    const post = await CommunityPost.findById(parentComment.postId).select("authorId").lean();
    if (!post) {
      throw new NotFoundException("Community post not found");
    }

    const page = pagination.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = pagination.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [replies, totalItems] = await Promise.all([
      CommunityComment.find({ parentCommentId: commentId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("authorId", POST_AUTHOR_SELECT)
        .exec() as Promise<CommunityCommentDocument[]>,
      CommunityComment.countDocuments({ parentCommentId: commentId }),
    ]);

    return {
      data: replies.map((reply) =>
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

      const post = await CommunityPost.findById(parentComment.postId)
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
        text: input.text,
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

    const reply = await CommunityComment.findById(created.replyId)
      .populate("authorId", POST_AUTHOR_SELECT)
      .exec() as CommunityCommentDocument | null;

    if (!reply) {
      throw new NotFoundException("Community comment not found");
    }

    return this.mapCommentResponse(reply, created.postAuthorId, []);
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
      event: this.mapEventSummary(post.eventId),
      link: post.link?.trim() || null,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLikedByCurrentUser,
      createdAt: post.createdAt.toISOString(),
    };
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
      text: comment.text,
      isPostAuthor: this.getAuthorId(comment.authorId) === postAuthorId,
      replyCount: comment.replyCount,
      replies: replies.map((reply) => this.mapCommentResponse(reply, postAuthorId, [])),
      createdAt: comment.createdAt.toISOString(),
    };
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

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
