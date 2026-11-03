import { TestBed } from '@angular/core/testing';
import { SeoAnalyzerService } from './seo-analyzer.service';

describe('SeoAnalyzerService', () => {
  let service: SeoAnalyzerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoAnalyzerService);
  });

  it('should return score 0 when content is empty (early return)', () => {
    const result = service.analyze('Tiêu đề', '', 'từ khóa');
    expect(result.score).toBe(0);
    expect(result.wordCount).toBe(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should score well when keyword is present in title, heading and content', () => {
    const title = 'Thi công phần mềm doanh nghiệp';
    const content = `
      <h2>Chiến lược thi công phần mềm</h2>
      <p>${'Nội dung chuyên sâu về thi công phần mềm '.repeat(35)}</p>
    `;
    const result = service.analyze(title, content, 'thi công phần mềm');
    expect(result.hasTitleKeyword).toBe(true);
    expect(result.hasHeadingKeyword).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});

