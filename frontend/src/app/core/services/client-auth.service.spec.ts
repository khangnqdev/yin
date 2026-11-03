import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ClientAuthService } from './client-auth.service';

describe('ClientAuthService', () => {
  let service: ClientAuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ClientAuthService,
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ClientAuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('should initialize with no token and not logged in', () => {
    expect(service.token()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('should register client successfully', async () => {
    const mockProfile = {
      id: 'test-uuid-1',
      username: 'client_tech',
      email: 'client@yin.vn',
      phone: '+84 901 234 567',
      dateOfBirth: '1995-10-10',
      receiveUpdates: true,
      role: 'CLIENT' as const,
      createdAt: '2026-11-02T00:00:00Z'
    };

    const promise = service.register({
      username: 'client_tech',
      email: 'client@yin.vn',
      password: 'password123456',
      phone: '+84 901 234 567',
      dateOfBirth: '1995-10-10',
      receiveUpdates: true
    });

    const req = httpTesting.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush(mockProfile);

    const result = await promise;
    expect(result.username).toBe('client_tech');
    expect(result.role).toBe('CLIENT');
  });

  it('should log in client, store token in sessionStorage and update signals', async () => {
    const mockAuthResponse = {
      token: 'jwt-client-token-xyz',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: 'test-uuid-1',
        username: 'client_tech',
        role: 'CLIENT' as const
      }
    };

    const mockProfile = {
      id: 'test-uuid-1',
      username: 'client_tech',
      email: 'client@yin.vn',
      phone: '+84 901 234 567',
      dateOfBirth: '1995-10-10',
      receiveUpdates: true,
      role: 'CLIENT' as const,
      createdAt: '2026-11-02T00:00:00Z'
    };

    const promise = service.login({
      username: 'client_tech',
      password: 'password123456'
    });

    const req = httpTesting.expectOne('/api/auth/client/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    // Cho phép microtask chạy để trigger loadProfile
    await Promise.resolve();

    const profileReq = httpTesting.expectOne('/api/client/me');
    expect(profileReq.request.method).toBe('GET');
    profileReq.flush(mockProfile);

    const res = await promise;
    expect(res.token).toBe('jwt-client-token-xyz');
    expect(service.isLoggedIn()).toBe(true);
    expect(sessionStorage.getItem('yin_client_token')).toBe('jwt-client-token-xyz');
  });

  it('should clear token and user on logout', () => {
    sessionStorage.setItem('yin_client_token', 'token-123');
    service.token.set('token-123');

    service.logout();

    expect(sessionStorage.getItem('yin_client_token')).toBeNull();
    expect(service.token()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });
});
