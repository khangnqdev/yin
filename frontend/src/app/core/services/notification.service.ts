import { Injectable, signal, computed } from '@angular/core';
import { AppNotification, NotificationType, NotificationKind, NotificationPosition } from '../models/notification.model';

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: NotificationType;
  metaText?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  detailTitle?: string;
  detailContent?: string;
  detailItems?: Array<{ label: string; value: string }>;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  readonly activeDetail = signal<AppNotification | null>(null);

  // Nhóm 1: Thông báo trạng thái (Status Notifications) hiển thị ở PHÍA TRÊN BÊN PHẢI (top-right)
  readonly statusNotifications = computed(() => {
    return this.notifications().filter(n => {
      const pos = n.position || (n.kind === 'action' ? 'bottom-right' : 'top-right');
      return pos === 'top-right';
    });
  });

  // Nhóm 2: Thông báo cần xác nhận (Action / Confirmation Notifications) hiển thị ở PHÍA DƯỚI BÊN PHẢI (bottom-right)
  readonly actionNotifications = computed(() => {
    return this.notifications().filter(n => {
      const pos = n.position || (n.kind === 'action' ? 'bottom-right' : 'top-right');
      return pos === 'bottom-right';
    });
  });

  private readonly autoDismissTimers = new Map<string, number>();

  show(notification: Omit<AppNotification, 'id' | 'timestamp'>): string {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const kind: NotificationKind = notification.kind || 'status';
    const position: NotificationPosition = notification.position || (kind === 'action' ? 'bottom-right' : 'top-right');
    
    // Mặc định: Thông báo trạng thái tự biến mất sau 6s. Thông báo xác nhận giữ cố định (duration = 0) hoặc do người dùng truyền vào.
    const defaultDuration = kind === 'action' ? 0 : 6000;
    const duration = notification.duration !== undefined ? notification.duration : defaultDuration;

    const item: AppNotification = {
      ...notification,
      id,
      kind,
      position,
      timestamp: Date.now(),
      duration
    };

    // Đưa thông báo mới lên đầu danh sách
    this.notifications.update(current => [item, ...current]);

    if (duration > 0) {
      if (typeof window !== 'undefined') {
        const timer = window.setTimeout(() => {
          this.dismiss(id);
        }, duration);
        this.autoDismissTimers.set(id, timer);
      }
    }

    return id;
  }

  // 1. Dành cho thông báo trạng thái (Hiển thị Top-Right)
  showStatus(
    title: string, 
    message: string, 
    options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'title' | 'message' | 'kind' | 'position'>>
  ): string {
    return this.show({
      kind: 'status',
      position: 'top-right',
      type: options?.type || 'info',
      title,
      message,
      ...options
    });
  }

  // 2. Dành cho thông báo cần xác nhận (Hiển thị Bottom-Right)
  confirm(options: ConfirmOptions): string {
    const idRef = { id: '' };

    idRef.id = this.show({
      kind: 'action',
      position: 'bottom-right',
      type: options.type || 'warning',
      title: options.title,
      message: options.message,
      metaText: options.metaText,
      duration: 0, // Cần tương tác người dùng
      detailTitle: options.detailTitle,
      detailContent: options.detailContent,
      detailItems: options.detailItems,
      dismissText: options.cancelText || 'Bỏ qua',
      actions: [
        {
          label: options.cancelText || 'Hủy bỏ',
          onClick: () => {
            if (options.onCancel) options.onCancel();
            this.dismiss(idRef.id);
          }
        },
        {
          label: options.confirmText || 'Xác nhận',
          isPrimary: true,
          isDanger: options.isDanger,
          onClick: () => {
            options.onConfirm();
            this.dismiss(idRef.id);
          }
        }
      ]
    });

    return idRef.id;
  }

  showAction(
    title: string,
    message: string,
    options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'title' | 'message' | 'kind' | 'position'>>
  ): string {
    return this.show({
      kind: 'action',
      position: 'bottom-right',
      type: options?.type || 'info',
      title,
      message,
      ...options
    });
  }

  info(
    title: string, 
    message: string, 
    options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'type' | 'title' | 'message'>>
  ): string {
    return this.show({ type: 'info', title, message, ...options });
  }

  success(
    title: string, 
    message: string, 
    options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'type' | 'title' | 'message'>>
  ): string {
    return this.show({ type: 'success', title, message, ...options });
  }

  warning(
    title: string, 
    message: string, 
    options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'type' | 'title' | 'message'>>
  ): string {
    return this.show({ type: 'warning', title, message, ...options });
  }

  error(
    title: string, 
    message: string, 
    options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'type' | 'title' | 'message'>>
  ): string {
    return this.show({ type: 'error', title, message, ...options });
  }

  dismiss(id: string): void {
    if (this.autoDismissTimers.has(id)) {
      clearTimeout(this.autoDismissTimers.get(id));
      this.autoDismissTimers.delete(id);
    }
    this.notifications.update(list => list.filter(n => n.id !== id));
    if (this.activeDetail()?.id === id) {
      this.activeDetail.set(null);
    }
  }

  openDetail(notification: AppNotification): void {
    this.activeDetail.set(notification);
  }

  closeDetail(): void {
    this.activeDetail.set(null);
  }
}
