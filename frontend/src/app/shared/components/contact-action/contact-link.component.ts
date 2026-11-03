import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ContactActionBaseComponent } from './contact-action-base.component';

/**
 * Reusable Component cho tất cả các liên kết / nút bấm điều hướng đến trang Liên Hệ.
 * Kế thừa trực tiếp từ ContactActionBaseComponent để tự động sở hữu:
 * - Kiểm tra vị trí trang hiện tại
 * - Hiển thị toast thông báo kèm popup chi tiết
 * - Cuộn trang thông minh
 * 
 * Cách dùng:
 * <yin-contact-link cssClass="nav-item" routerLinkActive="active">Liên Hệ</yin-contact-link>
 * <yin-contact-link cssClass="yin-btn yin-btn-primary nav-cta-pill">Tư Vấn Dự Án</yin-contact-link>
 */
@Component({
  selector: 'yin-contact-link',
  template: `
    <a 
      routerLink="/contact" 
      [routerLinkActive]="routerLinkActive()" 
      [routerLinkActiveOptions]="{ exact: exact() }"
      [class]="cssClass()" 
      [title]="title()"
      (click)="onClick($event)">
      <ng-content></ng-content>
    </a>
  `,
  imports: [RouterLink, RouterLinkActive]
})
export class YinContactLinkComponent extends ContactActionBaseComponent {
  readonly cssClass = input<string>('');
  readonly routerLinkActive = input<string>('');
  readonly exact = input<boolean>(false);
  readonly title = input<string>('Liên Hệ & Khảo Sát Dự Án');
  readonly clicked = output<void>();

  onClick(event: MouseEvent): void {
    this.clicked.emit();
    this.handleContactClick(event);
  }
}

