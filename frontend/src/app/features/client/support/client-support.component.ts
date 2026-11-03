import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { SupportRequest, SupportStatus } from '../../../core/models/support-request.model';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-client-support',
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, YinIconComponent],
  templateUrl: './client-support.component.html',
  styleUrls: ['./client-support.component.css']
})
export class ClientSupportComponent implements OnInit {
  protected readonly auth = inject(ClientAuthService);

  // Form state
  protected readonly subject = signal('');
  protected readonly message = signal('');
  protected readonly submitting = signal(false);
  protected readonly formError = signal('');
  protected readonly successAlert = signal('');

  // Requests state
  protected readonly requests = signal<SupportRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly isCreatingNew = signal(false);

  // Pagination state (Offset)
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly totalCount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadRequests(0);
  }

  async loadRequests(page: number = this.currentPage()): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.auth.getMySupportRequests(page, this.pageSize());
      this.requests.set(data.items);
      this.totalCount.set(data.total);
      this.currentPage.set(data.page);
    } catch {
      this.formError.set('Không thể tải danh sách yêu cầu hỗ trợ.');
    } finally {
      this.loading.set(false);
    }
  }

  async changePage(newPage: number): Promise<void> {
    if (newPage < 0 || newPage >= this.totalPages()) {
      return;
    }
    await this.loadRequests(newPage);
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  toggleCreateForm(): void {
    this.isCreatingNew.update(v => !v);
    this.formError.set('');
    this.successAlert.set('');
  }

  validate(): boolean {
    const sub = this.subject().trim();
    const msg = this.message().trim();

    if (!sub || sub.length < 3 || sub.length > 200) {
      this.formError.set('Chủ đề yêu cầu phải có độ dài từ 3 đến 200 ký tự.');
      return false;
    }

    if (!msg || msg.length < 10 || msg.length > 5000) {
      this.formError.set('Nội dung yêu cầu phải có độ dài từ 10 đến 5000 ký tự.');
      return false;
    }

    this.formError.set('');
    return true;
  }

  async submitTicket(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (!this.validate()) {
      return;
    }

    this.submitting.set(true);
    this.formError.set('');
    this.successAlert.set('');

    try {
      await this.auth.createSupportRequest(
        this.subject().trim(),
        this.message().trim()
      );

      // Tải lại trang đầu tiên để đồng bộ danh sách
      await this.loadRequests(0);
      this.subject.set('');
      this.message.set('');
      this.isCreatingNew.set(false);
      this.successAlert.set('Yêu cầu hỗ trợ của bạn đã được gửi thành công! Đội ngũ kỹ sư Yin sẽ phản hồi sớm nhất.');
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 429) {
          this.formError.set('Bạn đã gửi quá nhiều yêu cầu liên tiếp. Vui lòng thử lại sau ít phút.');
        } else {
          this.formError.set(err.error?.message || 'Không thể tạo yêu cầu hỗ trợ. Vui lòng kiểm tra lại.');
        }
      } else {
        this.formError.set('Đã có lỗi xảy ra trong quá trình gửi yêu cầu.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  getStatusLabel(status: SupportStatus): string {
    switch (status) {
      case 'OPEN': return 'Mới tiếp nhận';
      case 'IN_PROGRESS': return 'Đang xử lý';
      case 'RESOLVED': return 'Đã giải quyết';
      case 'CLOSED': return 'Đã đóng';
      default: return status;
    }
  }
}

