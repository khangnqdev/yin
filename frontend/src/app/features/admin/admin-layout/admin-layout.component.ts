import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocalDbService } from '../../../core/services/local-db.service';
import { ThemeService } from '../../../core/services/theme.service';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, YinIconComponent]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  protected readonly db = inject(LocalDbService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly adminUser = this.db.adminUser;
  private sessionTimer?: ReturnType<typeof setInterval>;

  private readonly onVisible = () => {
    if (document.visibilityState === 'visible') void this.checkSession();
  };

  ngOnInit(): void {
    if (typeof window === 'undefined') return;
    this.sessionTimer = setInterval(() => void this.checkSession(), 15_000);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  ngOnDestroy(): void {
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
  }

  private async checkSession(): Promise<void> {
    if (!this.db.token()) return;
    try {
      await this.db.refreshAdminSession();
      this.db.loadError.set('');
    } catch (error) {
      if (this.db.token()) this.db.loadError.set('Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau.');
    }
  }
  protected readonly isCollapsed = signal<boolean>(this.getStoredCollapsedState());
  protected readonly isDashboardOpen = signal<boolean>(true);
  protected readonly isProfileMenuOpen = signal<boolean>(false);
  protected readonly isFlyoutHovered = signal<boolean>(false);
  protected readonly searchQuery = signal<string>('');

  private getStoredCollapsedState(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('yin_sidebar_collapsed') === 'true';
  }

  toggleCollapse(): void {
    this.isCollapsed.update(collapsed => {
      const next = !collapsed;
      if (typeof window !== 'undefined') {
        localStorage.setItem('yin_sidebar_collapsed', String(next));
      }
      return next;
    });
  }

  toggleDashboard(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isDashboardOpen.update(open => !open);
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isProfileMenuOpen.update(open => !open);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  showFlyout(): void {
    if (this.isCollapsed()) {
      this.isFlyoutHovered.set(true);
    }
  }

  hideFlyout(): void {
    this.isFlyoutHovered.set(false);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.db.logout();
    void this.router.navigate(['/admin/login']);
  }
}
