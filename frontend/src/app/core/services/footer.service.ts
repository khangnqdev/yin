import { Injectable, signal } from '@angular/core';
import { FooterConfig } from '../models/footer-config.model';

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  brandDesc: 'Công ty Yin — Đơn vị thi công xây dựng phần mềm công nghệ doanh nghiệp. Chúng tôi kiến tạo những nền tảng số chuẩn mực, bảo mật cao và vận hành ổn định cho tổ chức dẫn đầu.',
  founderName: 'Khang',
  founderRole: 'Người sáng lập',

  col1Title: 'Nền Tảng & Giải Pháp',
  col1Links: [
    { id: 'lnk_1', label: 'Trang Chủ Doanh Nghiệp', url: '/' },
    { id: 'lnk_2', label: 'Về Công Ty Yin', url: '/about' },
    { id: 'lnk_3', label: 'Dự Án Đã Thi Công', url: '/projects' },
    { id: 'lnk_4', label: 'Kho Tri Thức & Báo Chí', url: '/blog' },
    { id: 'lnk_5', label: 'Liên Hệ Khảo Sát Dự Án', url: '/contact' },
    { id: 'lnk_6', label: 'Chính Sách Bảo Mật & Dữ Liệu', url: '/privacy' }
  ],

  col2Title: 'Năng Lực Kỹ Nghệ',
  col2Items: [
    { id: 'cap_1', text: 'Kiến Trúc Microservices & Event-Driven' },
    { id: 'cap_2', text: 'Angular Signals Zoneless High-FPS' },
    { id: 'cap_3', text: 'Java Spring Boot Core Banking Standard' },
    { id: 'cap_4', text: 'Microsoft SQL Server Performance Tuning' },
    { id: 'cap_5', text: 'Bảo Mật Zero-Trust & Chống XSS' }
  ],

  col3Title: 'Liên Hệ & Trực Tuyến',
  contactEmail: 'contact@yin.vn',
  contactPhone: '+84 900 123 456',
  contactAddress: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP. HCM',
  mapLink: 'https://www.google.com/maps/dir/?api=1&destination=Khu+C%C3%B4ng+Ngh%E1%BB%87+Cao+TP+Th%E1%BB%A7+%C4%90%E1%BB%A9c+TP+H%E1%BB%93+Ch%C3%AD+Minh',

  copyrightText: 'Công ty Công nghệ Yin. Toàn quyền bảo lưu. Sáng lập bởi Khang.',
  securityBadge: 'Bảo mật chuẩn Enterprise • Thiết kế theo cảm hứng Workday'
};

@Injectable({ providedIn: 'root' })
export class FooterService {
  private readonly STORAGE_KEY = 'yin_footer_custom_config';

  readonly footerConfig = signal<FooterConfig>(this.loadStoredConfig());

  private loadStoredConfig(): FooterConfig {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_FOOTER_CONFIG };
    }
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_FOOTER_CONFIG };
    }
    try {
      const parsed = JSON.parse(raw) as Partial<FooterConfig>;
      return {
        ...DEFAULT_FOOTER_CONFIG,
        ...parsed,
        col1Links: parsed.col1Links && parsed.col1Links.length > 0 ? parsed.col1Links : DEFAULT_FOOTER_CONFIG.col1Links,
        col2Items: parsed.col2Items && parsed.col2Items.length > 0 ? parsed.col2Items : DEFAULT_FOOTER_CONFIG.col2Items
      };
    } catch {
      return { ...DEFAULT_FOOTER_CONFIG };
    }
  }

  saveFooterConfig(config: FooterConfig): void {
    this.footerConfig.set({ ...config });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      } catch (e) {
        console.warn('Không thể lưu footer config vào localStorage:', e);
      }
    }
  }

  resetToDefault(): void {
    this.footerConfig.set({ ...DEFAULT_FOOTER_CONFIG });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

