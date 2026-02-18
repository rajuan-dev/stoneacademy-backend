import {
  ACCOUNT_STATUS,
  ROLES,
  USER_STATUS,
} from "@/constants/app.constants";
import type { Document, Types } from "mongoose";

export interface IAdminAccount extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  phoneNumber?: string;
  contactNo?: string;
  role: (typeof ROLES)["ADMIN"] | (typeof ROLES)["SUPER_ADMIN"];
  status: (typeof USER_STATUS)[keyof typeof USER_STATUS];
  accountStatus: (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  profilePhoto?: Types.ObjectId | null;
  profileImageUrl?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
