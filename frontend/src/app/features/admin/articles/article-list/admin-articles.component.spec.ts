import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AdminArticlesComponent } from './admin-articles.component';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article } from '../../../../core/models/article.model';

describe('AdminArticlesComponent', () => {
  let component: AdminArticlesComponent;
  let fixture: ComponentFixture<AdminArticlesComponent>;

  const mockArticle: Article = {
    id: 'art_1',
    title: 'Kiến Trúc Microservices Với Angular 20',
    slug: 'kien-truc-microservices-angular-20',
    category: 'Cong-Nghe',
    status: 'PUBLISHED',
    focusKeyword: 'Angular 20',
    seoTitle: 'Kiến Trúc Microservices',
    seoDescription: 'Mô tả bài viết',
    summary: 'Tóm tắt bài viết...',
    contentHtml: '<p>Nội dung bài viết...</p>',
    contentJson: '{"type":"doc","content":[]}',
    thumbnailUrl: '/assets/images/sample.jpg',
    readingTimeMinutes: 5,
    wordCount: 1200,
    viewCount: 150,
    authorName: 'Yin Kenna',
    authorRole: 'Lead Architect',
    publishedAt: '2026-11-01T10:00:00Z',
    createdAt: '2026-11-01T09:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
  };

  const mockDbService = {
    adminUser: signal<{ id: string; username: string; role: string } | null>({
      id: 'adm_1',
      username: 'admin',
      role: 'ADMIN',
    }),
    getAdminArticles: vi.fn().mockResolvedValue({
      items: [mockArticle],
      hasMore: false,
      nextCursor: null,
    }),
    getTrashedArticles: vi.fn().mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
    }),
    getArticleCategories: vi.fn().mockResolvedValue({
      items: ['Cong-Nghe', 'Kien-Truc'],
    }),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
    restoreArticle: vi.fn().mockResolvedValue(mockArticle),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminArticlesComponent],
      providers: [
        provideRouter([]),
        { provide: LocalDbService, useValue: mockDbService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminArticlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and define all 8 required columns', () => {
    expect(component).toBeTruthy();
    expect(component.columns.length).toBe(8);

    const columnKeys = component.columns.map((c) => c.key);
    expect(columnKeys).toEqual([
      'title',
      'focusKeyword',
      'category',
      'status',
      'readingTimeMinutes',
      'viewCount',
      'createdAt',
      'actions',
    ]);
  });

  it('should load articles and categories on init', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    expect(mockDbService.getAdminArticles).toHaveBeenCalled();
    expect(mockDbService.getArticleCategories).toHaveBeenCalled();
    expect(component['articles']().length).toBe(1);
    expect(component['filteredArticles']().length).toBe(1);
    expect(component['filteredArticles']()[0].title).toBe('Kiến Trúc Microservices Với Angular 20');
  });

  it('should filter articles by search query', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    component.onSearchChange('Microservices');
    expect(component['filteredArticles']().length).toBe(1);

    component.onSearchChange('NonExistentTerm');
    expect(component['filteredArticles']().length).toBe(0);
  });

  it('should switch to trash and load trashed articles', async () => {
    component.onFilterChange({ id: 'status', value: 'TRASH' });
    fixture.detectChanges();

    expect(component['selectedStatus']()).toBe('TRASH');
    expect(mockDbService.getTrashedArticles).toHaveBeenCalled();
  });
});
