import { Injectable, effect, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { LanguageService } from './language.service';

export interface SeoMetadata {
  title: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  type?: string;
  canonicalUrl?: string;
}

const DEFAULT_SEO: SeoMetadata = {
  title: 'Yin | Thi Công Phần Mềm & Giải Pháp Công Nghệ Cao Cấp',
  description: 'Yin (Yin Kenna) - Đơn vị chuyên thi công phần mềm, làm phần mềm theo yêu cầu và phát triển kiến trúc công nghệ cao cấp. Kiến trúc vững chắc, chịu tải lớn, bảo mật tuyệt đối.',
  keywords: 'Yin, yin.vn, Yin Kenna, thi công phần mềm, làm phần mềm, xây dựng phần mềm, lập trình phần mềm, thiết kế phần mềm, gia công phần mềm, công ty phần mềm, kiến trúc phần mềm, phát triển web app',
  ogImage: 'https://yin.vn/assets/logo/icon-512.png',
  type: 'website'
};

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);

  private isInitialized = false;
  private lastSeo: Partial<SeoMetadata> | null = null;

  constructor() {
    effect(() => {
      this.language.language();
      if (this.lastSeo) this.updatePageSeo(this.lastSeo);
    });
  }

  /**
   * Khởi tạo lắng nghe router để tự động cập nhật Title và Description theo từng route.
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    // Cập nhật SEO cho route hiện tại ngay khi khởi tạo
    this.updateFromRoute(this.activatedRoute);

    // Lắng nghe sự kiện chuyển trang để cập nhật Title và Meta Description tự động
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // RouterTitleStrategy also writes the document title during navigation.
        // Run after it so the selected language remains reflected in the tab title.
        setTimeout(() => this.updateFromRoute(this.activatedRoute), 0);
      });
  }

  /**
   * Cập nhật Title và Meta tag cho trang một cách linh hoạt (hỗ trợ trang động như Blog detail).
   */
  public updatePageSeo(seo: Partial<SeoMetadata>): void {
    this.lastSeo = seo;
    // 1. Chuẩn hóa Title: Đảm bảo format "Yin | <Tên trang>"
    const rawTitle = this.language.text((seo.title || DEFAULT_SEO.title).trim());
    let formattedTitle: string;
    if (rawTitle.startsWith('Yin |')) {
      formattedTitle = rawTitle;
    } else if (rawTitle.toLowerCase() === 'yin' || rawTitle === 'Trang Chủ' || rawTitle === 'Home') {
      formattedTitle = this.language.text(DEFAULT_SEO.title);
    } else {
      formattedTitle = `Yin | ${rawTitle}`;
    }

    this.titleService.setTitle(formattedTitle);

    // 2. Cập nhật Meta Description
    const description = this.language.text(seo.description || DEFAULT_SEO.description);
    if (description) {
      this.metaService.updateTag({ name: 'description', content: description });
      this.metaService.updateTag({ property: 'og:description', content: description });
      this.metaService.updateTag({ name: 'twitter:description', content: description });
    }

    // 3. Cập nhật OpenGraph Title & Twitter Title
    this.metaService.updateTag({ property: 'og:title', content: formattedTitle });
    this.metaService.updateTag({ name: 'twitter:title', content: formattedTitle });

    // 4. Cập nhật Keywords nếu có
    const keywords = this.language.text(seo.keywords || DEFAULT_SEO.keywords);
    if (keywords) {
      this.metaService.updateTag({ name: 'keywords', content: keywords });
    }

    // 5. Cập nhật OpenGraph Image nếu có
    const image = seo.ogImage || DEFAULT_SEO.ogImage;
    if (image) {
      this.metaService.updateTag({ property: 'og:image', content: image });
      this.metaService.updateTag({ name: 'twitter:image', content: image });
    }

    // 6. Cập nhật OpenGraph Type
    const type = seo.type || DEFAULT_SEO.type;
    if (type) {
      this.metaService.updateTag({ property: 'og:type', content: type });
    }
    this.metaService.updateTag({ property: 'og:locale', content: this.language.language() === 'en' ? 'en_US' : 'vi_VN' });
  }

  /**
   * Trích xuất thông tin SEO từ leaf route sâu nhất trong cây ActivatedRoute.
   */
  private updateFromRoute(route: ActivatedRoute): void {
    let currentRoute: ActivatedRoute | null = route;

    // Duyệt xuống leaf route (nhánh con cùng)
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const data = currentRoute.snapshot.data || {};
    const routeTitle = currentRoute.snapshot.title || data['title'];
    const description = data['description'];
    const keywords = data['keywords'];
    const ogImage = data['ogImage'];

    this.updatePageSeo({
      title: routeTitle || DEFAULT_SEO.title,
      description,
      keywords,
      ogImage
    });
  }
}

