import type { Buffer } from "node:buffer";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import path from "node:path";
import { URL } from "node:url";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { env } from "@/env";

export type StorageUploadInput = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
};

export type StorageUploadResult = {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

type PreparedStorageUploadInput = StorageUploadInput & {
  width?: number;
  height?: number;
};

const PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 80;
const OPTIMIZABLE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private publicEndpoint?: string;

  constructor() {
    this.bucket = env.AWS_S3_BUCKET;
    this.region = env.AWS_REGION;
    const configuredEndpoint = env.AWS_S3_ENDPOINT?.replace(/\/+$/, "");
    this.publicEndpoint = configuredEndpoint;
    this.endpoint = this.normalizeEndpoint(configuredEndpoint);
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(
    file: StorageUploadInput,
    options: { prefix: string },
  ): Promise<StorageUploadResult> {
    const prepared = await this.prepareUpload(file);
    const key = this.buildKey(options.prefix, prepared.originalName);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: prepared.buffer,
        ContentType: prepared.mimeType,
        CacheControl: PUBLIC_MEDIA_CACHE_CONTROL,
      }),
    );

    return {
      key,
      url: this.buildPublicUrl(key),
      mimeType: prepared.mimeType,
      sizeBytes: prepared.buffer.length,
      width: prepared.width,
      height: prepared.height,
    };
  }

  async uploadFiles(
    files: StorageUploadInput[],
    options: { prefix: string },
  ): Promise<StorageUploadResult[]> {
    const uploads = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploads);
  }

  async deleteFile(key: string): Promise<void> {
    if (!key)
      return;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private buildKey(prefix: string, originalName: string): string {
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
    const extension = path.extname(originalName).toLowerCase();
    const safeExtension = extension && extension.length <= 10 ? extension : "";
    return `${normalizedPrefix}/${uuidv4()}${safeExtension}`;
  }

  private async prepareUpload(file: StorageUploadInput): Promise<PreparedStorageUploadInput> {
    if (!this.canOptimizeImage(file.mimeType)) {
      return file;
    }

    try {
      const normalizedMimeType = this.normalizeImageMimeType(file.mimeType);
      const transformer = sharp(file.buffer)
        .rotate()
        .resize({
          width: MAX_IMAGE_DIMENSION,
          height: MAX_IMAGE_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        });

      if (normalizedMimeType === "image/jpeg") {
        transformer.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true });
      }
      else if (normalizedMimeType === "image/png") {
        transformer.png({ compressionLevel: 9, adaptiveFiltering: true });
      }
      else if (normalizedMimeType === "image/webp") {
        transformer.webp({ quality: IMAGE_QUALITY });
      }

      const { data, info } = await transformer.toBuffer({ resolveWithObject: true });

      return {
        ...file,
        buffer: data,
        mimeType: normalizedMimeType,
        width: info.width,
        height: info.height,
      };
    }
    catch {
      return file;
    }
  }

  private canOptimizeImage(mimeType: string) {
    return OPTIMIZABLE_IMAGE_MIME_TYPES.has(this.normalizeImageMimeType(mimeType));
  }

  private normalizeImageMimeType(mimeType: string) {
    return mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();
  }

  private buildPublicUrl(key: string): string {
    const base = this.publicEndpoint || this.endpoint;
    if (base) {
      return `${base}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private normalizeEndpoint(endpoint?: string): string | undefined {
    if (!endpoint) {
      return undefined;
    }
    try {
      const url = new URL(endpoint);
      const matchedBucketPrefix = `${this.bucket}.`;
      if (url.hostname.startsWith(matchedBucketPrefix)) {
        url.hostname = url.hostname.replace(matchedBucketPrefix, "");
      }
      return url.toString().replace(/\/+$/, "");
    }
    catch {
      return endpoint;
    }
  }
}

export const s3Service = new S3Service();
