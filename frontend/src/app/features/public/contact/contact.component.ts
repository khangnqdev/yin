import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LocalDbService } from '../../../core/services/local-db.service';
import { ContactService } from '../../../core/services/contact.service';
import { AnalyticsTrackerService } from '../../../core/services/analytics-tracker.service';
import { DynamicPageHostComponent } from '../../../shared/components/dynamic-page-host/dynamic-page-host.component';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  imports: [FormsModule, DynamicPageHostComponent, YinIconComponent]
})
export class ContactComponent implements OnInit {
  private readonly db = inject(LocalDbService);
  private readonly contacts = inject(ContactService);
  private readonly tracker = inject(AnalyticsTrackerService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly pageDoc = computed(() => this.db.getPageDocument('contact'));
  protected readonly headerBlocks = computed(() => this.pageDoc()?.blocks || []);

  // Form Fields Reactive Signals
  protected readonly fullName = signal<string>('');
  protected readonly email = signal<string>('');
  protected readonly phone = signal<string>('');
  protected readonly companyName = signal<string>('');
  protected readonly projectType = signal<string>('Hệ thống Web & Mobile Doanh nghiệp');
  protected readonly budgetRange = signal<string>('200M - 500M VNĐ');
  protected readonly message = signal<string>('');
  
  // Security Honeypot (Chống bot spam)
  protected readonly honeypot = signal<string>('');
  private formOpenTimestamp: number = 0;

  // Status Signals
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly isSuccess = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');

  // Thông Tin Địa Chỉ & Bản Đồ Google Maps
  protected readonly officeAddress = signal<string>('Khu Công Nghệ Cao, Xa lộ Hà Nội, TP. Thủ Đức, TP. Hồ Chí Minh');
  protected readonly officeLabel = signal<string>('Văn Phòng Kỹ Nghệ Công Nghệ Yin');
  protected readonly isCopied = signal<boolean>(false);

  // Link chỉ đường mở trực tiếp ứng dụng Google Maps
  protected readonly googleMapsDirectionsUrl = computed(() => {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(this.officeAddress())}`;
  });

  // URL nhúng bản đồ Google Maps (không cần API key, nhẹ và bảo mật)
  protected readonly safeEmbedUrl = computed<SafeResourceUrl>(() => {
    const query = encodeURIComponent(`${this.officeLabel()} ${this.officeAddress()}`);
    const url = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    this.formOpenTimestamp = Date.now();
    this.db.recordPageView('/contact', 'direct');
    this.tracker.initTargetTracking('page_contact', 'Trang Liên Hệ');
  }

  async copyAddress(): Promise<void> {
    if (!navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.officeAddress());
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2500);
    } catch {
      // Early return nếu clipboard bị từ chối quyền
    }
  }

  async submitContactForm(): Promise<void> {
    this.errorMessage.set('');

    // 1. Early Return kiểm tra Honeypot (Nếu bot điền trường này -> chặn ngay)
    if (this.honeypot().trim().length > 0) {
      this.isSuccess.set(true);
      return;
    }

    // 2. Early Return kiểm tra thời gian gửi form (quá nhanh dưới 1.5s là bot tự động)
    const elapsedSeconds = (Date.now() - this.formOpenTimestamp) / 1000;
    if (elapsedSeconds < 1.5) {
      this.errorMessage.set('Thao tác quá nhanh, vui lòng kiểm tra lại thông tin.');
      return;
    }

    // 3. Early Return kiểm tra tính hợp lệ của trường bắt buộc
    const name = this.fullName().trim();
    const mail = this.email().trim();
    const tel = this.phone().trim();
    const msg = this.message().trim();

    if (!name || !mail || !tel || !msg) {
      this.errorMessage.set('Vui lòng điền đầy đủ họ tên, email, số điện thoại và nội dung lời nhắn.');
      return;
    }

    // 4. Early Return kiểm tra format email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      this.errorMessage.set('Địa chỉ email không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      await this.contacts.create({
        fullName: name,
        email: mail,
        phone: tel,
        companyName: this.companyName().trim(),
        projectType: this.projectType(),
        budgetRange: this.budgetRange(),
        message: msg
      });
      this.isSuccess.set(true);
    } catch {
      this.errorMessage.set('Không thể gửi liên hệ. Vui lòng đợi một lát và thử lại.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    this.fullName.set('');
    this.email.set('');
    this.phone.set('');
    this.companyName.set('');
    this.message.set('');
    this.isSuccess.set(false);
    this.formOpenTimestamp = Date.now();
  }
}
