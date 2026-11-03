import { Injectable, inject } from '@angular/core';
import { LocalDbService } from './local-db.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsTrackerService {
  private readonly db = inject(LocalDbService);

  private currentTargetId: string | null = null;
  private currentTargetTitle: string = '';
  private maxScrollDepth: number = 0;
  private lastObservedBlockId: string = '';
  private lastObservedBlockLabel: string = '';
  private pageEnterTimestamp: number = 0;
  private observer: IntersectionObserver | null = null;

  /**
   * Khởi tạo việc theo dõi một bài viết hoặc trang cụ thể.
   */
  public initTargetTracking(targetId: string, targetTitle: string): void {
    // 1. Early Return nếu tham số rỗng
    if (!targetId) {
      return;
    }

    // Reset trạng thái theo dõi cho mục tiêu mới
    this.currentTargetId = targetId;
    this.currentTargetTitle = targetTitle;
    this.maxScrollDepth = 0;
    this.lastObservedBlockId = '';
    this.lastObservedBlockLabel = '';
    this.pageEnterTimestamp = Date.now();

    // Dọn dẹp observer cũ nếu có
    if (this.observer) {
      this.observer.disconnect();
    }

    // 2. Tạo IntersectionObserver để theo dõi các block nội dung
    this.setupIntersectionObserver();
  }

  /**
   * Cập nhật chỉ số đọc từ phần trăm nội dung bài viết thực tế (tính từ title đến hết bài viết).
   */
  public handleScrollPercentage(scrollPercentage: number): void {
    if (!this.currentTargetId) {
      return;
    }

    let depthMilestone = 0;
    if (scrollPercentage >= 95) {
      depthMilestone = 100;
    } else if (scrollPercentage >= 70) {
      depthMilestone = 75;
    } else if (scrollPercentage >= 45) {
      depthMilestone = 50;
    } else if (scrollPercentage >= 20) {
      depthMilestone = 25;
    }

    if (depthMilestone <= this.maxScrollDepth) {
      return;
    }

    this.maxScrollDepth = depthMilestone;
    this.saveTrackingSnapshot();
  }

  /**
   * Lắng nghe vị trí cuộn trang để ghi nhận các mốc 25%, 50%, 75%, 100%.
   */
  public handleScrollPosition(): void {
    // Early return nếu không có mục tiêu đang theo dõi
    if (!this.currentTargetId) {
      return;
    }

    const docElem = document.documentElement;
    const body = document.body;
    const scrollTop = docElem.scrollTop || body.scrollTop;
    const scrollHeight = (docElem.scrollHeight || body.scrollHeight) - docElem.clientHeight;

    if (scrollHeight <= 0) {
      return;
    }

    const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
    let depthMilestone = 0;

    if (scrollPercentage >= 95) {
      depthMilestone = 100;
    } else if (scrollPercentage >= 70) {
      depthMilestone = 75;
    } else if (scrollPercentage >= 45) {
      depthMilestone = 50;
    } else if (scrollPercentage >= 20) {
      depthMilestone = 25;
    }

    // Early return nếu chưa vượt mốc sâu hơn
    if (depthMilestone <= this.maxScrollDepth) {
      return;
    }

    this.maxScrollDepth = depthMilestone;
    this.saveTrackingSnapshot();
  }

  /**
   * Kết thúc phiên đọc và lưu chỉ số điểm rời bỏ (Drop-off point).
   */
  public finalizeTracking(): void {
    // Early return nếu không có mục tiêu
    if (!this.currentTargetId) {
      return;
    }

    this.saveTrackingSnapshot();

    // Dọn dẹp observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.currentTargetId = null;
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // Chỉ ghi nhận khi phần tử xuất hiện trong khung nhìn
        if (!entry.isIntersecting) {
          continue;
        }

        const target = entry.target as HTMLElement;
        const blockId = target.id || target.getAttribute('data-block-id') || '';
        const blockLabel = target.innerText.trim().substring(0, 80) || blockId;

        if (blockId) {
          this.lastObservedBlockId = blockId;
          this.lastObservedBlockLabel = blockLabel;
        }
      }
    }, {
      threshold: 0.3
    });

    // Lấy tất cả các heading và khối nội dung để quan sát
    setTimeout(() => {
      if (!this.observer) {
        return;
      }
      const elements = document.querySelectorAll('.tracked-block, h1, h2, h3, [data-block-id]');
      elements.forEach(el => this.observer?.observe(el));
    }, 300);
  }

  private saveTrackingSnapshot(): void {
    if (!this.currentTargetId) {
      return;
    }

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - this.pageEnterTimestamp) / 1000));
    const sessionId = this.db.getOrCreateSessionId();

    this.db.recordScrollDropOff({
      sessionId,
      targetId: this.currentTargetId,
      targetTitle: this.currentTargetTitle,
      maxScrollDepth: this.maxScrollDepth,
      lastBlockId: this.lastObservedBlockId || 'intro-section',
      lastBlockLabel: this.lastObservedBlockLabel || 'Phần mở đầu',
      timeSpentSeconds
    });
  }
}

