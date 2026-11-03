import { Injectable } from '@angular/core';

interface StoredDraft<T> {
  data: T;
  savedAt: number; // Unix timestamp in ms
}

@Injectable({ providedIn: 'root' })
export class DraftStorageService {
  // Thời gian lưu trữ bản nháp mặc định: 12 tiếng (12 * 60 * 60 * 1000 ms)
  private readonly DEFAULT_EXPIRY_MS = 12 * 60 * 60 * 1000;

  /**
   * Lưu bản nháp vào localStorage kèm thời điểm lưu
   */
  saveDraft<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    const entry: StoredDraft<T> = {
      data,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(`yin_draft_${key}`, JSON.stringify(entry));
    } catch (e) {
      console.warn('Không thể lưu bản nháp vào localStorage:', e);
    }
  }

  /**
   * Lấy bản nháp từ localStorage.
   * Nếu đã quá 12 tiếng (hoặc maxAgeMs chỉ định), tự động xóa và trả về null.
   */
  getDraft<T>(key: string, maxAgeMs: number = this.DEFAULT_EXPIRY_MS): T | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`yin_draft_${key}`);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as StoredDraft<T>;
      const age = Date.now() - entry.savedAt;
      
      // Nếu đã quá 12 tiếng thì bản nháp hết hạn, phải xóa
      if (age > maxAgeMs) {
        this.clearDraft(key);
        return null;
      }

      return entry.data;
    } catch {
      this.clearDraft(key);
      return null;
    }
  }

  /**
   * Kiểm tra có bản nháp hợp lệ còn trong hạn 12 tiếng không
   */
  hasDraft(key: string, maxAgeMs: number = this.DEFAULT_EXPIRY_MS): boolean {
    return this.getDraft(key, maxAgeMs) !== null;
  }

  /**
   * Xóa bản nháp khi người dùng đã Lưu thành công hoặc chủ động Hủy
   */
  clearDraft(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`yin_draft_${key}`);
  }
}

