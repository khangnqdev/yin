import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { YinIconComponent } from '../icon/icon.component';
import { ContactActionBaseComponent } from '../../../shared/components/contact-action/contact-action-base.component';

@Component({
  selector: 'yin-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  imports: [RouterLink, YinIconComponent]
})
export class YinFooterComponent extends ContactActionBaseComponent {
  protected readonly config = this.footerService!.footerConfig;
  protected readonly currentYear = new Date().getFullYear();

  /**
   * Kế thừa từ ContactActionBaseComponent:
   * Kiểm tra nếu là liên kết /contact thì tự động bắt sự kiện và thông báo nếu đang ở trang liên hệ
   */
  onLinkClick(url: string, event?: Event): void {
    if (this.isContactUrl(url)) {
      this.handleContactClick(event);
    }
  }
}
