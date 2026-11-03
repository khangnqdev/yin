import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { FooterService } from '../../../core/services/footer.service';

/**
 * Base Component cung cấp logic điều hướng & thông báo thông minh cho trang Liên Hệ.
 * Các component (Header, Footer, CTA,...) có thể kế thừa (extends) để tái sử dụng toàn bộ:
 * - Kiểm tra người dùng có đang ở trang /contact hay không.
 * - Hiển thị popup thông báo nếu người dùng đang ở trang đó mà tiếp tục bấm nút.
 * - Tự động cuộn mượt (smooth scroll) đến biểu mẫu khảo sát liên hệ.
 */
@Component({
  template: ''
})
export abstract class ContactActionBaseComponent {
  protected readonly router = inject(Router);
  protected readonly notificationService = inject(NotificationService);
  protected readonly footerService = inject(FooterService, { optional: true });

  /**
   * Kiểm tra một đường dẫn có phải trang liên hệ hay không
   */
  protected isContactUrl(url: string): boolean {
    if (!url) return false;
    return url === '/contact' || url.startsWith('/contact?') || url.startsWith('/contact#');
  }

  /**
   * Xử lý sự kiện click vào nút/liên kết Liên hệ.
   * Nếu người dùng đang ở /contact:
   *   - Ngăn điều hướng thừa thãi (preventDefault)
   *   - Bắn thông báo trạng thái với đầy đủ thông số liên hệ & nút cuộn tới form
   *   - Trả về true (đã xử lý)
   * Nếu người dùng chưa ở /contact:
   *   - Trả về false để luồng click/routerLink diễn ra bình thường
   */
  protected handleContactClick(event?: Event): boolean {
    const currentUrl = this.router.url;
    if (this.isContactUrl(currentUrl)) {
      if (event) {
        event.preventDefault();
      }
      this.notifyAlreadyOnContact();
      return true;
    }
    return false;
  }

  /**
   * Hiển thị thông báo trạng thái tương tác cao (Interactive Toast & Popup)
   */
  protected notifyAlreadyOnContact(): void {
    const footerCfg = this.footerService?.footerConfig();
    const phone = footerCfg?.contactPhone || '+84 900 123 456';
    const email = footerCfg?.contactEmail || 'contact@yin.vn';
    const address = footerCfg?.contactAddress || 'Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh';

    this.notificationService.showStatus(
      'Bạn đang ở trang Liên hệ rồi!',
      'Bạn hiện đang xem trang Liên Hệ & Khảo Sát Dự Án. Bấm vào đây để xem chi tiết thông tin hướng dẫn và hotline.',
      {
        type: 'info',
        metaText: 'Trang hiện tại',
        detailTitle: 'Bạn Đang Ở Trang Liên Hệ & Khảo Sát Dự Án',
        detailContent: 'Hệ thống nhận thấy bạn đang xem trang Liên Hệ & Khảo Sát Dự Án. Hãy kéo xuống để điền thông tin vào biểu mẫu khảo sát trực tuyến hoặc kết nối trực tiếp với chuyên gia kỹ thuật qua các kênh bên dưới.',
        detailItems: [
          { label: 'Vị Trí Hiện Tại', value: '/contact (Trang Liên Hệ & Khảo Sát)' },
          { label: 'Hotline Kỹ Thuật', value: phone },
          { label: 'Email Tiếp Nhận', value: email },
          { label: 'Văn Phòng', value: address }
        ],
        actions: [
          {
            label: 'Cuộn Đến Biểu Mẫu',
            isPrimary: true,
            onClick: () => {
              this.scrollToContactForm();
            }
          }
        ]
      }
    );
  }

  /**
   * Cuộn mượt đến biểu mẫu liên hệ khảo sát trên trang
   */
  protected scrollToContactForm(): void {
    if (typeof document !== 'undefined') {
      const formEl = document.getElementById('contact-form') || document.querySelector('.contact-actual-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

