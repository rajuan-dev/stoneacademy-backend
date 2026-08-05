import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { UnauthorizedException } from "@/utils/app-error.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  communityPostIdSchema,
  createCommunityCommentSchema,
  createCommunityReplySchema,
  listCommunityCommentsSchema,
  listCommunityPostsSchema,
  listCommunityRepliesSchema,
  reportCommunityPostSchema,
  updateCommunityPostSchema,
} from "./community.schema";
import { CommunityService } from "./community.service";

export class CommunityController {
  private service: CommunityService;

  constructor() {
    this.service = new CommunityService();
  }

  listPosts = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listCommunityPostsSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const result = await this.service.listPosts({
      ...validated.query,
      currentUserId: userId,
    });
    ApiResponse.paginated(res, result.data, result.pagination, "Community posts fetched successfully");
  });

  getPost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(communityPostIdSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const post = await this.service.getPostById(validated.params.postId, userId);
    ApiResponse.success(res, post, "Community post fetched successfully");
  });

  togglePostLike = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(communityPostIdSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const result = await this.service.togglePostLike(validated.params.postId, userId);
    ApiResponse.success(
      res,
      result,
      result.isLikedByCurrentUser
        ? "Community post liked successfully"
        : "Community post unliked successfully",
    );
  });

  updatePost = asyncHandler(async (req: Request, res: Response) => {
    this.normalizeMultipartLocation(req);
    const validated = await zParse(updateCommunityPostSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const post = await this.service.updatePost({
      postId: validated.params.postId,
      userId,
      ...validated.body,
      files: this.getUploadedFiles(req),
    });
    ApiResponse.success(res, post, "Community post updated successfully");
  });

  deletePost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(communityPostIdSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    await this.service.deletePost(validated.params.postId, userId);
    ApiResponse.noContent(res, "Community post deleted successfully");
  });

  reportPost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(reportCommunityPostSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const report = await this.service.reportPost(
      validated.params.postId,
      userId,
      validated.body,
    );
    ApiResponse.created(res, report, "Report submitted successfully");
  });

  listComments = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listCommunityCommentsSchema, req);
    const result = await this.service.listComments(
      validated.params.postId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Community comments fetched successfully");
  });

  createComment = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createCommunityCommentSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const comment = await this.service.createComment({
      postId: validated.params.postId,
      authorId: userId,
      text: validated.body.text,
      eventId: validated.body.eventId,
      activityId: validated.body.activityId,
    });
    ApiResponse.created(res, comment, "Community comment created successfully");
  });

  listReplies = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listCommunityRepliesSchema, req);
    const result = await this.service.listReplies(
      validated.params.commentId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Community replies fetched successfully");
  });

  createReply = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createCommunityReplySchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const reply = await this.service.createReply({
      commentId: validated.params.commentId,
      authorId: userId,
      text: validated.body.text,
      eventId: validated.body.eventId,
      activityId: validated.body.activityId,
    });
    ApiResponse.created(res, reply, "Community reply created successfully");
  });

  private getAuthenticatedUserId(req: Request) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }
    return userId;
  }

  private normalizeMultipartLocation(req: Request) {
    const locationLatitude = (req.body as Record<string, unknown>)?.["location[latitude]"];
    const locationLongitude = (req.body as Record<string, unknown>)?.["location[longitude]"];
    const locationLabel = (req.body as Record<string, unknown>)?.["location[label]"];

    if (
      req.body
      && !req.body.location
      && locationLatitude !== undefined
      && locationLongitude !== undefined
    ) {
      req.body.location = {
        latitude: locationLatitude,
        longitude: locationLongitude,
        ...(locationLabel !== undefined ? { label: locationLabel } : {}),
      };
    }
  }

  private getUploadedFiles(req: Request) {
    const rawFiles = req.files as
      | Express.Multer.File[]
      | Record<string, Express.Multer.File[]>
      | undefined;

    return Array.isArray(rawFiles)
      ? rawFiles.filter(Boolean)
      : [
          ...(rawFiles?.media || []),
          ...(rawFiles?.mediaFiles || []),
          ...(rawFiles?.["mediaFiles[]"] || []),
          ...(rawFiles?.files || []),
        ].filter(Boolean);
  }
}
