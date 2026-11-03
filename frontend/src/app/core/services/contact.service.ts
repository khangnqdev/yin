import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Contact, ContactCreateDto, ContactStatus } from '../models/contact.model';
import { CursorPage } from '../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly contactsState = signal<Contact[]>([]);

  readonly contacts = this.contactsState.asReadonly();
  readonly pendingCount = computed(() => this.contacts().filter(contact => contact.status === 'NEW').length);

  setFromBootstrap(contacts: Contact[]): void {
    if (Array.isArray(contacts)) {
      this.contactsState.set(contacts);
    }
  }

  clear(): void {
    this.contactsState.set([]);
  }

  /**
   * Lấy danh sách liên hệ theo cursor keyset (server-side search, status, cursor)
   */
  async getAdminContacts(
    status = '', 
    search = '', 
    cursor = '', 
    size = 20
  ): Promise<CursorPage<Contact>> {
    let params = new HttpParams().set('size', String(size));
    if (status.trim() && status.trim() !== 'ALL') {
      params = params.set('status', status.trim());
    }
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (cursor) {
      params = params.set('cursor', cursor);
    }

    const res = await firstValueFrom(this.http.get<CursorPage<Contact>>('/api/admin/contacts', { params }));
    return res;
  }

  async create(dto: ContactCreateDto): Promise<void> {
    await firstValueFrom(this.http.post<{ id: string }>('/api/contacts', dto));
  }

  async updateStatus(id: string, status: ContactStatus, adminNotes = ''): Promise<Contact> {
    const updated = await firstValueFrom(this.http.put<Contact>(
      `/api/admin/contacts/${encodeURIComponent(id)}`, { status, adminNotes }
    ));
    this.contactsState.update(current => current.map(contact => contact.id === id ? updated : contact));
    return updated;
  }
}
