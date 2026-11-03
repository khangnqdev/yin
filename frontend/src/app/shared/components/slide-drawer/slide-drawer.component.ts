import { Component, input, output } from '@angular/core';
import { YinIconComponent } from '../../components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-slide-drawer',
  templateUrl: './slide-drawer.component.html',
  styleUrls: ['./slide-drawer.component.css'],
  imports: [YinIconComponent],
  host: {
    '(document:keydown.escape)': 'onEscapeKey()'
  }
})
export class YinSlideDrawerComponent {
  // Trạng thái mở / đóng drawer
  readonly isOpen = input<boolean>(false);
  
  // Tiêu đề & mô tả phụ ở đầu drawer
  readonly title = input<string>('');
  readonly subtitle = input<string>('');

  // Tùy chỉnh nhãn nút bấm
  readonly saveText = input<string>('Lưu');
  readonly cancelText = input<string>('Hủy bỏ');
  readonly isSaving = input<boolean>(false);
  readonly saveDisabled = input<boolean>(false);

  // Cờ báo hiệu bản nháp vừa được khôi phục tự động
  readonly hasDraft = input<boolean>(false);

  // Sự kiện
  readonly close = output<void>();        // Khi bấm ngoài backdrop, nút X, hoặc phím Escape
  readonly cancel = output<void>();       // Khi bấm nút Hủy bỏ
  readonly save = output<void>();         // Khi bấm nút Lưu
  readonly clearDraft = output<void>();   // Khi bấm xóa bản nháp đã khôi phục

  onEscapeKey(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    // Chỉ kích hoạt khi click trực tiếp vào lớp phủ mờ bên ngoài
    if ((event.target as HTMLElement).classList.contains('drawer-backdrop')) {
      this.close.emit();
    }
  }
}
