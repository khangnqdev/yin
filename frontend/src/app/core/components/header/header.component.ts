import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { YinIconComponent } from '../icon/icon.component';
import { ClientAuthService } from '../../services/client-auth.service';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { PwaService } from '../../services/pwa.service';
import { ContactActionBaseComponent } from '../../../shared/components/contact-action/contact-action-base.component';
import { YinContactLinkComponent } from '../../../shared/components/contact-action/contact-link.component';

@Component({
  selector: 'yin-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [RouterLink, RouterLinkActive, YinIconComponent, YinContactLinkComponent]
})
export class YinHeaderComponent extends ContactActionBaseComponent {
  protected readonly clientAuth = inject(ClientAuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  protected readonly pwa = inject(PwaService);

  protected readonly isMobileMenuOpen = signal(false);

  installApp(): void {
    void this.pwa.promptInstall();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  logoutClient(): void {
    this.closeMobileMenu();
    this.clientAuth.logout();
  }

  /**
   * Kế thừa từ ContactActionBaseComponent:
   * Tự động kiểm tra trang hiện tại và hiển thị thông báo nếu đang ở /contact
   */
  onContactClick(event?: Event): void {
    this.handleContactClick(event);
  }
}
