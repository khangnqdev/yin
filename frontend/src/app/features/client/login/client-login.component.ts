import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { YinIconComponent } from '../../../shared/components/yin-icon/yin-icon.component';

@Component({
  selector: 'yin-client-login',
  imports: [CommonModule, FormsModule, RouterLink, YinIconComponent],
  templateUrl: './client-login.component.html',
  styleUrls: ['./client-login.component.css']
})
export class ClientLoginComponent implements OnInit {
  private readonly auth = inject(ClientAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['registered'] === 'true') {
      this.successMessage.set('Đăng ký tài khoản thành công! Vui lòng đăng nhập để bắt đầu trải nghiệm.');
      if (params['username']) {
        this.username.set(params['username']);
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    const usernameVal = this.username().trim();
    const passwordVal = this.password();

    if (!usernameVal || !passwordVal) {
      this.errorMessage.set('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.login({
        username: usernameVal,
        password: passwordVal
      });

      // Điều hướng vào trang quản lý tài khoản Client
      await this.router.navigate(['/account']);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 429) {
          this.errorMessage.set('Tài khoản tạm thời bị giới hạn do thử sai nhiều lần. Vui lòng thử lại sau ít phút.');
        } else {
          // Chuẩn bảo mật: Không phân biệt tên đăng nhập sai hay mật khẩu sai
          this.errorMessage.set('Tên đăng nhập hoặc mật khẩu không chính xác.');
        }
      } else {
        this.errorMessage.set('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

