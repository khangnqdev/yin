import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article } from '../../../../core/models/article.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import { DynamicPageHostComponent } from '../../../../shared/components/dynamic-page-host/dynamic-page-host.component';

@Component({
  selector: 'yin-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.css'],
  imports: [RouterLink, FormsModule, YinIconComponent, DynamicPageHostComponent]
})
export class BlogListComponent implements OnInit, OnDestroy {
  private readonly db = inject(LocalDbService);

  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCategory = signal<string>('ALL');

  protected readonly pageDoc = computed(() => this.db.getPageDocument('blog'));
  protected readonly headerBlocks = computed(() => this.pageDoc()?.blocks || []);

  // Server-side cursor pagination state
  protected readonly articles = signal<Article[]>([]);
  protected readonly categories = signal<string[]>(['ALL']);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadingMore = signal<boolean>(false);
  protected readonly hasMore = signal<boolean>(false);
  protected readonly nextCursor = signal<string | null>(null);

  protected readonly featuredArticle = computed<Article | null>(() => {
    const list = this.articles();
    return list.length > 0 ? list[0] : null;
  });

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private currentRequestId = 0;

  async ngOnInit(): Promise<void> {
    this.db.recordPageView('/blog', 'direct');
    await Promise.all([
      this.loadCategories(),
      this.loadArticles(true)
    ]);
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  /**
   * Tải danh mục từ server endpoint /api/articles/categories (offset)
   */
  async loadCategories(): Promise<void> {
    try {
      const res = await this.db.getArticleCategories(0, 50);
      if (res?.items) {
        this.categories.set(['ALL', ...res.items]);
      }
    } catch {
      // Giữ mặc định ALL
    }
  }

  /**
   * Tải bài viết theo cursor keyset (server-side filter & search)
   */
  async loadArticles(isReset = false): Promise<void> {
    const requestId = ++this.currentRequestId;
    
    if (isReset) {
      this.loading.set(true);
      this.nextCursor.set(null);
    } else {
      this.loadingMore.set(true);
    }

    const cursor = isReset ? '' : (this.nextCursor() || '');
    const category = this.selectedCategory();
    const search = this.searchQuery().trim();

    try {
      const res = await this.db.getPublicArticles(category, search, cursor, 20);
      
      // Bỏ qua nếu request đã cũ
      if (requestId !== this.currentRequestId) {
        return;
      }

      if (isReset) {
        this.articles.set(res.items || []);
      } else {
        this.articles.update(prev => [...prev, ...(res.items || [])]);
      }

      this.hasMore.set(res.hasMore);
      this.nextCursor.set(res.nextCursor);
    } catch {
      // Giữ nguyên dữ liệu đã tải nếu tải tiếp bị lỗi
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
    // Debounce tìm kiếm 300ms theo đúng contract chung
    this.searchDebounceTimer = setTimeout(() => {
      void this.loadArticles(true);
    }, 300);
  }

  setCategory(cat: string): void {
    if (this.selectedCategory() === cat) return;
    this.selectedCategory.set(cat);
    void this.loadArticles(true);
  }

  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore() || !this.nextCursor()) {
      return;
    }
    await this.loadArticles(false);
  }
}
