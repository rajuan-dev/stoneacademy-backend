import type { Types } from "mongoose";

export type CommunityLocation = {
  label?: string | null;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
};

export type CommunityAuthorResponse = {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type CommunityMediaResponse = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string | null;
  thumbnailUrl: string | null;
  order: number;
};

export type CommunityEventSummary = {
  id: string;
  title: string | null;
  type: string | null;
  startAt: string | null;
  location: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
  creatorProfileImageUrl: string | null;
  imageUrl: string | null;
};

export type CommunityActivitySummary = {
  id: string;
  title: string | null;
  type: string | null;
  startAt: string | null;
  location: string | null;
  hostName: string | null;
  hostUsername: string | null;
  hostProfileImageUrl: string | null;
  imageUrl: string | null;
};

export type CommunityPostResponse = {
  id: string;
  author: CommunityAuthorResponse;
  text: string | null;
  media: CommunityMediaResponse[];
  location: CommunityLocation | null;
  event: CommunityEventSummary | null;
  events: CommunityEventSummary[];
  activity: CommunityActivitySummary | null;
  activities: CommunityActivitySummary[];
  link: string | null;
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
};

export type CommunityCommentResponse = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  author: CommunityAuthorResponse;
  text: string | null;
  event: CommunityEventSummary | null;
  activity: CommunityActivitySummary | null;
  isPostAuthor: boolean;
  replyCount: number;
  replies: CommunityCommentResponse[];
  createdAt: string;
};

export type ListCommunityPostsInput = {
  q?: string;
  page?: number;
  limit?: number;
  currentUserId: string;
};

export type CommunityPaginationInput = {
  page?: number;
  limit?: number;
};

export type CreateCommunityPostInput = {
  authorId: string;
  text?: string;
  mediaIds?: string[];
  location?: CommunityLocation | null;
  eventId?: string | null;
  eventIds?: string[] | null;
  activityId?: string | null;
  activityIds?: string[] | null;
  link?: string;
};

export type UpdateCommunityPostInput = {
  postId: string;
  userId: string;
  text?: string | null;
  mediaIds?: string[] | null;
  location?: unknown;
  eventId?: string | null;
  eventIds?: string[] | null;
  activityId?: string | null;
  activityIds?: string[] | null;
  link?: string | null;
  files?: Express.Multer.File[];
};

export type CreateCommunityCommentInput = {
  postId: string;
  authorId: string;
  text?: string;
  eventId?: string;
  activityId?: string;
};

export type CreateCommunityReplyInput = {
  commentId: string;
  authorId: string;
  text?: string;
  eventId?: string;
  activityId?: string;
};

export type CommunityLikeResult = {
  postId: string;
  likeCount: number;
  isLikedByCurrentUser: boolean;
};

export type PopulatedCommunityUser = {
  _id: Types.ObjectId;
  fullName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
};

export type PopulatedCommunityMedia = {
  _id: Types.ObjectId;
  type?: "image" | "video";
  url?: string | null;
};

export type PopulatedCommunityEvent = {
  _id: Types.ObjectId;
  title?: string | null;
  type?: string | null;
  category?: string | null;
  startAt?: Date | null;
  location?: {
    label?: string | null;
  } | null;
  creatorId?: PopulatedCommunityUser | Types.ObjectId | null;
  media?: Array<PopulatedCommunityMedia | Types.ObjectId> | null;
};

export type PopulatedCommunityActivity = {
  _id: Types.ObjectId;
  title?: string | null;
  type?: string | null;
  category?: string | null;
  startAt?: Date | null;
  location?: {
    label?: string | null;
  } | null;
  hostId?: PopulatedCommunityUser | Types.ObjectId | null;
  media?: Array<PopulatedCommunityMedia | Types.ObjectId> | null;
};
