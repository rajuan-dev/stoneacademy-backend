import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { CommunityController } from "./community.controller";
import { communityUpload } from "@/modules/community-creator/community-creator-upload";

const router = Router();
const controller = new CommunityController();

router.use(authMiddleware.verifyToken);

/**
 * @openapi
 * /community/posts:
 *   get:
 *     tags: [Community]
 *     summary: List community posts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community feed fetched
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community posts fetched successfully
 *               data:
 *                 - id: 6890e4caa12f9d001f1b0001
 *                   author:
 *                     id: 6890e4caa12f9d001f1b0101
 *                     name: Sarah Miller
 *                     username: sarah
 *                     avatarUrl: https://example.com/avatar.jpg
 *                   text: Morning training update
 *                   media:
 *                     - id: 6890e4caa12f9d001f1b0201
 *                       type: IMAGE
 *                       url: https://example.com/photo.jpg
 *                       thumbnailUrl: null
 *                       order: 0
 *                   location: null
 *                   event: null
 *                   activity: null
 *                   link: null
 *                   likeCount: 10
 *                   commentCount: 4
 *                   isLikedByCurrentUser: true
 *                   createdAt: 2026-08-01T10:00:00.000Z
 *               meta:
 *                 page: 1
 *                 pageSize: 10
 *                 totalItems: 1
 *                 totalPages: 1
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
 *                 - field: query.page
 *                   message: "Too small: expected number to be >=1"
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
 */
router.get("/posts", controller.listPosts);

/**
 * @openapi
 * /community/posts/{postId}:
 *   get:
 *     tags: [Community]
 *     summary: Get community post detail
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Community post fetched
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community post fetched successfully
 *               data:
 *                 id: 6890e4caa12f9d001f1b0001
 *                 author:
 *                   id: 6890e4caa12f9d001f1b0101
 *                   name: Sarah Miller
 *                   username: sarah
 *                   avatarUrl: https://example.com/avatar.jpg
 *                 text: Morning training update
 *                 media: []
 *                 location: null
 *                 event: null
 *                 activity: null
 *                 link: https://example.com
 *                 likeCount: 10
 *                 commentCount: 4
 *                 isLikedByCurrentUser: true
 *                 createdAt: 2026-08-01T10:00:00.000Z
 *               meta: null
 *               timestamp: 2026-08-01T10:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Community post not found
 *               data: null
 *               meta: null
 */
router.get("/posts/:postId", controller.getPost);

/**
 * @openapi
 * /community/posts/{postId}/like:
 *   post:
 *     tags: [Community]
 *     summary: Toggle like state for a community post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Community post like state changed
 */
router.post("/posts/:postId/like", controller.togglePostLike);

/**
 * @openapi
 * /community/posts/{postId}/report:
 *   post:
 *     tags: [Community]
 *     summary: Report a community post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       201:
 *         description: Report submitted
 */
router.post("/posts/:postId/report", controller.reportPost);

/**
 * @openapi
 * /community/posts/{postId}:
 *   patch:
 *     tags: [Community]
 *     summary: Edit a community post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 nullable: true
 *               mediaIds:
 *                 type: array
 *                 nullable: true
 *                 items:
 *                   type: string
 *               location:
 *                 type: object
 *                 nullable: true
 *               eventId:
 *                 type: string
 *                 nullable: true
 *               activityId:
 *                 type: string
 *                 nullable: true
 *               link:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Community post updated
 *   delete:
 *     tags: [Community]
 *     summary: Soft-delete a community post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Community post deleted
 */
router.patch("/posts/:postId", communityUpload, controller.updatePost);
router.delete("/posts/:postId", controller.deletePost);

/**
 * @openapi
 * /community/posts/{postId}/comments:
 *   get:
 *     tags: [Community]
 *     summary: List top-level comments for a community post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community comments fetched
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community comments fetched successfully
 *               data:
 *                 - id: 6890e4caa12f9d001f1b0301
 *                   postId: 6890e4caa12f9d001f1b0001
 *                   parentCommentId: null
 *                   author:
 *                     id: 6890e4caa12f9d001f1b0102
 *                     name: Elena Ross
 *                     username: elena
 *                     avatarUrl: null
 *                   text: Great update
 *                   isPostAuthor: false
 *                   replyCount: 1
 *                   replies:
 *                     - id: 6890e4caa12f9d001f1b0302
 *                       postId: 6890e4caa12f9d001f1b0001
 *                       parentCommentId: 6890e4caa12f9d001f1b0301
 *                       author:
 *                         id: 6890e4caa12f9d001f1b0101
 *                         name: Sarah Miller
 *                         username: sarah
 *                         avatarUrl: https://example.com/avatar.jpg
 *                       text: Thank you
 *                       isPostAuthor: true
 *                       replyCount: 0
 *                       replies: []
 *                       createdAt: 2026-08-01T10:05:00.000Z
 *                   createdAt: 2026-08-01T10:02:00.000Z
 *               meta:
 *                 page: 1
 *                 pageSize: 10
 *                 totalItems: 1
 *                 totalPages: 1
 *               timestamp: 2026-08-01T10:06:00.000Z
 *   post:
 *     tags: [Community]
 *     summary: Create a top-level comment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 4000
 *               eventId:
 *                 type: string
 *               activityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Community comment created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community comment created successfully
 *               data:
 *                 id: 6890e4caa12f9d001f1b0301
 *                 postId: 6890e4caa12f9d001f1b0001
 *                 parentCommentId: null
 *                 author:
 *                   id: 6890e4caa12f9d001f1b0102
 *                   name: Elena Ross
 *                   username: elena
 *                   avatarUrl: null
 *                 text: Great update
 *                 event: null
 *                 activity: null
 *                 isPostAuthor: false
 *                 replyCount: 0
 *                 replies: []
 *                 createdAt: 2026-08-01T10:02:00.000Z
 *               meta: null
 *               timestamp: 2026-08-01T10:02:00.000Z
 */
router.get("/posts/:postId/comments", controller.listComments);
router.post("/posts/:postId/comments", controller.createComment);

/**
 * @openapi
 * /community/comments/{commentId}/replies:
 *   get:
 *     tags: [Community]
 *     summary: List replies for a top-level community comment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community replies fetched
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community replies fetched successfully
 *               data:
 *                 - id: 6890e4caa12f9d001f1b0302
 *                   postId: 6890e4caa12f9d001f1b0001
 *                   parentCommentId: 6890e4caa12f9d001f1b0301
 *                   author:
 *                     id: 6890e4caa12f9d001f1b0101
 *                     name: Sarah Miller
 *                     username: sarah
 *                     avatarUrl: https://example.com/avatar.jpg
 *                   text: Thank you
 *                   isPostAuthor: true
 *                   replyCount: 0
 *                   replies: []
 *                   createdAt: 2026-08-01T10:05:00.000Z
 *               meta:
 *                 page: 1
 *                 pageSize: 10
 *                 totalItems: 1
 *                 totalPages: 1
 *               timestamp: 2026-08-01T10:06:00.000Z
 *   post:
 *     tags: [Community]
 *     summary: Create a reply for a top-level community comment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 4000
 *               eventId:
 *                 type: string
 *               activityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Community reply created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Community reply created successfully
 *               data:
 *                 id: 6890e4caa12f9d001f1b0302
 *                 postId: 6890e4caa12f9d001f1b0001
 *                 parentCommentId: 6890e4caa12f9d001f1b0301
 *                 author:
 *                   id: 6890e4caa12f9d001f1b0101
 *                   name: Sarah Miller
 *                   username: sarah
 *                   avatarUrl: https://example.com/avatar.jpg
 *                 text: Thank you
 *                 event: null
 *                 activity: null
 *                 isPostAuthor: true
 *                 replyCount: 0
 *                 replies: []
 *                 createdAt: 2026-08-01T10:05:00.000Z
 *               meta: null
 *               timestamp: 2026-08-01T10:05:00.000Z
 */
router.get("/comments/:commentId/replies", controller.listReplies);
router.post("/comments/:commentId/replies", controller.createReply);

export default router;
