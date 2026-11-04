import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-client-register',
  imports: [CommonModule, FormsModule, RouterLink, YinIconComponent],
  templateUrl: './client-register.component.html',
  styleUrls: ['./client-register.component.css']
})
export class ClientRegisterComponent {
  private readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly phone = signal('');
  protected readonly dateOfBirth = signal('');
  protected readonly receiveUpdates = signal(false);
  protected readonly agreeDataPolicy = signal(false);
  protected readonly showDataPolicyDetails = signal(false);

  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleDataPolicyDetails(): void {
    this.showDataPolicyDetails.update(v => !v);
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    const emailVal = this.email().trim();
    const usernameVal = this.username().trim();
    const passwordVal = this.password();
    const phoneVal = this.phone().trim();
    const dobVal = this.dateOfBirth().trim();

    // 1. Email: max 255, định dạng chuẩn
    const emailRegex = /^[^\s@<>]{1,64}@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/;
    if (!emailVal) {
      errors['email'] = 'Vui lòng nhập địa chỉ email.';
    } else if (emailVal.length > 255 || !emailRegex.test(emailVal)) {
      errors['email'] = 'Email không hợp lệ (tối đa 255 ký tự).';
    }

    // 2. Username: 3-50 ký tự ASCII chữ, số, _, ., -
    const userRegex = /^[A-Za-z0-9_.-]{3,50}$/;
    if (!usernameVal) {
      errors['username'] = 'Vui lòng nhập tên đăng nhập.';
    } else if (!userRegex.test(usernameVal)) {
      errors['username'] = 'Tên đăng nhập từ 3–50 ký tự ASCII (chữ, số, _, ., -).';
    }

    // 3. Password: 12-72 ký tự, không chứa khoảng trắng đầu/cuối
    if (!passwordVal) {
      errors['password'] = 'Vui lòng nhập mật khẩu.';
    } else if (passwordVal.length < 12 || passwordVal.length > 72) {
      errors['password'] = 'Mật khẩu phải từ 12 đến 72 ký tự.';
    } else if (passwordVal !== passwordVal.trim()) {
      errors['password'] = 'Mật khẩu không được chứa khoảng trắng ở đầu hoặc cuối.';
    }

    // 4. Phone: 7-15 chữ số, cho phép +, khoảng trắng, (), ., -
    const phoneDigits = phoneVal.replace(/\D/g, '');
    const phoneRegex = /^[+0-9() .-]+$/;
    if (!phoneVal) {
      errors['phone'] = 'Vui lòng nhập số điện thoại.';
    } else if (!phoneRegex.test(phoneVal) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      errors['phone'] = 'Số điện thoại phải chứa từ 7 đến 15 chữ số.';
    }

    // 5. Date of Birth: YYYY-MM-DD, không ở tương lai
    if (!dobVal) {
      errors['dateOfBirth'] = 'Vui lòng chọn ngày sinh.';
    } else {
      const selectedDate = new Date(dobVal);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(selectedDate.getTime()) || selectedDate > today) {
        errors['dateOfBirth'] = 'Ngày sinh không hợp lệ hoặc ở tương lai.';
      }
    }

    // 6. Chấp thuận Chính sách Bảo mật & Quản trị Dữ liệu (Bắt buộc)
    if (!this.agreeDataPolicy()) {
      errors['agreeDataPolicy'] = 'Vui lòng đọc và tích chọn đồng ý cho phép sử dụng thông tin cá nhân theo Chính sách Bảo mật.';
    }

    this.fieldErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.errorMessage.set('');
    if (!this.validateForm()) {
      return;
    }

    this.submitting.set(true);

    try {
      await this.auth.register({
        email: this.email().trim().toLowerCase(),
        username: this.username().trim(),
        password: this.password(),
        phone: this.phone().trim(),
        dateOfBirth: this.dateOfBirth().trim(),
        receiveUpdates: this.receiveUpdates()
      });

      // Đăng ký thành công -> Chuyển hướng sang trang đăng nhập với thông báo
      await this.router.navigate(['/login'], {
        queryParams: { registered: 'true', username: this.username().trim() }
      });
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 409) {
          this.errorMessage.set('Tên đăng nhập hoặc địa chỉ email đã tồn tại trong hệ thống.');
        } else if (err.status === 429) {
          this.errorMessage.set('Bạn đã thực hiện quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau ít phút.');
        } else if (err.status === 400) {
          this.errorMessage.set(err.error?.message || 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.');
        } else {
          this.errorMessage.set('Không thể hoàn tất đăng ký vào lúc này. Vui lòng thử lại sau.');
        }
      } else {
        this.errorMessage.set('Đã có lỗi xảy ra trong quá trình xử lý.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

