// file: src/modules/activity/activity.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import upload from "@/config/multer.config";
import { Router } from "express";
import { ActivityController } from "./activity.controller";

const router = Router();
const controller = new ActivityController();

/**
 * @openapi
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: List activities
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusMiles
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [distance, time, popular]
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
 *         description: Activities list
 */
router.get("/", controller.list);
/**
 * @openapi
 * /activities:
 *   post:
 *     tags: [Activities]
 *     summary: Create activity
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, startAt]
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: object
 *               participantLimit:
 *                 type: integer
 *               distanceMiles:
 *                 type: number
 *               mediaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 */
router.post(
  "/",
  authMiddleware.verifyToken,
  upload.any(),
  controller.create,
);

/**
 * @openapi
 * /activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Get activity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Activity'
 */
router.get("/:id", authMiddleware.optionalAuth, controller.getById);
/**
 * @openapi
 * /activities/{id}:
 *   patch:
 *     tags: [Activities]
 *     summary: Update activity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/:id", authMiddleware.verifyToken, controller.update);
/**
 * @openapi
 * /activities/{id}:
 *   delete:
 *     tags: [Activities]
 *     summary: Cancel activity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.delete("/:id", authMiddleware.verifyToken, controller.remove);

/**
 * @openapi
 * /activities/{id}/join:
 *   post:
 *     tags: [Activities]
 *     summary: Join activity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Joined
 */
router.post("/:id/join", authMiddleware.verifyToken, controller.join);
/**
 * @openapi
 * /activities/{id}/leave:
 *   post:
 *     tags: [Activities]
 *     summary: Leave activity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left
 */
router.post("/:id/leave", authMiddleware.verifyToken, controller.leave);
/**
 * @openapi
 * /activities/{id}/pass:
 *   get:
 *     tags: [Activities]
 *     summary: Get activity pass
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pass payload
 */
router.get("/:id/pass", authMiddleware.verifyToken, controller.pass);
/**
 * @openapi
 * /activities/{id}/cancel:
 *   post:
 *     tags: [Activities]
 *     summary: Cancel activity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.post("/:id/cancel", authMiddleware.verifyToken, controller.cancel);

export default router;
