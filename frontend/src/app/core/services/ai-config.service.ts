import { Injectable, signal, computed } from '@angular/core';

export type AiProvider = 'acp' | 'gemini' | 'openai' | 'anthropic';

export interface AiSettings {
  provider: AiProvider;
  acpServerUrl: string;
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  temperature: number;
}

const DEFAULT_SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên nghiệp của Yin Kenna (Yin Platform) - đơn vị thi công và kiến trúc phần mềm cao cấp.
Nhiệm vụ của bạn là viết bài viết blog công nghệ chuyên sâu, chuẩn SEO, có cấu trúc chặt chẽ, luận điểm rõ ràng và ví dụ cụ thể.
Nội dung bài viết phải định dạng bằng HTML phong phú tương thích với Tiptap Editor (sử dụng <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <pre><code>, <table>).
Không chèn các thẻ <html>, <body>, <head>. Chỉ trả về nội dung HTML hợp lệ của thân bài.`;

const STORAGE_KEY = 'yin_ai_settings_v1';

@Injectable({
  providedIn: 'root'
})
export class AiConfigService {
  private readonly configSignal = signal<AiSettings>(this.loadStoredSettings());

  public readonly settings = computed(() => this.configSignal());
  public readonly isConfigured = computed(() => {
    const s = this.configSignal();
    if (s.provider === 'acp') {
      return Boolean(s.acpServerUrl && s.acpServerUrl.trim());
    }
    return Boolean(s.apiKey && s.apiKey.trim());
  });

  private loadStoredSettings(): AiSettings {
    if (typeof window === 'undefined') {
      return this.defaultSettings();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...this.defaultSettings(),
          ...parsed
        };
      }
    } catch {
      // Fallback
    }
    return this.defaultSettings();
  }

  private defaultSettings(): AiSettings {
    return {
      provider: 'acp',
      acpServerUrl: 'http://localhost:8000',
      apiKey: '',
      modelName: 'gemini-2.0-flash',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7
    };
  }

  public saveSettings(newSettings: Partial<AiSettings>): void {
    const updated: AiSettings = {
      ...this.configSignal(),
      ...newSettings
    };
    this.configSignal.set(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }

  public resetToDefaults(): void {
    const defaults = this.defaultSettings();
    this.configSignal.set(defaults);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    }
  }
}

