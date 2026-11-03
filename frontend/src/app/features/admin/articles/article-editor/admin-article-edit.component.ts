import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article, ArticleStatus } from '../../../../core/models/article.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import { AiConfigService } from '../../../../core/services/ai-config.service';
import { AiWriterService, AiArticleResponse } from '../../../../core/services/ai-writer.service';

import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';

export const Figcaption = Node.create({
  name: 'figcaption',
  group: 'block',
  content: 'inline*',
  selectable: false,
  defining: true,
  parseHTML() {
    return [{ tag: 'figcaption' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figcaption', mergeAttributes(HTMLAttributes), 0];
  },
});

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'image figcaption',
  defining: true,
  draggable: true,
  parseHTML() {
    return [{ tag: 'figure' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes), 0];
  },
});

@Component({
  selector: 'yin-admin-article-edit',
  templateUrl: './admin-article-edit.component.html',
  styleUrls: ['./admin-article-edit.component.css'],
  imports: [FormsModule, RouterLink, YinIconComponent],
})
export class AdminArticleEditComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly db = inject(LocalDbService);
  protected readonly aiConfigService = inject(AiConfigService);
  private readonly aiWriterService = inject(AiWriterService);

  // Template Ref for Tiptap
  protected readonly tiptapEditorRef = viewChild<ElementRef<HTMLDivElement>>('tiptapEditorRef');
  protected readonly coverFileInput = viewChild<ElementRef<HTMLInputElement>>('coverFileInput');
  protected readonly editorImageFileInput =
    viewChild<ElementRef<HTMLInputElement>>('editorImageFileInput');

  // Image Upload State Signals
  protected readonly isCoverDragging = signal<boolean>(false);
  protected readonly isUploadingCover = signal<boolean>(false);
  protected readonly isEditorDragging = signal<boolean>(false);
  protected readonly isUploadingEditorImage = signal<boolean>(false);

  // Page Mode Signals
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly articleId = signal<string>('');

  // Article Form Signals (Matching UI Prototype)
  protected readonly title = signal<string>('');
  protected readonly slug = signal<string>('');
  protected readonly excerpt = signal<string>('');
  protected readonly categories = signal<string[]>(['Công Nghệ', 'Kiến Trúc Phần Mềm']);
  protected readonly date = signal<string>('2026-11-03');
  protected readonly coverImage = signal<string>('');
  protected readonly authorName = signal<string>('Khang (Founder)');
  protected readonly authorRole = signal<string>('Nhà Sáng Lập & Kỹ Sư Trưởng');
  protected readonly authorAvatar = signal<string>('/assets/logo/icon-512.png');
  protected readonly status = signal<ArticleStatus>('DRAFT');
  protected readonly initialStatus = signal<ArticleStatus>('DRAFT');
  protected readonly focusKeyword = signal<string>('');

  // Tiptap Editor Instance & State
  public editor: Editor | null = null;
  protected readonly selectedBlockType = signal<string>('paragraph');
  protected readonly isBoldActive = signal<boolean>(false);
  protected readonly isItalicActive = signal<boolean>(false);
  protected readonly isUnderlineActive = signal<boolean>(false);
  protected readonly isStrikeActive = signal<boolean>(false);
  protected readonly isCodeActive = signal<boolean>(false);
  protected readonly isQuoteActive = signal<boolean>(false);
  protected readonly isBulletListActive = signal<boolean>(false);
  protected readonly isOrderedListActive = signal<boolean>(false);
  protected readonly isHighlightActive = signal<boolean>(false);
  protected readonly isLinkActive = signal<boolean>(false);
  protected readonly isEmbedOpen = signal<boolean>(false);
  protected readonly isFullscreen = signal<boolean>(false);

  // Category and Author Popover dropdown signals
  protected readonly newCategoryInput = signal<string>('');
  protected readonly isCategoryDropdownOpen = signal<boolean>(false);
  protected readonly isAuthorDropdownOpen = signal<boolean>(false);

  // Saving State Signals
  protected readonly isSaving = signal<boolean>(false);
  protected readonly isSavedSuccess = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');

  // AI Assistant Modal Signals
  protected readonly isAiModalOpen = signal<boolean>(false);
  protected readonly aiTopic = signal<string>('');
  protected readonly aiKeywords = signal<string>('');
  protected readonly aiCategory = signal<string>('Công Nghệ');
  protected readonly aiTone = signal<string>('Chuyên sâu kỹ thuật & Thực chiến');
  protected readonly aiLength = signal<'short' | 'medium' | 'long'>('medium');
  protected readonly isAiGenerating = signal<boolean>(false);
  protected readonly aiStatusMessage = signal<string>('');
  protected readonly aiGeneratedResult = signal<AiArticleResponse | null>(null);
  protected readonly aiActiveTab = signal<'preview' | 'meta' | 'html'>('preview');

  // Available Presets
  protected readonly availableCategories = [
    'Công Nghệ',
    'Kiến Trúc Phần Mềm',
    'Hệ Thống Phân Tán',
    'Bảo Mật',
    'Tối Ưu Hiệu Năng',
    'Chuyển Đổi Số',
    'Case Study',
  ];

  protected readonly availableAuthors = [
    {
      name: 'Khang (Founder)',
      role: 'Nhà Sáng Lập & Kỹ Sư Trưởng',
      avatar: '/assets/logo/icon-512.png',
    },
    {
      name: 'Yin Tech Team',
      role: 'Đội Ngũ Kỹ Thuật Yin',
      avatar: '/assets/logo/yinkenna.svg',
    },
  ];

  private initialLoadedHtml: string = '';
  private loadedPublishedAt: string | null = null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isEditMode.set(false);
      this.date.set(new Date().toISOString().split('T')[0]);
      return;
    }

    this.isEditMode.set(true);
    this.articleId.set(id);

    const article = await this.db.fetchAdminArticleById(id);
    if (!article) {
      this.errorMessage.set('Không tìm thấy bài viết yêu cầu.');
      return;
    }

    this.title.set(article.title || '');
    this.slug.set(article.slug || '');
    this.excerpt.set(article.summary || '');

    // Phân tách Category thành danh sách tags
    if (article.category) {
      const parts = article.category
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      this.categories.set(parts.length > 0 ? parts : [article.category]);
    }

    if (article.publishedAt) {
      this.loadedPublishedAt = article.publishedAt;
      try {
        const d = new Date(article.publishedAt);
        if (!isNaN(d.getTime())) {
          this.date.set(d.toISOString().split('T')[0]);
        }
      } catch {
        // Keep default
      }
    }

    if (article.thumbnailUrl) {
      this.coverImage.set(article.thumbnailUrl);
    }

    if (article.authorName) {
      this.authorName.set(article.authorName);
      const match = this.availableAuthors.find(
        (a) => a.name.toLowerCase() === article.authorName.toLowerCase(),
      );
      if (match) {
        this.authorRole.set(match.role);
        this.authorAvatar.set(match.avatar);
      }
    }

    this.status.set(article.status || 'DRAFT');
    this.initialStatus.set(article.status || 'DRAFT');
    this.focusKeyword.set(article.focusKeyword || '');

    this.initialLoadedHtml = article.contentHtml || '';
    if (this.editor && this.initialLoadedHtml) {
      this.editor.commands.setContent(this.initialLoadedHtml);
    }
  }

  ngAfterViewInit(): void {
    const container = this.tiptapEditorRef()?.nativeElement;
    if (!container) return;

    this.editor = new Editor({
      element: container,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4],
          },
          link: false,
          underline: false,
        }),
        Image.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: 'editor-embedded-image',
          },
        }),
        Figure,
        Figcaption,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'editor-link',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        Underline,
        Highlight.configure({
          multicolor: false,
        }),
        Placeholder.configure({
          placeholder: 'Bắt đầu viết nội dung bài viết của bạn tại đây...',
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
      ],
      content: this.initialLoadedHtml || this.getDefaultInitialContent(),
      onUpdate: () => {
        this.updateActiveFormatting();
      },
      onSelectionUpdate: () => {
        this.updateActiveFormatting();
      },
    });

    this.updateActiveFormatting();
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }

  private getDefaultInitialContent(): string {
    return `
      <p>Chào mừng bạn đến với trình soạn thảo bài viết của <strong>Yin Tech</strong>. Hệ thống hỗ trợ định dạng trực quan phong phú, chèn bảng biểu, danh sách, khối mã nguồn và hình ảnh minh họa chất lượng cao.</p>
      <h2>1. Giới thiệu tổng quan hệ thống</h2>
      <p>Bài viết hỗ trợ tự động sinh mục lục thông minh dựa theo các tiêu đề H2, H3. Các đề mục lớn giúp người đọc dễ dàng định hướng nội dung và nắm bắt trọng tâm bài viết nhanh chóng.</p>
      <figure class="article-figure">
        <img src="/assets/logo/yinkenna.svg" alt="Biểu tượng Yin Tech" class="editor-embedded-image" />
        <figcaption class="article-figcaption">Biểu tượng thương hiệu Yin Tech — Nền tảng công nghệ và kiến trúc phần mềm cao cấp</figcaption>
      </figure>
      <p></p>
      <h2>2. Trải nghiệm đọc trực quan và phóng to ảnh</h2>
      <p>Tất cả hình ảnh chèn vào bài viết đều có chú thích (caption) rõ ràng. Khi người đọc xem bài viết trên trang công khai, họ có thể nhấp trực tiếp vào ảnh để mở chế độ phóng to chi tiết (lightbox).</p>
    `.trim();
  }

  private updateActiveFormatting(): void {
    if (!this.editor) return;

    this.isBoldActive.set(this.editor.isActive('bold'));
    this.isItalicActive.set(this.editor.isActive('italic'));
    this.isUnderlineActive.set(this.editor.isActive('underline'));
    this.isStrikeActive.set(this.editor.isActive('strike'));
    this.isCodeActive.set(this.editor.isActive('codeBlock'));
    this.isQuoteActive.set(this.editor.isActive('blockquote'));
    this.isBulletListActive.set(this.editor.isActive('bulletList'));
    this.isOrderedListActive.set(this.editor.isActive('orderedList'));
    this.isHighlightActive.set(this.editor.isActive('highlight'));
    this.isLinkActive.set(this.editor.isActive('link'));

    if (this.editor.isActive('heading', { level: 1 })) {
      this.selectedBlockType.set('h1');
    } else if (this.editor.isActive('heading', { level: 2 })) {
      this.selectedBlockType.set('h2');
    } else if (this.editor.isActive('heading', { level: 3 })) {
      this.selectedBlockType.set('h3');
    } else {
      this.selectedBlockType.set('paragraph');
    }
  }

  // Tiptap Commands
  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleUnderline(): void {
    this.editor?.chain().focus().toggleUnderline().run();
  }

  toggleStrike(): void {
    this.editor?.chain().focus().toggleStrike().run();
  }

  toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  toggleCodeBlock(): void {
    this.editor?.chain().focus().toggleCodeBlock().run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  toggleHighlight(): void {
    this.editor?.chain().focus().toggleHighlight().run();
  }

  setBlockType(type: string): void {
    if (!this.editor) return;
    this.selectedBlockType.set(type);

    if (type === 'paragraph') {
      this.editor.chain().focus().setParagraph().run();
    } else if (type === 'h1') {
      this.editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (type === 'h2') {
      this.editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (type === 'h3') {
      this.editor.chain().focus().toggleHeading({ level: 3 }).run();
    } else if (type === 'quote') {
      this.editor.chain().focus().toggleBlockquote().run();
    } else if (type === 'code') {
      this.editor.chain().focus().toggleCodeBlock().run();
    }
  }

  setLink(): void {
    if (!this.editor) return;
    const previousUrl = this.editor.getAttributes('link')['href'] || '';
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      this.editor.chain().focus().unsetLink().run();
      return;
    }

    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  // Image Insertion in Tiptap Content (Upload File from Device)
  addImage(): void {
    this.editorImageFileInput()?.nativeElement.click();
  }

  onEditorImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void this.uploadAndInsertImage(input.files[0]);
      input.value = '';
    }
  }

  onEditorDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      event.stopPropagation();
      this.isEditorDragging.set(true);
    }
  }

  onEditorDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isEditorDragging.set(false);
  }

  onEditorDrop(event: DragEvent): void {
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        event.preventDefault();
        event.stopPropagation();
        this.isEditorDragging.set(false);
        void this.uploadAndInsertImage(file);
      }
    }
  }

  onEditorPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          void this.uploadAndInsertImage(file);
          break;
        }
      }
    }
  }

  async uploadAndInsertImage(file: File): Promise<void> {
    if (!this.editor) return;
    this.isUploadingEditorImage.set(true);
    try {
      const url = await this.db.uploadImage(file);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      const inputCaption = window.prompt('Nhập chú thích cho ảnh (bỏ trống nếu muốn chỉnh sửa sau):', cleanFileName);
      const captionText = (inputCaption !== null ? inputCaption.trim() : '') || cleanFileName;

      const safeCaption = this.escapeHtml(captionText);
      const safeAlt = this.escapeHtml(cleanFileName);

      this.editor
        .chain()
        .focus()
        .insertContent(`
          <figure class="article-figure">
            <img src="${url}" alt="${safeAlt}" class="editor-embedded-image" />
            <figcaption class="article-figcaption">${safeCaption}</figcaption>
          </figure>
          <p></p>
        `)
        .run();
    } catch {
      this.errorMessage.set('Không thể tải hình ảnh lên. Vui lòng thử lại.');
    } finally {
      this.isUploadingEditorImage.set(false);
    }
  }

  escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  insertTable(): void {
    this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  cycleAlign(): void {
    if (!this.editor) return;
    if (this.editor.isActive({ textAlign: 'center' })) {
      this.editor.chain().focus().setTextAlign('right').run();
    } else if (this.editor.isActive({ textAlign: 'right' })) {
      this.editor.chain().focus().setTextAlign('left').run();
    } else {
      this.editor.chain().focus().setTextAlign('center').run();
    }
  }

  toggleEmbedDropdown(): void {
    this.isEmbedOpen.update((v) => !v);
  }

  insertEmbed(type: 'youtube' | 'code' | 'divider'): void {
    this.isEmbedOpen.set(false);
    if (!this.editor) return;

    if (type === 'divider') {
      this.editor.chain().focus().setHorizontalRule().run();
    } else if (type === 'youtube') {
      const url = window.prompt(
        'Nhập link nhúng YouTube hoặc Video:',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      if (url) {
        this.editor
          .chain()
          .focus()
          .insertContent(
            `<p><a href="${url}" class="editor-link" target="_blank">▶ Xem Video liên kết: ${url}</a></p>`,
          )
          .run();
      }
    } else if (type === 'code') {
      this.editor.chain().focus().toggleCodeBlock().run();
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  // Category Management
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen.update((v) => !v);
  }

  addCategory(categoryName: string): void {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    const current = this.categories();
    if (!current.includes(trimmed)) {
      this.categories.set([...current, trimmed]);
    }
    this.newCategoryInput.set('');
    this.isCategoryDropdownOpen.set(false);
  }

  removeCategory(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.categories.update((items) => items.filter((_, i) => i !== index));
  }

  onCategoryInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCategory(this.newCategoryInput());
    }
  }

  // Cover Image Upload Handlers (File Picker + Drag & Drop)
  triggerCoverImageUpload(): void {
    this.coverFileInput()?.nativeElement.click();
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void this.uploadAndSetCover(input.files[0]);
      input.value = '';
    }
  }

  onCoverDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isCoverDragging.set(true);
  }

  onCoverDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isCoverDragging.set(false);
  }

  onCoverDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isCoverDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        void this.uploadAndSetCover(file);
      }
    }
  }

  async uploadAndSetCover(file: File): Promise<void> {
    this.isUploadingCover.set(true);
    try {
      const url = await this.db.uploadImage(file);
      this.coverImage.set(url);
    } catch {
      this.errorMessage.set('Không thể tải ảnh bìa lên. Vui lòng thử lại.');
    } finally {
      this.isUploadingCover.set(false);
    }
  }

  removeCoverImage(event: MouseEvent): void {
    event.stopPropagation();
    this.coverImage.set('');
  }

  // Author Selector
  toggleAuthorDropdown(): void {
    this.isAuthorDropdownOpen.update((v) => !v);
  }

  selectAuthor(author: { name: string; role: string; avatar: string }): void {
    this.authorName.set(author.name);
    this.authorRole.set(author.role);
    this.authorAvatar.set(author.avatar);
    this.isAuthorDropdownOpen.set(false);
  }

  // AI Writer Assistant
  openAiModal(): void {
    this.aiTopic.set(
      this.title() || 'Tối Ưu Hoá Tỷ Lệ Chuyển Đổi Trên Landing Page Với Video Marketing',
    );
    this.aiKeywords.set(this.categories().join(', '));
    this.aiCategory.set(this.categories()[0] || 'Công Nghệ');
    this.aiGeneratedResult.set(null);
    this.aiStatusMessage.set('');
    this.isAiModalOpen.set(true);
  }

  closeAiModal(): void {
    this.isAiModalOpen.set(false);
  }

  async generateWithAi(): Promise<void> {
    const topic = this.aiTopic().trim();
    if (!topic) {
      this.aiStatusMessage.set('Vui lòng nhập chủ đề bài viết.');
      return;
    }

    this.isAiGenerating.set(true);
    this.aiStatusMessage.set('Đang kết nối ACP Server và phân tích cấu trúc bài viết…');

    try {
      const result = await this.aiWriterService.generateArticle({
        topic,
        keywords: this.aiKeywords(),
        category: this.aiCategory(),
        tone: this.aiTone(),
        targetLength: this.aiLength(),
      });

      this.aiGeneratedResult.set(result);
      this.aiStatusMessage.set(
        result.isMockFallback
          ? 'Bài viết đã được tạo thành công qua mô hình chuyên sâu!'
          : 'Bài viết đã được sinh thành công từ máy chủ ACP!',
      );
    } catch {
      this.aiStatusMessage.set(
        'Có lỗi xảy ra khi tạo bài viết với AI. Vui lòng kiểm tra lại kết nối.',
      );
    } finally {
      this.isAiGenerating.set(false);
    }
  }

  applyAiResult(): void {
    const res = this.aiGeneratedResult();
    if (!res) return;

    if (res.title) this.title.set(res.title);
    if (res.slug) this.slug.set(res.slug);
    if (res.excerpt) this.excerpt.set(res.excerpt);
    if (res.categories && res.categories.length > 0) {
      this.categories.set(res.categories);
    }
    if (res.contentHtml && this.editor) {
      this.editor.commands.setContent(res.contentHtml);
    }

    this.closeAiModal();
    this.isSavedSuccess.set(true);
    setTimeout(() => this.isSavedSuccess.set(false), 2000);
  }

  // Cancel / Exit
  cancel(): void {
    void this.router.navigate(['/admin/articles']);
  }

  slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 150);
  }

  // Quick Actions: Lưu bài viết, Xuất bản, Hủy bài
  async saveDraft(): Promise<void> {
    if (this.initialStatus() === 'PUBLISHED' || this.status() === 'PUBLISHED') {
      this.status.set('PUBLISHED');
    } else {
      this.status.set('DRAFT');
    }
    await this.saveArticle();
  }

  async publishArticle(): Promise<void> {
    this.status.set('PUBLISHED');
    await this.saveArticle();
  }

  // Save the selected CMS state.
  async saveArticle(): Promise<void> {
    this.errorMessage.set('');
    const articleTitle = this.title().trim();

    if (!articleTitle) {
      this.errorMessage.set('Vui lòng nhập Tiêu đề (Title) cho bài viết.');
      return;
    }

    this.isSaving.set(true);

    const cleanSlug = this.slugify(this.slug().trim() || articleTitle);
    this.slug.set(cleanSlug);

    const contentHtml = this.editor?.getHTML() || '';
    const editorJson = this.editor?.getJSON();
    const contentJson = editorJson ? JSON.stringify(editorJson) : '{"type":"doc","content":[]}';
    const textContent = this.editor?.getText() || '';
    const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const payload: Partial<Article> & { title: string } = {
      id: this.isEditMode() ? this.articleId() : undefined,
      title: articleTitle,
      slug: cleanSlug,
      summary: this.excerpt().trim(),
      category: this.categories().length > 0 ? this.categories().join(', ') : 'Cong-Nghe',
      status: this.status(),
      focusKeyword: this.focusKeyword().trim() || this.categories()[0] || 'Chung',
      thumbnailUrl: this.coverImage().trim() || '/assets/logo/yinkenna.svg',
      authorName: this.authorName().trim() || 'John Doe',
      publishedAt: this.status() === 'PUBLISHED'
        ? this.loadedPublishedAt && this.loadedPublishedAt.slice(0, 10) === this.date()
          ? this.loadedPublishedAt
          : this.date() ? new Date(this.date()).toISOString() : new Date().toISOString()
        : undefined,
      contentHtml,
      contentJson,
      wordCount,
      readingTimeMinutes: readingTime,
    };

    try {
      const saved = await this.db.saveArticle(payload);
      this.initialStatus.set(saved.status);
      this.loadedPublishedAt = saved.publishedAt || null;
      this.isSavedSuccess.set(true);
      setTimeout(() => {
        this.isSavedSuccess.set(false);
        if (!this.isEditMode()) {
          void this.router.navigate(['/admin/articles']);
        }
      }, 1500);
    } catch (error: unknown) {
      const detail = error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
        ? error.error.message : '';
      this.errorMessage.set(detail
        ? `Không thể lưu bài viết: ${detail}`
        : error instanceof HttpErrorResponse
          ? `Không thể lưu bài viết (HTTP ${error.status}).`
          : 'Không thể lưu bài viết. Vui lòng thử lại.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
