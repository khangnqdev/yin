import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ClientProfile } from '../../../core/models/client-auth.model';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';
import {
  YinDataTableComponent,
  YinCellDefDirective,
  TableColumn,
  TableFilter,
} from '../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'yin-admin-clients',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    YinIconComponent,
    YinDataTableComponent,
    YinCellDefDirective,
  ],
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

  public readonly columns: TableColumn<ClientProfile>[] = [
    { key: 'username', label: 'Khách Hàng', icon: 'user', width: '220px', sortable: true },
    { key: 'email', label: 'Email', icon: 'mail', width: '220px', sortable: true },
    { key: 'phone', label: 'Số Điện Thoại', icon: 'phone', width: '150px' },
    { key: 'dateOfBirth', label: 'Ngày Sinh', icon: 'calendar', width: '130px' },
    { key: 'receiveUpdates', label: 'Bản Tin', icon: 'bell', width: '160px', sortable: true },
    { key: 'createdAt', label: 'Ngày Đăng Ký', icon: 'clock', width: '170px', sortable: true },
  ];

  protected readonly filterPills = computed<TableFilter[]>(() => [
    {
      id: 'updates',
      label: 'Nhận Bản Tin',
      icon: 'bell',
      activeValue: this.updatesOnly() ? 'YES' : 'ALL',
      options: [
        { label: 'Tất cả khách hàng', value: 'ALL' },
        { label: 'Đang nhận tin', value: 'YES' },
      ],
    },
  ]);

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

  async onSearchChange(term: string): Promise<void> {
    this.searchTerm.set(term);
    this.currentPage.set(0);
    await this.fetchClients();
  }

  async onFilterChange(event: { id: string; value: any }): Promise<void> {
    if (event.id === 'updates') {
      this.updatesOnly.set(event.value === 'YES');
      this.currentPage.set(0);
      await this.fetchClients();
    }
  }

  async onPageSizeChange(newSize: number): Promise<void> {
    this.pageSize.set(newSize);
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

  onExportCsv(): void {
    const list = this.clients();
    const headers = ['ID', 'Username', 'Email', 'Phone', 'DateOfBirth', 'ReceiveUpdates', 'CreatedAt'];
    const rows = list.map((c) => [
      c.id,
      `"${c.username}"`,
      `"${c.email}"`,
      c.phone || '',
      c.dateOfBirth || '',
      c.receiveUpdates ? 'Yes' : 'No',
      c.createdAt || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clients-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }
}

