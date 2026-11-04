import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../../core/services/contact.service';
import { DraftStorageService } from '../../../core/services/draft-storage.service';
import { Contact, ContactStatus } from '../../../core/models/contact.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';
import { YinSlideDrawerComponent } from '../../../shared/components/slide-drawer/slide-drawer.component';
import {
  YinDataTableComponent,
  YinCellDefDirective,
  TableColumn,
  TableFilter,
} from '../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'yin-admin-contacts',
  templateUrl: './admin-contacts.component.html',
  styleUrls: ['./admin-contacts.component.css'],
  imports: [
    FormsModule,
    DatePipe,
    YinIconComponent,
    YinSlideDrawerComponent,
    YinDataTableComponent,
    YinCellDefDirective,
  ]
})
export class AdminContactsComponent implements OnInit, OnDestroy {
  private readonly contactsService = inject(ContactService);
  private readonly draftStorage = inject(DraftStorageService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedStatus = signal<string>('ALL');
  protected readonly selectedContact = signal<Contact | null>(null);
  protected readonly editNotes = signal<string>('');
  protected readonly hasDraftRestored = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Server-side cursor keyset state
  protected readonly contactsList = signal<Contact[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadingMore = signal<boolean>(false);
  protected readonly hasMore = signal<boolean>(false);
  protected readonly nextCursor = signal<string | null>(null);

  public readonly columns: TableColumn<Contact>[] = [
    { key: 'fullName', label: 'Khách Hàng / Đơn Vị', icon: 'user', width: '220px', sortable: true },
    { key: 'contact', label: 'Thông Tin Liên Lạc', icon: 'mail', width: '210px' },
    { key: 'projectType', label: 'Đề Bài Dự Án', icon: 'briefcase', width: '260px' },
    { key: 'budgetRange', label: 'Ngân Sách', icon: 'wallet', width: '130px' },
    { key: 'status', label: 'Trạng Thái', icon: 'check-circle', width: '150px', sortable: true },
    { key: 'createdAt', label: 'Ngày Gửi', icon: 'calendar', width: '140px', sortable: true },
    { key: 'actions', label: 'Thao Tác', icon: 'settings', width: '120px', align: 'center' },
  ];

  protected readonly filterPills = computed<TableFilter[]>(() => [
    {
      id: 'status',
      label: 'Trạng Thái',
      icon: 'check-circle',
      activeValue: this.selectedStatus(),
      options: [
        { label: 'Tất cả trạng thái', value: 'ALL' },
        { label: 'Mới tiếp nhận', value: 'NEW' },
        { label: 'Đã liên hệ', value: 'CONTACTED' },
        { label: 'Đang xử lý', value: 'IN_PROGRESS' },
        { label: 'Đã giải quyết', value: 'RESOLVED' },
        { label: 'Đánh dấu Spam', value: 'SPAM' },
      ],
    },
  ]);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private currentRequestId = 0;

  async ngOnInit(): Promise<void> {
    await this.loadContacts(true);
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  async loadContacts(isReset = false): Promise<void> {
    const requestId = ++this.currentRequestId;

    if (isReset) {
      this.loading.set(true);
      this.nextCursor.set(null);
    } else {
      this.loadingMore.set(true);
    }

    const cursor = isReset ? '' : (this.nextCursor() || '');
    const status = this.selectedStatus() === 'ALL' ? '' : this.selectedStatus();
    const search = this.searchQuery().trim();

    try {
      const res = await this.contactsService.getAdminContacts(status, search, cursor, 20);

      // Bỏ qua nếu có request mới hơn
      if (requestId !== this.currentRequestId) {
        return;
      }

      if (isReset) {
        this.contactsList.set(res.items || []);
      } else {
        this.contactsList.update(curr => [...curr, ...(res.items || [])]);
      }

      this.hasMore.set(res.hasMore);
      this.nextCursor.set(res.nextCursor);
    } catch {
      // Giữ dữ liệu đã tải nếu tải tiếp bị lỗi
    } finally {
      if (requestId === this.currentRequestId) {
        this.loading.set(false);
        this.loadingMore.set(false);
      }
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      void this.loadContacts(true);
    }, 300);
  }

  setStatus(status: string): void {
    if (this.selectedStatus() === status) return;
    this.selectedStatus.set(status);
    void this.loadContacts(true);
  }

  onFilterChange(event: { id: string; value: any }): void {
    if (event.id === 'status') {
      this.setStatus(event.value);
    }
  }

  onExportCsv(): void {
    const list = this.contactsList();
    const headers = ['ID', 'FullName', 'CompanyName', 'Email', 'Phone', 'ProjectType', 'BudgetRange', 'Status', 'CreatedAt'];
    const rows = list.map((c) => [
      c.id,
      `"${c.fullName || ''}"`,
      `"${c.companyName || ''}"`,
      `"${c.email || ''}"`,
      c.phone || '',
      `"${c.projectType || ''}"`,
      `"${c.budgetRange || ''}"`,
      c.status,
      c.createdAt || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contacts-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore() || !this.nextCursor()) {
      return;
    }
    await this.loadContacts(false);
  }

  openContactModal(contact: Contact): void {
    if (!contact) {
      return;
    }
    this.selectedContact.set(contact);

    // Kiểm tra bản nháp còn trong hạn 12 tiếng của liên hệ này
    const draftKey = `contact_notes_${contact.id}`;
    const draft = this.draftStorage.getDraft<string>(draftKey);
    if (draft !== null && draft !== (contact.adminNotes || '')) {
      this.editNotes.set(draft);
      this.hasDraftRestored.set(true);
    } else {
      this.editNotes.set(contact.adminNotes || '');
      this.hasDraftRestored.set(false);
    }
  }

  onDrawerClose(): void {
    const current = this.selectedContact();
    if (current) {
      const draftKey = `contact_notes_${current.id}`;
      const notes = this.editNotes().trim();
      // Nếu có chỉnh sửa khác với dữ liệu gốc, lưu lại bản nháp (12 tiếng)
      if (notes !== (current.adminNotes || '').trim()) {
        this.draftStorage.saveDraft(draftKey, notes);
      }
    }
    this.closeModal();
  }

  onDrawerCancel(): void {
    const current = this.selectedContact();
    if (current) {
      this.draftStorage.clearDraft(`contact_notes_${current.id}`);
    }
    this.closeModal();
  }

  onClearDraft(): void {
    const current = this.selectedContact();
    if (current) {
      this.draftStorage.clearDraft(`contact_notes_${current.id}`);
      this.editNotes.set(current.adminNotes || '');
      this.hasDraftRestored.set(false);
    }
  }

  closeModal(): void {
    this.selectedContact.set(null);
    this.editNotes.set('');
    this.hasDraftRestored.set(false);
  }

  async saveModalChanges(): Promise<void> {
    const c = this.selectedContact();
    if (!c) {
      return;
    }

    this.isSaving.set(true);
    try {
      const updated = await this.contactsService.updateStatus(c.id, c.status, this.editNotes().trim());
      // Xóa bản nháp khi đã lưu thành công
      this.draftStorage.clearDraft(`contact_notes_${c.id}`);
      this.hasDraftRestored.set(false);

      // Nếu bộ lọc hiện tại khác trạng thái mới cập nhật, loại khỏi danh sách
      const filter = this.selectedStatus();
      if (filter !== 'ALL' && filter !== updated.status) {
        this.contactsList.update(list => list.filter(item => item.id !== updated.id));
      } else {
        this.contactsList.update(list => list.map(item => item.id === updated.id ? updated : item));
      }

      this.closeModal();
    } catch {
      alert('Không thể cập nhật liên hệ. Vui lòng thử lại.');
    } finally {
      this.isSaving.set(false);
    }
  }

  saveNotes(): Promise<void> {
    return this.saveModalChanges();
  }

  updateContactStatus(status: ContactStatus): void {
    const current = this.selectedContact();
    if (current) {
      this.selectedContact.set({ ...current, status });
    }
  }

  updateStatus(status: ContactStatus): void {
    this.updateContactStatus(status);
  }
}
