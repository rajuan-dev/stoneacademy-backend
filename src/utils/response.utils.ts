// file: src/utils/response.utils.ts

import { HTTPSTATUS } from "@/config/http.config";
import type { Response } from "express";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  query?: string | null;
  filters?: Record<string, unknown>;
  [key: string]: unknown;
};

type LegacyPaginationMeta = {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  pageCount?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

type ResponseMeta = PaginationMeta | Record<string, unknown> | null;

type SuccessResponse<T> = {
  success: true;
  message: string;
  data: T | null;
  meta: ResponseMeta;
  timestamp: string;
};

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T | null = null,
    message = "Success",
    meta: ResponseMeta = null,
    statusCode: number = HTTPSTATUS.OK,
  ) {
    return this.ok(res, data, message, meta, statusCode);
  }

  static ok<T>(
    res: Response,
    data: T | null = null,
    message = "Success",
    meta: ResponseMeta = null,
    statusCode: number = HTTPSTATUS.OK,
  ) {
    const payload: SuccessResponse<T> = {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(payload);
  }

  static created<T>(
    res: Response,
    data: T | null = null,
    message = "Resource created successfully",
    meta: ResponseMeta = null,
  ) {
    return this.ok(res, data, message, meta, HTTPSTATUS.CREATED);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta | LegacyPaginationMeta,
    message = "Success",
    statusCode: number = HTTPSTATUS.OK,
  ) {
    return this.ok(res, data, message, normalizePaginationMeta(meta), statusCode);
  }

  static noContent(res: Response, message = "No content") {
    return res.status(HTTPSTATUS.NO_CONTENT).json({
      success: true,
      message,
      data: null,
      meta: null,
      timestamp: new Date().toISOString(),
    });
  }
}

function normalizePaginationMeta(meta: PaginationMeta | LegacyPaginationMeta): PaginationMeta {
  if ("page" in meta) {
    return meta as PaginationMeta;
  }

  return {
    page: meta.currentPage ?? 1,
    pageSize: meta.itemsPerPage ?? meta.limit ?? 0,
    totalItems: meta.totalItems ?? 0,
    totalPages: meta.totalPages ?? meta.pageCount ?? 0,
    sortBy: meta.sortBy,
    sortOrder: meta.sortOrder,
    query: undefined,
    filters: undefined,
  };
}
