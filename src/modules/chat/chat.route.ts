import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import { Router } from "express";
import { realtimeService } from "@/services/realtime.service";
import {
  createHostThreadSchema,
  listThreadsSchema,
  sendThreadMessageSchema,
  threadIdParamSchema,
} from "./chat.schema";
import { ChatService } from "./chat.service";

const router = Router();
const service = new ChatService();

router.use(authMiddleware.verifyToken);

router.get(
  "/threads",
  asyncHandler(async (req, res) => {
    await zParse(listThreadsSchema, req);
    const userId = req.user!.userId;
    const threads = await service.listThreadsForUser(userId);
    ApiResponse.success(res, threads, "Threads fetched successfully");
  }),
);

router.post(
  "/threads/host",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const validated = await zParse(createHostThreadSchema, req);
    const thread = await service.ensureHostThread(userId, validated.body);
    ApiResponse.success(res, thread, "Host thread ready");
  }),
);

router.post(
  "/threads/admin",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const thread = await service.ensureAdminThread(userId);
    ApiResponse.success(res, thread, "Admin thread ready");
  }),
);

router.get(
  "/threads/:threadId/messages",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const validated = await zParse(threadIdParamSchema, req);
    const messages = await service.listMessages(userId, validated.params.threadId);
    ApiResponse.success(res, messages, "Messages fetched successfully");
  }),
);

router.post(
  "/threads/:threadId/messages",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const validated = await zParse(sendThreadMessageSchema, req);

    const result = await service.sendMessageToThread(userId, {
      threadId: validated.params.threadId,
      type: validated.body.type,
      text: validated.body.text,
      imageUrl: validated.body.imageUrl,
    });

    realtimeService.emitThreadMessageCreated({
      threadId: result.thread._id,
      participantIds: result.thread.memberUserIds,
      message: result.message,
    });

    ApiResponse.created(res, result, "Message sent successfully");
  }),
);

router.post(
  "/threads/:threadId/seen",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const validated = await zParse(threadIdParamSchema, req);
    const result = await service.markThreadSeen(userId, validated.params.threadId);
    ApiResponse.success(res, result, "Thread marked as seen");
  }),
);

export default router;
