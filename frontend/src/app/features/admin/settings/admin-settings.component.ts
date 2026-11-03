import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiConfigService, AiProvider, AiSettings } from '../../../core/services/ai-config.service';
import { AiWriterService } from '../../../core/services/ai-writer.service';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

@Component({
  selector: 'yin-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
  imports: [FormsModule, YinIconComponent]
})
export class AdminSettingsComponent {
  private readonly configService = inject(AiConfigService);
  private readonly writerService = inject(AiWriterService);

  // Form Signals
  protected readonly provider = signal<AiProvider>(this.configService.settings().provider);
  protected readonly acpServerUrl = signal<string>(this.configService.settings().acpServerUrl);
  protected readonly apiKey = signal<string>(this.configService.settings().apiKey);
  protected readonly modelName = signal<string>(this.configService.settings().modelName);
  protected readonly systemPrompt = signal<string>(this.configService.settings().systemPrompt);
  protected readonly temperature = signal<number>(this.configService.settings().temperature);

  // Status Signals
  protected readonly isTesting = signal<boolean>(false);
  protected readonly testResult = signal<{ success: boolean; message: string } | null>(null);
  protected readonly isSavedSuccess = signal<boolean>(false);
  protected readonly showApiKey = signal<boolean>(false);

  toggleShowApiKey(): void {
    this.showApiKey.update(v => !v);
  }

  async testConnection(): Promise<void> {
    this.isTesting.set(true);
    this.testResult.set(null);

    // Lưu tạm thời để test với giá trị hiện tại trên form
    this.saveSettingsLocally();

    try {
      const res = await this.writerService.testConnection();
      this.testResult.set(res);
    } catch {
      this.testResult.set({
        success: false,
        message: 'Lỗi khi kiểm tra kết nối. Vui lòng kiểm tra lại địa chỉ máy chủ và API Key.'
      });
    } finally {
      this.isTesting.set(false);
    }
  }

  saveSettings(): void {
    this.saveSettingsLocally();
    this.isSavedSuccess.set(true);
    setTimeout(() => {
      this.isSavedSuccess.set(false);
    }, 2500);
  }

  private saveSettingsLocally(): void {
    this.configService.saveSettings({
      provider: this.provider(),
      acpServerUrl: this.acpServerUrl().trim(),
      apiKey: this.apiKey().trim(),
      modelName: this.modelName().trim(),
      systemPrompt: this.systemPrompt().trim(),
      temperature: this.temperature()
    });
  }

  resetDefaults(): void {
    if (confirm('Bạn có chắc muốn khôi phục toàn bộ cài đặt AI về mặc định?')) {
      this.configService.resetToDefaults();
      const current = this.configService.settings();
      this.provider.set(current.provider);
      this.acpServerUrl.set(current.acpServerUrl);
      this.apiKey.set(current.apiKey);
      this.modelName.set(current.modelName);
      this.systemPrompt.set(current.systemPrompt);
      this.temperature.set(current.temperature);
      this.testResult.set(null);
    }
  }
}
