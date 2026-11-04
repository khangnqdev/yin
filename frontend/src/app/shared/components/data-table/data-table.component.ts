import {
  Component,
  Directive,
  TemplateRef,
  contentChildren,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  icon?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  cellClass?: string;
}

export interface TableFilterOption {
  label: string;
  value: any;
}

export interface TableFilter {
  id: string;
  label: string;
  icon?: string;
  activeValue?: any;
  options: TableFilterOption[];
}

@Directive({
  selector: '[yinCell]',
})
export class YinCellDefDirective {
  public readonly column = input.required<string>({ alias: 'yinCell' });

  constructor(public readonly template: TemplateRef<any>) {}
}

@Component({
  selector: 'yin-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css'],
  imports: [FormsModule, NgTemplateOutlet, YinIconComponent],
})
export class YinDataTableComponent<T extends Record<string, any> = any> {
  // Column definitions and data
  public readonly columns = input.required<TableColumn<T>[]>();
  public readonly data = input<T[]>([]);
  public readonly loading = input<boolean>(false);
  public readonly totalCount = input<number | null>(null);
  public readonly trackBy = input<string>('id');

  // Pagination inputs
  public readonly pageSize = input<number>(15);
  public readonly pageSizeOptions = input<number[]>([10, 15, 25, 50]);
  public readonly currentPage = input<number>(1);
  public readonly serverSidePagination = input<boolean>(false);

  // Search & Filter inputs
  public readonly showSearch = input<boolean>(true);
  public readonly searchQuery = input<string>('');
  public readonly searchPlaceholder = input<string>('Search');
  public readonly filterPills = input<TableFilter[]>([]);

  // Toolbar & View inputs
  public readonly showViews = input<boolean>(true);
  public readonly currentView = input<'table' | 'board' | 'list'>('table');
  public readonly showHide = input<boolean>(true);
  public readonly showCustomize = input<boolean>(true);
  public readonly showMore = input<boolean>(true);
  public readonly showExport = input<boolean>(true);
  public readonly selectable = input<boolean>(true);

  // Primary Action
  public readonly primaryActionLabel = input<string>('');
  public readonly primaryActionIcon = input<string>('plus');

  // Empty state
  public readonly emptyMessage = input<string>('Không có dữ liệu phù hợp');
  public readonly emptySubMessage = input<string>('Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.');

  // Events / Outputs
  public readonly searchChange = output<string>();
  public readonly pageChange = output<number>();
  public readonly pageSizeChange = output<number>();
  public readonly viewChange = output<'table' | 'board' | 'list'>();
  public readonly primaryActionClick = output<void>();
  public readonly exportClick = output<void>();
  public readonly selectionChange = output<T[]>();
  public readonly filterChange = output<{ id: string; value: any }>();

  // Cell templates provided via <ng-template yinCell="key" let-row>
  public readonly cellTemplates = contentChildren(YinCellDefDirective);

  // Internal reactive states
  protected readonly localView = signal<'table' | 'board' | 'list'>('table');
  protected readonly localPage = signal<number>(1);
  protected readonly localPageSize = signal<number>(15);
  protected readonly localSearch = signal<string>('');
  protected readonly selectedKeys = signal<Set<string | number>>(new Set());

  // Dropdown states for filters and options
  protected readonly openFilterId = signal<string | null>(null);
  protected readonly isCustomizeOpen = signal<boolean>(false);
  protected readonly isMoreOpen = signal<boolean>(false);
  protected readonly hiddenColumns = signal<Set<string>>(new Set());

  constructor() {
    effect(() => {
      this.localView.set(this.currentView());
    });
    effect(() => {
      this.localPage.set(this.currentPage());
    });
    effect(() => {
      this.localPageSize.set(this.pageSize());
    });
    effect(() => {
      this.localSearch.set(this.searchQuery());
    });
  }

  // Active columns (omitting hidden ones)
  protected readonly visibleColumns = computed(() => {
    const hidden = this.hiddenColumns();
    return this.columns().filter((col) => !hidden.has(col.key));
  });

  // Effective rows to display
  protected readonly displayRows = computed(() => {
    const raw = this.data();
    if (this.serverSidePagination()) {
      return raw;
    }
    const page = this.localPage();
    const size = this.localPageSize();
    const start = (page - 1) * size;
    return raw.slice(start, start + size);
  });

  // Total items count
  protected readonly effectiveTotal = computed(() => {
    const explicit = this.totalCount();
    return explicit !== null && explicit !== undefined ? explicit : this.data().length;
  });

  // Total pages
  protected readonly totalPages = computed(() => {
    const total = this.effectiveTotal();
    const size = this.localPageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  // Pagination range text e.g. "1-15 of 380 rows"
  protected readonly rangeText = computed(() => {
    const total = this.effectiveTotal();
    if (total === 0) return '0 rows';
    const page = this.localPage();
    const size = this.localPageSize();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `${start}-${end} of ${total} rows`;
  });

  // Pagination page buttons list e.g. [1, 2, '...', 5]
  protected readonly pageList = computed(() => {
    const total = this.totalPages();
    const current = this.localPage();
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (current <= 3) {
      pages.push(1, 2, 3, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  });

  // Row selection computed states
  protected readonly allSelected = computed(() => {
    const rows = this.displayRows();
    if (rows.length === 0) return false;
    const keys = this.selectedKeys();
    return rows.every((r) => keys.has(this.getRowKey(r)));
  });

  protected readonly isIndeterminate = computed(() => {
    const rows = this.displayRows();
    if (rows.length === 0) return false;
    const keys = this.selectedKeys();
    const some = rows.some((r) => keys.has(this.getRowKey(r)));
    return some && !this.allSelected();
  });

  // Template resolver
  getCellTemplate(key: string): TemplateRef<any> | null {
    const match = this.cellTemplates().find((t) => t.column() === key);
    return match ? match.template : null;
  }

  // Row key getter
  getRowKey(row: T): string | number {
    const field = this.trackBy();
    return row[field] ?? JSON.stringify(row);
  }

  // Value getter with fallback
  getCellValue(row: T, key: string): string {
    const val = row[key];
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  // View switch
  setView(view: 'table' | 'board' | 'list'): void {
    if (this.localView() === view) return;
    this.localView.set(view);
    this.viewChange.emit(view);
  }

  // Search
  onSearchInput(value: string): void {
    this.localSearch.set(value);
    this.localPage.set(1);
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.onSearchInput('');
  }

  // Selection
  toggleAll(): void {
    const rows = this.displayRows();
    const keys = new Set(this.selectedKeys());
    if (this.allSelected()) {
      rows.forEach((r) => keys.delete(this.getRowKey(r)));
    } else {
      rows.forEach((r) => keys.add(this.getRowKey(r)));
    }
    this.selectedKeys.set(keys);
    this.emitSelection();
  }

  toggleRow(row: T): void {
    const key = this.getRowKey(row);
    const keys = new Set(this.selectedKeys());
    if (keys.has(key)) {
      keys.delete(key);
    } else {
      keys.add(key);
    }
    this.selectedKeys.set(keys);
    this.emitSelection();
  }

  isRowSelected(row: T): boolean {
    return this.selectedKeys().has(this.getRowKey(row));
  }

  private emitSelection(): void {
    const keys = this.selectedKeys();
    const selected = this.data().filter((r) => keys.has(this.getRowKey(r)));
    this.selectionChange.emit(selected);
  }

  // Pagination navigation
  goToPage(page: number | string): void {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages() || page === this.localPage()) return;
    this.localPage.set(page);
    this.pageChange.emit(page);
  }

  onPageSizeSelect(size: number): void {
    if (size === this.localPageSize()) return;
    this.localPageSize.set(size);
    this.localPage.set(1);
    this.pageSizeChange.emit(size);
  }

  // Filters
  toggleFilter(id: string): void {
    this.openFilterId.update((curr) => (curr === id ? null : id));
  }

  closeFilter(): void {
    this.openFilterId.set(null);
  }

  selectFilterValue(filterId: string, value: any): void {
    this.openFilterId.set(null);
    this.filterChange.emit({ id: filterId, value });
  }

  // Customize / Column hide
  toggleCustomize(): void {
    this.isCustomizeOpen.update((v) => !v);
  }

  toggleColumnVisibility(key: string): void {
    const set = new Set(this.hiddenColumns());
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.hiddenColumns.set(set);
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().has(key);
  }

  // Primary action & export
  onPrimaryAction(): void {
    this.primaryActionClick.emit();
  }

  onExport(): void {
    this.exportClick.emit();
  }
}
