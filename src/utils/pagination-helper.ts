// file: src/utils/pagination-helper.ts

import type { PaginatedResponse } from "@/ts/pagination.types";
import type { PaginationMeta } from "@/utils/response.utils";
import {
  buildMongoFilters,
  buildPaginationMeta,
  buildSort,
  parsePaginationParams,
  type PaginationQueryParams,
} from "@/core/http/pagination";

export class PaginationHelper {
  static parsePaginationParams(query: PaginationQueryParams) {
    return parsePaginationParams(query);
  }

  static parse(query: PaginationQueryParams) {
    return this.parsePaginationParams(query);
  }

  static formatResponse<T>(result: {
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      query?: string | null;
      filters?: Record<string, unknown>;
    };
  }): PaginatedResponse<T> {
    return {
      success: true,
      data: result.data,
      pagination: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.totalItems,
        itemsPerPage: result.pagination.pageSize,
        hasNext: result.pagination.page < result.pagination.totalPages,
        hasPrev: result.pagination.page > 1,
        nextPage:
          result.pagination.page < result.pagination.totalPages
            ? result.pagination.page + 1
            : null,
        prevPage: result.pagination.page > 1 ? result.pagination.page - 1 : null,
        slNo: (result.pagination.page - 1) * result.pagination.pageSize,
      },
      meta: {
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        sortBy: result.pagination.sortBy,
        sortOrder: result.pagination.sortOrder,
        query: result.pagination.query,
        filters: result.pagination.filters,
      },
    };
  }

  static buildResponse<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    const meta = buildPaginationMeta({
      page,
      pageSize,
      totalItems: total,
    });

    return {
      success: true,
      data,
      pagination: {
        currentPage: meta.page,
        totalPages: meta.totalPages,
        totalItems: meta.totalItems,
        itemsPerPage: meta.pageSize,
        hasNext: meta.page < meta.totalPages,
        hasPrev: meta.page > 1,
        nextPage: meta.page < meta.totalPages ? meta.page + 1 : null,
        prevPage: meta.page > 1 ? meta.page - 1 : null,
        slNo: (meta.page - 1) * meta.pageSize,
      },
      meta,
    };
  }

  static createSearchFilter(
    query: PaginationQueryParams,
    searchFields: string[] = [],
  ) {
    const parsed = parsePaginationParams(query);
    const filters = buildMongoFilters(parsed.filters);

    if (parsed.query && searchFields.length) {
      const regex = new RegExp(parsed.query, "i");
      filters.$or = searchFields.map((field) => ({ [field]: { $regex: regex } }));
    }

    return filters;
  }

  static buildMeta(args: {
    page: number;
    pageSize: number;
    totalItems: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    query?: string | null;
    filters?: Record<string, unknown>;
  }): PaginationMeta {
    return buildPaginationMeta(args);
  }

  static buildSort(sortBy: string, sortOrder: "asc" | "desc") {
    return buildSort(sortBy, sortOrder);
  }
}
