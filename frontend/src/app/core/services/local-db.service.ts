import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Article } from '../models/article.model';
import { ContactService } from './contact.service';
import { DynamicBlock, PageDocument, PageKey } from '../models/page-block.model';
import { AnalyticsSummary, ScrollDropOffRecord } from '../models/analytics.model';
import { OffsetPage, CursorPage } from '../models/pagination.model';

interface AdminBootstrap {
  summary: AnalyticsSummary;
}

@Injectable({ providedIn: 'root' })
export class LocalDbService {
  private readonly http = inject(HttpClient);
  private readonly contactService = inject(ContactService);
  private readonly router = inject(Router);
  private readonly tokenKey = 'yin_admin_token';
  private readonly adminUserKey = 'yin_admin_user';

  // Signals reactive state
  readonly isNavbarHidden = signal<boolean>(false);
  readonly articles = signal<Article[]>([]);
  readonly contacts = this.contactService.contacts;
  readonly pages = signal<Record<PageKey, PageDocument>>({} as Record<PageKey, PageDocument>);
  readonly readingSessions = signal<ScrollDropOffRecord[]>([]);
  readonly loadError = signal<string>('');
  readonly adminUser = signal<{ id: string; username: string; role: string } | null>(
    this.getStoredAdminUser(),
  );
  readonly adminSession = signal<{ role: string; rank: number; permissions: string[] } | null>(null);
  readonly reauthMessage = signal('');
  private readonly sessionChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('yin-admin-session') : null;

  constructor() {
    if (this.sessionChannel) this.sessionChannel.onmessage = event => {
      if (event.data === 'reauth' && this.token()) {
        this.requireReauthentication(false);
        void this.router.navigate(['/admin/login']);
      }
    };
  }
  readonly summary = signal<AnalyticsSummary>({
    totalPageViews: 0,
    uniqueVisitors: 0,
    totalArticles: 0,
    totalContacts: 0,
    funnel: { totalReaders: 0, reached25: 0, reached50: 0, reached75: 0, completed100: 0 },
    exitBlocks: [],
    dailyViews: [],
  });
  readonly publishedArticles = computed(() =>
    this.articles().filter((article) => article.status === 'PUBLISHED'),
  );
  readonly pendingContactsCount = this.contactService.pendingCount;

  private getStoredAdminUser(): { id: string; username: string; role: string } | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(this.adminUserKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Tải dữ liệu trang chủ công khai (Offset cho pages, Cursor cho articles)
   */
  async loadPublic(): Promise<void> {
    try {
      const [pagesRes, articlesRes] = await Promise.all([
        firstValueFrom(this.http.get<OffsetPage<PageDocument>>('/api/pages?page=0&size=20')),
        firstValueFrom(this.http.get<CursorPage<Article>>('/api/articles?size=20')),
      ]);
      const pageItems = pagesRes?.items || [];
      const articleItems = articlesRes?.items || [];
      this.pages.set(
        Object.fromEntries(pageItems.map((page) => [page.pageKey, page])) as Record<
          PageKey,
          PageDocument
        >,
      );
      this.articles.set(articleItems);
      this.loadError.set('');
    } catch {
      this.loadError.set('Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau.');
    }
  }

  /**
   * Tải summary bootstrap cho admin (BE mới chỉ trả về { summary })
   */
  async loadAdmin(): Promise<boolean> {
    if (!this.token()) return false;
    try {
      await this.refreshAdminSession();
      if (this.hasPermission('dashboard:READ')) {
        const result = await firstValueFrom(this.http.get<AdminBootstrap>('/api/admin/bootstrap'));
        if (result?.summary) this.summary.set(result.summary);
      }
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) this.requireReauthentication();
      if (error instanceof HttpErrorResponse && error.status === 503) {
        this.loadError.set('Chức năng quản trị đang bị lỗi hệ thống. Vui lòng thử lại sau.');
        return true;
      }
      return false;
    }
  }

  async refreshAdminSession(): Promise<void> {
    const session = await firstValueFrom(this.http.get<{ role: string; rank: number; permissions: string[] }>('/api/admin/session'));
    this.adminSession.set(session);
  }

  hasPermission(permission: string): boolean {
    return this.adminSession()?.permissions.includes(permission) ?? false;
  }

  requireReauthentication(broadcast = true): void {
    this.reauthMessage.set('Quyền truy cập hoặc phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.');
    this.logout();
    if (broadcast) this.sessionChannel?.postMessage('reauth');
  }

  async login(username: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<{ token: string; user?: { id: string; username: string; role: string } }>(
        '/api/auth/admin/login',
        { username, password },
      ),
    );
    sessionStorage.setItem(this.tokenKey, result.token);
    this.reauthMessage.set('');
    if (result.user) {
      sessionStorage.setItem(this.adminUserKey, JSON.stringify(result.user));
      this.adminUser.set(result.user);
    }
  }

  logout(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.adminUserKey);
    this.adminUser.set(null);
    this.adminSession.set(null);
    this.contactService.clear();
    this.readingSessions.set([]);
    void this.loadPublic();
  }

  token(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }
  isLoggedIn(): boolean {
    return !!this.token();
  }

  // Synchronous cache getters
  getArticleBySlug(slug: string): Article | null {
    return (
      this.articles().find((article) => article.slug === slug && article.status === 'PUBLISHED') ??
      null
    );
  }
  getArticleById(id: string): Article | null {
    return this.articles().find((article) => article.id === id) ?? null;
  }
  getPageDocument(key: PageKey): PageDocument | null {
    const inMem = this.pages()[key];
    if (inMem) return inMem;
    const local = this.getPersistedPageLocal(key);
    if (local) {
      this.pages.update((curr) => ({ ...curr, [key]: local }));
      return local;
    }
    return null;
  }
  getAnalyticsSummary(): AnalyticsSummary {
    return this.summary();
  }

  /**
   * Quản lý bộ nhớ đệm trang cục bộ (LocalStorage) để đảm bảo đồng bộ WYSIWYG
   */
  private persistPageLocal(key: PageKey, doc: PageDocument): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('yin_page_' + key, JSON.stringify(doc));
    } catch {
      // QuotaExceededError or private browsing
    }
  }

  private getPersistedPageLocal(key: PageKey): PageDocument | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('yin_page_' + key);
      return raw ? (JSON.parse(raw) as PageDocument) : null;
    } catch {
      return null;
    }
  }

  /**
   * Lấy chi tiết bài viết công khai qua GET /api/articles/{slug}
   */
  async fetchArticleBySlug(slug: string): Promise<Article | null> {
    try {
      const art = await firstValueFrom(
        this.http.get<Article>(`/api/articles/${encodeURIComponent(slug)}`),
      );
      return art;
    } catch {
      return null;
    }
  }

  /**
   * Lấy chi tiết bài viết admin qua GET /api/admin/articles/{id}
   */
  async fetchAdminArticleById(id: string): Promise<Article | null> {
    try {
      const art = await firstValueFrom(
        this.http.get<Article>(`/api/admin/articles/${encodeURIComponent(id)}`),
      );
      return art;
    } catch {
      return null;
    }
  }

  /**
   * Lấy trang cụ thể qua GET /api/pages/{key}
   */
  async fetchPageByKey(key: PageKey): Promise<PageDocument | null> {
    try {
      const doc = await firstValueFrom(
        this.http.get<PageDocument>(`/api/pages/${encodeURIComponent(key)}`),
      );
      this.pages.update((curr) => ({ ...curr, [key]: doc }));
      this.persistPageLocal(key, doc);
      return doc;
    } catch {
      const local = this.getPersistedPageLocal(key);
      if (local) {
        this.pages.update((curr) => ({ ...curr, [key]: local }));
        return local;
      }
      return null;
    }
  }

  /**
   * Danh sách bài viết công khai phân trang cursor keyset
   */
  async getPublicArticles(
    category = '',
    search = '',
    cursor = '',
    size = 20,
  ): Promise<CursorPage<Article>> {
    let params = new HttpParams().set('size', String(size));
    if (category.trim() && category.trim() !== 'ALL') {
      params = params.set('category', category.trim());
    }
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return await firstValueFrom(this.http.get<CursorPage<Article>>('/api/articles', { params }));
  }

  /**
   * Danh mục bài viết công khai (offset)
   */
  async getArticleCategories(page = 0, size = 50): Promise<OffsetPage<string>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return await firstValueFrom(
      this.http.get<OffsetPage<string>>('/api/articles/categories', { params }),
    );
  }

  /**
   * Danh sách bài viết admin phân trang cursor keyset
   */
  async getAdminArticles(
    status = '',
    category = '',
    search = '',
    cursor = '',
    size = 20,
  ): Promise<CursorPage<Article>> {
    let params = new HttpParams().set('size', String(size));
    if (status.trim() && status.trim() !== 'ALL') {
      params = params.set('status', status.trim());
    }
    if (category.trim() && category.trim() !== 'ALL') {
      params = params.set('category', category.trim());
    }
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return await firstValueFrom(
      this.http.get<CursorPage<Article>>('/api/admin/articles', { params }),
    );
  }

  async getTrashedArticles(search = '', cursor = '', size = 20): Promise<CursorPage<Article>> {
    let params = new HttpParams().set('size', String(size));
    if (search.trim()) params = params.set('search', search.trim());
    if (cursor) params = params.set('cursor', cursor);
    return await firstValueFrom(
      this.http.get<CursorPage<Article>>('/api/admin/articles/trash', { params }),
    );
  }

  /**
   * Lấy phiên đọc (reading sessions) cho admin analytics phân trang cursor
   */
  async getReadingSessions(cursor = '', size = 20): Promise<CursorPage<ScrollDropOffRecord>> {
    let params = new HttpParams().set('size', String(size));
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return await firstValueFrom(
      this.http.get<CursorPage<ScrollDropOffRecord>>('/api/admin/reading-sessions', { params }),
    );
  }

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await firstValueFrom(
      this.http.post<{ url: string }>('/api/admin/upload', formData),
    );
    if (!res?.url) throw new Error('Máy chủ không trả về URL ảnh.');
    return res.url;
  }

  async saveArticle(article: Partial<Article> & { title: string }): Promise<Article> {
    const path = article.id
      ? `/api/admin/articles/${encodeURIComponent(article.id)}`
      : '/api/admin/articles';
    const request = article.id
      ? this.http.put<Article>(path, article)
      : this.http.post<Article>(path, article);
    const saved = await firstValueFrom(request);
    this.articles.update((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  }

  async deleteArticle(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/admin/articles/${encodeURIComponent(id)}`));
    this.articles.update((current) => current.filter((item) => item.id !== id));
  }

  async restoreArticle(id: string): Promise<Article> {
    return await firstValueFrom(
      this.http.post<Article>(`/api/admin/articles/${encodeURIComponent(id)}/restore`, {}),
    );
  }

  async incrementArticleViews(slug: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`/api/articles/${encodeURIComponent(slug)}/view`, {}),
    );
    this.articles.update((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, viewCount: item.viewCount + 1 } : item,
      ),
    );
  }

  async savePageBlocks(
    key: PageKey,
    blocks: DynamicBlock[],
    pageTitle?: string,
    metaDescription?: string,
  ): Promise<PageDocument> {
    const title =
      (pageTitle && pageTitle.trim()) ||
      this.pages()[key]?.pageTitle ||
      'Yin - Công Ty Thi Công Xây Dựng Phần Mềm';
    const meta =
      metaDescription !== undefined ? metaDescription : this.pages()[key]?.metaDescription || '';

    // Clone and clean blocks to ensure valid URLs and structure
    const cleanedBlocks = this.cleanBlocksForBackend(blocks);

    let saved: PageDocument;
    try {
      saved = await firstValueFrom(
        this.http.put<PageDocument>(`/api/admin/pages/${key}`, {
          blocks: cleanedBlocks,
          pageTitle: title,
          metaDescription: meta,
        }),
      );
    } catch {
      // Fallback local document if backend is unreachable or session expired
      saved = {
        pageKey: key,
        pageTitle: title,
        metaDescription: meta,
        blocks: cleanedBlocks,
        updatedAt: new Date().toISOString(),
      };
    }

    this.pages.update((current) => ({ ...current, [key]: saved }));
    this.persistPageLocal(key, saved);
    return saved;
  }

  private cleanBlocksForBackend(blocks: DynamicBlock[]): DynamicBlock[] {
    const raw = JSON.parse(JSON.stringify(blocks)) as DynamicBlock[];
    for (const b of raw) {
      if (!b.id) b.id = 'blk_' + Math.random().toString(36).substring(2, 9);
      if (!b.style) b.style = {};
      // Ensure colSpan and gridColumns are clean numbers
      if (b.style.gridColumns !== 1 && b.style.gridColumns !== 2) {
        b.style.gridColumns = 2;
      }
    }
    return raw;
  }

  recordPageView(path: string, referrer = ''): void {
    void firstValueFrom(
      this.http.post('/api/analytics/views', {
        sessionId: this.getOrCreateSessionId(),
        path,
        referrer,
      }),
    ).catch(() => undefined);
  }

  recordScrollDropOff(record: Omit<ScrollDropOffRecord, 'id' | 'timestamp'>): void {
    void firstValueFrom(this.http.post('/api/analytics/reading-sessions', record)).catch(
      () => undefined,
    );
  }

  getOrCreateSessionId(): string {
    const existing = sessionStorage.getItem('yin_session_id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem('yin_session_id', id);
    return id;
  }
}
