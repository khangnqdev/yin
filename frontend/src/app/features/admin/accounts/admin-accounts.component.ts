import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { DraftStorageService } from '../../../core/services/draft-storage.service';
import { AdminAccount } from '../../../core/models/client-auth.model';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';
import { YinSlideDrawerComponent } from '../../../shared/components/slide-drawer/slide-drawer.component';
import { HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from '../../../core/services/local-db.service';

interface AdminAccountDraft {
  username: string;
  role: 'MANAGER' | 'ADMIN' | 'FIXER';
}

@Component({
  selector: 'yin-admin-accounts',
  imports: [CommonModule, FormsModule, DatePipe, YinIconComponent, YinSlideDrawerComponent],
  templateUrl: './admin-accounts.component.html',
  styleUrls: ['./admin-accounts.component.css']
})
export class AdminAccountsComponent implements OnInit {
  private readonly adminApi = inject(AdminManagementService);
  protected readonly db = inject(LocalDbService);
  private readonly draftStorage = inject(DraftStorageService);
  private readonly DRAFT_KEY = 'admin_account_new';

  protected readonly accounts = signal<AdminAccount[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly successMessage = signal('');

  // Pagination state (Offset)
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly totalCount = signal(0);

  // Drawer & Form state
  protected readonly isAddingAccount = signal(false);
  protected readonly hasDraftRestored = signal(false);
  protected readonly newUsername = signal('');
  protected readonly newPassword = signal('');
  protected readonly newRole = signal<'MANAGER' | 'ADMIN' | 'FIXER'>('ADMIN');
  protected readonly submitting = signal(false);
  protected readonly formError = signal('');
  protected readonly busyAccountId = signal('');
  protected readonly passwordAccount = signal<AdminAccount | null>(null);
  protected readonly replacementPassword = signal('');

  readonly availableRoles: Array<'MANAGER' | 'ADMIN' | 'FIXER'> = ['MANAGER', 'ADMIN', 'FIXER'];

  async ngOnInit(): Promise<void> {
    await this.fetchAccounts(0);
  }

  async fetchAccounts(page: number = this.currentPage()): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const data = await this.adminApi.getAdminAccounts(page, this.pageSize());
      this.accounts.set(data.items);
      this.totalCount.set(data.total);
      this.currentPage.set(data.page);
    } catch {
      this.error.set('Không thể tải danh sách tài khoản quản trị.');
    } finally {
      this.loading.set(false);
    }
  }

  async changePage(newPage: number): Promise<void> {
    if (newPage < 0 || newPage >= this.totalPages()) {
      return;
    }
    await this.fetchAccounts(newPage);
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  openAddDrawer(): void {
    this.formError.set('');
    this.successMessage.set('');

    // Kiểm tra và khôi phục bản nháp chưa lưu (trong hạn 12 tiếng)
    const draft = this.draftStorage.getDraft<AdminAccountDraft>(this.DRAFT_KEY);
    if (draft) this.draftStorage.saveDraft(this.DRAFT_KEY, { username: draft.username || '', role: draft.role || 'ADMIN' });
    if (draft && draft.username) {
      this.newUsername.set(draft.username || '');
      this.newPassword.set('');
      this.newRole.set(draft.role || 'ADMIN');
      this.hasDraftRestored.set(true);
    } else {
      this.newUsername.set('');
      this.newPassword.set('');
      this.newRole.set('ADMIN');
      this.hasDraftRestored.set(false);
    }

    this.isAddingAccount.set(true);
  }

  /**
   * Khi đóng popup bằng cách bấm ngoài backdrop hoặc nút X:
   * Nếu có nhập dữ liệu thì tự động lưu bản nháp (hết hạn sau 12 tiếng).
   */
  onDrawerClose(): void {
    if (this.newUsername().trim()) {
      this.draftStorage.saveDraft(this.DRAFT_KEY, {
        username: this.newUsername(),
        role: this.newRole()
      });
    } else {
      this.draftStorage.clearDraft(this.DRAFT_KEY);
    }
    this.newPassword.set('');
    this.isAddingAccount.set(false);
  }

  /**
   * Khi người dùng chủ động bấm Hủy bỏ:
   * Xóa bản nháp và đóng popup
   */
  onDrawerCancel(): void {
    this.draftStorage.clearDraft(this.DRAFT_KEY);
    this.hasDraftRestored.set(false);
    this.newUsername.set('');
    this.newPassword.set('');
    this.isAddingAccount.set(false);
  }

  /**
   * Chủ động xóa bản nháp đã khôi phục
   */
  onClearDraft(): void {
    this.draftStorage.clearDraft(this.DRAFT_KEY);
    this.hasDraftRestored.set(false);
    this.newUsername.set('');
    this.newPassword.set('');
    this.newRole.set('ADMIN');
  }

  validate(): boolean {
    const userVal = this.newUsername().trim();
    const passVal = this.newPassword();

    const userRegex = /^[A-Za-z0-9_.-]{3,50}$/;
    if (!userVal || !userRegex.test(userVal)) {
      this.formError.set('Tên đăng nhập quản trị từ 3–50 ký tự ASCII (chữ, số, _, ., -).');
      return false;
    }

    if (!passVal || passVal.length < 12 || passVal.length > 72) {
      this.formError.set('Mật khẩu quản trị phải từ 12 đến 72 ký tự.');
      return false;
    }

    if (passVal !== passVal.trim()) {
      this.formError.set('Mật khẩu không được chứa khoảng trắng ở đầu hoặc cuối.');
      return false;
    }

    this.formError.set('');
    return true;
  }

  async submitNewAdmin(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (!this.validate()) {
      return;
    }

    this.submitting.set(true);
    this.formError.set('');
    this.successMessage.set('');

    try {
      const created = await this.adminApi.createAdminAccount({
        username: this.newUsername().trim(),
        password: this.newPassword(),
        role: this.newRole()
      });

      // Tải lại trang đầu tiên sau khi tạo mới
      await this.fetchAccounts(0);
      
      // Xóa bản nháp khi đã lưu thành công
      this.draftStorage.clearDraft(this.DRAFT_KEY);
      this.hasDraftRestored.set(false);
      this.newUsername.set('');
      this.newPassword.set('');
      this.isAddingAccount.set(false);

      this.successMessage.set(`Đã khởi tạo thành công tài khoản quản trị "${created.username}"!`);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 409) {
          this.formError.set('Tên đăng nhập này đã tồn tại trên hệ thống.');
        } else {
          this.formError.set(err.error?.message || 'Không thể tạo tài khoản quản trị.');
        }
      } else {
        this.formError.set('Đã có lỗi xảy ra.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  async toggleActive(account: AdminAccount): Promise<void> {
    if (account.id === this.db.adminUser()?.id || this.busyAccountId()) return;
    const next = !account.isActive;
    if (!next && !confirm(`Khóa tài khoản "${account.username}"? Các phiên đăng nhập hiện tại sẽ hết hiệu lực.`)) return;
    this.busyAccountId.set(account.id);
    this.error.set('');
    try {
      const updated = await this.adminApi.setAdminAccountActive(account.id, next);
      this.replaceAccount(updated);
      this.successMessage.set(next ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
    } catch (error) {
      this.showActionError(error);
    } finally {
      this.busyAccountId.set('');
    }
  }

  async changeRole(account: AdminAccount, role: AdminAccount['role']): Promise<void> {
    if (account.id === this.db.adminUser()?.id || role === account.role || this.busyAccountId()) return;
    this.busyAccountId.set(account.id);
    this.error.set('');
    try {
      this.replaceAccount(await this.adminApi.changeAdminAccountRole(account.id, role));
      this.successMessage.set(`Đã đổi vai trò của "${account.username}" thành ${role}.`);
    } catch (error) {
      this.showActionError(error);
      this.accounts.update(items => items.map(item => item.id === account.id ? { ...item } : item));
    } finally {
      this.busyAccountId.set('');
    }
  }

  openPasswordReset(account: AdminAccount): void {
    this.replacementPassword.set('');
    this.formError.set('');
    this.passwordAccount.set(account);
  }

  closePasswordReset(): void {
    this.replacementPassword.set('');
    this.passwordAccount.set(null);
  }

  async submitPasswordReset(): Promise<void> {
    const account = this.passwordAccount();
    const password = this.replacementPassword();
    if (!account || this.busyAccountId()) return;
    if (password.length < 12 || new TextEncoder().encode(password).length > 72 || password !== password.trim()) {
      this.formError.set('Mật khẩu mới cần từ 12 đến 72 byte, không có khoảng trắng ở hai đầu.');
      return;
    }
    this.busyAccountId.set(account.id);
    this.formError.set('');
    try {
      await this.adminApi.resetAdminAccountPassword(account.id, password);
      this.closePasswordReset();
      this.successMessage.set(`Đã đặt lại mật khẩu cho "${account.username}". Các phiên cũ đã hết hiệu lực.`);
    } catch (error) {
      this.formError.set(error instanceof HttpErrorResponse ? error.error?.message || 'Không thể đặt lại mật khẩu.' : 'Không thể đặt lại mật khẩu.');
    } finally {
      this.busyAccountId.set('');
    }
  }

  private replaceAccount(updated: AdminAccount): void {
    this.accounts.update(items => items.map(item => item.id === updated.id ? updated : item));
  }

  private showActionError(error: unknown): void {
    this.error.set(error instanceof HttpErrorResponse ? error.error?.message || 'Không thể cập nhật tài khoản.' : 'Không thể cập nhật tài khoản.');
  }
}
