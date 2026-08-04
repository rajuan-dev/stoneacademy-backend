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

  likePost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(communityPostIdSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const result = await this.service.likePost(validated.params.postId, userId);
    ApiResponse.success(res, result, "Community post liked successfully");
  });

  unlikePost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(communityPostIdSchema, req);
    const userId = this.getAuthenticatedUserId(req);
    const result = await this.service.unlikePost(validated.params.postId, userId);
    ApiResponse.success(res, result, "Community post unliked successfully");
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
}
