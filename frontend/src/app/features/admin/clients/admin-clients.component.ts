import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ClientProfile } from '../../../core/models/client-auth.model';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-admin-clients',
  imports: [CommonModule, FormsModule, DatePipe, YinIconComponent],
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.css']
})
export class AdminClientsComponent implements OnInit {
  private readonly adminApi = inject(AdminManagementService);

  protected readonly clients = signal<ClientProfile[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  // Filters
  protected readonly updatesOnly = signal(true);
  protected readonly searchTerm = signal('');
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly totalCount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.fetchClients();
  }

  async fetchClients(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const res = await this.adminApi.getClients(
        this.updatesOnly(),
        this.searchTerm(),
        this.currentPage(),
        this.pageSize()
      );
      this.clients.set(res.items);
      this.totalCount.set(res.total);
    } catch {
      this.error.set('Không thể tải danh sách khách hàng. Vui lòng thử lại sau.');
    } finally {
      this.loading.set(false);
    }
  }

  async onSearch(): Promise<void> {
    this.currentPage.set(0);
    await this.fetchClients();
  }

  async toggleUpdatesOnly(): Promise<void> {
    this.updatesOnly.update(v => !v);
    this.currentPage.set(0);
    await this.fetchClients();
  }

  async changePage(newPage: number): Promise<void> {
    if (newPage < 0 || newPage >= this.totalPages()) {
      return;
    }
    this.currentPage.set(newPage);
    await this.fetchClients();
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }
}

