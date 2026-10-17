import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Reads `page` and `limit` query parameters from a request and returns
 * normalized pagination values. Negative or zero values are coerced;
 * the limit is clamped to `maxLimit`.
 *
 * @param req      Express request object
 * @param defaultLimit default page size when `limit` is absent
 * @param maxLimit     upper bound on the page size
 */
export function getPaginationParams(
  req: Request,
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const rawPage = parseInt((req.query.page as string) || '1', 10);
  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);

  const rawLimit = parseInt((req.query.limit as string) || String(defaultLimit), 10);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.isNaN(rawLimit) ? defaultLimit : rawLimit)
  );

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

/**
 * Wraps a page of results together with pagination metadata.
 */
export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
): PaginatedResponse<T> {
  const { page, limit } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}
