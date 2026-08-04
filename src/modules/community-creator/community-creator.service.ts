import { env } from "@/env";
import { CommunityService } from "@/modules/community/community.service";
import type { CommunityLocation } from "@/modules/community/community.type";
import { EventService } from "@/modules/event/event.service";
import { Media } from "@/modules/media/media.model";
import { s3Service, type StorageUploadInput } from "@/services/s3.service";
import { TransactionHelper } from "@/utils/transaction.utils";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type {
  CommunityCreatorServiceInput,
  CreateCommunityPostBody,
  ProcessedUploadedCommunityMedia,
} from "./community-creator.type";

const ALLOWED_PREFIXES = ["image/", "video/"] as const;

export class CommunityCreatorService {
  private communityService: CommunityService;
  private eventService: EventService;

  constructor() {
    this.communityService = new CommunityService();
    this.eventService = new EventService();
  }

  async createPost(input: CommunityCreatorServiceInput) {
    const existingMediaIds = await this.validateExistingMedia(
      input.userId,
      input.body.mediaIds ?? [],
    );
    const uploadedMedia = await this.processUploadedMedia(input.userId, input.files);
    const location = this.normalizeLocation(input.body);
    const eventId = await this.validateEvent(input.body.eventId);
    const text = input.body.text?.trim() || undefined;
    const link = input.body.link?.trim() || undefined;
    const orderedMediaIds = [
      ...existingMediaIds,
      ...uploadedMedia.map((item) => item.id),
    ];

    if (
      !text
      && orderedMediaIds.length === 0
      && !location
      && !eventId
      && !link
    ) {
      await this.cleanupUploadedMedia(uploadedMedia);
      throw new BadRequestException("Community post must include at least one content field");
    }

    try {
      return await this.communityService.createPost({
        authorId: input.userId,
        text,
        mediaIds: orderedMediaIds,
        location,
        eventId,
        link,
      });
    } catch (error) {
      await this.cleanupUploadedMedia(uploadedMedia);
      throw error;
    }
  }

  async validateExistingMedia(userId: string, mediaIds: string[]) {
    if (!mediaIds.length) {
      return [];
    }

    const mediaDocs = await Media.find({
      _id: { $in: mediaIds },
    })
      .select("ownerId type")
      .lean();

    const mediaById = new Map(
      mediaDocs.map((media) => [media._id.toString(), media]),
    );

    return mediaIds.map((mediaId) => {
      const media = mediaById.get(mediaId);
      if (!media) {
        throw new NotFoundException("Media not found");
      }
      if (media.ownerId.toString() !== userId) {
        throw new ForbiddenException("You do not have access to this media");
      }
      if (media.type !== "image" && media.type !== "video") {
        throw new BadRequestException("Unsupported media type");
      }
      return mediaId;
    });
  }

  async processUploadedMedia(userId: string, files: Express.Multer.File[]) {
    if (!files.length) {
      return [];
    }

    for (const file of files) {
      if (!ALLOWED_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
        throw new BadRequestException("Only image and video uploads are supported");
      }
    }

    const uploadsInput: StorageUploadInput[] = files.map((file) => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }));

    const uploads = await s3Service.uploadFiles(uploadsInput, {
      prefix: `community/${userId}`,
    });

    try {
      const mediaDocs = await Media.insertMany(
        uploads.map((upload, index) => ({
          ownerId: userId,
          type: uploadsInput[index].mimeType.startsWith("video/") ? "video" : "image",
          s3Bucket: env.AWS_S3_BUCKET,
          s3Key: upload.key,
          url: upload.url,
          mimeType: uploadsInput[index].mimeType,
          sizeBytes: uploadsInput[index].buffer.length,
        })),
      );

      return mediaDocs.map((doc, index) => ({
        id: doc._id.toString(),
        s3Key: uploads[index].key,
      })) satisfies ProcessedUploadedCommunityMedia[];
    } catch (error) {
      await Promise.allSettled(
        uploads.map((upload) => s3Service.deleteFile(upload.key)),
      );
      throw error;
    }
  }

  async validateEvent(eventId?: string) {
    if (!eventId) {
      return undefined;
    }

    await this.eventService.getById(eventId);
    return eventId;
  }

  normalizeLocation(body: CreateCommunityPostBody): CommunityLocation | null {
    const location = body.location;
    if (!location) {
      return null;
    }

    const coordinates = Array.isArray(location.coordinates)
      ? location.coordinates
      : [Number(location.longitude), Number(location.latitude)];

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    return {
      label: location.label?.trim() || `${latitude},${longitude}`,
      coordinates: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    };
  }

  private async cleanupUploadedMedia(media: ProcessedUploadedCommunityMedia[]) {
    if (!media.length) {
      return;
    }

    await Promise.allSettled([
      Media.deleteMany({ _id: { $in: media.map((item) => item.id) } }).exec(),
      ...media.map((item) => s3Service.deleteFile(item.s3Key)),
    ]);
  }
}
