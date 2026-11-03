import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { 
  ClientProfile, 
  ClientRegisterDto, 
  LoginDto, 
  AuthResponse, 
  AuthUser 
} from '../models/client-auth.model';
import { SupportRequest } from '../models/support-request.model';
import { OffsetPage } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class ClientAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenKey = 'yin_client_token';
  private readonly userKey = 'yin_client_user';

  // Signals reactive state
  readonly token = signal<string | null>(this.getStoredToken());
  readonly currentUser = signal<AuthUser | null>(this.getStoredUser());
  readonly profile = signal<ClientProfile | null>(null);
  readonly isLoading = signal<boolean>(false);

  readonly isLoggedIn = computed(() => !!this.token() && this.currentUser()?.role === 'CLIENT');

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = sessionStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Đăng ký tài khoản Client mới
   */
  async register(data: ClientRegisterDto): Promise<ClientProfile> {
    const response = await firstValueFrom(
      this.http.post<ClientProfile>('/api/auth/register', data)
    );
    return response;
  }

  /**
   * Đăng nhập cổng Client
   */
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/client/login', credentials)
    );

    if (!res.token || res.user.role !== 'CLIENT') {
      throw new Error('Tài khoản không có quyền truy cập cổng khách hàng.');
    }

    sessionStorage.setItem(this.tokenKey, res.token);
    sessionStorage.setItem(this.userKey, JSON.stringify(res.user));

    this.token.set(res.token);
    this.currentUser.set(res.user);

    // Tự động tải hồ sơ khách hàng
    await this.loadProfile();

    return res;
  }

  /**
   * Lấy thông tin hồ sơ khách hàng hiện tại
   */
  async loadProfile(): Promise<ClientProfile | null> {
    if (!this.token()) {
      this.profile.set(null);
      return null;
    }

    try {
      this.isLoading.set(true);
      const data = await firstValueFrom(
        this.http.get<ClientProfile>('/api/client/me')
      );
      this.profile.set(data);
      return data;
    } catch {
      this.profile.set(null);
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cập nhật trạng thái nhận bản tin công nghệ
   */
  async updateOptIn(receiveUpdates: boolean): Promise<ClientProfile> {
    const updated = await firstValueFrom(
      this.http.patch<ClientProfile>('/api/client/me/updates', { receiveUpdates })
    );
    this.profile.set(updated);
    return updated;
  }

  /**
   * Tạo yêu cầu hỗ trợ kỹ thuật
   */
  async createSupportRequest(subject: string, message: string): Promise<SupportRequest> {
    return await firstValueFrom(
      this.http.post<SupportRequest>('/api/client/support-requests', { subject, message })
    );
  }

  /**
   * Lấy danh sách yêu cầu hỗ trợ của client hiện tại (phân trang offset)
   */
  async getMySupportRequests(page = 0, size = 20): Promise<OffsetPage<SupportRequest>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return await firstValueFrom(
      this.http.get<OffsetPage<SupportRequest>>('/api/client/support-requests', { params })
    );
  }

  /**
   * Đăng xuất Client
   */
  logout(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
    void this.router.navigate(['/login']);
  }
}

