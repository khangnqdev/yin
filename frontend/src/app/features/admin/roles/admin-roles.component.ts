import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { LocalDbService } from '../../../core/services/local-db.service';
import { AdminRole } from '../../../core/models/role.model';

const FEATURES = [
  { code: 'dashboard', name: 'Tổng quan', actions: ['READ'] },
  { code: 'analytics', name: 'Phân tích', actions: ['READ'] },
  { code: 'articles', name: 'Bài viết', actions: ['READ', 'WRITE', 'EXECUTE', 'DELETE'] },
  { code: 'pages', name: 'Trang', actions: ['READ', 'WRITE'] },
  { code: 'contacts', name: 'Liên hệ', actions: ['READ', 'WRITE'] },
  { code: 'clients', name: 'Khách hàng', actions: ['READ'] },
  { code: 'support', name: 'Hỗ trợ', actions: ['READ', 'EXECUTE'] },
  { code: 'accounts', name: 'Tài khoản quản trị', actions: ['READ', 'WRITE', 'EXECUTE'] },
  { code: 'roles', name: 'Vai trò', actions: ['READ', 'WRITE', 'EXECUTE'] },
  { code: 'profile', name: 'Hồ sơ tác giả', actions: ['READ', 'WRITE'] },
  { code: 'upload', name: 'Tải tệp', actions: ['WRITE'] },
];

@Component({
  selector: 'yin-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.css'],
})
export class AdminRolesComponent implements OnInit {
  private readonly api = inject(AdminManagementService);
  protected readonly db = inject(LocalDbService);
  protected readonly roles = signal<AdminRole[]>([]);
  protected readonly selected = signal<AdminRole | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly features = FEATURES;
  protected readonly actions = ['READ', 'WRITE', 'EXECUTE', 'DELETE'];
  protected creating = false;
  protected code = '';
  protected name = '';
  protected description = '';
  protected rank = 1;
  protected grants = new Set<string>();

  async ngOnInit(): Promise<void> { await this.reload(); }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.roles.set(await this.api.getRoles());
      this.error.set('');
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 503
        ? 'Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau.' : 'Không thể tải vai trò.');
    } finally {
      this.loading.set(false);
    }
  }

  protected select(role: AdminRole): void {
    this.creating = false;
    this.selected.set(role);
    this.code = role.code;
    this.name = role.name;
    this.description = role.description;
    this.rank = role.rank;
    this.grants = new Set(role.permissions);
    this.error.set('');
    this.success.set('');
  }

  protected startCreate(): void {
    this.creating = true;
    this.selected.set(null);
    this.code = '';
    this.name = '';
    this.description = '';
    this.rank = Math.max(1, (this.db.adminSession()?.rank ?? 2) - 1);
    this.grants = new Set();
    this.error.set('');
    this.success.set('');
  }

  protected canEdit(): boolean {
    const role = this.selected();
    return this.db.hasPermission('roles:WRITE') &&
      (this.creating || !!role && !role.isSystem && role.rank < (this.db.adminSession()?.rank ?? 0));
  }

  protected available(feature: string, action: string): boolean {
    return FEATURES.some(f => f.code === feature && f.actions.includes(action));
  }

  protected toggle(permission: string, checked: boolean): void {
    if (!this.canEdit() || !this.db.hasPermission(permission)) return;
    if (checked) this.grants.add(permission); else this.grants.delete(permission);
  }

  protected async save(): Promise<void> {
    if (!this.canEdit() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const data = { name: this.name.trim(), description: this.description.trim(), rank: Number(this.rank), permissions: [...this.grants] };
      const saved = this.creating
        ? await this.api.createRole({ ...data, code: this.code.trim().toUpperCase() })
        : await this.api.updateRole(this.code, data);
      await this.reload();
      this.select(saved);
      this.success.set('Đã lưu vai trò. Các tài khoản bị ảnh hưởng cần đăng nhập lại.');
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 503
        ? 'Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau.'
        : error instanceof HttpErrorResponse && error.status === 403
          ? 'Bạn không được chỉnh sửa vai trò hoặc cấp quyền này.' : 'Không thể lưu vai trò.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async changeStatus(): Promise<void> {
    const role = this.selected();
    if (!role || !this.canEdit() || !this.db.hasPermission('roles:EXECUTE') || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.api.setRoleActive(role.code, !role.isActive);
      await this.reload();
      this.select(saved);
      this.success.set('Đã cập nhật trạng thái vai trò.');
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 409
        ? 'Hãy chuyển các tài khoản sang vai trò khác trước khi ngừng vai trò này.'
        : error instanceof HttpErrorResponse && error.status === 503
          ? 'Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau.' : 'Không thể đổi trạng thái vai trò.');
    } finally {
      this.saving.set(false);
    }
  }
}
