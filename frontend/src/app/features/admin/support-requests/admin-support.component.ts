import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { AdminSupportRequest, SupportStatus } from '../../../core/models/support-request.model';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-admin-support',
  imports: [CommonModule, FormsModule, DatePipe, YinIconComponent],
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.css']
})
export class AdminSupportComponent implements OnInit {
  private readonly adminApi = inject(AdminManagementService);

  protected readonly requests = signal<AdminSupportRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly toastMessage = signal('');
  protected readonly updatingId = signal<string | null>(null);

  // Filters
  protected readonly selectedStatus = signal<string>(''); // Rỗng = ALL
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly totalCount = signal(0);

  readonly availableStatuses: SupportStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  async ngOnInit(): Promise<void> {
    await this.fetchRequests();
  }

  async fetchRequests(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const res = await this.adminApi.getSupportRequests(
        this.selectedStatus(),
        this.currentPage(),
        this.pageSize()
      );
      this.requests.set(res.items);
      this.totalCount.set(res.total);
    } catch {
      this.error.set('Không thể tải danh sách yêu cầu hỗ trợ.');
    } finally {
      this.loading.set(false);
    }
  }

  async setStatusFilter(status: string): Promise<void> {
    this.selectedStatus.set(status);
    this.currentPage.set(0);
    await this.fetchRequests();
  }

  async updateStatus(ticket: AdminSupportRequest, newStatus: SupportStatus): Promise<void> {
    if (ticket.status === newStatus || this.updatingId() === ticket.id) {
      return;
    }

    this.updatingId.set(ticket.id);

    try {
      const updated = await this.adminApi.updateSupportRequestStatus(ticket.id, newStatus);
      // Cập nhật trạng thái trong signal
      this.requests.update(list => 
        list.map(item => item.id === ticket.id ? { ...item, status: updated.status, updatedAt: updated.updatedAt } : item)
      );
      this.showToast(`Đã chuyển trạng thái yêu cầu sang "${this.getStatusLabel(newStatus)}"`);
    } catch {
      this.showToast('Không thể cập nhật trạng thái yêu cầu.');
    } finally {
      this.updatingId.set(null);
    }
  }

  async changePage(newPage: number): Promise<void> {
    if (newPage < 0 || newPage >= this.totalPages()) {
      return;
    }
    this.currentPage.set(newPage);
    await this.fetchRequests();
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  getStatusLabel(status: SupportStatus): string {
    switch (status) {
      case 'OPEN': return 'Mới tiếp nhận (OPEN)';
      case 'IN_PROGRESS': return 'Đang xử lý (IN_PROGRESS)';
      case 'RESOLVED': return 'Đã giải quyết (RESOLVED)';
      case 'CLOSED': return 'Đã đóng (CLOSED)';
      default: return status;
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 3500);
  }
}

