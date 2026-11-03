import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminSettingsComponent } from './admin-settings.component';
import { AiConfigService } from '../../../core/services/ai-config.service';

describe('AdminSettingsComponent', () => {
  let component: AdminSettingsComponent;
  let fixture: ComponentFixture<AdminSettingsComponent>;
  let configService: AiConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiConfigService
      ]
    }).compileComponents();

    configService = TestBed.inject(AiConfigService);
    configService.resetToDefaults();

    fixture = TestBed.createComponent(AdminSettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create settings component and have default settings', () => {
    expect(component).toBeTruthy();
    expect(component['provider']()).toBe('acp');
    expect(component['acpServerUrl']()).toBe('http://localhost:8000');
  });

  it('should toggle API key visibility', () => {
    expect(component['showApiKey']()).toBe(false);
    component.toggleShowApiKey();
    expect(component['showApiKey']()).toBe(true);
  });

  it('should save settings', () => {
    component['apiKey'].set('my-secret-key');
    component.saveSettings();
    expect(component['isSavedSuccess']()).toBe(true);
    expect(configService.settings().apiKey).toBe('my-secret-key');
  });
});

