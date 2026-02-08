// file: src/modules/user/user.route.ts

import upload from "@/config/multer.config";
import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const userController = new UserController();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get my profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 */
router.get("/me", authMiddleware.verifyToken, userController.getProfile);
/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update my profile
 *     security:
 *       - BearerAuth: []
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
router.patch("/me", authMiddleware.verifyToken, userController.updateProfile);
router.delete("/me", authMiddleware.verifyToken, userController.deleteAccount);

/**
 * @openapi
 * /users/me/profile-photo:
 *   post:
 *     tags: [Users]
 *     summary: Upload profile photo
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated
 */
router.post(
  "/me/profile-photo",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.USER, ROLES.CREATOR, ROLES.CLIENT, ROLES.CLEANER),
  upload.single("photo"),
  userController.uploadProfilePhoto,
);

/**
 * @openapi
 * /users/me/gallery:
 *   post:
 *     tags: [Users]
 *     summary: Upload gallery media
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Updated
 */
router.post(
  "/me/gallery",
  authMiddleware.verifyToken,
  upload.array("media", 10),
  userController.uploadGallery,
);

/**
 * @openapi
 * /users/me/gallery/{mediaId}:
 *   delete:
 *     tags: [Users]
 *     summary: Remove gallery item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed
 */
router.delete(
  "/me/gallery/:mediaId",
  authMiddleware.verifyToken,
  userController.removeGalleryItem,
);

/**
 * @openapi
 * /users/{id}/public:
 *   get:
 *     tags: [Users]
 *     summary: Public user profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public profile
 */
router.get("/:id/public", userController.getPublicProfile);

/**
 * @openapi
 * /users/{id}/block:
 *   post:
 *     tags: [Users]
 *     summary: Block user
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
 *         description: Blocked
 */
router.post(
  "/:id/block",
  authMiddleware.verifyToken,
  userController.blockUser,
);

/**
 * @openapi
 * /users/{id}/block:
 *   delete:
 *     tags: [Users]
 *     summary: Unblock user
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
 *         description: Unblocked
 */
router.delete(
  "/:id/block",
  authMiddleware.verifyToken,
  userController.unblockUser,
);

export default router;
