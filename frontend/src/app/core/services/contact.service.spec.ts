import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Contact } from '../models/contact.model';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let http: HttpTestingController;

  const contact: Contact = {
    id: 'contact-1', fullName: 'Test Person', email: 'test@example.com', phone: '0901234567',
    projectType: 'Web', budgetRange: '200M - 500M', message: 'Please contact me',
    status: 'NEW', createdAt: '2026-11-03T00:00:00Z', updatedAt: '2026-11-03T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('updates the admin list and pending count after a successful HTTP response', async () => {
    service.setFromBootstrap([contact]);
    expect(service.pendingCount()).toBe(1);

    const promise = service.updateStatus(contact.id, 'CONTACTED', 'Called client');
    const request = http.expectOne('/api/admin/contacts/contact-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'CONTACTED', adminNotes: 'Called client' });
    request.flush({ ...contact, status: 'CONTACTED', adminNotes: 'Called client' });

    await promise;
    expect(service.contacts()[0].status).toBe('CONTACTED');
    expect(service.pendingCount()).toBe(0);
  });

  it('keeps the existing signal value when the server rejects an update', async () => {
    service.setFromBootstrap([contact]);
    const promise = service.updateStatus(contact.id, 'CLOSED');
    http.expectOne('/api/admin/contacts/contact-1').flush(
      { message: 'Request failed' }, { status: 500, statusText: 'Server Error' }
    );
    await expect(promise).rejects.toBeTruthy();
    expect(service.contacts()[0].status).toBe('NEW');
  });
});
