import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  viewChild, 
  input, 
  output, 
  model, 
  signal, 
  computed, 
  inject,
  effect
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';

import { YinIconComponent } from '../../../core/components/icon/icon.component';
import { SeoAnalyzerService } from '../../../core/services/seo-analyzer.service';
import { TableOfContentItem, SeoAnalysisResult, ArticleStatus } from '../../../core/models/article.model';

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'yin-notion-editor',
  templateUrl: './notion-editor.component.html',
  styleUrls: ['./notion-editor.component.css'],
  imports: [FormsModule, YinIconComponent]
})
export class YinNotionEditorComponent implements OnInit, OnDestroy {
  private readonly seoAnalyzer = inject(SeoAnalyzerService);

  // Two-way Models & Inputs
  public readonly initialHtml = input<string>('');
  public readonly articleTitle = model<string>('');
  public readonly articleDescription = model<string>('');
  public readonly focusKeyword = model<string>('');
  public readonly category = model<string>('Cong-Nghe');
  public readonly status = model<ArticleStatus>('DRAFT');
  public readonly slug = model<string>('');
  public readonly isEditMode = input<boolean>(false);

  // Outputs
  public readonly contentChanged = output<{
    html: string;
    json: string;
    wordCount: number;
    readingTime: number;
  }>();

  // Template Refs
  protected readonly editorElement = viewChild<ElementRef<HTMLDivElement>>('editorElement');

  // Internal State Signals
  public editor: Editor | null = null;
  protected readonly currentHtml = signal<string>('');
  protected readonly isSlashMenuOpen = signal<boolean>(false);
  protected readonly slashMenuPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  protected readonly isScoreHidden = signal<boolean>(false);
  protected readonly activeInspectorTab = signal<'seo' | 'settings' | 'toc'>('seo');
  protected readonly selectedBlockFormat = signal<string>('paragraph');
  
  private lastLoadedHtml: string = '';

  constructor() {
    // Reactive sync: When initialHtml arrives asynchronously from backend, load it into Tiptap
    effect(() => {
      const html = this.initialHtml();
      if (this.editor && html && html !== this.lastLoadedHtml) {
        const currentText = this.editor.getText().trim();
        if (!currentText || this.lastLoadedHtml === '') {
          this.editor.commands.setContent(html, { emitUpdate: true });
          this.lastLoadedHtml = html;
          this.currentHtml.set(html);
        }
      }
    });
  }

  // Slash commands catalog
  protected readonly slashCommands: SlashCommandItem[] = [
    { id: 'h1', title: 'Tiêu đề lớn (H1)', description: 'Tiêu đề chính của phân đoạn', icon: 'heading-1' },
    { id: 'h2', title: 'Tiêu đề vừa (H2)', description: 'Tiêu đề mục con trong bài', icon: 'heading-2' },
    { id: 'h3', title: 'Tiêu đề nhỏ (H3)', description: 'Chi tiết luận điểm cấp 3', icon: 'heading-3' },
    { id: 'bulletList', title: 'Danh sách dấu chấm', description: 'Liệt kê các điểm kỹ thuật', icon: 'list' },
    { id: 'orderedList', title: 'Danh sách số', description: 'Liệt kê các bước thực thi 1, 2, 3', icon: 'list-ordered' },
    { id: 'quote', title: 'Trích dẫn kỹ nghệ (Quote)', description: 'Làm nổi bật đoạn phát biểu then chốt', icon: 'quote' },
    { id: 'codeBlock', title: 'Khối mã nguồn (Code)', description: 'Nhúng mã lập trình Spring/Angular', icon: 'code' },
    { id: 'table', title: 'Bảng dữ liệu (Table)', description: 'Chèn bảng so sánh kỹ thuật', icon: 'table' },
    { id: 'image', title: 'Chèn hình ảnh', description: 'Nhúng hình ảnh kiến trúc qua link URL', icon: 'image' }
  ];

  // Computed Table of Contents (Outline)
  protected readonly outline = computed<TableOfContentItem[]>(() => {
    const html = this.currentHtml();
    if (!html) {
      return [];
    }

    const headingRegex = /<h([1-3])([^>]*)>(.*?)<\/h[1-3]>/gi;
    const items: TableOfContentItem[] = [];
    let match: RegExpExecArray | null;

    let index = 1;
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      const attrs = match[2];
      const text = match[3].replace(/<[^>]*>/g, '').trim();

      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      const id = idMatch ? idMatch[1] : `heading-${index}`;

      if (text) {
        items.push({ id, text, level });
        index++;
      }
    }

    return items;
  });

  // Real-time SEO Analysis
  protected readonly seoResult = computed<SeoAnalysisResult>(() => {
    return this.seoAnalyzer.analyze(
      this.articleTitle(),
      this.currentHtml(),
      this.focusKeyword(),
      this.articleDescription()
    );
  });

  // Circular Gauge Calculations
  protected readonly gaugeCircumference = 289.02; // 2 * PI * 46
  
  protected readonly gaugeStrokeDashoffset = computed<number>(() => {
    const score = Math.max(0, Math.min(100, this.seoResult().score));
    return this.gaugeCircumference - (score / 100) * this.gaugeCircumference;
  });

  protected readonly gaugeStrokeColor = computed<string>(() => {
    const score = this.seoResult().score;
    if (score >= 75) return '#10B981'; // Green Emerald
    if (score >= 45) return '#F59E0B'; // Amber Gold
    return '#EF4444'; // Red
  });

  ngOnInit(): void {
    this.initTiptap();
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  private initTiptap(): void {
    const container = this.editorElement()?.nativeElement;
    if (!container) {
      return;
    }

    const startingContent = this.initialHtml() || '<p></p>';
    if (this.initialHtml()) {
      this.lastLoadedHtml = this.initialHtml();
    }

    this.editor = new Editor({
      element: container,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false
        }),
        Placeholder.configure({
          placeholder: "Nhập nội dung bài viết kỹ nghệ hoặc gõ '/' để mở menu chọn khối..."
        }),
        CharacterCount,
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        Image.configure({ inline: true }),
        Link.configure({ openOnClick: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] })
      ],
      content: startingContent,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const json = JSON.stringify(editor.getJSON());
        this.currentHtml.set(html);

        const wordCount = editor.storage['characterCount']?.words() || 0;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        this.contentChanged.emit({
          html,
          json,
          wordCount,
          readingTime
        });

        this.updateActiveBlockFormat(editor);
        this.checkSlashCommandTrigger(editor);
      },
      onSelectionUpdate: ({ editor }) => {
        this.updateActiveBlockFormat(editor);
      }
    });

    this.currentHtml.set(this.editor.getHTML());
  }

  private updateActiveBlockFormat(editor: Editor): void {
    if (editor.isActive('heading', { level: 1 })) {
      this.selectedBlockFormat.set('h1');
    } else if (editor.isActive('heading', { level: 2 })) {
      this.selectedBlockFormat.set('h2');
    } else if (editor.isActive('heading', { level: 3 })) {
      this.selectedBlockFormat.set('h3');
    } else if (editor.isActive('blockquote')) {
      this.selectedBlockFormat.set('quote');
    } else if (editor.isActive('codeBlock')) {
      this.selectedBlockFormat.set('code');
    } else {
      this.selectedBlockFormat.set('paragraph');
    }
  }

  // ============================================================================
  // SLASH COMMAND POPUP
  // ============================================================================

  private checkSlashCommandTrigger(editor: Editor): void {
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from, '\n');

    if (textBefore !== '/') {
      if (this.isSlashMenuOpen()) {
        this.isSlashMenuOpen.set(false);
      }
      return;
    }

    const coords = editor.view.coordsAtPos(from);
    const editorRect = this.editorElement()?.nativeElement.getBoundingClientRect();

    if (editorRect) {
      this.slashMenuPosition.set({
        top: coords.bottom - editorRect.top + 8,
        left: Math.max(16, coords.left - editorRect.left)
      });
      this.isSlashMenuOpen.set(true);
    }
  }

  public executeSlashCommand(commandId: string): void {
    if (!this.editor) {
      return;
    }

    const { from } = this.editor.state.selection;
    this.editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    this.isSlashMenuOpen.set(false);

    switch (commandId) {
      case 'h1':
        this.editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        this.editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        this.editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        this.editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        this.editor.chain().focus().toggleOrderedList().run();
        break;
      case 'quote':
        this.editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        this.editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'table':
        this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'image': {
        const url = prompt('Nhập URL hình ảnh (VD: https://images.unsplash.com/...):');
        if (url) {
          this.editor.chain().focus().setImage({ src: url }).run();
        }
        break;
      }
    }
  }

  // ============================================================================
  // TOOLBAR COMMANDS
  // ============================================================================

  public onFormatDropdownChange(format: string): void {
    if (!this.editor) return;
    this.selectedBlockFormat.set(format);

    switch (format) {
      case 'paragraph':
        this.editor.chain().focus().setParagraph().run();
        break;
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
    }
  }

  public toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  public toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  public toggleStrike(): void {
    this.editor?.chain().focus().toggleStrike().run();
  }

  public toggleCode(): void {
    this.editor?.chain().focus().toggleCode().run();
  }

  public toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  public toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  public toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  public setAlignment(alignment: 'left' | 'center'): void {
    this.editor?.chain().focus().setTextAlign(alignment).run();
  }

  public insertLinkPrompt(): void {
    const previousUrl = this.editor?.getAttributes('link')['href'] || '';
    const url = prompt('Nhập liên kết URL:', previousUrl);
    if (url === null) {
      return;
    }
    if (url === '') {
      this.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    this.editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  public insertTable(): void {
    this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  public insertImagePrompt(): void {
    const url = prompt('Nhập URL hình ảnh:');
    if (!url) {
      return;
    }
    this.editor?.chain().focus().setImage({ src: url }).run();
  }

  public undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  public redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  public toggleScorePanel(): void {
    this.isScoreHidden.update(v => !v);
  }

  public scrollToHeading(item: TableOfContentItem): void {
    if (!item.text) {
      return;
    }
    const container = this.editorElement()?.nativeElement;
    if (!container) {
      return;
    }

    const headings = container.querySelectorAll(`h${item.level}`);
    for (const h of Array.from(headings)) {
      if (h.textContent?.trim() === item.text) {
        h.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }

  public getCategoryLabel(catKey: string): string {
    switch (catKey) {
      case 'Kien-Truc-Phan-Mem': return 'Kiến Trúc Phần Mềm';
      case 'Cong-Nghe': return 'Công Nghệ Mới';
      case 'Case-Study': return 'Case Study Thực Chiến';
      case 'Bao-Mat': return 'Bảo Mật Hệ Thống';
      default: return catKey;
    }
  }
}
