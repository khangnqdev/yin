import { Component, inject, signal, computed, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Sortable from 'sortablejs';
import { LocalDbService } from '../../../core/services/local-db.service';
import { FooterService } from '../../../core/services/footer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FooterConfig } from '../../../core/models/footer-config.model';
import { 
  PageKey, 
  PageDocument,
  BlockType,
  DynamicBlock, 
  HeroBlock, 
  StatsBlock, 
  ProjectsGridBlock, 
  RichContentBlock, 
  CtaBlock, 
  TextBlock,
  StepsBlock,
  OptionsBlock,
  MultiColumnBlock,
  ProgramsBlock,
  VideoBlock,
  FormBlock,
  SectionBlock,
  FaqBlock,
  TestimonialsBlock,
  ProjectItem,
  BlockStyle
} from '../../../core/models/page-block.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';
import { DynamicPageHostComponent } from '../../../shared/components/dynamic-page-host/dynamic-page-host.component';

export interface PaletteItem {
  type: BlockType;
  label: string;
  vietnameseName: string;
  description: string;
  icon: string;
  category: 'content' | 'layout' | 'media' | 'conversion';
}

@Component({
  selector: 'yin-admin-pages-edit',
  templateUrl: './admin-pages-edit.component.html',
  styleUrls: ['./admin-pages-edit.component.css'],
  imports: [FormsModule, RouterLink, YinIconComponent, DynamicPageHostComponent]
})
export class AdminPagesEditComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly db = inject(LocalDbService);
  private readonly footerService = inject(FooterService);
  private readonly notificationService = inject(NotificationService);

  @ViewChild('sortableContainer', { static: false })
  private sortableContainerRef?: ElementRef<HTMLElement>;

  private sortableInstance: Sortable | null = null;
  private subSortableInstance: Sortable | null = null;

  // Active Page & State
  protected readonly selectedPageKey = signal<PageKey>('home');
  protected readonly isFooterActive = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly isSaved = signal<boolean>(false);
  protected readonly saveError = signal<string>('');

  // Sidebar & Inspector Modes
  protected readonly sidebarTab = signal<'design' | 'edit'>('design');
  protected readonly inspectorMode = signal<'block' | 'page'>('block');
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedCategory = signal<string>('all');

  // Canvas Viewport & Scaling
  protected readonly viewportMode = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  protected readonly zoomLevel = signal<number>(100);
  protected readonly isFullscreen = signal<boolean>(false);

  // Selected Block State
  protected readonly selectedBlockId = signal<string | null>(null);

  // Drag & Drop State
  protected readonly draggedBlockId = signal<string | null>(null);
  protected readonly draggedPaletteType = signal<BlockType | null>(null);
  protected readonly dragOverIndex = signal<number | null>(null);
  protected readonly isQuickPickerOpen = signal<boolean>(false);
  protected readonly quickPickerInsertIndex = signal<number | null>(null);

  // Image Uploading State
  protected readonly isUploadingImage = signal<boolean>(false);

  // Undo / Redo History
  private readonly historySnapshots: string[] = [];
  private historyIndex = -1;
  protected readonly canUndo = signal<boolean>(false);
  protected readonly canRedo = signal<boolean>(false);

  // Editable footer copy
  protected readonly footerEdit = signal<FooterConfig>(
    JSON.parse(JSON.stringify(this.footerService.footerConfig()))
  );

  // Palette Catalog matching reference image
  protected readonly paletteItems: PaletteItem[] = [
    { type: 'text', label: 'Text', vietnameseName: 'Văn Bản & Tiêu Đề', description: 'Khối văn bản tự do, tiêu đề lớn và đoạn văn', icon: 'type', category: 'content' },
    { type: 'steps', label: 'Steps', vietnameseName: 'Các Bước Quy Trình', description: 'Quy trình thực hiện theo từng bước 1, 2, 3...', icon: 'list-ordered', category: 'content' },
    { type: 'cta', label: 'Call to Action', vietnameseName: 'Kêu Gọi Hành Động', description: 'Nút bấm nổi bật kích thích chuyển đổi khách hàng', icon: 'mouse-pointer', category: 'conversion' },
    { type: 'options', label: 'Options', vietnameseName: 'Gói & Lựa Chọn', description: 'Bảng giá, gói dịch vụ hoặc lựa chọn so sánh 2-3 cột', icon: 'columns', category: 'conversion' },
    { type: 'multi-column', label: 'Multi Column', vietnameseName: 'Nhiều Cột Đa Năng', description: 'Bố cục chia 2, 3 hoặc 4 cột kèm ảnh và mô tả', icon: 'layout', category: 'layout' },
    { type: 'programs', label: 'Programs', vietnameseName: 'Chương Trình & Dịch Vụ', description: 'Danh mục các dịch vụ trọng tâm và thời lượng', icon: 'grid', category: 'content' },
    { type: 'video', label: 'Video', vietnameseName: 'Video & Media', description: 'Nhúng video giới thiệu công trình hoặc media', icon: 'video', category: 'media' },
    { type: 'form', label: 'Form', vietnameseName: 'Biểu Mẫu Đăng Ký', description: 'Form tiếp nhận thông tin khách hàng và tư vấn', icon: 'check-square', category: 'conversion' },
    { type: 'section', label: 'Section', vietnameseName: 'Phân Đoạn Đồ Họa', description: 'Khối chia đôi nội dung chữ và hình ảnh minh họa', icon: 'columns', category: 'layout' },
    { type: 'faq', label: 'FAQ', vietnameseName: 'Hỏi Đáp Thường Gặp', description: 'Danh sách câu hỏi thường gặp dạng thẻ accordion', icon: 'help-circle', category: 'content' },
    { type: 'hero', label: 'Hero Banner', vietnameseName: 'Banner Mở Đầu', description: 'Phần chào đầu ấn tượng kèm badge, nút bấm và chỉ số', icon: 'sparkles', category: 'content' },
    { type: 'stats', label: 'Stats Counter', vietnameseName: 'Thống Kê Số Liệu', description: 'Các con số ấn tượng khẳng định uy tín năng lực', icon: 'bar-chart', category: 'content' },
    { type: 'projects-grid', label: 'Projects Grid', vietnameseName: 'Lưới Dự Án Thi Công', description: 'Danh sách dự án kiến trúc & xây dựng thực tế', icon: 'grid', category: 'content' },
    { type: 'testimonials', label: 'Testimonials', vietnameseName: 'Ý Kiến Khách Hàng', description: 'Đánh giá chân thực từ các chủ đầu tư', icon: 'quote', category: 'conversion' },
    { type: 'rich-content', label: 'Rich Content', vietnameseName: 'Nội Dung Chi Tiết', description: 'Nội dung phân tích sâu với định dạng HTML phong phú', icon: 'file-text', category: 'content' }
  ];

  // Filtered Palette Items
  protected readonly filteredPalette = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.paletteItems.filter(item => {
      const matchCat = cat === 'all' || item.category === cat;
      const matchQuery = !q || item.label.toLowerCase().includes(q) || item.vietnameseName.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  });

  // Page Document
  protected readonly currentPageDoc = computed(() => {
    const doc = this.db.getPageDocument(this.selectedPageKey());
    if (doc?.blocks) {
      this.ensureRichContentItems(doc.blocks);
    }
    return doc;
  });

  // Page Blocks list
  protected readonly pageBlocks = computed<DynamicBlock[]>(() => {
    return this.currentPageDoc()?.blocks || [];
  });

  // Currently Selected Block
  protected readonly selectedBlock = computed<DynamicBlock | null>(() => {
    const id = this.selectedBlockId();
    if (!id) return null;
    return this.pageBlocks().find(b => b.id === id) || null;
  });

  async ngOnInit(): Promise<void> {
    await this.selectPage('home');
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initSortable(), 200);
  }

  ngOnDestroy(): void {
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }
    if (this.subSortableInstance) {
      this.subSortableInstance.destroy();
      this.subSortableInstance = null;
    }
  }

  /**
   * Khởi tạo SortableJS cho luồng khối chính trên canvas
   */
  initSortable(): void {
    if (typeof window === 'undefined') return;
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }
    const el = this.sortableContainerRef?.nativeElement;
    if (!el) return;

    this.sortableInstance = new Sortable(el, {
      animation: 200,
      handle: '.drag-handle-btn, .block-bounding-tag, .card-admin-header',
      ghostClass: 'sortable-ghost-card',
      chosenClass: 'sortable-chosen-card',
      dragClass: 'sortable-drag-card',
      filter: 'button, input, textarea, a, .card-header-actions',
      preventOnFilter: false,
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          this.reorderBlocks(evt.oldIndex, evt.newIndex);
        }
      }
    });
  }

  /**
   * Khởi tạo SortableJS cho danh sách các thẻ lặp lại (sub-items) trong Inspector
   */
  initSubSortable(): void {
    if (typeof window === 'undefined') return;
    if (this.subSortableInstance) {
      this.subSortableInstance.destroy();
      this.subSortableInstance = null;
    }
    const el = document.querySelector('.sub-items-sortable-list') as HTMLElement | null;
    if (!el) return;

    this.subSortableInstance = new Sortable(el, {
      animation: 180,
      handle: '.sub-item-drag-handle',
      ghostClass: 'sortable-ghost-sub',
      chosenClass: 'sortable-chosen-sub',
      filter: 'input, textarea, button, select, a',
      preventOnFilter: false,
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          this.reorderSubItems(evt.oldIndex, evt.newIndex);
        }
      }
    });
  }

  /**
   * Đồng bộ cập nhật mảng khối và phát tín hiệu signal cho Angular OnPush canvas
   */
  updateDocBlocks(blocks: DynamicBlock[]): void {
    const key = this.selectedPageKey();
    const doc = this.currentPageDoc();
    if (!doc) return;

    const cloned = JSON.parse(JSON.stringify(blocks)) as DynamicBlock[];
    const updatedDoc: PageDocument = {
      ...doc,
      blocks: cloned,
      updatedAt: new Date().toISOString()
    };

    this.db.pages.update(pages => ({ ...pages, [key]: updatedDoc }));
    setTimeout(() => {
      this.initSortable();
      this.initSubSortable();
    }, 60);
  }

  /**
   * Kích hoạt cập nhật tức thì khi chỉnh sửa bất kỳ trường nào trong Inspector
   */
  onBlockFieldChange(): void {
    const doc = this.currentPageDoc();
    if (!doc) return;
    this.pushHistory();
    this.updateDocBlocks(doc.blocks);
  }

  /**
   * Lấy danh sách sub-items của khối
   */
  getSubItems(block: DynamicBlock): any[] | null {
    if (!block) return null;
    switch (block.type) {
      case 'hero': return (block as HeroBlock).statsPreview || null;
      case 'stats': return (block as StatsBlock).items || null;
      case 'steps': return (block as StepsBlock).steps || null;
      case 'projects-grid': return (block as ProjectsGridBlock).projects || null;
      case 'options': return (block as OptionsBlock).options || null;
      case 'multi-column': return (block as MultiColumnBlock).columns || null;
      case 'programs': return (block as ProgramsBlock).programs || null;
      case 'testimonials': return (block as TestimonialsBlock).items || null;
      case 'faq': return (block as FaqBlock).items || null;
      case 'form': return (block as FormBlock).fields || null;
      case 'rich-content': return (block as RichContentBlock).items || null;
      default: return null;
    }
  }

  /**
   * Kéo thả đổi vị trí đối tượng/thẻ con trong danh sách
   */
  reorderSubItems(fromIndex: number, toIndex: number): void {
    const block = this.selectedBlock();
    if (!block) return;
    const list = this.getSubItems(block);
    if (!list || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    this.onBlockFieldChange();
    setTimeout(() => this.initSubSortable(), 60);
  }

  /**
   * Thêm đối tượng mới vào danh sách (Dynamic Addition)
   */
  addSubItem(block: DynamicBlock): void {
    if (!block) return;
    this.pushHistory();
    switch (block.type) {
      case 'hero': {
        const b = block as HeroBlock;
        if (!b.statsPreview) b.statsPreview = [];
        b.statsPreview.push({ label: 'Chỉ số mới', value: '100+' });
        break;
      }
      case 'stats': {
        const b = block as StatsBlock;
        if (!b.items) b.items = [];
        b.items.push({ number: '100+', label: 'Chỉ số mới', description: 'Mô tả ngắn gọn về chỉ số đạt được' });
        break;
      }
      case 'steps': {
        const b = block as StepsBlock;
        if (!b.steps) b.steps = [];
        const nextNum = String(b.steps.length + 1).padStart(2, '0');
        b.steps.push({ stepNumber: nextNum, title: `Bước ${nextNum}: Tiêu đề bước`, description: 'Mô tả chi tiết nội dung của bước này' });
        break;
      }
      case 'projects-grid': {
        const b = block as ProjectsGridBlock;
        if (!b.projects) b.projects = [];
        b.projects.push({
          id: 'proj_' + Date.now(),
          title: 'Dự án mới',
          category: 'Công nghệ cao',
          summary: 'Tóm tắt giải pháp và giá trị mang lại cho khách hàng.',
          client: 'Khách hàng đối tác',
          technologies: ['Angular', 'Spring Boot'],
          metrics: '+50% Hiệu suất',
          link: '/projects'
        });
        break;
      }
      case 'options': {
        const b = block as OptionsBlock;
        if (!b.options) b.options = [];
        b.options.push({
          title: 'Gói dịch vụ mới',
          price: 'Liên hệ',
          description: 'Mô tả gói dịch vụ và phạm vi áp dụng.',
          features: ['Hỗ trợ kỹ thuật 24/7', 'Bảo trì trọn đời', 'Báo cáo định kỳ'],
          buttonText: 'Chọn Gói Này',
          buttonLink: '/contact'
        });
        break;
      }
      case 'multi-column': {
        const b = block as MultiColumnBlock;
        if (!b.columns) b.columns = [];
        b.columns.push({
          title: 'Cột tính năng mới',
          description: 'Mô tả chi tiết tính năng hoặc dịch vụ nổi bật.',
          linkText: 'Tìm hiểu thêm',
          link: '/about'
        });
        b.columnsCount = b.columns.length;
        break;
      }
      case 'programs': {
        const b = block as ProgramsBlock;
        if (!b.programs) b.programs = [];
        b.programs.push({
          title: 'Chương trình / Dịch vụ mới',
          category: 'Phát triển chuyên sâu',
          description: 'Mô tả tổng quan về chương trình và giá trị cốt lõi.',
          duration: '3 tháng',
          badge: 'Mới'
        });
        break;
      }
      case 'testimonials': {
        const b = block as TestimonialsBlock;
        if (!b.items) b.items = [];
        b.items.push({
          quote: 'Dịch vụ và chất lượng công nghệ vượt trội, mang lại hiệu quả to lớn.',
          author: 'Nguyễn Văn A',
          position: 'Giám đốc Công nghệ (CTO)',
          company: 'Tập đoàn Doanh nghiệp',
          rating: 5
        });
        break;
      }
      case 'faq': {
        const b = block as FaqBlock;
        if (!b.items) b.items = [];
        b.items.push({
          question: 'Câu hỏi thường gặp mới là gì?',
          answer: 'Câu trả lời giải thích chi tiết và rõ ràng cho khách hàng.'
        });
        break;
      }
      case 'form': {
        const b = block as FormBlock;
        if (!b.fields) b.fields = [];
        b.fields.push({
          label: 'Trường thông tin mới',
          placeholder: 'Nhập thông tin...',
          fieldType: 'text',
          required: true
        });
        break;
      }
      case 'rich-content': {
        const b = block as RichContentBlock;
        if (!b.items) b.items = [];
        b.items.push({
          heading: 'Mục nội dung mới',
          body: 'Nội dung chi tiết diễn giải cho phần này.'
        });
        break;
      }
    }
    this.onBlockFieldChange();
    setTimeout(() => this.initSubSortable(), 80);
  }

  /**
   * Xóa đối tượng con khỏi danh sách
   */
  removeSubItem(block: DynamicBlock, index: number): void {
    if (!block) return;
    const list = this.getSubItems(block);
    if (!list || index < 0 || index >= list.length) return;
    this.pushHistory();
    list.splice(index, 1);
    if (block.type === 'multi-column') {
      (block as MultiColumnBlock).columnsCount = (block as MultiColumnBlock).columns.length;
    }
    this.onBlockFieldChange();
    setTimeout(() => this.initSubSortable(), 80);
  }

  /**
   * Thiết lập độ rộng ô lưới (tương thích ngược)
   */
  setGridColumns(block: DynamicBlock, cols: 1 | 2, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.ensureBlockStyle(block);
    block.style!.gridColumns = cols;
    const doc = this.currentPageDoc();
    if (doc) {
      this.pushHistory();
      this.updateDocBlocks(doc.blocks);
    }
  }

  toggleGridColumns(block: DynamicBlock, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const current = block.style?.gridColumns === 1 ? 2 : 1;
    this.setGridColumns(block, current);
  }

  // Page selection
  async selectPage(key: PageKey): Promise<void> {
    this.isFooterActive.set(false);
    this.selectedPageKey.set(key);
    this.selectedBlockId.set(null);
    this.isSaved.set(false);
    this.saveError.set('');
    if (!this.db.getPageDocument(key)) {
      await this.db.fetchPageByKey(key);
    }
    this.initHistory();
    setTimeout(() => this.initSortable(), 200);
  }

  selectFooter(): void {
    this.isFooterActive.set(true);
    this.footerEdit.set(JSON.parse(JSON.stringify(this.footerService.footerConfig())));
    this.selectedBlockId.set(null);
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
      case 'home': return 'Trang chủ (Home)';
      case 'about': return 'Về Yin & Khang (About)';
      case 'projects': return 'Dự án thi công (Projects)';
      case 'blog': return 'Bài viết & Báo chí (Blog)';
      case 'contact': return 'Liên hệ (Contact)';
    }
  }

  // Block Selection
  selectBlock(blockId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedBlockId.set(blockId);
    this.sidebarTab.set('edit');
    this.inspectorMode.set('block');
    setTimeout(() => this.initSubSortable(), 120);
  }

  deselectBlock(): void {
    this.selectedBlockId.set(null);
  }

  // Zoom and Viewport controls
  setZoom(level: number): void {
    this.zoomLevel.set(Math.max(50, Math.min(150, level)));
  }

  zoomIn(): void {
    this.setZoom(this.zoomLevel() + 10);
  }

  zoomOut(): void {
    this.setZoom(this.zoomLevel() - 10);
  }

  resetZoom(): void {
    this.zoomLevel.set(100);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(f => !f);
  }

  // Drag and Drop implementation
  onPaletteDragStart(event: DragEvent, type: BlockType): void {
    this.draggedPaletteType.set(type);
    this.draggedBlockId.set(null);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', type);
    }
  }

  onBlockDragStart(event: DragEvent, blockId: string): void {
    this.draggedBlockId.set(blockId);
    this.draggedPaletteType.set(null);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', blockId);
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.draggedPaletteType() ? 'copy' : 'move';
    }
    this.dragOverIndex.set(index);
  }

  onDragLeave(event: DragEvent): void {
    // Only reset if leaving boundary
    const target = event.currentTarget as HTMLElement;
    if (target && !target.contains(event.relatedTarget as Node)) {
      this.dragOverIndex.set(null);
    }
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    const paletteType = this.draggedPaletteType();
    const draggedBlockId = this.draggedBlockId();

    if (paletteType) {
      this.insertBlockAt(paletteType, dropIndex);
    } else if (draggedBlockId) {
      const blocks = this.pageBlocks();
      const fromIndex = blocks.findIndex(b => b.id === draggedBlockId);
      if (fromIndex !== -1 && fromIndex !== dropIndex) {
        this.reorderBlocks(fromIndex, dropIndex);
      }
    }

    this.onDragEnd();
  }

  onDragEnd(): void {
    this.draggedPaletteType.set(null);
    this.draggedBlockId.set(null);
    this.dragOverIndex.set(null);
  }

  // Block Manipulation Methods
  addNewBlock(type: BlockType): void {
    const doc = this.currentPageDoc();
    if (!doc) return;
    this.insertBlockAt(type, doc.blocks.length);
  }

  openQuickPicker(index: number): void {
    this.quickPickerInsertIndex.set(index);
    this.isQuickPickerOpen.set(true);
  }

  closeQuickPicker(): void {
    this.isQuickPickerOpen.set(false);
    this.quickPickerInsertIndex.set(null);
  }

  selectQuickPickerBlock(type: BlockType): void {
    const idx = this.quickPickerInsertIndex();
    this.insertBlockAt(type, idx !== null ? idx : this.pageBlocks().length);
    this.closeQuickPicker();
  }

  insertBlockAt(type: BlockType, index: number): void {
    const doc = this.currentPageDoc();
    if (!doc) return;

    this.pushHistory();
    const newBlock = this.createDefaultBlock(type);
    const updatedBlocks = [...doc.blocks];
    updatedBlocks.splice(index, 0, newBlock);
    this.updateDocBlocks(updatedBlocks);

    this.selectedBlockId.set(newBlock.id);
    this.sidebarTab.set('edit');
    this.inspectorMode.set('block');

    this.notificationService.showStatus(
      'Đã thêm khối mới',
      `Khối "${this.getBlockLabel(type)}" đã được thêm vào trang.`,
      { type: 'success' }
    );
  }

  duplicateBlock(blockId: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const doc = this.currentPageDoc();
    if (!doc) return;

    const idx = doc.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;

    this.pushHistory();
    const original = doc.blocks[idx];
    const clone = JSON.parse(JSON.stringify(original)) as DynamicBlock;
    clone.id = 'blk_' + Math.random().toString(36).substring(2, 9);
    if (clone.title) clone.title += ' (Bản sao)';

    const updated = [...doc.blocks];
    updated.splice(idx + 1, 0, clone);
    this.updateDocBlocks(updated);

    this.selectedBlockId.set(clone.id);
  }

  removeBlock(blockId: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const doc = this.currentPageDoc();
    if (!doc) return;

    this.pushHistory();
    const updated = doc.blocks.filter(b => b.id !== blockId);
    this.updateDocBlocks(updated);
    if (this.selectedBlockId() === blockId) {
      this.selectedBlockId.set(null);
    }
  }

  moveBlock(blockId: string, direction: 'up' | 'down', event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const doc = this.currentPageDoc();
    if (!doc) return;

    const idx = doc.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= doc.blocks.length) return;

    this.reorderBlocks(idx, targetIdx);
  }

  reorderBlocks(fromIndex: number, toIndex: number): void {
    const doc = this.currentPageDoc();
    if (!doc) return;

    this.pushHistory();
    const updated = [...doc.blocks];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    this.updateDocBlocks(updated);
  }

  // Alignment and Style Controls
  setAlignment(block: DynamicBlock, align: 'left' | 'center' | 'right' | 'justify', event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.ensureBlockStyle(block);
    block.style!.textAlign = align;
    this.onBlockFieldChange();
  }

  setDirection(block: DynamicBlock, dir: 'row' | 'column', event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.ensureBlockStyle(block);
    block.style!.layoutDirection = dir;
    this.onBlockFieldChange();
  }

  setGap(block: DynamicBlock, gap: 'sm' | 'md' | 'lg'): void {
    this.ensureBlockStyle(block);
    block.style!.gap = gap;
    this.onBlockFieldChange();
  }

  setFullWidth(block: DynamicBlock, fullWidth: boolean): void {
    this.ensureBlockStyle(block);
    block.style!.fullWidth = fullWidth;
    this.onBlockFieldChange();
  }

  setBackground(block: DynamicBlock, type: 'transparent' | 'light' | 'dark' | 'gradient' | 'image', value?: string): void {
    this.ensureBlockStyle(block);
    const s = block.style!;
    switch (type) {
      case 'transparent':
        s.backgroundColor = 'transparent';
        s.backgroundGradient = undefined;
        s.backgroundImage = undefined;
        s.textColor = '#0f172a';
        break;
      case 'light':
        s.backgroundColor = '#f8fafc';
        s.backgroundGradient = undefined;
        s.backgroundImage = undefined;
        s.textColor = '#0f172a';
        break;
      case 'dark':
        s.backgroundColor = '#0f172a';
        s.backgroundGradient = undefined;
        s.backgroundImage = undefined;
        s.textColor = '#ffffff';
        break;
      case 'gradient':
        s.backgroundColor = undefined;
        s.backgroundImage = undefined;
        s.backgroundGradient = value || 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #ea580c 100%)';
        s.textColor = '#ffffff';
        break;
      case 'image':
        if (value) s.backgroundImage = value;
        if (s.backgroundOverlay === undefined) s.backgroundOverlay = 0.5;
        s.textColor = '#ffffff';
        break;
    }
    this.onBlockFieldChange();
  }

  setBackgroundOverlay(block: DynamicBlock, overlay: number): void {
    this.ensureBlockStyle(block);
    block.style!.backgroundOverlay = overlay;
    this.onBlockFieldChange();
  }

  setPaddingY(block: DynamicBlock, pad: 'none' | 'sm' | 'md' | 'lg' | 'xl'): void {
    this.ensureBlockStyle(block);
    block.style!.paddingY = pad;
    this.onBlockFieldChange();
  }

  setBorderRadius(block: DynamicBlock, r: 'none' | 'sm' | 'md' | 'lg' | 'full'): void {
    this.ensureBlockStyle(block);
    block.style!.borderRadius = r;
    this.onBlockFieldChange();
  }

  setTextColor(block: DynamicBlock, color: string): void {
    this.ensureBlockStyle(block);
    block.style!.textColor = color;
    this.onBlockFieldChange();
  }

  setAccentColor(block: DynamicBlock, color: string): void {
    this.ensureBlockStyle(block);
    block.style!.accentColor = color;
    this.onBlockFieldChange();
  }

  // Image Uploading
  async onImageFileSelected(block: DynamicBlock, event: Event, targetProp: string = 'imageUrl'): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploadingImage.set(true);

    try {
      const url = await this.db.uploadImage(file);
      (block as unknown as Record<string, unknown>)[targetProp] = url;
      this.notificationService.showStatus('Tải ảnh thành công', 'Hình ảnh đã được cập nhật cho khối.', { type: 'success' });
    } catch {
      this.notificationService.showStatus('Lỗi tải ảnh', 'Không thể tải hình ảnh lên máy chủ. Vui lòng thử lại.', { type: 'error' });
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  async onBgImageSelected(block: DynamicBlock, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploadingImage.set(true);

    try {
      const url = await this.db.uploadImage(file);
      this.ensureBlockStyle(block);
      block.style!.backgroundImage = url;
      if (block.style!.backgroundOverlay === undefined) {
        block.style!.backgroundOverlay = 0.5;
      }
      block.style!.textColor = '#ffffff';
      this.notificationService.showStatus('Tải ảnh nền thành công', 'Ảnh nền khối đã được cập nhật.', { type: 'success' });
    } catch {
      this.notificationService.showStatus('Lỗi tải ảnh nền', 'Không thể tải ảnh nền lên máy chủ.', { type: 'error' });
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  // Style Generator
  getBlockWrapperStyles(block: DynamicBlock): Record<string, string> {
    const s = block.style || {};
    const styles: Record<string, string> = {};

    if (s.backgroundColor) styles['background-color'] = s.backgroundColor;
    if (s.backgroundGradient) styles['background-image'] = s.backgroundGradient;
    if (s.backgroundImage) {
      styles['background-image'] = `url('${s.backgroundImage}')`;
      styles['background-size'] = 'cover';
      styles['background-position'] = 'center';
    }
    if (s.textColor) styles['color'] = s.textColor;
    if (s.textAlign) styles['text-align'] = s.textAlign;

    if (s.borderRadius) {
      const radiusMap: Record<string, string> = {
        none: '0px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        full: '9999px'
      };
      styles['border-radius'] = radiusMap[s.borderRadius] || '0px';
    }

    return styles;
  }

  private ensureBlockStyle(block: DynamicBlock): void {
    if (!block.style) {
      block.style = {
        textAlign: 'center',
        layoutDirection: 'column',
        paddingY: 'md',
        borderRadius: 'none'
      };
    }
  }

  // History Undo / Redo
  private initHistory(): void {
    const doc = this.currentPageDoc();
    this.historySnapshots.length = 0;
    this.historyIndex = -1;
    if (doc) {
      this.historySnapshots.push(JSON.stringify(doc.blocks));
      this.historyIndex = 0;
    }
    this.updateHistoryButtons();
  }

  pushHistory(): void {
    const doc = this.currentPageDoc();
    if (!doc) return;

    if (this.historyIndex < this.historySnapshots.length - 1) {
      this.historySnapshots.splice(this.historyIndex + 1);
    }
    this.historySnapshots.push(JSON.stringify(doc.blocks));
    this.historyIndex = this.historySnapshots.length - 1;
    this.updateHistoryButtons();
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const snapshot = this.historySnapshots[this.historyIndex];
      this.updateDocBlocks(JSON.parse(snapshot));
      this.updateHistoryButtons();
    }
  }

  redo(): void {
    if (this.historyIndex < this.historySnapshots.length - 1) {
      this.historyIndex++;
      const snapshot = this.historySnapshots[this.historyIndex];
      this.updateDocBlocks(JSON.parse(snapshot));
      this.updateHistoryButtons();
    }
  }

  private updateHistoryButtons(): void {
    this.canUndo.set(this.historyIndex > 0);
    this.canRedo.set(this.historyIndex < this.historySnapshots.length - 1);
  }

  // Save Blocks
  async saveBlocks(): Promise<void> {
    this.saveError.set('');
    this.isSaving.set(true);

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

    // Sync contentHtml for rich-content
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
      this.notificationService.showStatus(
        'Đã xuất bản thay đổi!',
        `Trang "${this.getPageLabel(doc.pageKey)}" đã được lưu và cập nhật trực tiếp trên website.`,
        { type: 'success' }
      );
      setTimeout(() => this.isSaved.set(false), 2500);
    } catch {
      this.isSaving.set(false);
      this.saveError.set('Không thể lưu trang. Vui lòng kiểm tra kết nối và thử lại.');
    }
  }

  // Footer methods
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

  // Sub-items management for blocks
  // Steps
  addStepItem(block: StepsBlock): void {
    if (!block.steps) block.steps = [];
    const num = block.steps.length + 1;
    block.steps.push({
      stepNumber: num < 10 ? '0' + num : '' + num,
      title: `Bước ${num}: Triển khai mới`,
      description: 'Mô tả chi tiết nội dung công việc và kết quả bàn giao của bước này.'
    });
  }

  removeStepItem(block: StepsBlock, idx: number): void {
    block.steps.splice(idx, 1);
  }

  // Options
  addOptionItem(block: OptionsBlock): void {
    if (!block.options) block.options = [];
    block.options.push({
      title: 'Gói Dịch Vụ Mới',
      price: 'Từ 150 Triệu',
      description: 'Mô tả ngắn gọn về giải pháp và đối tượng phù hợp.',
      features: ['Khảo sát & tư vấn miễn phí', 'Bản vẽ kỹ thuật 3D', 'Bảo hành 3 năm'],
      buttonText: 'Chọn Gói Này',
      buttonLink: '/contact',
      isFeatured: false
    });
  }

  removeOptionItem(block: OptionsBlock, idx: number): void {
    block.options.splice(idx, 1);
  }

  addOptionFeature(option: { features: string[] }): void {
    option.features.push('Tính năng mới');
  }

  removeOptionFeature(option: { features: string[] }, idx: number): void {
    option.features.splice(idx, 1);
  }

  // Multi-Column
  addColumnItem(block: MultiColumnBlock): void {
    if (!block.columns) block.columns = [];
    block.columns.push({
      title: 'Tiêu Đề Cột Mới',
      description: 'Mô tả ngắn gọn về nội dung hoặc lợi ích then chốt.',
      linkText: 'Tìm hiểu thêm',
      link: '/about'
    });
  }

  removeColumnItem(block: MultiColumnBlock, idx: number): void {
    block.columns.splice(idx, 1);
  }

  // Programs
  addProgramItem(block: ProgramsBlock): void {
    if (!block.programs) block.programs = [];
    block.programs.push({
      title: 'Chương Trình / Dịch Vụ Mới',
      category: 'Kỹ Thuật',
      description: 'Mô tả mục tiêu và nội dung chi tiết của chương trình này.',
      duration: '1 - 2 tháng',
      badge: 'Mới'
    });
  }

  removeProgramItem(block: ProgramsBlock, idx: number): void {
    block.programs.splice(idx, 1);
  }

  // Form
  addFormField(block: FormBlock): void {
    if (!block.fields) block.fields = [];
    block.fields.push({
      label: 'Trường nhập mới',
      placeholder: 'Nhập nội dung...',
      fieldType: 'text',
      required: false
    });
  }

  removeFormField(block: FormBlock, idx: number): void {
    block.fields.splice(idx, 1);
  }

  // FAQ
  addFaqItem(block: FaqBlock): void {
    if (!block.items) block.items = [];
    block.items.push({
      question: 'Câu hỏi thắc mắc mới?',
      answer: 'Câu trả lời giải thích chi tiết, ngắn gọn và hữu ích cho khách hàng.'
    });
  }

  removeFaqItem(block: FaqBlock, idx: number): void {
    block.items.splice(idx, 1);
  }

  // Hero Stats
  addHeroStat(block: HeroBlock): void {
    if (!block.statsPreview) block.statsPreview = [];
    block.statsPreview.push({ label: 'Chỉ số mới', value: '100%' });
  }

  removeHeroStat(block: HeroBlock, index: number): void {
    block.statsPreview?.splice(index, 1);
  }

  // Stats
  addStatItem(block: StatsBlock): void {
    if (!block.items) block.items = [];
    block.items.push({
      number: '99+',
      label: 'Chỉ số mới',
      description: 'Mô tả chi tiết chỉ số này'
    });
  }

  removeStatItem(block: StatsBlock, index: number): void {
    block.items?.splice(index, 1);
  }

  // Projects
  addProject(block: ProjectsGridBlock): void {
    if (!block.projects) block.projects = [];
    block.projects.push({
      id: 'prj_' + Date.now(),
      title: 'Tên công trình mới',
      category: 'Kiến Trúc Đương Đại',
      summary: 'Mô tả giải pháp kiến trúc và công năng thực tế.',
      client: 'Chủ đầu tư',
      technologies: ['Bê Tông Tự Lèn', 'Kính Low-E', 'Smart System'],
      metrics: 'Đạt chuẩn Gold',
      link: '/projects'
    });
  }

  removeProject(block: ProjectsGridBlock, index: number): void {
    block.projects?.splice(index, 1);
  }

  updateProjectTechs(project: ProjectItem, rawText: string): void {
    project.technologies = rawText.split(',').map(t => t.trim()).filter(Boolean);
  }

  getProjectTechsString(project: ProjectItem): string {
    return (project.technologies || []).join(', ');
  }

  // Rich Content
  addRichItem(block: RichContentBlock): void {
    if (!block.items) block.items = [];
    block.items.push({
      heading: `${block.items.length + 1}. Mục nội dung mới`,
      body: 'Nhập nội dung phân tích chi tiết hoặc luận điểm kỹ thuật ở đây...'
    });
  }

  removeRichItem(block: RichContentBlock, index: number): void {
    block.items?.splice(index, 1);
  }

  // Testimonials
  addTestimonial(block: TestimonialsBlock): void {
    if (!block.items) block.items = [];
    block.items.push({
      quote: 'Dịch vụ thi công chuyên nghiệp, tỉ mỉ từng chi tiết và đúng hạn.',
      author: 'Nguyễn Văn A',
      position: 'Chủ đầu tư',
      company: 'Hà Nội',
      rating: 5
    });
  }

  removeTestimonial(block: TestimonialsBlock, index: number): void {
    block.items?.splice(index, 1);
  }

  // Type-casting helpers for templates
  asHero(b: DynamicBlock): HeroBlock { return b as HeroBlock; }
  asStats(b: DynamicBlock): StatsBlock { return b as StatsBlock; }
  asProjects(b: DynamicBlock): ProjectsGridBlock { return b as ProjectsGridBlock; }
  asRich(b: DynamicBlock): RichContentBlock { return b as RichContentBlock; }
  asCta(b: DynamicBlock): CtaBlock { return b as CtaBlock; }
  asText(b: DynamicBlock): TextBlock { return b as TextBlock; }
  asSteps(b: DynamicBlock): StepsBlock { return b as StepsBlock; }
  asOptions(b: DynamicBlock): OptionsBlock { return b as OptionsBlock; }
  asMultiColumn(b: DynamicBlock): MultiColumnBlock { return b as MultiColumnBlock; }
  asPrograms(b: DynamicBlock): ProgramsBlock { return b as ProgramsBlock; }
  asVideo(b: DynamicBlock): VideoBlock { return b as VideoBlock; }
  asForm(b: DynamicBlock): FormBlock { return b as FormBlock; }
  asSection(b: DynamicBlock): SectionBlock { return b as SectionBlock; }
  asFaq(b: DynamicBlock): FaqBlock { return b as FaqBlock; }
  asTestimonials(b: DynamicBlock): TestimonialsBlock { return b as TestimonialsBlock; }

  getBlockLabel(type: BlockType): string {
    const item = this.paletteItems.find(p => p.type === type);
    return item ? item.label : type;
  }

  getBlockVietnamese(type: BlockType): string {
    const item = this.paletteItems.find(p => p.type === type);
    return item ? item.vietnameseName : type;
  }

  // Default Factory
  private createDefaultBlock(type: BlockType): DynamicBlock {
    const id = 'blk_' + Math.random().toString(36).substring(2, 9);
    const baseStyle: BlockStyle = {
      textAlign: 'center',
      layoutDirection: 'column',
      paddingY: 'lg',
      borderRadius: 'none'
    };

    switch (type) {
      case 'text':
        return {
          id,
          type: 'text',
          badge: 'Thông Điệp Chính',
          headline: 'Tiêu đề thông điệp hoặc nội dung nổi bật',
          description: 'Mô tả chi tiết phân đoạn với câu chữ truyền cảm hứng và định dạng rõ ràng, thu hút sự chú ý của người xem.',
          buttonText: 'Khám Phá Thêm',
          buttonLink: '/about',
          style: { ...baseStyle }
        } as TextBlock;

      case 'steps':
        return {
          id,
          type: 'steps',
          badge: 'Quy Trình Chuẩn Hóa',
          headline: '4 Bước Hiện Thực Hóa Dự Án Kỹ Nghệ',
          description: 'Quy trình chuẩn hóa từ khảo sát, lập kế hoạch đến bàn giao và bảo hành lâu dài.',
          steps: [
            { stepNumber: '01', title: 'Khảo Sát & Tư Vấn', description: 'Đánh giá hiện trạng mặt bằng và xác định yêu cầu cốt lõi.' },
            { stepNumber: '02', title: 'Thiết Kế & Bản Vẽ', description: 'Hoàn thiện bản vẽ 3D và sơ đồ kỹ thuật chi tiết.' },
            { stepNumber: '03', title: 'Thi Công Thực Địa', description: 'Tiến hành xây dựng với sự giám sát chặt chẽ của kỹ sư.' },
            { stepNumber: '04', title: 'Nghiệm Thu & Bàn Giao', description: 'Kiểm định chất lượng và bàn giao công trình hoàn hảo.' }
          ],
          style: { ...baseStyle, layoutDirection: 'row' }
        } as StepsBlock;

      case 'cta':
        return {
          id,
          type: 'cta',
          badge: 'Sẵn Sàng Hợp Tác',
          headline: 'Bắt Đầu Dự Án Mới Cùng Yin & Khang Ngay Hôm Nay',
          description: 'Liên hệ ngay để nhận tư vấn kỹ thuật chuyên sâu và dự toán công trình minh bạch không phát sinh.',
          buttonText: 'Liên Hệ Ngay',
          buttonLink: '/contact',
          secondaryButtonText: 'Xem Dự Án Đã Làm',
          secondaryButtonLink: '/projects',
          style: { ...baseStyle, backgroundColor: '#0f172a', textColor: '#ffffff', borderRadius: 'md', paddingY: 'xl' }
        } as CtaBlock;

      case 'options':
        return {
          id,
          type: 'options',
          badge: 'Gói Giải Pháp',
          headline: 'Tùy Chọn Dịch Vụ Phù Hợp',
          description: 'Lựa chọn mô hình thiết kế và thi công tối ưu cho quy mô công trình của bạn.',
          options: [
            {
              title: 'Gói Tiêu Chuẩn',
              price: 'Từ 200 Triệu',
              description: 'Phù hợp cho các không gian vừa và nhỏ với ngân sách cân đối.',
              features: ['Thiết kế kiến trúc 2D & 3D', 'Vật tư đạt chuẩn kiểm định', 'Bảo hành kết cấu 3 năm', 'Bàn giao đúng tiến độ'],
              buttonText: 'Chọn Gói Tiêu Chuẩn',
              buttonLink: '/contact',
              isFeatured: false
            },
            {
              title: 'Gói Cao Cấp (VIP)',
              price: 'Từ 500 Triệu',
              description: 'Giải pháp toàn diện với vật liệu cao cấp và kỹ sư trưởng phụ trách.',
              features: ['Thiết kế độc bản theo nhận diện', 'Vật tư nhập khẩu cao cấp', 'Giám sát 24/7 camera thực địa', 'Bảo hành 5 năm & bảo trì trọn đời'],
              buttonText: 'Đăng Ký Tư Vấn VIP',
              buttonLink: '/contact',
              isFeatured: true
            }
          ],
          style: { ...baseStyle, layoutDirection: 'row' }
        } as OptionsBlock;

      case 'multi-column':
        return {
          id,
          type: 'multi-column',
          badge: 'Năng Lực Cốt Lõi',
          headline: 'Giải Pháp Kiến Tạo Toàn Diện',
          description: 'Chúng tôi kết hợp kỹ nghệ thi công chính xác với tư duy thiết kế đương đại.',
          columnsCount: 3,
          columns: [
            { title: 'Thiết Kế Không Gian', description: 'Định hình kiến trúc và nội thất hài hòa giữa thẩm mỹ và công năng sử dụng.', linkText: 'Tìm hiểu thêm', link: '/about' },
            { title: 'Thi Công Chuẩn Mực', description: 'Đội ngũ thợ lành nghề và kỹ sư giám sát tuân thủ nghiêm ngặt quy chuẩn an toàn.', linkText: 'Xem hồ sơ năng lực', link: '/projects' },
            { title: 'Tối Ưu Ngân Sách', description: 'Bóc tách khối lượng minh bạch và dự toán chi tiết không phát sinh chi phí ẩn.', linkText: 'Nhận báo giá', link: '/contact' }
          ],
          style: { ...baseStyle, layoutDirection: 'row' }
        } as MultiColumnBlock;

      case 'programs':
        return {
          id,
          type: 'programs',
          badge: 'Chương Trình & Dịch Vụ',
          headline: 'Các Hạng Mục Trọng Điểm',
          description: 'Danh mục các dịch vụ trọng tâm được thực hiện với tiêu chuẩn kỹ thuật hàng đầu.',
          programs: [
            { title: 'Xây Dựng Biệt Thự & Nhà Phố', category: 'Thi Công', description: 'Biệt thự hiện đại, nhà phố cao cấp với kết cấu vững chắc qua thời gian.', duration: '6 - 9 tháng', badge: 'Chủ lực' },
            { title: 'Hoàn Thiện Văn Phòng & Showroom', category: 'Nội Thất', description: 'Không gian thương mại chuyên nghiệp, tối ưu nhận diện thương hiệu.', duration: '1 - 3 tháng', badge: 'Nổi bật' },
            { title: 'Cải Tạo & Nâng Cấp Công Trình', category: 'Cải Tạo', description: 'Biến hóa diện mạo và nâng cấp công năng cho công trình cũ kỹ.', duration: '1 - 2 tháng', badge: 'Linh hoạt' }
          ],
          style: { ...baseStyle, layoutDirection: 'row' }
        } as ProgramsBlock;

      case 'video':
        return {
          id,
          type: 'video',
          badge: 'Thực Tế Công Trình',
          headline: 'Khám Phá Video Thực Địa Công Trình',
          description: 'Góc quay thực tế quá trình thi công và các công trình sau khi hoàn thiện.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          posterUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?auto=format&fit=crop&w=1200&q=80',
          caption: 'Góc quay cận cảnh công trình thi công hoàn thiện.',
          style: { ...baseStyle }
        } as VideoBlock;

      case 'form':
        return {
          id,
          type: 'form',
          badge: 'Đăng Ký Tư Vấn',
          headline: 'Gửi Yêu Cầu Khảo Sát Thực Địa',
          description: 'Để lại thông tin để kỹ sư trưởng liên hệ khảo sát thực địa trong vòng 24 giờ.',
          submitButtonText: 'Gửi Yêu Cầu Khảo Sát',
          successMessage: 'Cảm ơn bạn! Kỹ sư của Yin & Khang sẽ liên hệ lại ngay.',
          fields: [
            { label: 'Họ và tên', placeholder: 'Nguyễn Văn A', fieldType: 'text', required: true },
            { label: 'Số điện thoại', placeholder: '0900 123 456', fieldType: 'tel', required: true },
            { label: 'Địa chỉ công trình', placeholder: 'Quận / Huyện, Tỉnh thành', fieldType: 'text', required: false },
            { label: 'Nhu cầu chi tiết', placeholder: 'Mô tả diện tích, phong cách mong muốn...', fieldType: 'textarea', required: false }
          ],
          style: { ...baseStyle, backgroundColor: '#f8fafc', borderRadius: 'md' }
        } as FormBlock;

      case 'section':
        return {
          id,
          type: 'section',
          badge: 'Giá Trị Đích Thực',
          headline: 'Tiêu Chuẩn Kỹ Nghệ Đặt Trọng Tâm Vào Khách Hàng',
          description: 'Chúng tôi cam kết chất lượng từng mối nối, độ phẳng từng mét vuông tường và tính chuẩn mực trong từng đường nét kiến trúc.',
          imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
          imagePosition: 'right',
          buttonText: 'Khám Phá Dự Án',
          buttonLink: '/projects',
          style: { ...baseStyle, textAlign: 'left', layoutDirection: 'row' }
        } as SectionBlock;

      case 'faq':
        return {
          id,
          type: 'faq',
          badge: 'Giải Đáp Thắc Mắc',
          headline: 'Câu Hỏi Thường Gặp Về Dịch Vụ',
          description: 'Những điều bạn cần biết trước khi khởi công công trình cùng chúng tôi.',
          items: [
            { question: 'Quy trình tư vấn và khảo sát có tính phí không?', answer: 'Hoàn toàn miễn phí. Đội ngũ kỹ sư sẽ đến trực tiếp công trình để đo đạc và tư vấn ban đầu không thu phí.' },
            { question: 'Thời gian thi công một công trình trung bình kéo dài bao lâu?', answer: 'Tùy thuộc quy mô: căn hộ/văn phòng từ 30-45 ngày, nhà phố biệt thự từ 4-8 tháng.' },
            { question: 'Chính sách bảo hành công trình như thế nào?', answer: 'Bảo hành kết cấu lên đến 5 năm, bảo hành hoàn thiện 2 năm và kiểm tra định kỳ miễn phí hàng năm.' }
          ],
          style: { ...baseStyle }
        } as FaqBlock;

      case 'hero':
        return {
          id,
          type: 'hero',
          badgeText: 'Kiến Trúc & Xây Dựng 2026',
          headline: 'Cooking Our Website.',
          highlightText: 'Sáng Tạo & Đột Phá',
          description: 'Chúng tôi kiến tạo những không gian sống đẳng cấp với chuẩn mực kỹ thuật cao nhất.',
          primaryCtaText: 'Nhận Tư Vấn Ngay',
          primaryCtaLink: '/contact',
          secondaryCtaText: 'Xem Dự Án Thực Tế',
          secondaryCtaLink: '/projects',
          statsPreview: [
            { label: 'Công trình bàn giao', value: '150+' },
            { label: 'Khách hàng hài lòng', value: '99%' }
          ],
          style: { ...baseStyle, paddingY: 'xl' }
        } as HeroBlock;

      case 'stats':
        return {
          id,
          type: 'stats',
          items: [
            { number: '12+', label: 'Năm Kinh Nghiệm', description: 'Trong lĩnh vực thiết kế và thi công xây dựng' },
            { number: '250+', label: 'Dự Án Hoàn Thành', description: 'Trải dài khắp các tỉnh thành trọng điểm' },
            { number: '99.5%', label: 'Đúng Tiến Độ', description: 'Cam kết tiến độ bằng văn bản hợp đồng minh bạch' },
            { number: '100%', label: 'Vật Liệu Chuẩn', description: 'Nguồn gốc xuất xứ rõ ràng có kiểm định' }
          ],
          style: { ...baseStyle, layoutDirection: 'row', backgroundColor: '#f8fafc' }
        } as StatsBlock;

      case 'projects-grid':
        return {
          id,
          type: 'projects-grid',
          badge: 'Công Trình Nổi Bật',
          title: 'Các Dự Án Thi Công Tiêu Biểu',
          subtitle: 'Minh chứng cho năng lực thực thi và chất lượng kỹ nghệ hàng đầu',
          showFilter: true,
          projects: [
            {
              id: 'prj_' + Date.now(),
              title: 'Biệt Thự Đơn Lập Park City',
              category: 'Biệt Thự',
              summary: 'Thiết kế hiện đại phong cách Bắc Âu kết hợp sân vườn sinh thái nghỉ dưỡng.',
              client: 'Gia đình Anh Hưng',
              technologies: ['Kiến Trúc Sinh Thái', 'Nội Thất Gỗ Tự Nhiên', 'Smart Home'],
              metrics: 'Bàn giao sớm 15 ngày',
              link: '/projects',
              imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
            }
          ],
          style: { ...baseStyle }
        } as ProjectsGridBlock;

      case 'rich-content':
        return {
          id,
          type: 'rich-content',
          title: 'Nội Dung Chi Tiết',
          contentHtml: '<p><strong>Triết lý hoạt động:</strong> Đặt chất lượng và sự an tâm của khách hàng lên hàng đầu trong mọi quyết định thiết kế và thi công.</p>',
          items: [
            { heading: 'Triết lý hoạt động', body: 'Đặt chất lượng và sự an tâm của khách hàng lên hàng đầu trong mọi quyết định thiết kế và thi công.' }
          ],
          style: { ...baseStyle, textAlign: 'left' }
        } as RichContentBlock;

      case 'testimonials':
        return {
          id,
          type: 'testimonials',
          title: 'Đánh Giá Của Khách Hàng',
          subtitle: 'Lắng nghe phản hồi từ những chủ đầu tư đã tin tưởng lựa chọn chúng tôi',
          items: [
            {
              quote: 'Đội ngũ Yin & Khang làm việc cực kỳ chuyên nghiệp và tận tâm. Công trình bàn giao đúng hạn với chất lượng vượt mong đợi.',
              author: 'Nguyễn Minh Tuấn',
              position: 'Tổng Giám Đốc',
              company: 'Tuấn Khang Corp',
              rating: 5
            }
          ],
          style: { ...baseStyle, layoutDirection: 'row' }
        } as TestimonialsBlock;
    }
  }

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
    const pRegex = /<p[^>]*>(?:<strong>(.*?)<\/strong>)?([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(html)) !== null) {
      const heading = (match[1] || '').replace(/[:：]$/, '').trim();
      const body = (match[2] || '').replace(/<[^>]+>/g, '').trim();
      if (!heading && !body) continue;
      items.push({ heading, body });
    }
    if (items.length === 0) {
      const clean = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean) items.push({ heading: 'Nội dung chi tiết', body: clean });
    }
    return items;
  }

  private escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
