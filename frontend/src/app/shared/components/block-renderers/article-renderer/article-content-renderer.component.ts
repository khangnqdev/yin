import { Component, input, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'yin-article-content-renderer',
  templateUrl: './article-content-renderer.component.html',
  styleUrls: ['./article-content-renderer.component.css']
})
export class ArticleContentRendererComponent {
  private readonly sanitizer = inject(DomSanitizer);
  public readonly contentHtml = input.required<string>();

  /**
   * Đảm bảo mọi thẻ heading h1, h2, h3 đều có thuộc tính id duy nhất
   * tương ứng với danh sách Mục lục (TOC) để click trỏ tới chính xác 100%.
   */
  protected readonly safeContent = computed<SafeHtml>(() => {
    const raw = this.contentHtml();
    if (!raw) {
      return '';
    }

    let idx = 1;
    const processed = raw.replace(/<h([1-4])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
      // Nếu đã có id thì giữ nguyên
      if (/id=["'][^"']+["']/i.test(attrs)) {
        return match;
      }
      // Gán id heading-${idx} tự động
      return `<h${level} id="heading-${idx++}"${attrs}>${text}</h${level}>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(processed);
  });
}
