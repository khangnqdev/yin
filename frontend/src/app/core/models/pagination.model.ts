export interface OffsetPage<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface CursorPage<T> {
  items: T[];
  size: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export type PaginatedResult<T> = OffsetPage<T>;

