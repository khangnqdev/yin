import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminArticleEditComponent } from './admin-article-edit.component';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article } from '../../../../core/models/article.model';

describe('AdminArticleEditComponent', () => {
  let component: AdminArticleEditComponent;
  let fixture: ComponentFixture<AdminArticleEditComponent>;

  const mockArticle: Article = {
    id: 'art_2',
    title: 'Tối Ưu Change Detection Trong Angular v22 Với Signals & Fine-Grained Reactivity',
    slug: 'toi-uu-change-detection-angular-v22-signals',
    summary: 'Khám phá cách mạng Signals trong Angular...',
    category: 'Health, Gym, High-Converting',
    thumbnailUrl: '/assets/logo/yinkenna.svg',
    status: 'PUBLISHED',
    focusKeyword: 'Angular Signals',
    contentHtml: '<h2>Kỷ nguyên Zoneless và Signals</h2><p>Angular đã bước sang trang mới...</p>',
    contentJson: '',
    wordCount: 450,
    readingTimeMinutes: 4,
    viewCount: 285,
    authorName: 'John Doe',
    createdAt: '2026-11-01T08:00:00Z',
    publishedAt: '2024-10-01T08:00:00Z',
    updatedAt: '2026-11-02T10:30:00Z'
  };

  const mockDbService = {
    fetchAdminArticleById: vi.fn().mockResolvedValue(mockArticle),
    saveArticle: vi.fn().mockResolvedValue(mockArticle),
    uploadImage: vi.fn().mockResolvedValue('/assets/uploads/test.png')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminArticleEditComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LocalDbService, useValue: mockDbService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'art_2' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminArticleEditComponent);
    component = fixture.componentInstance;
  });

  it('should create the editor component and load article art_2', async () => {
    expect(component).toBeTruthy();
    await component.ngOnInit();
    expect(mockDbService.fetchAdminArticleById).toHaveBeenCalledWith('art_2');
    expect(component['title']()).toBe('Tối Ưu Change Detection Trong Angular v22 Với Signals & Fine-Grained Reactivity');
    expect(component['slug']()).toBe('toi-uu-change-detection-angular-v22-signals');
    expect(component['categories']()).toEqual(['Health', 'Gym', 'High-Converting']);
    expect(component['authorName']()).toBe('John Doe');
  });

  it('starts a new editor in draft state', () => {
    expect(component['status']()).toBe('DRAFT');
  });

  it('should add and remove category chips', () => {
    component['addCategory']('New Tag');
    expect(component['categories']()).toContain('New Tag');

    const index = component['categories']().indexOf('New Tag');
    component['removeCategory'](index, new MouseEvent('click'));
    expect(component['categories']()).not.toContain('New Tag');
  });

  it('should handle author selection', () => {
    component['selectAuthor']({
      name: 'Khang (Founder)',
      role: 'Chief Architect & Founder',
      avatar: 'https://images.unsplash.com/test.jpg'
    });
    expect(component['authorName']()).toBe('Khang (Founder)');
    expect(component['authorRole']()).toBe('Chief Architect & Founder');
  });

  it('should open and close AI modal and apply AI generated result', () => {
    component['openAiModal']();
    expect(component['isAiModalOpen']()).toBe(true);

    component['aiGeneratedResult'].set({
      title: 'AI Generated Title',
      slug: 'ai-generated-title',
      excerpt: 'AI summary',
      categories: ['AI', 'Tech'],
      contentHtml: '<p>AI content</p>'
    });

    component['applyAiResult']();
    expect(component['title']()).toBe('AI Generated Title');
    expect(component['slug']()).toBe('ai-generated-title');
    expect(component['excerpt']()).toBe('AI summary');
    expect(component['categories']()).toEqual(['AI', 'Tech']);
    expect(component['isAiModalOpen']()).toBe(false);
  });

  it('should upload cover image via file and update coverImage signal', async () => {
    const fakeFile = new File(['dummy content'], 'cover.png', { type: 'image/png' });
    await component.uploadAndSetCover(fakeFile);
    expect(mockDbService.uploadImage).toHaveBeenCalledWith(fakeFile);
    expect(component['coverImage']()).toBe('/assets/uploads/test.png');
  });

  it('should save/publish article', async () => {
    await component.ngOnInit();
    await component.saveArticle();
    expect(mockDbService.saveArticle).toHaveBeenCalled();
    expect(component['isSavedSuccess']()).toBe(true);
  });

  it('should support quick action saveDraft and publishArticle', async () => {
    await component.ngOnInit();
    
    // Quick action: saveDraft
    await component.saveDraft();
    expect(mockDbService.saveArticle).toHaveBeenCalled();

    // Quick action: publishArticle sets status to PUBLISHED
    await component.publishArticle();
    expect(component['status']()).toBe('PUBLISHED');
    expect(mockDbService.saveArticle).toHaveBeenCalled();
  });

  it('shows the backend reason when saving fails', async () => {
    mockDbService.saveArticle.mockRejectedValueOnce(new HttpErrorResponse({
      status: 400,
      error: { message: 'contentJson is too long' }
    }));
    await component.ngOnInit();
    await component.saveArticle();
    expect(component['errorMessage']()).toContain('contentJson is too long');
  });
});
