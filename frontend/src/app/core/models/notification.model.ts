export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPosition = 'top-right' | 'bottom-right';
export type NotificationKind = 'status' | 'action';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
  isDanger?: boolean;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  kind?: NotificationKind; // 'status' (default: top-right) or 'action' (confirmations: bottom-right)
  position?: NotificationPosition; // Explicit position override
  title: string;
  message: string;
  timestamp: number;
  metaText?: string; // e.g. "2 mins ago", "v4.2", "Đang cập nhật"
  avatarUrl?: string; // Optional user avatar image
  avatarInitials?: string; // Fallback avatar letters
  progressPercent?: number; // 0-100 for upload / process states
  detailTitle?: string;
  detailContent?: string;
  detailItems?: Array<{ label: string; value: string }>;
  actions?: NotificationAction[];
  dismissText?: string; // e.g. "Dismiss", "Bỏ qua", "Hủy"
  duration?: number; // milliseconds before auto-dismiss; 0 = persistent
}
