import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YinDataTableComponent, TableColumn } from './data-table.component';

describe('YinDataTableComponent', () => {
  let component: YinDataTableComponent;
  let fixture: ComponentFixture<YinDataTableComponent>;

  const mockColumns: TableColumn[] = [
    { key: 'title', label: 'Tiêu đề' },
    { key: 'category', label: 'Mục' },
    { key: 'status', label: 'Trạng thái' },
  ];

  const mockData = [
    { id: '1', title: 'Bài viết 1', category: 'Tech', status: 'PUBLISHED' },
    { id: '2', title: 'Bài viết 2', category: 'Design', status: 'DRAFT' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YinDataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YinDataTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', mockColumns);
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create the data table component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle selection of all rows', () => {
    expect(component['allSelected']()).toBe(false);
    component.toggleAll();
    expect(component['allSelected']()).toBe(true);
    expect(component.isRowSelected(mockData[0])).toBe(true);

    component.toggleAll();
    expect(component['allSelected']()).toBe(false);
  });

  it('should switch view modes correctly', () => {
    component.setView('board');
    expect(component['localView']()).toBe('board');

    component.setView('list');
    expect(component['localView']()).toBe('list');

    component.setView('table');
    expect(component['localView']()).toBe('table');
  });

  it('should handle search input', () => {
    const searchSpy = vi.spyOn(component.searchChange, 'emit');
    component.onSearchInput('angular');
    expect(component['localSearch']()).toBe('angular');
    expect(searchSpy).toHaveBeenCalledWith('angular');

    component.clearSearch();
    expect(component['localSearch']()).toBe('');
    expect(searchSpy).toHaveBeenCalledWith('');
  });

  it('should compute pagination range and navigate', () => {
    expect(component['effectiveTotal']()).toBe(2);
    expect(component['rangeText']()).toContain('1-2 of 2 rows');

    component.goToPage(1);
    expect(component['localPage']()).toBe(1);
  });
});

