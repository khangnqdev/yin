import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article } from '../../../../core/models/article.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import {
  YinDataTableComponent,
  YinCellDefDirective,
  TableColumn,
  TableFilter,
} from '../../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'yin-admin-articles',
  templateUrl: './admin-articles.component.html',
  styleUrls: ['./admin-articles.component.css'],
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    YinIconComponent,
    YinDataTableComponent,
    YinCellDefDirective,
  ],
})
export class AdminArticlesComponent implements OnInit, OnDestroy {
  private readonly db = inject(LocalDbService);
  private readonly router = inject(Router);

  protected readonly canEdit = () => ['ADMIN', 'MANAGER'].includes(this.db.adminUser()?.role || '');

  protected readonly articles = signal<Article[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedStatus = signal<string>('ALL');
  protected readonly selectedCategory = signal<string>('ALL');
  protected readonly availableCategories = signal<string[]>([]);

  // Pagination state
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = signal<number>(15);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private currentRequestId = 0;

  public readonly columns: TableColumn<Article>[] = [
    { key: 'title', label: 'Tiêu đề', icon: 'file-text', width: '320px', sortable: true },
    { key: 'focusKeyword', label: 'Từ khóa', icon: 'search', width: '160px', sortable: true },
    { key: 'category', label: 'Mục', icon: 'folder', width: '130px', sortable: true },
    { key: 'status', label: 'Trạng thái', icon: 'check-circle', width: '150px', sortable: true },
    { key: 'readingTimeMinutes', label: 'Thời gian đọc ước tính', icon: 'clock', width: '190px', sortable: true, align: 'center' },
    { key: 'viewCount', label: 'Lượt xem', icon: 'eye', width: '110px', sortable: true, align: 'right' },
    { key: 'createdAt', label: 'Ngày tạo', icon: 'calendar', width: '150px', sortable: true },
    { key: 'actions', label: 'Thao tác', icon: 'settings', width: '160px', align: 'center' },
  ];

  protected readonly filterPills = computed<TableFilter[]>(() => {
    const filters: TableFilter[] = [
      {
        id: 'status',
        label: 'Trạng thái',
        icon: 'check-circle',
        activeValue: this.selectedStatus(),
        options: [
          { label: 'Tất cả trạng thái', value: 'ALL' },
          { label: 'Đã xuất bản', value: 'PUBLISHED' },
          { label: 'Bản nháp', value: 'DRAFT' },
          { label: 'Lưu trữ', value: 'ARCHIVED' },
          { label: 'Thùng rác', value: 'TRASH' },
        ],
      },
    ];

    const cats = this.availableCategories();
    if (cats.length > 0) {
      filters.push({
        id: 'category',
        label: 'Mục',
        icon: 'folder',
        activeValue: this.selectedCategory(),
        options: [
          { label: 'Tất cả các mục', value: 'ALL' },
          ...cats.map((c) => ({ label: c, value: c })),
        ],
      });
    }

    return filters;
  });

  protected readonly filteredArticles = computed<Article[]>(() => {
    let list = this.articles();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    if (cat && cat !== 'ALL') {
      list = list.filter((a) => a.category?.toLowerCase() === cat.toLowerCase());
    }

    if (query) {
      list = list.filter((a) =>
        a.title.toLowerCase().includes(query) ||
        (a.focusKeyword && a.focusKeyword.toLowerCase().includes(query)) ||
        a.slug.toLowerCase().includes(query) ||
        (a.category && a.category.toLowerCase().includes(query))
      );
    }
    return list;
  });

  async ngOnInit(): Promise<void> {
    void this.loadCategories();
    await this.loadArticles();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      const res = await this.db.getArticleCategories(0, 100);
      if (res?.items) {
        this.availableCategories.set(res.items);
      }
    } catch {
      // Fallback: extract distinct from current articles
    }
  }

  async loadArticles(): Promise<void> {
    const requestId = ++this.currentRequestId;
    this.loading.set(true);

    const status = this.selectedStatus() === 'ALL' ? '' : this.selectedStatus();
    const search = this.searchQuery().trim();

    try {
      const res = status === 'TRASH'
        ? await this.db.getTrashedArticles(search, '', 100)
        : await this.db.getAdminArticles(status, '', search, '', 100);

      if (requestId !== this.currentRequestId) {
        return;
      }

      const items = res.items || [];
      this.articles.set(items);

      // Collect distinct categories if not yet set
      if (!this.availableCategories().length) {
        const set = new Set<string>();
        items.forEach((a) => {
          if (a.category) set.add(a.category);
        });
        if (set.size > 0) {
          this.availableCategories.set(Array.from(set));
        }
      }
    } catch {
      // Giữ dữ liệu hiện thời nếu gặp lỗi kết nối
    } finally {
      if (requestId === this.currentRequestId) {
        this.loading.set(false);
      }
    }
  }

  onFilterChange(evt: { id: string; value: any }): void {
    if (evt.id === 'status') {
      if (this.selectedStatus() !== evt.value) {
        this.selectedStatus.set(evt.value);
        this.currentPage.set(1);
        void this.loadArticles();
      }
    } else if (evt.id === 'category') {
      this.selectedCategory.set(evt.value);
      this.currentPage.set(1);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      void this.loadArticles();
    }, 300);
  }

  navigateToCreate(): void {
    void this.router.navigate(['/admin/articles/create']);
  }

  getStatusLabel(status: string): string {
    if (this.selectedStatus() === 'TRASH') return 'Đã xóa';
    switch (status) {
      case 'PUBLISHED':
        return 'Đã xuất bản';
      case 'DRAFT':
        return 'Bản nháp';
      case 'ARCHIVED':
        return 'Lưu trữ';
      default:
        return status;
    }
  }

  async deleteArticle(id: string, title: string): Promise<void> {
    if (!id) return;
    const confirmed = confirm(`Chuyển bài viết "${title}" vào thùng rác? Bạn có thể khôi phục sau.`);
    if (!confirmed) return;

    try {
      await this.db.deleteArticle(id);
      await this.loadArticles();
    } catch {
      alert('Không thể xóa bài viết. Vui lòng thử lại.');
    }
  }

  async restoreArticle(id: string): Promise<void> {
    try {
      await this.db.restoreArticle(id);
      await this.loadArticles();
    } catch {
      alert('Không thể khôi phục bài viết. Vui lòng thử lại.');
    }
  }

  onExportCsv(): void {
    const items = this.filteredArticles();
    if (!items.length) {
      alert('Không có dữ liệu để xuất file.');
      return;
    }

    const headers = ['ID', 'Tiêu đề', 'Từ khóa', 'Mục', 'Trạng thái', 'Thời gian đọc (phút)', 'Lượt xem', 'Ngày tạo', 'Đường dẫn'];
    const rows = items.map((a) => [
      `"${a.id}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${(a.focusKeyword || '').replace(/"/g, '""')}"`,
      `"${(a.category || '').replace(/"/g, '""')}"`,
      `"${a.status}"`,
      a.readingTimeMinutes || 1,
      a.viewCount || 0,
      `"${a.createdAt}"`,
      `"/blog/${a.slug}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh-sach-bai-viet-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
