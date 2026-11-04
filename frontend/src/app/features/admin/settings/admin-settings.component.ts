import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { YinIconComponent } from '../../../core/components/icon/icon.component';
import { AuthorProfileService } from '../../../core/services/author-profile.service';
import { ARTICLE_FORMAT_MARKDOWN_TEMPLATE, ARTICLE_AI_SYSTEM_PROMPT } from '../../../core/constants/article-format-template';

@Component({
  selector: 'yin-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
  imports: [FormsModule, YinIconComponent]
})
export class AdminSettingsComponent implements OnInit {
  private readonly authorProfile = inject(AuthorProfileService);
  
  protected readonly authorName = signal('');
  protected readonly authorRole = signal('');
  protected readonly profileError = signal('');
  protected readonly profileSaved = signal(false);
  protected readonly profileSaving = signal(false);
  protected readonly isCopiedPrompt = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const profile = await this.authorProfile.load();
      this.authorName.set(profile.authorName);
      this.authorRole.set(profile.authorRole);
    } catch {
      this.profileError.set('Không thể tải thông tin tác giả. Vui lòng tải lại trang.');
    }
  }

  async saveAuthorProfile(): Promise<void> {
    const authorName = this.authorName().trim();
    const authorRole = this.authorRole().trim();
    if (!authorName || !authorRole || authorName.length > 200 || authorRole.length > 200) {
      this.profileError.set('Nhập tên tác giả và vai trò, tối đa 200 ký tự mỗi mục.');
      return;
    }
    this.profileSaving.set(true);
    this.profileError.set('');
    this.profileSaved.set(false);
    try {
      await this.authorProfile.save({ authorName, authorRole });
      this.profileSaved.set(true);
      setTimeout(() => this.profileSaved.set(false), 2500);
    } catch {
      this.profileError.set('Không thể lưu thông tin tác giả. Vui lòng thử lại.');
    } finally {
      this.profileSaving.set(false);
    }
  }

  downloadFormatGuide(): void {
    const blob = new Blob([ARTICLE_FORMAT_MARKDOWN_TEMPLATE], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quy-dinh-va-mau-soan-bai.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  copyAiPrompt(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(ARTICLE_AI_SYSTEM_PROMPT);
      this.isCopiedPrompt.set(true);
      setTimeout(() => this.isCopiedPrompt.set(false), 2000);
    }
  }
}
