import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { YinHeaderComponent } from './core/components/header/header.component';
import { YinFooterComponent } from './core/components/footer/footer.component';
import { YinNotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';
import { LocalDbService } from './core/services/local-db.service';
import { SeoService } from './core/services/seo.service';
import { TranslateContentDirective } from './core/services/translate-content.directive';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  imports: [RouterOutlet, YinHeaderComponent, YinFooterComponent, YinNotificationToastComponent, TranslateContentDirective]
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);
  protected readonly db = inject(LocalDbService);
  protected readonly isAdminRoute = signal<boolean>(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  );

  ngOnInit(): void {
    // 1. Kích hoạt bộ quản lý SEO & dynamic Title/Description cho toàn bộ routes
    this.seoService.init();

    // 2. Kiểm tra route ban đầu cho thanh layout
    this.updateAdminStatus(this.router.url);

    // 3. Lắng nghe sự kiện chuyển trang
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: unknown) => {
        const navEvent = event as NavigationEnd;
        this.updateAdminStatus(navEvent.urlAfterRedirects);
        if (typeof window !== 'undefined') {
          window.scrollTo(0, 0);
        }
      });
  }

  private updateAdminStatus(url?: string): void {
    const path = url || (typeof window !== 'undefined' ? window.location.pathname : '');
    this.isAdminRoute.set(path.startsWith('/admin'));
  }
}
