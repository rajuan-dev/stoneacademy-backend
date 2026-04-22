import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";

type CachedResponse = {
  body: Buffer;
  contentType?: string;
  expiresAt: number;
  statusCode: number;
};

const MAX_CACHE_ENTRIES = 500;
const DEFAULT_TTL_MS = 10000;
const STATIC_TTL_MS = 60000;
const SENSITIVE_PATH_PATTERNS = [
  /^\/api\/v\d+\/auth\b/,
  /^\/api\/v\d+\/admin\/auth\b/,
  /^\/api\/v\d+\/billing\/webhook\b/,
  /^\/api\/v\d+\/stripe\b/,
];

const cache = new Map<string, CachedResponse>();

const getTtl = (path: string) => {
  if (
    path.includes("/categories")
    || path.includes("/cms")
    || path.includes("/settings")
  ) {
    return STATIC_TTL_MS;
  }

  if (
    path.includes("/messages")
    || path.includes("/chat")
    || path.includes("/notifications")
    || path.includes("/join-status")
  ) {
    return 5000;
  }

  return DEFAULT_TTL_MS;
};

const shouldSkip = (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") return true;
  if (req.headers["x-cache-bypass"] === "true") return true;
  if (req.headers["cache-control"]?.includes("no-cache")) return true;
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(req.originalUrl));
};

const authScope = (req: Request) => {
  const authorization = req.headers.authorization || "";
  if (!authorization) return "public";
  return createHash("sha256").update(authorization).digest("hex").slice(0, 24);
};

const getCacheKey = (req: Request) =>
  `${req.method}:${authScope(req)}:${req.originalUrl}`;

const remember = (key: string, value: CachedResponse) => {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, value);
};

export const clearResponseCache = () => {
  cache.clear();
};

export function responseCache(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.on("finish", () => {
      if (res.statusCode < 500) clearResponseCache();
    });
    next();
    return;
  }

  if (shouldSkip(req)) {
    next();
    return;
  }

  const key = getCacheKey(req);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    res.status(cached.statusCode);
    if (cached.contentType) res.type(cached.contentType);
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "private, max-age=10");
    res.send(cached.body);
    return;
  }

  if (cached) cache.delete(key);

  const originalSend = res.send.bind(res);
  res.send = ((body?: any) => {
    const contentType = String(res.getHeader("content-type") || "");
    const isJson = contentType.includes("application/json");
    const canCache =
      res.statusCode === 200
      && isJson
      && body !== undefined
      && !res.getHeader("set-cookie");

    if (canCache) {
      const buffer = Buffer.isBuffer(body)
        ? body
        : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
      remember(key, {
        body: buffer,
        contentType,
        expiresAt: Date.now() + getTtl(req.originalUrl),
        statusCode: res.statusCode,
      });
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "private, max-age=10");
    }

    return originalSend(body);
  }) as typeof res.send;

  next();
}
