import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ClientProfile, AdminAccount, CreateAdminDto, CreatedAdminAccount } from '../models/client-auth.model';
import { AdminSupportRequest, SupportStatus } from '../models/support-request.model';
import { OffsetPage } from '../models/pagination.model';
import { AdminRole, RoleInput } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class AdminManagementService {
  private readonly http = inject(HttpClient);

  async getRoles(): Promise<AdminRole[]> {
    return firstValueFrom(this.http.get<AdminRole[]>('/api/admin/roles'));
  }

  async createRole(data: RoleInput & { code: string }): Promise<AdminRole> {
    return firstValueFrom(this.http.post<AdminRole>('/api/admin/roles', data));
  }

  async updateRole(code: string, data: RoleInput): Promise<AdminRole> {
    return firstValueFrom(this.http.put<AdminRole>(`/api/admin/roles/${encodeURIComponent(code)}`, data));
  }

  async setRoleActive(code: string, isActive: boolean): Promise<AdminRole> {
    return firstValueFrom(this.http.patch<AdminRole>(`/api/admin/roles/${encodeURIComponent(code)}/status`, { isActive }));
  }

  /**
   * Lấy danh sách khách hàng (hỗ trợ lọc updatesOnly, tìm kiếm, phân trang offset)
   */
  async getClients(
    updatesOnly: boolean = true, 
    search: string = '', 
    page: number = 0, 
    size: number = 20
  ): Promise<OffsetPage<ClientProfile>> {
    let params = new HttpParams()
      .set('updatesOnly', String(updatesOnly))
      .set('page', String(page))
      .set('size', String(size));

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return await firstValueFrom(
      this.http.get<OffsetPage<ClientProfile>>('/api/admin/clients', { params })
    );
  }

  /**
   * Lấy danh sách yêu cầu hỗ trợ (hỗ trợ lọc status, phân trang offset)
   */
  async getSupportRequests(
    status: string = '', 
    page: number = 0, 
    size: number = 20
  ): Promise<OffsetPage<AdminSupportRequest>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (status.trim()) {
      params = params.set('status', status.trim());
    }

    return await firstValueFrom(
      this.http.get<OffsetPage<AdminSupportRequest>>('/api/admin/support-requests', { params })
    );
  }

  /**
   * Cập nhật trạng thái yêu cầu hỗ trợ
   */
  async updateSupportRequestStatus(id: string, status: SupportStatus): Promise<AdminSupportRequest> {
    return await firstValueFrom(
      this.http.patch<AdminSupportRequest>(`/api/admin/support-requests/${id}`, { status })
    );
  }

  /**
   * Lấy danh sách tài khoản quản trị (hỗ trợ phân trang offset page, size)
   */
  async getAdminAccounts(page: number = 0, size: number = 20): Promise<OffsetPage<AdminAccount>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    return await firstValueFrom(
      this.http.get<OffsetPage<AdminAccount>>('/api/admin/accounts', { params })
    );
  }

  /**
   * Tạo tài khoản quản trị mới
   */
  async createAdminAccount(data: CreateAdminDto): Promise<CreatedAdminAccount> {
    return await firstValueFrom(
      this.http.post<CreatedAdminAccount>('/api/admin/accounts', data)
    );
  }

  async setAdminAccountActive(id: string, isActive: boolean): Promise<AdminAccount> {
    return await firstValueFrom(this.http.patch<AdminAccount>(
      `/api/admin/accounts/${encodeURIComponent(id)}/status`, { isActive }
    ));
  }

  async changeAdminAccountRole(id: string, role: AdminAccount['role']): Promise<AdminAccount> {
    return await firstValueFrom(this.http.patch<AdminAccount>(
      `/api/admin/accounts/${encodeURIComponent(id)}/role`, { role }
    ));
  }

  async resetAdminAccountPassword(id: string, password: string): Promise<AdminAccount> {
    return await firstValueFrom(this.http.post<AdminAccount>(
      `/api/admin/accounts/${encodeURIComponent(id)}/reset-password`, { password }
    ));
  }
}
