import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocalDbService } from '../../../core/services/local-db.service';
import { ScrollDropOffRecord } from '../../../core/models/analytics.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css'],
  imports: [DatePipe, YinIconComponent]
})
export class AdminAnalyticsComponent implements OnInit {
  private readonly db = inject(LocalDbService);

  protected readonly summary = computed(() => this.db.getAnalyticsSummary());

  // Server-side cursor keyset reading sessions
  protected readonly readingSessions = signal<ScrollDropOffRecord[]>([]);
  protected readonly loadingSessions = signal<boolean>(true);
  protected readonly loadingMore = signal<boolean>(false);
  protected readonly hasMore = signal<boolean>(false);
  protected readonly nextCursor = signal<string | null>(null);

  // Tính phần trăm phễu
  protected readonly funnelPercentages = computed(() => {
    const f = this.summary().funnel;
    const total = Math.max(1, f.totalReaders);

    return {
      p25: Math.round((f.reached25 / total) * 100),
      p50: Math.round((f.reached50 / total) * 100),
      p75: Math.round((f.reached75 / total) * 100),
      p100: Math.round((f.completed100 / total) * 100)
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadReadingSessions(true);
  }

  async loadReadingSessions(isReset = false): Promise<void> {
    if (isReset) {
      this.loadingSessions.set(true);
      this.nextCursor.set(null);
    } else {
      this.loadingMore.set(true);
    }

    const cursor = isReset ? '' : (this.nextCursor() || '');

    try {
      const res = await this.db.getReadingSessions(cursor, 20);
      if (isReset) {
        this.readingSessions.set(res.items || []);
      } else {
        this.readingSessions.update(curr => [...curr, ...(res.items || [])]);
      }
      this.hasMore.set(res.hasMore);
      this.nextCursor.set(res.nextCursor);
    } catch {
      // Giữ dữ liệu hiện tại nếu lỗi
    } finally {
      this.loadingSessions.set(false);
      this.loadingMore.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore() || !this.nextCursor()) {
      return;
    }
    await this.loadReadingSessions(false);
  }
}
