import { TestBed } from '@angular/core/testing';
import { PwaService } from './pwa.service';
import { NotificationService } from './notification.service';

describe('PwaService', () => {
  let service: PwaService;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PwaService,
        NotificationService
      ]
    });
    service = TestBed.inject(PwaService);
    notificationService = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose signal states for standalone, installable, and ios', () => {
    expect(typeof service.isStandalone()).toBe('boolean');
    expect(typeof service.isInstallable()).toBe('boolean');
    expect(typeof service.isIos()).toBe('boolean');
  });

  it('should trigger promptInstall without throwing', async () => {
    await expect(service.promptInstall()).resolves.not.toThrow();
  });
});

