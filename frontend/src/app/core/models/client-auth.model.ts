export type UserRole = 'CLIENT' | 'ADMIN' | 'MANAGER' | 'FIXER';

export interface ClientProfile {
  id: string;
  username: string;
  email: string;
  phone: string;
  dateOfBirth: string; // Định dạng YYYY-MM-DD
  receiveUpdates: boolean;
  role: 'CLIENT';
  createdAt: string; // ISO 8601 UTC
}

export interface ClientRegisterDto {
  email: string;
  username: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  receiveUpdates?: boolean;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface AdminAccount {
  id: string;
  username: string;
  role: 'MANAGER' | 'ADMIN' | 'FIXER';
  isActive: boolean;
  createdAt: string;
}

export interface CreateAdminDto {
  username: string;
  password: string;
  role: 'MANAGER' | 'ADMIN' | 'FIXER';
}

