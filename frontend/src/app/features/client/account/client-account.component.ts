import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { ClientProfile } from '../../../core/models/client-auth.model';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';
import { APP_VARIABLES } from '../../../core/constants/app.variables';

@Component({
  selector: 'yin-client-account',
  imports: [CommonModule, DatePipe, RouterLink, YinIconComponent],
  templateUrl: './client-account.component.html',
  styleUrls: ['./client-account.component.css']
})
export class ClientAccountComponent implements OnInit {
  protected readonly appVars = APP_VARIABLES;
  protected readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);

  protected readonly profile = signal<ClientProfile | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly updatingOptIn = signal<boolean>(false);
  protected readonly toastMessage = signal<string>('');
  protected readonly toastType = signal<'success' | 'error'>('success');

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.auth.loadProfile();
      if (!data) {
        this.auth.logout();
        return;
      }
      this.profile.set(data);
    } catch {
      this.showToast('Không thể tải thông tin hồ sơ khách hàng.', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleUpdates(): Promise<void> {
    const current = this.profile();
    if (!current || this.updatingOptIn()) {
      return;
    }

    const nextState = !current.receiveUpdates;
    this.updatingOptIn.set(true);

    try {
      const updated = await this.auth.updateOptIn(nextState);
      this.profile.set(updated);
      this.showToast(
        nextState 
          ? 'Đã bật nhận bản tin cập nhật công nghệ từ Yin!' 
          : 'Đã hủy nhận bản tin công nghệ thành công.',
        'success'
      );
    } catch {
      this.showToast('Không thể cập nhật tùy chọn nhận tin. Vui lòng thử lại.', 'error');
    } finally {
      this.updatingOptIn.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 4000);
  }
}

