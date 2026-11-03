export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportRequest {
  id: string;
  subject: string;
  message: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportRequest extends SupportRequest {
  clientId: string;
  username: string;
  email: string;
  phone: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

