import type { CommunityLocation, CommunityPostResponse } from "@/modules/community/community.type";

export type CreateCommunityPostBody = {
  text?: string;
  mediaIds?: string[];
  location?: {
    label?: string;
    latitude?: number | string;
    longitude?: number | string;
    coordinates?: [number, number];
  };
  eventId?: string;
  link?: string;
};

export type CommunityCreatorServiceInput = {
  userId: string;
  body: CreateCommunityPostBody;
  files: Express.Multer.File[];
};

export type ValidatedExistingCommunityMedia = {
  id: string;
};

export type ProcessedUploadedCommunityMedia = {
  id: string;
  s3Key: string;
};

export type NormalizedCommunityCreatePostInput = {
  text?: string;
  mediaIds: string[];
  location: CommunityLocation | null;
  eventId?: string;
  link?: string;
};

export type CommunityCreatorCreatePostResult = CommunityPostResponse;
