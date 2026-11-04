import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-privacy',
  imports: [RouterLink, YinIconComponent],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css']
})
export class PrivacyComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly acceptedNotice = signal(false);
  protected readonly activeTab = signal<'all' | 'collection' | 'storage' | 'usage' | 'transfer' | 'deletion'>('all');

  protected setActiveTab(tab: 'all' | 'collection' | 'storage' | 'usage' | 'transfer' | 'deletion'): void {
    this.activeTab.set(tab);
  }

  protected confirmAcceptance(): void {
    this.acceptedNotice.set(true);
    // Nếu có query param từ trang đăng ký thì điều hướng lại về /register
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      setTimeout(() => {
        this.router.navigateByUrl(returnUrl);
      }, 600);
    }
  }

  protected scrollToStage(id: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

