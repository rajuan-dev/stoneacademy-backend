import type { NextFunction, Request, Response } from "express";

const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
]);

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    Object.entries(obj).forEach(([key, val]) => {
      if (SENSITIVE_KEYS.has(key)) {
        result[key] = "***redacted***";
      } else {
        result[key] = sanitize(val);
      }
    });
    return result;
  }

  if (typeof value === "string" && value.length > 2000) {
    return `${value.slice(0, 2000)}...[truncated]`;
  }

  return value;
}

function normalizeFiles(req: Request) {
  const files = req.files as
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined;

  if (!files) return undefined;

  if (Array.isArray(files)) {
    return files.map((file) => ({
      field: file.fieldname,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));
  }

  const mapped: Record<string, unknown> = {};
  Object.entries(files).forEach(([field, items]) => {
    mapped[field] = items.map((file) => ({
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));
  });
  return mapped;
}

export function requestBodyLogger(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const methodHasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (!methodHasBody) return;

    const body = sanitize(req.body ?? {});
    const files = normalizeFiles(req);

    console.log("\n[REQUEST PAYLOAD]");
    console.log("requestId:", req.id);
    console.log("method:", req.method);
    console.log("url:", req.originalUrl);
    console.log("content-type:", req.headers["content-type"]);
    console.log("query:", req.query ?? {});
    console.log("params:", req.params ?? {});
    console.log("body:", body);
    console.log("files:", files ?? []);
  });

  next();
}
