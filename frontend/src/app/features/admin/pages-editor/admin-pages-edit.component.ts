import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocalDbService } from '../../../core/services/local-db.service';
import { FooterService } from '../../../core/services/footer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FooterConfig } from '../../../core/models/footer-config.model';
import { 
  PageKey, 
  DynamicBlock, 
  HeroBlock, 
  StatsBlock, 
  ProjectsGridBlock, 
  RichContentBlock, 
  CtaBlock, 
  ProjectItem 
} from '../../../core/models/page-block.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-admin-pages-edit',
  templateUrl: './admin-pages-edit.component.html',
  styleUrls: ['./admin-pages-edit.component.css'],
  imports: [FormsModule, YinIconComponent]
})
export class AdminPagesEditComponent implements OnInit {
  private readonly db = inject(LocalDbService);
  private readonly footerService = inject(FooterService);
  private readonly notificationService = inject(NotificationService);

  protected readonly selectedPageKey = signal<PageKey>('home');
  protected readonly isFooterActive = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly isSaved = signal<boolean>(false);
  protected readonly saveError = signal<string>('');

  // Editable footer copy
  protected readonly footerEdit = signal<FooterConfig>(
    JSON.parse(JSON.stringify(this.footerService.footerConfig()))
  );

  protected readonly currentPageDoc = computed(() => {
    const doc = this.db.getPageDocument(this.selectedPageKey());
    if (doc?.blocks) {
      this.ensureRichContentItems(doc.blocks);
    }
    return doc;
  });

  protected readonly pageBlocks = computed<DynamicBlock[]>(() => {
    return this.currentPageDoc()?.blocks || [];
  });

  async ngOnInit(): Promise<void> {
    await this.selectPage('home');
  }

  async selectPage(key: PageKey): Promise<void> {
    this.isFooterActive.set(false);
    this.selectedPageKey.set(key);
    this.isSaved.set(false);
    this.saveError.set('');
    if (!this.db.getPageDocument(key)) {
      await this.db.fetchPageByKey(key);
    }
  }

  selectFooter(): void {
    this.isFooterActive.set(true);
    this.footerEdit.set(JSON.parse(JSON.stringify(this.footerService.footerConfig())));
    this.isSaved.set(false);
    this.saveError.set('');
  }

  getPublicUrl(key: PageKey): string {
    switch (key) {
      case 'home': return '/';
      case 'about': return '/about';
      case 'projects': return '/projects';
      case 'blog': return '/blog';
      case 'contact': return '/contact';
    }
  }

  getPageLabel(key: PageKey): string {
    switch (key) {
      case 'home': return 'Trang chủ';
      case 'about': return 'Về Yin & Khang';
      case 'projects': return 'Dự án thi công';
      case 'blog': return 'Bài viết & Báo chí';
      case 'contact': return 'Liên hệ';
    }
  }

  /**
   * Đảm bảo các khối rich-content có mảng items cấu trúc thay vì phụ thuộc HTML thô
   */
  private ensureRichContentItems(blocks: DynamicBlock[]): void {
    for (const b of blocks) {
      if (b.type === 'rich-content') {
        const rich = b as RichContentBlock;
        if (!rich.items || rich.items.length === 0) {
          rich.items = this.parseHtmlToItems(rich.contentHtml);
        }
      }
    }
  }

  private parseHtmlToItems(html: string): Array<{ heading: string; body: string }> {
    if (!html) return [];
    const items: Array<{ heading: string; body: string }> = [];

    // Tách các đoạn <p><strong>Tiêu đề:</strong> Nội dung</p>
    const pRegex = /<p[^>]*>(?:<strong>(.*?)<\/strong>)?([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(html)) !== null) {
      let heading = (match[1] || '').replace(/[:：]$/, '').trim();
      let body = (match[2] || '').replace(/<[^>]+>/g, '').trim();
      if (!heading && !body) continue;
      items.push({ heading, body });
    }

    if (items.length === 0) {
      const clean = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean) {
        items.push({ heading: 'Nội dung chi tiết', body: clean });
      }
    }

    return items;
  }

  async saveBlocks(): Promise<void> {
    this.saveError.set('');
    this.isSaving.set(true);

    // Xử lý lưu cấu hình Footer khi đang ở tab Chân Trang
    if (this.isFooterActive()) {
      try {
        this.footerService.saveFooterConfig(this.footerEdit());
        this.isSaving.set(false);
        this.isSaved.set(true);
        this.notificationService.showStatus(
          'Đã lưu chân trang',
          'Nội dung chân trang đã được cập nhật và đồng bộ trên toàn website.',
          { type: 'success' }
        );
        setTimeout(() => this.isSaved.set(false), 2000);
      } catch {
        this.isSaving.set(false);
        this.saveError.set('Không thể lưu thông tin chân trang.');
      }
      return;
    }

    const doc = this.currentPageDoc();
    if (!doc) {
      this.isSaving.set(false);
      return;
    }

    // Đồng bộ lại contentHtml cho các khối rich-content từ items để đảm bảo tính toàn vẹn
    for (const b of doc.blocks) {
      if (b.type === 'rich-content') {
        const rich = b as RichContentBlock;
        if (rich.items && rich.items.length > 0) {
          rich.contentHtml = rich.items.map(it => {
            const h = it.heading ? `<strong>${this.escapeHtml(it.heading)}:</strong> ` : '';
            return `<p>${h}${this.escapeHtml(it.body)}</p>`;
          }).join('\n');
        }
      }
    }

    try {
      await this.db.savePageBlocks(doc.pageKey, doc.blocks, doc.pageTitle, doc.metaDescription);
      this.isSaving.set(false);
      this.isSaved.set(true);
      setTimeout(() => this.isSaved.set(false), 2000);
    } catch {
      this.isSaving.set(false);
      this.saveError.set('Không thể lưu trang. Vui lòng kiểm tra kết nối và thử lại.');
    }
  }

  // Footer Link & Capability Helper Methods
  addFooterLink(): void {
    const edit = this.footerEdit();
    const newId = 'lnk_' + Date.now();
    edit.col1Links.push({ id: newId, label: 'Liên kết mới', url: '/' });
    this.footerEdit.set({ ...edit });
  }

  removeFooterLink(index: number): void {
    const edit = this.footerEdit();
    edit.col1Links.splice(index, 1);
    this.footerEdit.set({ ...edit });
  }

  addFooterCap(): void {
    const edit = this.footerEdit();
    const newId = 'cap_' + Date.now();
    edit.col2Items.push({ id: newId, text: 'Năng lực công nghệ mới' });
    this.footerEdit.set({ ...edit });
  }

  removeFooterCap(index: number): void {
    const edit = this.footerEdit();
    edit.col2Items.splice(index, 1);
    this.footerEdit.set({ ...edit });
  }

  resetFooterToDefaults(): void {
    this.notificationService.confirm({
      title: 'Khôi phục chân trang mặc định?',
      message: 'Bạn có chắc chắn muốn đặt lại toàn bộ nội dung chân trang về bản thiết kế chuẩn mực ban đầu không?',
      confirmText: 'Khôi phục ngay',
      cancelText: 'Hủy bỏ',
      metaText: 'Chân trang',
      onConfirm: () => {
        this.footerService.resetToDefault();
        this.footerEdit.set(JSON.parse(JSON.stringify(this.footerService.footerConfig())));
        this.notificationService.showStatus(
          'Đã khôi phục mặc định',
          'Chân trang đã được khôi phục về nội dung chuẩn ban đầu thành công.',
          { type: 'success' }
        );
      }
    });
  }

  private escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Type-casting helpers
  asHero(block: DynamicBlock): HeroBlock { return block as HeroBlock; }
  asStats(block: DynamicBlock): StatsBlock { return block as StatsBlock; }
  asProjects(block: DynamicBlock): ProjectsGridBlock { return block as ProjectsGridBlock; }
  asRich(block: DynamicBlock): RichContentBlock { return block as RichContentBlock; }
  asCta(block: DynamicBlock): CtaBlock { return block as CtaBlock; }

  // Hero Stats Preview Items
  addHeroStat(block: HeroBlock): void {
    if (!block.statsPreview) block.statsPreview = [];
    block.statsPreview.push({ label: 'Chỉ số mới', value: '100%' });
  }

  removeHeroStat(block: HeroBlock, index: number): void {
    if (block.statsPreview) {
      block.statsPreview.splice(index, 1);
    }
  }

  // Stats Block Items
  addStatItem(block: StatsBlock): void {
    if (!block.items) block.items = [];
    block.items.push({
      number: '99+',
      label: 'Tiêu đề chỉ số',
      description: 'Mô tả chi tiết chỉ số này'
    });
  }

  removeStatItem(block: StatsBlock, index: number): void {
    if (block.items) {
      block.items.splice(index, 1);
    }
  }

  // Projects Grid Block Items
  addProject(block: ProjectsGridBlock): void {
    if (!block.projects) block.projects = [];
    block.projects.push({
      id: 'prj_' + Date.now(),
      title: 'Tên công trình dự án mới',
      category: 'Enterprise Solution',
      summary: 'Mô tả ngắn gọn về giải pháp kỹ thuật và kết quả thi công công trình này.',
      client: 'Khách hàng đối tác',
      technologies: ['Spring Boot 3', 'Angular', 'SQL Server'],
      metrics: 'Tối ưu hiệu năng 50%',
      link: '/contact'
    });
  }

  removeProject(block: ProjectsGridBlock, index: number): void {
    if (block.projects) {
      block.projects.splice(index, 1);
    }
  }

  updateProjectTechs(project: ProjectItem, rawText: string): void {
    project.technologies = rawText.split(',').map(t => t.trim()).filter(Boolean);
  }

  getProjectTechsString(project: ProjectItem): string {
    return (project.technologies || []).join(', ');
  }

  // Rich Content Block Items
  addRichItem(block: RichContentBlock): void {
    if (!block.items) block.items = [];
    block.items.push({
      heading: `${block.items.length + 1}. Mục nội dung mới`,
      body: 'Nhập nội dung phân tích chi tiết hoặc luận điểm kỹ thuật ở đây...'
    });
  }

  removeRichItem(block: RichContentBlock, index: number): void {
    if (block.items) {
      block.items.splice(index, 1);
    }
  }
}
