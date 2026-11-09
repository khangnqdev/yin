import { Injectable, inject, signal } from '@angular/core';
import { NotificationService } from './notification.service';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private readonly notification = inject(NotificationService);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  public readonly isInstallable = signal<boolean>(false);
  public readonly isStandalone = signal<boolean>(false);
  public readonly isIos = signal<boolean>(false);

  constructor() {
    this.detectEnvironment();
    this.initInstallPromptListener();
  }

  private detectEnvironment(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 1. Kiểm tra xem web có đang mở dưới dạng In-App (Standalone) không
    const isStandaloneDisplay =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;
    const isIosStandalone =
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
    this.isStandalone.set(isStandaloneDisplay || isIosStandalone);

    // 2. Nhận diện thiết bị iOS
    const ua = (window.navigator?.userAgent || '').toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    this.isIos.set(isIosDevice);

    // Nếu là iOS và chưa ở chế độ standalone, hiển thị khả năng cài đặt
    if (isIosDevice && !this.isStandalone()) {
      this.isInstallable.set(true);
    }
  }

  private initInstallPromptListener(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }

    // Lắng nghe sự kiện trước khi cài đặt PWA trên Chromium (Android/Chrome/Edge)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.isInstallable.set(true);
    });

    // Lắng nghe khi người dùng đã cài đặt thành công
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstallable.set(false);
      this.isStandalone.set(true);
      this.notification.success(
        'Đã cài đặt ứng dụng Yin!',
        'Biểu tượng Yin đã xuất hiện trên màn hình điện thoại của bạn. Bạn có thể mở trực tiếp dưới dạng in-app bất cứ lúc nào.',
      );
    });
  }

  /**
   * Kích hoạt cài đặt ứng dụng hoặc hướng dẫn lưu vào màn hình chính (In-App)
   */
  public async promptInstall(): Promise<void> {
    // 1. Đã chạy trong chế độ In-App
    if (this.isStandalone()) {
      this.notification.info(
        'Đang chạy chế độ In-App',
        'Website Yin hiện đang chạy trực tiếp dưới dạng ứng dụng độc lập (In-App) trên thiết bị của bạn.',
        {
          detailTitle: 'Trạng Thái In-App Hoạt Động',
          detailContent:
            'Ứng dụng Yin đã được cấu hình toàn màn hình không thanh địa chỉ, tối ưu tài nguyên và hiệu năng cao nhất.',
          detailItems: [
            { label: 'Chế độ hiển thị', value: 'Standalone (In-App)' },
            { label: 'Nền tảng', value: 'Yin Platform Progressive Web App' },
          ],
        },
      );
      return;
    }

    // 2. Nếu có deferredPrompt (Android / Chrome)
    if (this.deferredPrompt) {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.deferredPrompt = null;
        this.isInstallable.set(false);
      }
      return;
    }

    // 3. Nếu là thiết bị iOS (iPhone / iPad Safari)
    if (this.isIos()) {
      this.notification.info(
        'Cách lưu ứng dụng Yin (In-App) trên iPhone/iPad',
        'Để mở Yin dưới dạng ứng dụng in-app không có thanh địa chỉ trình duyệt:',
        {
          detailTitle: 'Hướng Dẫn Thêm Vào Màn Hình Chính (iOS Safari)',
          detailContent:
            'Hệ điều hành iOS hỗ trợ lưu website thành ứng dụng native mượt mà thông qua Safari:',
          detailItems: [
            {
              label: 'Bước 1',
              value:
                'Nhấn vào biểu tượng Chia sẻ (ô vuông có mũi tên trỏ lên) ở thanh dưới cùng Safari.',
            },
            {
              label: 'Bước 2',
              value: 'Kéo danh sách xuống và chọn "Thêm vào MH chính" (Add to Home Screen).',
            },
            {
              label: 'Bước 3',
              value:
                'Nhấn "Thêm" (Add) ở góc trên bên phải. Icon Yin sẽ xuất hiện ngoài màn hình chính của bạn.',
            },
          ],
        },
      );
      return;
    }

    // 4. Các trình duyệt khác (Android Chrome chưa kích hoạt prompt hoặc Desktop)
    this.notification.info(
      'Cài đặt ứng dụng Yin',
      'Bạn có thể lưu Yin vào màn hình chính điện thoại bằng cách bấm vào menu (dấu 3 chấm) của trình duyệt và chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".',
      {
        detailTitle: 'Lưu Điểm Truy Cập In-App',
        detailContent:
          'Web app Yin hỗ trợ chuẩn PWA Standalone. Khi lưu ra màn hình chính, web sẽ chạy độc lập như app cài từ store.',
        detailItems: [
          {
            label: 'Chrome / Edge Android',
            value: 'Bấm menu 3 chấm (⋮) > Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính"',
          },
          { label: 'Safari iOS', value: 'Bấm nút Chia sẻ > Chọn "Thêm vào MH chính"' },
        ],
      },
    );
  }
}
