import {
  ACCOUNT_STATUS,
  ROLES,
  USER_STATUS,
} from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema } from "mongoose";
import type { IAdminAccount } from "./admin-account.interface";

const adminAccountSchema = BaseSchemaUtil.createSchema<IAdminAccount>(
  {
    ...BaseSchemaUtil.emailField(true),
    passwordHash: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      default: ROLES.ADMIN,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: () => new Date(),
    },
    profilePhoto: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      default: null,
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    collection: "admin",
  },
);

adminAccountSchema.index({ email: 1 }, { unique: true });

export const AdminAccount = model<IAdminAccount>("Admin", adminAccountSchema, "admin");

const adminRefreshTokenBlacklistSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    reason: {
      type: String,
      enum: ["logout", "password_change", "security_incident", "admin_action"],
      default: "logout",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const AdminRefreshTokenBlacklist = model(
  "AdminRefreshTokenBlacklist",
  adminRefreshTokenBlacklistSchema,
);
