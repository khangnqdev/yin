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
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { AdminManagementService } from '../../../../core/services/admin-management.service';
import { AuthorProfileService } from '../../../../core/services/author-profile.service';
import { Article, ArticleStatus } from '../../../../core/models/article.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import {
  ParsedArticleMarkdown,
  ARTICLE_FORMAT_MARKDOWN_TEMPLATE,
  ARTICLE_AI_SYSTEM_PROMPT,
  parseArticleMarkdown,
} from '../../../../core/constants/article-format-template';
import {
  APP_VARIABLES,
  DEFAULT_AUTHOR_NAME,
  DEFAULT_AUTHOR_ROLE,
  DEFAULT_AUTHOR_AVATAR,
  DEFAULT_ACTIVE_AUTHORS,
  SystemAuthor,
} from '../../../../core/constants/app.variables';

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
  imports: [FormsModule, YinIconComponent],
})
export class AdminArticleEditComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly db = inject(LocalDbService);
  private readonly adminApi = inject(AdminManagementService);
  private readonly authorProfileService = inject(AuthorProfileService);

  // Template Ref for Tiptap & File Inputs
  protected readonly tiptapEditorRef = viewChild<ElementRef<HTMLDivElement>>('tiptapEditorRef');
  protected readonly coverFileInput = viewChild<ElementRef<HTMLInputElement>>('coverFileInput');
  protected readonly editorImageFileInput =
    viewChild<ElementRef<HTMLInputElement>>('editorImageFileInput');
  protected readonly markdownFileInput =
    viewChild<ElementRef<HTMLInputElement>>('markdownFileInput');

  // Image Upload State Signals
  protected readonly isCoverDragging = signal<boolean>(false);
  protected readonly isUploadingCover = signal<boolean>(false);
  protected readonly isEditorDragging = signal<boolean>(false);
  protected readonly isUploadingEditorImage = signal<boolean>(false);

  // App-wide Central Variables
  protected readonly appVars = APP_VARIABLES;

  // Page Mode Signals
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly articleId = signal<string>('');

  // Article Form Signals
  protected readonly title = signal<string>('');
  protected readonly slug = signal<string>('');
  protected readonly excerpt = signal<string>('');
  protected readonly categories = signal<string[]>(['Công Nghệ', 'Kiến Trúc Phần Mềm']);
  protected readonly date = signal<string>('2026-11-03');
  protected readonly coverImage = signal<string>('');
  protected readonly authorName = signal<string>(DEFAULT_AUTHOR_NAME);
  protected readonly authorRole = signal<string>(DEFAULT_AUTHOR_ROLE);
  protected readonly authorAvatar = signal<string>(DEFAULT_AUTHOR_AVATAR);
  protected readonly status = signal<ArticleStatus>('DRAFT');
  protected readonly initialStatus = signal<ArticleStatus>('DRAFT');
  protected readonly focusKeyword = signal<string>('');

  // SEO Keywords array & input signals
  protected readonly focusKeywords = signal<string[]>([]);
  protected readonly keywordInput = signal<string>('');

  // Dev Mode signals (HTML code vs Visual Editor)
  protected readonly editorViewMode = signal<'visual' | 'dev'>('visual');
  protected readonly devHtmlContent = signal<string>('');

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

  // External AI Format & Markdown Import Signals
  protected readonly isFormatModalOpen = signal<boolean>(false);
  protected readonly isImportPreviewOpen = signal<boolean>(false);
  protected readonly importedArticle = signal<ParsedArticleMarkdown | null>(null);
  protected readonly isCopiedPrompt = signal<boolean>(false);
  protected readonly isCopiedCoverPrompt = signal<boolean>(false);
  protected readonly previewTab = signal<'rendered' | 'meta' | 'markdown'>('rendered');
  protected readonly isProcessingImport = signal<boolean>(false);

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

  // Active Authors loaded from system accounts
  protected readonly availableAuthors: readonly SystemAuthor[] = DEFAULT_ACTIVE_AUTHORS;

  protected readonly systemActiveAuthors = signal<SystemAuthor[]>([
    ...DEFAULT_ACTIVE_AUTHORS,
  ]);

  // Article Quality & SEO Audit Recommendations
  protected readonly articleAudit = computed(() => {
    const t = this.title().trim();
    const ex = this.excerpt().trim();
    const kw = this.focusKeyword().trim().toLowerCase();
    const html = this.editorViewMode() === 'dev' ? this.devHtmlContent() : (this.editor?.getHTML() || '');
    const text = this.editor?.getText() || '';

    const pMatches = html.match(/<p\b[^>]*>.*?<\/p>/gi) || [];
    const pCount = pMatches.filter(p => p.replace(/<[^>]+>/g, '').trim().length > 0).length;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const hasH1 = /<h1\b/i.test(html);
    const hasH2 = /<h2\b/i.test(html);
    const hasH3 = /<h3\b/i.test(html);
    const hasImg = /<img\b/i.test(html) || !!this.coverImage();
    const hasDivider = /<hr\b/i.test(html);

    const titleLen = t.length;
    const titleOk = titleLen >= 30 && titleLen <= 70;
    const excerptLen = ex.length;
    const excerptOk = excerptLen >= 60 && excerptLen <= 180;

    const keywordInTitle = kw ? t.toLowerCase().includes(kw) : false;
    const keywordInExcerpt = kw ? ex.toLowerCase().includes(kw) : false;
    const keywordInContent = kw ? text.toLowerCase().includes(kw) : false;

    let keywordDensity = 0;
    if (kw && wordCount > 0) {
      const occurrences = (text.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      keywordDensity = Math.round((occurrences / wordCount) * 1000) / 10;
    }

    const issues: Array<{ text: string; severity: 'error' | 'warning' | 'info'; fixTip: string }> = [];

    if (!t) {
      issues.push({ text: 'Chưa có tiêu đề bài viết', severity: 'error', fixTip: 'Nhập tiêu đề hấp dẫn từ 30-70 ký tự.' });
    } else if (!titleOk) {
      issues.push({
        text: titleLen < 30 ? `Tiêu đề hơi ngắn (${titleLen}/30 ký tự)` : `Tiêu đề quá dài (${titleLen}/70 ký tự)`,
        severity: 'warning',
        fixTip: 'Độ dài lý tưởng là 40-60 ký tự để không bị cắt bớt trên Google.'
      });
    }

    if (!kw) {
      issues.push({ text: 'Chưa thiết lập Từ khóa SEO (Focus Keyword)', severity: 'warning', fixTip: 'Nhập cụm từ khóa trọng tâm để đo lường độ phủ và tối ưu tìm kiếm.' });
    } else {
      if (!keywordInTitle) {
        issues.push({ text: `Từ khóa "${kw}" chưa xuất hiện trong Tiêu đề`, severity: 'warning', fixTip: 'Nên chèn từ khóa vào nửa đầu tiêu đề để tăng điểm SEO.' });
      }
      if (!keywordInExcerpt) {
        issues.push({ text: `Từ khóa "${kw}" chưa xuất hiện trong Tóm tắt`, severity: 'info', fixTip: 'Đưa từ khóa vào đoạn trích để tăng tỷ lệ click (CTR).' });
      }
      if (!keywordInContent) {
        issues.push({ text: `Từ khóa "${kw}" chưa xuất hiện trong Nội dung bài viết`, severity: 'warning', fixTip: 'Phân bổ từ khóa tự nhiên trong các đoạn văn.' });
      }
    }

    if (!ex) {
      issues.push({ text: 'Chưa có đoạn trích tóm tắt (Excerpt)', severity: 'warning', fixTip: 'Tóm tắt giúp hiển thị thẻ Meta Description trên Google Search và mạng xã hội.' });
    } else if (!excerptOk) {
      issues.push({ text: `Đoạn tóm tắt có độ dài ${excerptLen} ký tự`, severity: 'info', fixTip: 'Độ dài tối ưu cho Google là từ 120-160 ký tự.' });
    }

    if (!hasH2) {
      issues.push({ text: 'Thiếu thẻ đề mục H2 (Heading 2)', severity: 'warning', fixTip: 'Bài viết cần ít nhất một đề mục H2 để phân chia các luận điểm lớn.' });
    }

    if (!hasH3) {
      issues.push({ text: 'Chưa có tiểu mục H3 (Heading 3)', severity: 'info', fixTip: 'Nên sử dụng H3 cho các bước chi tiết hoặc mục con giúp bài viết có cấu trúc rõ ràng.' });
    }

    if (pCount < 3) {
      issues.push({ text: `Nội dung quá ngắn (hiện có ${pCount}/3 đoạn văn)`, severity: 'error', fixTip: 'Cần ít nhất 3 đoạn văn hoàn chỉnh (mở bài, thân bài, kết luận) để bài viết có chiều sâu.' });
    }

    if (!hasImg) {
      issues.push({ text: 'Bài viết chưa có hình ảnh minh họa', severity: 'warning', fixTip: 'Chèn ảnh minh họa kèm chú thích để tăng trải nghiệm đọc và giảm tỷ lệ thoát trang.' });
    }

    let score = 0;
    if (t && titleOk) score += 15; else if (t) score += 8;
    if (kw) score += 10;
    if (keywordInTitle) score += 10;
    if (keywordInContent) score += 10;
    if (ex && excerptOk) score += 15; else if (ex) score += 8;
    if (hasH2) score += 10;
    if (hasH3) score += 5;
    if (pCount >= 3) score += 15; else score += Math.min(10, pCount * 3);
    if (hasImg) score += 10;

    return {
      score: Math.min(100, score),
      wordCount,
      pCount,
      hasH1,
      hasH2,
      hasH3,
      hasImg,
      hasDivider,
      titleLen,
      excerptLen,
      keywordDensity,
      keywordInTitle,
      keywordInExcerpt,
      keywordInContent,
      issues
    };
  });

  private initialLoadedHtml: string = '';
  private loadedPublishedAt: string | null = null;

  async loadActiveAuthors(): Promise<void> {
    try {
      const accountsRes = await this.adminApi.getAdminAccounts(0, 50);
      const activeAdmins = (accountsRes?.items || []).filter((a) => a.isActive);
      if (activeAdmins.length > 0) {
        this.systemActiveAuthors.set(
          activeAdmins.map((acc) => ({
            name: acc.username,
            role:
              acc.role === 'ADMIN'
                ? 'Quản Trị Viên (Admin)'
                : acc.role === 'MANAGER'
                  ? 'Quản Lý Nội Dung (Manager)'
                  : acc.role === 'FIXER' ? 'Kỹ Sư Hỗ Trợ (Fixer)' : acc.role,
            avatar: '/assets/logo/icon-512.png',
          })),
        );
      }
    } catch {
      // Giữ tác giả mặc định nếu offline
    }

    try {
      const profile = await this.authorProfileService.load();
      if (profile?.authorName) {
        const currentList = this.systemActiveAuthors();
        if (!currentList.some((a) => a.name.toLowerCase() === profile.authorName.toLowerCase())) {
          this.systemActiveAuthors.set([
            {
              name: profile.authorName,
              role: profile.authorRole || 'Tác giả bài viết',
              avatar: '/assets/logo/icon-512.png',
            },
            ...currentList,
          ]);
        }
      }
    } catch {
      // Giữ mặc định
    }
  }

  async ngOnInit(): Promise<void> {
    void this.loadActiveAuthors();

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
      const match = this.systemActiveAuthors().find(
        (a) => a.name.toLowerCase() === article.authorName.toLowerCase(),
      );
      if (match) {
        this.authorRole.set(match.role);
        this.authorAvatar.set(match.avatar);
      }
    }

    this.status.set(article.status || 'DRAFT');
    this.initialStatus.set(article.status || 'DRAFT');

    if (article.focusKeyword) {
      this.focusKeyword.set(article.focusKeyword);
      const kwParts = article.focusKeyword
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      this.focusKeywords.set(kwParts.length > 0 ? kwParts : [article.focusKeyword]);
    }

    this.initialLoadedHtml = article.contentHtml || '';
    if (this.editor && this.initialLoadedHtml) {
      this.editor.commands.setContent(this.initialLoadedHtml);
    }
  }

  // Focus Keyword Tag Management
  addKeyword(kw: string): void {
    const trimmed = kw.trim();
    if (!trimmed) return;
    const current = this.focusKeywords();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      this.focusKeywords.set(updated);
      this.focusKeyword.set(updated.join(', '));
    }
    this.keywordInput.set('');
  }

  removeKeyword(index: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const updated = this.focusKeywords().filter((_, i) => i !== index);
    this.focusKeywords.set(updated);
    this.focusKeyword.set(updated.join(', '));
  }

  onKeywordKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addKeyword(this.keywordInput());
    }
  }

  editKeyword(index: number): void {
    const current = this.focusKeywords()[index];
    const edited = window.prompt('Chỉnh sửa cụm từ khóa SEO:', current);
    if (edited !== null && edited.trim()) {
      const updated = [...this.focusKeywords()];
      updated[index] = edited.trim();
      this.focusKeywords.set(updated);
      this.focusKeyword.set(updated.join(', '));
    }
  }

  // Publish Date & Schedule Management
  setPublishImmediately(): void {
    const now = new Date();
    this.date.set(now.toISOString().split('T')[0]);
    this.loadedPublishedAt = now.toISOString();
  }

  // Dev Mode (HTML Source Code vs Visual Tiptap)
  toggleEditorMode(): void {
    if (this.editorViewMode() === 'visual') {
      const html = this.editor?.getHTML() || '';
      this.devHtmlContent.set(html);
      this.editorViewMode.set('dev');
    } else {
      this.editor?.commands.setContent(this.devHtmlContent());
      this.editorViewMode.set('visual');
    }
  }

  onDevHtmlChange(val: string): void {
    this.devHtmlContent.set(val);
  }

  insertDevTag(tag: string): void {
    const textarea = document.querySelector('.dev-html-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = this.devHtmlContent();
    const selected = current.substring(start, end);

    let replacement = '';
    if (tag === 'hr') {
      replacement = '\n<hr />\n';
    } else if (selected) {
      replacement = `<${tag}>${selected}</${tag}>`;
    } else {
      replacement = `<${tag}>Đoạn văn...</${tag}>`;
    }

    const next = current.substring(0, start) + replacement + current.substring(end);
    this.devHtmlContent.set(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + tag.length + 2,
        start + replacement.length - (tag === 'hr' ? 0 : tag.length + 3),
      );
    }, 0);
  }

  insertDivider(): void {
    if (this.editorViewMode() === 'visual') {
      this.editor?.chain().focus().setHorizontalRule().run();
    } else {
      this.insertDevTag('hr');
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
            levels: [1, 2, 3],
          },
        }),
        Image.configure({
          inline: false,
          allowBase64: true,
        }),
        Figcaption,
        Figure,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'editor-link',
          },
        }),
        Underline,
        Highlight.configure({
          multicolor: false,
        }),
        Placeholder.configure({
          placeholder:
            'Bắt đầu viết nội dung bài viết, thả file .md hoặc kéo thả hình ảnh vào đây...',
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
      content: this.initialLoadedHtml || '<p></p>',
      onUpdate: () => {
        this.updateActiveFormattingStates();
      },
      onSelectionUpdate: () => {
        this.updateActiveFormattingStates();
      },
    });

    this.updateActiveFormattingStates();
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  private updateActiveFormattingStates(): void {
    if (!this.editor) return;

    this.isBoldActive.set(this.editor.isActive('bold'));
    this.isItalicActive.set(this.editor.isActive('italic'));
    this.isUnderlineActive.set(this.editor.isActive('underline'));
    this.isStrikeActive.set(this.editor.isActive('strike'));
    this.isCodeActive.set(this.editor.isActive('code') || this.editor.isActive('codeBlock'));
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
    } else if (this.editor.isActive('blockquote')) {
      this.selectedBlockType.set('quote');
    } else if (this.editor.isActive('codeBlock')) {
      this.selectedBlockType.set('code');
    } else {
      this.selectedBlockType.set('paragraph');
    }
  }

  // Formatting Toolbar Triggers
  setBlockType(type: string): void {
    if (!this.editor) return;
    this.selectedBlockType.set(type);

    switch (type) {
      case 'h1':
        this.editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        this.editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        this.editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'quote':
        this.editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code':
        this.editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'paragraph':
      default:
        this.editor.chain().focus().setParagraph().run();
        break;
    }
  }

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

  toggleCodeBlock(): void {
    this.editor?.chain().focus().toggleCodeBlock().run();
  }

  toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
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

  setLink(): void {
    if (!this.editor) return;
    const previousUrl = this.editor.getAttributes('link')['href'] || '';
    const url = window.prompt('Nhập địa chỉ URL liên kết:', previousUrl);

    if (url === null) return;
    if (url === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  // Tiptap Content Image Upload Handlers
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
    event.preventDefault();
    event.stopPropagation();
    this.isEditorDragging.set(true);
  }

  onEditorDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isEditorDragging.set(false);
  }

  onEditorDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isEditorDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (
        file.name.endsWith('.md') ||
        file.name.endsWith('.markdown') ||
        file.type === 'text/markdown' ||
        (file.type === 'text/plain' && file.name.endsWith('.md'))
      ) {
        void this.processMarkdownFile(file);
        return;
      }
      if (file.type.startsWith('image/')) {
        void this.uploadAndInsertImage(file);
        return;
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
          return;
        }
      }
    }
  }

  async uploadAndInsertImage(file: File): Promise<void> {
    if (!this.editor) return;
    this.isUploadingEditorImage.set(true);

    try {
      const imageUrl = await this.db.uploadImage(file);
      const caption = window.prompt('Nhập chú thích hình ảnh (có thể để trống):', file.name) || '';

      if (caption.trim()) {
        const figureHtml = `
          <figure>
            <img src="${imageUrl}" alt="${this.escapeHtml(caption)}" />
            <figcaption>${this.escapeHtml(caption)}</figcaption>
          </figure>
          <p></p>
        `;
        this.editor.chain().focus().insertContent(figureHtml).run();
      } else {
        this.editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
      }
    } catch {
      this.errorMessage.set('Không thể tải hình ảnh lên máy chủ. Vui lòng thử lại.');
    } finally {
      this.isUploadingEditorImage.set(false);
    }
  }

  private escapeHtml(str: string): string {
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

  // =========================================================================
  // External AI Format & Markdown Import Handlers
  // =========================================================================
  openFormatModal(): void {
    this.isFormatModalOpen.set(true);
  }

  closeFormatModal(): void {
    this.isFormatModalOpen.set(false);
  }

  downloadFormatGuide(): void {
    const blob = new Blob([ARTICLE_FORMAT_MARKDOWN_TEMPLATE], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'quy-chuan-soan-bai-md.md';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async copyAiPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(ARTICLE_AI_SYSTEM_PROMPT);
      this.isCopiedPrompt.set(true);
      setTimeout(() => this.isCopiedPrompt.set(false), 2500);
    } catch {
      // Fallback if clipboard API not available
      const textarea = document.createElement('textarea');
      textarea.value = ARTICLE_AI_SYSTEM_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.isCopiedPrompt.set(true);
      setTimeout(() => this.isCopiedPrompt.set(false), 2500);
    }
  }

  async copyCoverPrompt(prompt: string): Promise<void> {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      this.isCopiedCoverPrompt.set(true);
      setTimeout(() => this.isCopiedCoverPrompt.set(false), 2500);
    } catch {
      // Fallback
    }
  }

  triggerImportMarkdown(): void {
    this.markdownFileInput()?.nativeElement.click();
  }

  onMarkdownFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void this.processMarkdownFile(input.files[0]);
      input.value = '';
    }
  }

  async processMarkdownFile(file: File): Promise<void> {
    this.isProcessingImport.set(true);
    this.errorMessage.set('');

    try {
      const rawText = await file.text();
      const parsed = parseArticleMarkdown(rawText);
      this.importedArticle.set(parsed);
      this.previewTab.set('rendered');
      this.isImportPreviewOpen.set(true);
    } catch {
      this.errorMessage.set(
        'Không thể phân tích file Markdown. Vui lòng kiểm tra lại định dạng file .md.',
      );
    } finally {
      this.isProcessingImport.set(false);
    }
  }

  applyImportedArticle(): void {
    const parsed = this.importedArticle();
    if (!parsed) return;

    if (parsed.title) {
      this.title.set(parsed.title);
      if (!this.slug() || !this.isEditMode()) {
        this.slug.set(parsed.slug || this.slugify(parsed.title));
      }
    }
    if (parsed.slug) {
      this.slug.set(this.slugify(parsed.slug));
    }
    if (parsed.excerpt) {
      this.excerpt.set(parsed.excerpt);
    }

    const categoriesToAdd: string[] = [];
    if (parsed.category) {
      categoriesToAdd.push(parsed.category);
    }
    if (parsed.tags && parsed.tags.length > 0) {
      for (const t of parsed.tags) {
        if (!categoriesToAdd.includes(t)) {
          categoriesToAdd.push(t);
        }
      }
      this.focusKeywords.set(parsed.tags);
      this.focusKeyword.set(parsed.tags.join(', '));
    }
    if (categoriesToAdd.length > 0) {
      this.categories.set(categoriesToAdd);
    }

    if (parsed.contentHtml && this.editor) {
      this.editor.commands.setContent(parsed.contentHtml);
      this.devHtmlContent.set(parsed.contentHtml);
    }

    this.isImportPreviewOpen.set(false);
    this.isSavedSuccess.set(true);
    setTimeout(() => this.isSavedSuccess.set(false), 2500);
  }

  closeImportPreview(): void {
    this.isImportPreviewOpen.set(false);
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

    // Đồng bộ nội dung nếu đang soạn ở chế độ Dev
    if (this.editorViewMode() === 'dev' && this.editor) {
      this.editor.commands.setContent(this.devHtmlContent());
    }

    const contentHtml = this.editor?.getHTML() || this.devHtmlContent() || '';
    const editorJson = this.editor?.getJSON();
    const contentJson = editorJson ? JSON.stringify(editorJson) : '{"type":"doc","content":[]}';
    const textContent = this.editor?.getText() || '';
    const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const finalKeyword = this.focusKeywords().length > 0 
      ? this.focusKeywords().join(', ') 
      : this.focusKeyword().trim() || this.categories()[0] || 'Chung';

    const payload: Partial<Article> & { title: string } = {
      id: this.isEditMode() ? this.articleId() : undefined,
      title: articleTitle,
      slug: cleanSlug,
      summary: this.excerpt().trim(),
      category: this.categories().length > 0 ? this.categories().join(', ') : 'Cong-Nghe',
      status: this.status(),
      focusKeyword: finalKeyword,
      thumbnailUrl: this.coverImage().trim() || '/assets/logo/yin.svg',
      authorName: this.authorName().trim() || 'John Doe',
      publishedAt:
        this.status() === 'PUBLISHED'
          ? this.loadedPublishedAt && this.loadedPublishedAt.slice(0, 10) === this.date()
            ? this.loadedPublishedAt
            : this.date()
              ? new Date(this.date()).toISOString()
              : new Date().toISOString()
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
      const detail =
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : '';
      this.errorMessage.set(
        detail
          ? `Không thể lưu bài viết: ${detail}`
          : error instanceof HttpErrorResponse
            ? `Không thể lưu bài viết (HTTP ${error.status}).`
            : 'Không thể lưu bài viết. Vui lòng thử lại.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
