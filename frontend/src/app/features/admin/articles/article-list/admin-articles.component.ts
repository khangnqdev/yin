import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article } from '../../../../core/models/article.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-admin-articles',
  templateUrl: './admin-articles.component.html',
  styleUrls: ['./admin-articles.component.css'],
  imports: [RouterLink, FormsModule, SlicePipe, YinIconComponent]
})
export class AdminArticlesComponent implements OnInit, OnDestroy {
  private readonly db = inject(LocalDbService);
  protected readonly canEdit = () => ['ADMIN', 'MANAGER'].includes(this.db.adminUser()?.role || '');

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedStatus = signal<string>('ALL');

  // Server-side cursor keyset state
  protected readonly articles = signal<Article[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadingMore = signal<boolean>(false);
  protected readonly hasMore = signal<boolean>(false);
  protected readonly nextCursor = signal<string | null>(null);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private currentRequestId = 0;

  async ngOnInit(): Promise<void> {
    await this.loadArticles(true);
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  async loadArticles(isReset = false): Promise<void> {
    const requestId = ++this.currentRequestId;

    if (isReset) {
      this.loading.set(true);
      this.nextCursor.set(null);
    } else {
      this.loadingMore.set(true);
    }

    const cursor = isReset ? '' : (this.nextCursor() || '');
    const status = this.selectedStatus() === 'ALL' ? '' : this.selectedStatus();
    const search = this.searchQuery().trim();

    try {
      const res = status === 'TRASH'
        ? await this.db.getTrashedArticles(search, cursor, 20)
        : await this.db.getAdminArticles(status, '', search, cursor, 20);

      // Bỏ qua nếu có request mới hơn
      if (requestId !== this.currentRequestId) {
        return;
      }

      if (isReset) {
        this.articles.set(res.items || []);
      } else {
        this.articles.update(curr => [...curr, ...(res.items || [])]);
      }

      this.hasMore.set(res.hasMore);
      this.nextCursor.set(res.nextCursor);
    } catch {
      // Giữ dữ liệu đã tải nếu tải trang tiếp bị lỗi
    } finally {
      if (requestId === this.currentRequestId) {
        this.loading.set(false);
        this.loadingMore.set(false);
      }
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      void this.loadArticles(true);
    }, 300);
  }

  setStatus(status: string): void {
    if (this.selectedStatus() === status) return;
    this.selectedStatus.set(status);
    void this.loadArticles(true);
  }

  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore() || !this.nextCursor()) {
      return;
    }
    await this.loadArticles(false);
  }

  async deleteArticle(id: string, title: string): Promise<void> {
    if (!id) {
      return;
    }
    const confirmed = confirm(`Chuyển bài viết "${title}" vào thùng rác? Bạn có thể khôi phục sau.`);
    if (!confirmed) {
      return;
    }
    try { 
      await this.db.deleteArticle(id); 
      // Sau khi xóa tải lại trang đầu để đồng bộ danh sách
      await this.loadArticles(true);
    } catch { 
      alert('Không thể xóa bài viết. Vui lòng thử lại.'); 
    }
  }

  async restoreArticle(id: string): Promise<void> {
    try {
      await this.db.restoreArticle(id);
      await this.loadArticles(true);
    } catch {
      alert('Không thể khôi phục bài viết. Vui lòng thử lại.');
    }
  }
}
