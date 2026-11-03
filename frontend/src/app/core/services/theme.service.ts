import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'yin_theme';
  readonly theme = signal<AppTheme>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.theme());

    // Sync to DOM whenever theme signal changes
    effect(() => {
      const current = this.theme();
      this.applyTheme(current);
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, current);
      }
    });
  }

  private getInitialTheme(): AppTheme {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(this.STORAGE_KEY) as AppTheme | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  toggleTheme(): void {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }

  setTheme(newTheme: AppTheme): void {
    this.theme.set(newTheme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }
}

