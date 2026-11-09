import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ElementRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { AnalyticsTrackerService } from '../../../../core/services/analytics-tracker.service';
import { SeoService } from '../../../../core/services/seo.service';
import { Article, TableOfContentItem } from '../../../../core/models/article.model';
import { ArticleContentRendererComponent } from '../../../../shared/components/block-renderers/article-renderer/article-content-renderer.component';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css'],
  imports: [RouterLink, ArticleContentRendererComponent, YinIconComponent],
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:keydown.escape)': 'closeLightbox()',
  },
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly db = inject(LocalDbService);
  private readonly tracker = inject(AnalyticsTrackerService);
  private readonly seoService = inject(SeoService);

  protected readonly article = signal<Article | null>(null);
  protected readonly scrollProgress = signal<number>(0);
  protected readonly isScrolledDown = signal<boolean>(false);
  protected readonly activeSectionId = signal<string>('');
  protected readonly zoomedImage = signal<{ src: string; caption: string } | null>(null);

  protected readonly formattedPublishedDate = computed(() => {
    const art = this.article();
    if (!art || !art.publishedAt) {
      return '2026-11-02';
    }
    return art.publishedAt.substring(0, 10);
  });

  protected readonly toc = computed<TableOfContentItem[]>(() => {
    const art = this.article();
    if (!art || !art.contentHtml) {
      return [];
    }

    const regex = /<h([1-4])([^>]*)>(.*?)<\/h\1>/gi;
    const items: TableOfContentItem[] = [];
    let match: RegExpExecArray | null;
    let idx = 1;

    while ((match = regex.exec(art.contentHtml)) !== null) {
      const level = parseInt(match[1], 10);
      const attrs = match[2];
      const text = match[3].replace(/<[^>]*>/g, '').trim();
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      const id = idMatch ? idMatch[1] : `heading-${idx}`;

      if (text) {
        items.push({ id, text, level });
        idx++;
      }
    }
    return items;
  });

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug');
    // Early return nếu không có slug
    if (!slug) {
      return;
    }

    // Lấy chi tiết bài viết trực tiếp từ API server /api/articles/{slug}
    const found = await this.db.fetchArticleBySlug(slug);
    if (!found) {
      return;
    }

    this.article.set(found);

    // Đếm lượt xem thật: Chỉ ghi nhận 1 lần trên mỗi phiên người dùng (session)
    const viewKey = `yin_viewed_art_${found.id || slug}`;
    if (typeof window !== 'undefined' && !sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      void this.db.incrementArticleViews(slug).catch(() => undefined);
    }

    this.db.recordPageView(`/blog/${slug}`, 'internal');
    this.tracker.initTargetTracking(found.id, found.title);

    // Cập nhật SEO động riêng biệt cho bài viết (Title: Yin | Tên bài viết, Meta Description: trích dẫn/tóm tắt bài viết)
    this.seoService.updatePageSeo({
      title: found.title,
      description:
        found.summary ||
        found.seoDescription ||
        `Đọc bài viết "${found.title}" về kiến trúc và thi công phần mềm tại Yin.`,
      keywords: found.focusKeyword
        ? `${found.focusKeyword}, Yin, thi công phần mềm, làm phần mềm, kiến trúc công nghệ`
        : 'Yin, thi công phần mềm, làm phần mềm, bài viết công nghệ',
      ogImage: found.thumbnailUrl || '/assets/logo/icon-512.png',
      type: 'article',
    });
  }

  ngOnDestroy(): void {
    this.tracker.finalizeTracking();
  }

  onScroll(): void {
    const docElem = document.documentElement;
    const body = document.body;
    const scrollTop = docElem.scrollTop || body.scrollTop;

    // Top toolbar hiển thị khi lướt xuống dưới (thay vì cố định từ đầu)
    this.isScrolledDown.set(scrollTop > 220);

    // Cập nhật thanh tiến trình đọc: CHỈ TÍNH TỪ KHI THẤY TIÊU ĐỀ ĐẾN KHI HẾT NỘI DUNG BÀI VIẾT (BODY CONTENT)
    const titleEl =
      (document.querySelector('.article-title') as HTMLElement) ||
      (document.querySelector('.article-header') as HTMLElement);
    const contentEl =
      (document.querySelector('.article-body-wrapper') as HTMLElement) ||
      (document.querySelector('.article-main-body') as HTMLElement);

    if (titleEl && contentEl) {
      const titleTop = titleEl.getBoundingClientRect().top + window.pageYOffset - 100;
      const contentBottom = contentEl.getBoundingClientRect().bottom + window.pageYOffset;
      const endScroll = contentBottom - window.innerHeight + 100;

      if (scrollTop <= titleTop) {
        this.scrollProgress.set(0);
        this.tracker.handleScrollPercentage(0);
      } else if (scrollTop >= endScroll || endScroll <= titleTop) {
        this.scrollProgress.set(100);
        this.tracker.handleScrollPercentage(100);
      } else {
        const totalDistance = endScroll - titleTop;
        const scrolledDistance = scrollTop - titleTop;
        const progress = Math.min(
          100,
          Math.max(0, Math.round((scrolledDistance / totalDistance) * 100)),
        );
        this.scrollProgress.set(progress);
        this.tracker.handleScrollPercentage(progress);
      }
    } else {
      // Fallback
      const scrollHeight = (docElem.scrollHeight || body.scrollHeight) - docElem.clientHeight;
      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
        this.scrollProgress.set(progress);
        this.tracker.handleScrollPercentage(progress);
      }
    }

    // Đánh dấu mục lục đang active theo vị trí scroll
    const headings = Array.from(
      document.querySelectorAll(
        '.article-body-wrapper h1, .article-body-wrapper h2, .article-body-wrapper h3',
      ),
    );
    if (headings.length === 0) {
      return;
    }

    const scrollThreshold = scrollTop + 150;
    for (let i = headings.length - 1; i >= 0; i--) {
      const h = headings[i] as HTMLElement;
      if (h.offsetTop <= scrollThreshold) {
        this.activeSectionId.set(h.id);
        break;
      }
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cuộn tới đầu nội dung bài viết khi click vào tiêu đề 'Nội Dung Chính'
   */
  scrollToFirstSection(): void {
    const items = this.toc();
    if (items.length > 0) {
      this.scrollToSection(items[0].id, 0);
      return;
    }

    const mainBody = document.querySelector('.article-main-body') as HTMLElement | null;
    if (mainBody) {
      this.smoothScrollToElement(mainBody);
    }
  }

  /**
   * Cuộn chính xác tới heading mục lục tương ứng, bù trừ fixed navbar + top toolbar
   */
  scrollToSection(id: string, index?: number): void {
    if (!id && typeof index !== 'number') {
      return;
    }

    let target: HTMLElement | null = null;

    // 1. Tìm bằng id trực tiếp
    if (id) {
      target = document.getElementById(id);
    }

    // 2. Tìm dự phòng theo index trong các thẻ heading
    if (!target && typeof index === 'number') {
      const headings = document.querySelectorAll(
        '.article-body-wrapper h1, .article-body-wrapper h2, .article-body-wrapper h3',
      );
      if (headings[index]) {
        target = headings[index] as HTMLElement;
      }
    }

    // 3. Tìm dự phòng theo text content
    if (!target && id) {
      const headings = Array.from(
        document.querySelectorAll(
          '.article-body-wrapper h1, .article-body-wrapper h2, .article-body-wrapper h3',
        ),
      );
      target =
        (headings.find((h) => h.id === id || h.textContent?.trim().includes(id)) as HTMLElement) ||
        null;
    }

    if (!target) {
      return;
    }

    this.activeSectionId.set(target.id || id);
    this.smoothScrollToElement(target);
  }

  private smoothScrollToElement(element: HTMLElement): void {
    // Offset 150px = 72px Navbar + 54px Top Toolbar + 24px khoảng thở thoáng đãng, không bị dính sát
    const headerOffset = 150;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'smooth',
    });

    // Hiệu ứng nhận diện: highlight viền vàng nhẹ trong 1.8s
    element.classList.add('heading-highlight-flash');
    setTimeout(() => {
      element.classList.remove('heading-highlight-flash');
    }, 1800);
  }

  handleImageClick(src: string, caption?: string): void {
    if (src) {
      this.zoomedImage.set({ src, caption: caption || '' });
    }
  }

  handleContentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      const src = img.currentSrc || img.src;
      const figure = img.closest('figure');
      const figcaption = figure ? figure.querySelector('figcaption')?.textContent?.trim() : '';
      const caption = figcaption || img.alt || '';
      this.zoomedImage.set({ src, caption });
    }
  }

  closeLightbox(): void {
    this.zoomedImage.set(null);
  }
}
