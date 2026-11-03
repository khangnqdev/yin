import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BlogDetailComponent } from './blog-detail.component';
import { LocalDbService } from '../../../../core/services/local-db.service';
import { Article } from '../../../../core/models/article.model';

describe('BlogDetailComponent', () => {
  let component: BlogDetailComponent;
  let fixture: ComponentFixture<BlogDetailComponent>;

  const mockArticle: Article = {
    id: 'art_2',
    title: 'Tối Ưu Change Detection Trong Angular v22 Với Signals',
    slug: 'toi-uu-change-detection-angular-v22-signals',
    summary: 'Khám phá cách mạng Signals trong Angular...',
    category: 'Cong-Nghe',
    thumbnailUrl: '/assets/logo/yinkenna.svg',
    status: 'PUBLISHED',
    focusKeyword: 'Angular Signals',
    contentHtml: '<h2 id="section-1">1. Mở đầu</h2><p>Nội dung bài viết rất dài...</p><h2 id="section-2">2. Kết luận</h2><p>Hết bài.</p>',
    contentJson: '',
    wordCount: 500,
    readingTimeMinutes: 3,
    viewCount: 150,
    authorName: 'Khang (Founder)',
    createdAt: '2026-10-22T09:30:00Z',
    publishedAt: '2026-10-22T09:30:00Z',
    updatedAt: '2026-10-22T09:30:00Z'
  };

  const mockDbService = {
    fetchArticleBySlug: vi.fn().mockResolvedValue(mockArticle),
    incrementArticleViews: vi.fn().mockResolvedValue(undefined),
    recordPageView: vi.fn(),
    getOrCreateSessionId: vi.fn().mockReturnValue('mock-session-id-123'),
    recordScrollDropOff: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogDetailComponent],
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
                get: (key: string) => (key === 'slug' ? 'toi-uu-change-detection-angular-v22-signals' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BlogDetailComponent);
    component = fixture.componentInstance;
  });

  it('should load article detail and initialize', async () => {
    expect(component).toBeTruthy();
    await component.ngOnInit();
    expect(mockDbService.fetchArticleBySlug).toHaveBeenCalledWith('toi-uu-change-detection-angular-v22-signals');
    expect(component['article']()?.title).toBe('Tối Ưu Change Detection Trong Angular v22 Với Signals');
  });

  it('should calculate reading progress based on title and body content boundaries', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    // Giả lập scroll ban đầu
    component.onScroll();
    expect(component['scrollProgress']()).toBeGreaterThanOrEqual(0);
    expect(component['scrollProgress']()).toBeLessThanOrEqual(100);
  });

  it('should have empty toc when article has no headings', async () => {
    mockDbService.fetchArticleBySlug.mockResolvedValueOnce({
      ...mockArticle,
      contentHtml: '<p>Nội dung ngắn gọn không có tiêu đề h nào.</p>'
    });
    await component.ngOnInit();
    expect(component['toc']()).toHaveLength(0);
  });

  it('should open and close image lightbox when image is clicked', () => {
    expect(component['zoomedImage']()).toBeNull();

    // Giả lập click vào ảnh có figure và figcaption
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = 'https://example.com/photo.png';
    img.alt = 'Ảnh mô tả';
    const caption = document.createElement('figcaption');
    caption.textContent = 'Chú thích chi tiết cho bức ảnh';
    figure.appendChild(img);
    figure.appendChild(caption);

    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: img, enumerable: true });

    component.handleContentClick(event);
    expect(component['zoomedImage']()).toEqual({
      src: 'https://example.com/photo.png',
      caption: 'Chú thích chi tiết cho bức ảnh'
    });

    component.closeLightbox();
    expect(component['zoomedImage']()).toBeNull();
  });
});
