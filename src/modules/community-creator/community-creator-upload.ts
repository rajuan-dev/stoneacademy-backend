import { BadRequestException } from "@/utils/app-error.utils";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";

const COMMUNITY_MAX_FILES = 10;
const COMMUNITY_FILE_SIZE_LIMIT = 50 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
    return;
  }

  cb(new BadRequestException("Only image and video uploads are supported"));
};

const communityUploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: COMMUNITY_FILE_SIZE_LIMIT,
    files: COMMUNITY_MAX_FILES,
  },
});

const rawCommunityUpload = communityUploader.any();

export const communityUpload = (req: Request, res: Response, next: NextFunction) => {
  rawCommunityUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_COUNT") {
        next(new BadRequestException(`A maximum of ${COMMUNITY_MAX_FILES} files is allowed`));
        return;
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        next(new BadRequestException("File size exceeds the allowed 50 MB limit"));
        return;
      }
    }

    next(error);
  });
};
