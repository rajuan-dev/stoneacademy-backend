import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth.middleware";

import { communityUpload } from "./community-creator-upload.js";
import { CommunityCreatorController } from "./community-creator.controller";

const router = Router();
const controller = new CommunityCreatorController();

/**
 * @openapi
 * /community-creator/posts:
 *   post:
 *     tags: [Community Creator]
 *     summary: Create a community post with existing and uploaded media
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               mediaIds:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               location:
 *                 type: string
 *                 description: JSON string location object
 *               location[label]:
 *                 type: string
 *               location[latitude]:
 *                 type: number
 *               location[longitude]:
 *                 type: number
 *               eventId:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               activityId:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               activityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               link:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               mediaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               location:
 *                 type: object
 *               eventId:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               eventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               activityId:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               activityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               link:
 *                 type: string
 *     responses:
 *       201:
 *         description: Community post created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community post created successfully
 *               data:
 *                 id: 6890e4caa12f9d001f1b0001
 *                 author:
 *                   id: 6890e4caa12f9d001f1b0101
 *                   name: Sarah Miller
 *                   username: sarah
 *                   avatarUrl: https://example.com/avatar.jpg
 *                 text: Morning training update
 *                 media:
 *                   - id: 6890e4caa12f9d001f1b0201
 *                     type: IMAGE
 *                     url: https://example.com/photo.jpg
 *                     thumbnailUrl: null
 *                     order: 0
 *                 location: null
 *                 event: null
 *                 events: []
 *                 activity: null
 *                 activities: []
 *                 link: null
 *                 likeCount: 0
 *                 commentCount: 0
 *                 isLikedByCurrentUser: false
 *                 createdAt: 2026-08-01T10:00:00.000Z
 *               meta: null
 *               timestamp: 2026-08-01T10:00:00.000Z
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Validation failed
 *               data: null
 *               meta: null
 *               errors:
 *                 - field: body.location.latitude
 *                   message: "Too small: expected number to be >=-90"
 *                   code: too_small
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Invalid email or password.
 *               data: null
 *               meta: null
 *       404:
 *         description: Related resource not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Media not found
 *               data: null
 *               meta: null
 */
router.post(
  "/posts",
  authMiddleware.verifyToken,
  communityUpload,
  controller.createPost,
);

export default router;
