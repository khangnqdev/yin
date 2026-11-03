import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../../core/services/contact.service';
import { DraftStorageService } from '../../../core/services/draft-storage.service';
import { Contact, ContactStatus } from '../../../core/models/contact.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';
import { YinSlideDrawerComponent } from '../../../shared/components/slide-drawer/slide-drawer.component';

@Component({
  selector: 'yin-admin-contacts',
  templateUrl: './admin-contacts.component.html',
  styleUrls: ['./admin-contacts.component.css'],
  imports: [FormsModule, YinIconComponent, YinSlideDrawerComponent]
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
