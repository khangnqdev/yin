import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AiWriterService } from './ai-writer.service';
import { AiConfigService } from './ai-config.service';

describe('AiWriterService', () => {
  let service: AiWriterService;
  let configService: AiConfigService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiWriterService,
        AiConfigService
      ]
    });

    service = TestBed.inject(AiWriterService);
    configService = TestBed.inject(AiConfigService);
    configService.resetToDefaults();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and have default ACP config', () => {
    expect(service).toBeTruthy();
    expect(configService.settings().provider).toBe('acp');
    expect(configService.settings().acpServerUrl).toBe('http://localhost:8000');
  });

  it('should save and update settings in AiConfigService', () => {
    configService.saveSettings({
      provider: 'gemini',
      apiKey: 'test-api-key',
      modelName: 'gemini-2.0-flash'
    });

    expect(configService.settings().provider).toBe('gemini');
    expect(configService.settings().apiKey).toBe('test-api-key');
    expect(configService.isConfigured()).toBe(true);
  });

  it('should generate article with ACP response', async () => {
    const promise = service.generateArticle({
      topic: 'Landing Page Video',
      category: 'Health',
      keywords: 'Gym, High-Converting'
    });

    const req = httpTesting.expectOne('http://localhost:8000/api/v1/generate');
    expect(req.request.method).toBe('POST');
    req.flush({
      title: 'Landing Page Video Guide',
      slug: 'landing-page-video-guide',
      excerpt: 'Summary test',
      categories: ['Health', 'Gym'],
      contentHtml: '<h2>Overview</h2><p>Content</p>'
    });

    const response = await promise;
    expect(response.title).toBe('Landing Page Video Guide');
    expect(response.slug).toBe('landing-page-video-guide');
    expect(response.categories).toContain('Health');
  });
});
