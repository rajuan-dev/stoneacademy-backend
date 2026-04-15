// file: src/modules/user/user.type.ts

import type {
  ACCOUNT_STATUS,
  GENDERS,
  ROLES,
  USER_STATUS,
} from "@/constants/app.constants";
import type { PaginationQuery as BasePaginationQuery } from "@/ts/pagination.types";

export type UserResponse = {
  _id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  phoneNumber?: string | null;
  dob?: Date;
  gender?: (typeof GENDERS)[keyof typeof GENDERS];
  location?: {
    label?: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  profilePhoto?: string | null;
  gallery?: string[];
  role: (typeof ROLES)[keyof typeof ROLES];
  accountStatus?: (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
  status?: (typeof USER_STATUS)[keyof typeof USER_STATUS];
  blockedReason?: string;
  blockedAt?: Date;
  blockedBy?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  creatorStatus?: {
    subscriptionActive?: boolean;
    subscriptionId?: string | null;
  };
  rating?: {
    avg?: number;
    count?: number;
  };
  blockedUsers?: string[];
  lastLoginAt?: Date;
  profileImage?: string;
  onboardingCompletedAt?: Date;
  onboardingSkippedAt?: Date;
  stripeAccountId?: string | null;
  stripeCustomerId?: string | null;
  stripeOnboardingCompleted?: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type UserCreatePayload = {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  dob?: Date;
  gender?: (typeof GENDERS)[keyof typeof GENDERS];
  location?: {
    label?: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  role: (typeof ROLES)[keyof typeof ROLES];
  status?: (typeof USER_STATUS)[keyof typeof USER_STATUS];
  emailVerifiedAt?: Date | null;
  cleanerPercentage?: number;
};

export type CleanerCreatePayload = {
  fullName: string;
  email: string;
  cleanerPercentage: number;
  phoneNumber?: string;
  address?: string;
};

export type CleanerCreationResult = {
  cleaner: UserResponse;
  emailSent: boolean;
  emailWarning?: string;
  /**
   * Only returned when email delivery fails so admins can share credentials manually.
   */
  temporaryPassword?: string;
};

export type PaginationQuery = BasePaginationQuery;

export type UpdateUserPayload = {
  fullName?: string;
  phone?: string;
  dob?: Date;
  gender?: (typeof GENDERS)[keyof typeof GENDERS];
  location?: {
    label?: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  email?: string;
  profilePhoto?: string | null;
  gallery?: string[];
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type JWTPayload = {
  userId: string;
  adminId?: string;
  email: string;
  role: string;
  status?: string;
  accountStatus?: string;
  emailVerifiedAt?: string | null;
  emailVerified?: boolean;
  subjectType?: "user" | "admin";
  iat?: number;
  exp?: number;
};

export type PublicProfileResponse = {
  _id: string;
  fullName: string;
  profilePhoto?: string | null;
  gallery?: string[];
  rating?: {
    avg?: number;
    count?: number;
  };
};
