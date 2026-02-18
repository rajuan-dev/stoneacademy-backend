// file: src/core/http/pagination.ts

import type { PaginationMeta } from "@/utils/response.utils";

export type PaginationQueryParams = {
  page?: string | number;
  pageSize?: string | number;
  query?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | string;
  filters?: string | Record<string, unknown>;
};

export type ParsedPaginationParams = {
  page: number;
  pageSize: number;
  query: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filters: Record<string, unknown>;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(
  params: PaginationQueryParams = {},
): ParsedPaginationParams {
  const page = normalizeNumber(params.page, DEFAULT_PAGE, 1);
  const pageSize = normalizeNumber(params.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const sortBy = params.sortBy?.trim() || "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";
  const query = params.query?.trim() || null;
  const filters = parseFilters(params.filters);

  return {
    page,
    pageSize,
    query,
    sortBy,
    sortOrder,
    filters,
  };
}

function normalizeNumber(
  value: string | number | undefined,
  fallback: number,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function parseFilters(filters?: string | Record<string, unknown>): Record<string, unknown> {
  if (!filters) {
    return {};
  }

  if (typeof filters === "string") {
    try {
      const parsed = JSON.parse(filters);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  if (typeof filters === "object" && !Array.isArray(filters)) {
    return filters as Record<string, unknown>;
  }

  return {};
}

export function buildSort(sortBy: string, sortOrder: "asc" | "desc") {
  return {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };
}

export function buildPaginationMeta(args: {
  page: number;
  pageSize: number;
  totalItems: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  query?: string | null;
  filters?: Record<string, unknown>;
}): PaginationMeta {
  const totalPages = args.totalItems > 0 ? Math.ceil(args.totalItems / args.pageSize) : 0;
  return {
    page: args.page,
    pageSize: args.pageSize,
    totalItems: args.totalItems,
    totalPages,
    sortBy: args.sortBy,
    sortOrder: args.sortOrder,
    query: args.query,
    filters: args.filters,
  };
}

export function buildMongoFilters(
  filters: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  return {
    ...filters,
    ...extra,
  };
}

