import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalDbService } from '../../../core/services/local-db.service';
import { ContactService } from '../../../core/services/contact.service';
import { Article } from '../../../core/models/article.model';
import { Contact } from '../../../core/models/contact.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  imports: [RouterLink, YinIconComponent]
})
export class AdminDashboardComponent implements OnInit {
  private readonly db = inject(LocalDbService);
  private readonly contactService = inject(ContactService);

  protected readonly summary = computed(() => this.db.getAnalyticsSummary());
  protected readonly canManageContent = () => this.db.hasPermission('articles:WRITE');
  protected readonly recentContacts = signal<Contact[]>([]);
  protected readonly topArticles = signal<Article[]>([]);

  protected readonly maxDailyView = computed(() => {
    const views = this.summary().dailyViews.map(d => d.views);
    return Math.max(...views, 10);
  });

  async ngOnInit(): Promise<void> {
    try {
      const artRes = await this.db.getAdminArticles('', '', '', '', 5);
      this.topArticles.set(artRes?.items || []);
      if (this.canManageContent()) {
        const contactRes = await this.contactService.getAdminContacts('', '', '', 5);
        this.recentContacts.set(contactRes?.items || []);
      }
    } catch {
      // Giữ mảng rỗng nếu chưa tải được
    }
  }
}
