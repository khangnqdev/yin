import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let titleService: Title;
  let metaService: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SeoService,
        provideRouter([])
      ]
    });
    service = TestBed.inject(SeoService);
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format title with Yin prefix', () => {
    service.updatePageSeo({ title: 'Dashboard' });
    expect(titleService.getTitle()).toBe('Yin | Dashboard');
  });

  it('should not duplicate Yin | prefix if already present', () => {
    service.updatePageSeo({ title: 'Yin | Trang Chủ' });
    expect(titleService.getTitle()).toBe('Yin | Trang Chủ');
  });

  it('should update meta description tag', () => {
    const testDesc = 'Yin (Yin Kenna) thi công phần mềm chất lượng cao.';
    service.updatePageSeo({
      title: 'Dịch Vụ',
      description: testDesc
    });

    const descMeta = metaService.getTag('name="description"');
    expect(descMeta?.content).toBe(testDesc);

    const ogDescMeta = metaService.getTag('property="og:description"');
    expect(ogDescMeta?.content).toBe(testDesc);
  });
});

