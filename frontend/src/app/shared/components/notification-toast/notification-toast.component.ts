import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification, NotificationType } from '../../../core/models/notification.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';

interface DragState {
  id: string;
  startX: number;
  startY: number;
  currentX: number;
  deltaX: number;
  isDragging: boolean;
}

@Component({
  selector: 'yin-notification-toast',
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css'],
  imports: [DatePipe, YinIconComponent],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  }
})
export class YinNotificationToastComponent {
  protected readonly notificationService = inject(NotificationService);

  // Trạng thái mở rộng stack khi hover chuột
  protected readonly isTopHovered = signal<boolean>(false);
  protected readonly isBottomHovered = signal<boolean>(false);

  // Trạng thái kéo vuốt (swipe-to-dismiss) theo từng thông báo
  protected readonly dragStates = signal<Record<string, { deltaX: number; isDragging: boolean; isDismissing: boolean }>>({});

  private activeDrag: DragState | null = null;
  private readonly DISMISS_THRESHOLD = 75; // Ngưỡng vuốt (px) để trượt bỏ

  onEscape(): void {
    if (this.notificationService.activeDetail()) {
      this.notificationService.closeDetail();
    }
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'info': return 'info';
      case 'success': return 'check';
      case 'warning': return 'alert-triangle';
      case 'error': return 'alert-circle';
    }
  }

  // Pointer event handlers for swipe to dismiss
  onPointerDown(event: PointerEvent, item: AppNotification): void {
    const target = event.target as HTMLElement;
    // Không kích hoạt kéo vuốt nếu bấm trực tiếp vào nút đóng hoặc nút hành động
    if (target.closest('.toast-close-btn') || target.closest('.toast-action-btn') || target.closest('.toast-link-btn')) {
      return;
    }

    this.activeDrag = {
      id: item.id,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      deltaX: 0,
      isDragging: false
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent, item: AppNotification): void {
    if (!this.activeDrag || this.activeDrag.id !== item.id) {
      return;
    }

    const deltaX = event.clientX - this.activeDrag.startX;
    const deltaY = event.clientY - this.activeDrag.startY;

    if (!this.activeDrag.isDragging && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.activeDrag.isDragging = true;
      }
    }

    if (this.activeDrag.isDragging) {
      this.activeDrag.currentX = event.clientX;
      this.activeDrag.deltaX = deltaX;

      this.dragStates.update(current => ({
        ...current,
        [item.id]: {
          deltaX,
          isDragging: true,
          isDismissing: false
        }
      }));
    }
  }

  onPointerUp(event: PointerEvent, item: AppNotification): void {
    if (!this.activeDrag || this.activeDrag.id !== item.id) {
      return;
    }

    const isDragging = this.activeDrag.isDragging;
    const deltaX = this.activeDrag.deltaX;
    this.activeDrag = null;

    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // Ignored
    }

    // Nếu chỉ là click nhẹ (không kéo) thì mở popup chi tiết
    if (!isDragging || Math.abs(deltaX) < 8) {
      this.dragStates.update(current => {
        const copy = { ...current };
        delete copy[item.id];
        return copy;
      });
      this.openDetail(item);
      return;
    }

    // Nếu kéo vượt ngưỡng threshold (75px), kích hoạt hiệu ứng trượt bỏ hoàn toàn
    if (Math.abs(deltaX) > this.DISMISS_THRESHOLD) {
      const exitDirection = deltaX > 0 ? 450 : -450;
      this.dragStates.update(current => ({
        ...current,
        [item.id]: {
          deltaX: exitDirection,
          isDragging: false,
          isDismissing: true
        }
      }));

      setTimeout(() => {
        this.notificationService.dismiss(item.id);
        this.dragStates.update(current => {
          const copy = { ...current };
          delete copy[item.id];
          return copy;
        });
      }, 200);
    } else {
      // Snap back về vị trí ban đầu
      this.dragStates.update(current => ({
        ...current,
        [item.id]: {
          deltaX: 0,
          isDragging: false,
          isDismissing: false
        }
      }));

      setTimeout(() => {
        this.dragStates.update(current => {
          const copy = { ...current };
          delete copy[item.id];
          return copy;
        });
      }, 220);
    }
  }

  onPointerCancel(event: PointerEvent, item: AppNotification): void {
    this.activeDrag = null;
    this.dragStates.update(current => {
      const copy = { ...current };
      delete copy[item.id];
      return copy;
    });
  }

  // Stacking transform logic theo phong cách Dribbble (Stacking deck effect)
  getToastTransform(stackPos: 'top' | 'bottom', index: number, id: string): string {
    const drag = this.dragStates()[id];
    if (drag && drag.deltaX !== 0) {
      return `translateX(${drag.deltaX}px)`;
    }

    const isHovered = stackPos === 'top' ? this.isTopHovered() : this.isBottomHovered();

    // Khi di chuột vào (hover), các thẻ dãn ra tự nhiên với khoảng cách đều
    if (isHovered || index === 0) {
      return 'translateY(0) scale(1)';
    }

    // Khi không hover, xếp lớp 3D lồng nhau (stacking cards)
    const factor = Math.min(index, 3);
    const offsetY = stackPos === 'top' ? -factor * 10 : factor * 10;
    const scale = 1 - factor * 0.04;
    return `translateY(${offsetY}px) scale(${scale})`;
  }

  getToastOpacity(stackPos: 'top' | 'bottom', index: number, id: string): number {
    const drag = this.dragStates()[id];
    if (drag) {
      if (drag.isDismissing) return 0;
      if (drag.deltaX !== 0) return Math.max(0.15, 1 - Math.abs(drag.deltaX) / 240);
    }

    const isHovered = stackPos === 'top' ? this.isTopHovered() : this.isBottomHovered();
    if (isHovered || index === 0) return 1;

    // Các thẻ ở sau sẽ mờ dần nhẹ
    return Math.max(0.65, 1 - index * 0.15);
  }

  getToastZIndex(stackPos: 'top' | 'bottom', index: number): number {
    const isHovered = stackPos === 'top' ? this.isTopHovered() : this.isBottomHovered();
    if (isHovered) {
      return 100 - index;
    }
    // Thẻ đầu tiên nằm trên cùng
    return 100 - index;
  }

  isToastDragging(id: string): boolean {
    return this.dragStates()[id]?.isDragging || false;
  }

  isToastDismissing(id: string): boolean {
    return this.dragStates()[id]?.isDismissing || false;
  }

  openDetail(item: AppNotification): void {
    this.notificationService.openDetail(item);
  }

  closeDetail(): void {
    this.notificationService.closeDetail();
  }

  dismiss(item: AppNotification, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.dismiss(item.id);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('detail-popup-backdrop')) {
      this.closeDetail();
    }
  }
}
