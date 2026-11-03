import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { LocalDbService } from '../../../core/services/local-db.service';

@Component({
  selector: 'yin-admin-login',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="login-shell">
      <form class="login-card" (ngSubmit)="submit()">
        <a routerLink="/" class="back-link">← Về trang chủ</a>
        <img src="/assets/logo/yinkenna.svg" alt="Yin" width="150" height="45" />
        <h1>Đăng nhập quản trị</h1>
        <label for="username">Tên đăng nhập</label>
        <input
          id="username"
          name="username"
          [ngModel]="username()"
          (ngModelChange)="username.set($event)"
          autocomplete="username"
          required
        />
        <label for="password">Mật khẩu</label>
        <input
          id="password"
          name="password"
          type="password"
          [ngModel]="password()"
          (ngModelChange)="password.set($event)"
          autocomplete="current-password"
          required
        />
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <button type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Đang đăng nhập…' : 'Đăng nhập' }}
        </button>
      </form>
    </main>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: var(--yin-bg);
        padding: 24px;
        transition: background 0.25s ease;
      }
      .login-card {
        width: min(100%, 420px);
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 32px;
        background: var(--yin-surface);
        border: 1px solid var(--yin-border);
        border-radius: 20px;
        box-shadow: var(--yin-shadow-card);
        transition: background 0.25s ease, border-color 0.25s ease;
      }
      .back-link {
        color: var(--yin-text-dim);
        text-decoration: none;
        margin-bottom: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        transition: color 0.2s ease;
      }
      .back-link:hover {
        color: var(--yin-gold);
      }
      .login-card h1 {
        font-size: 1.65rem;
        margin: 4px 0 8px;
        color: var(--yin-text-main);
        font-weight: 800;
      }
      label {
        font-weight: 700;
        color: var(--yin-text-main);
        font-size: 0.9rem;
      }
      input {
        padding: 11px 14px;
        border: 1px solid var(--yin-border);
        background: var(--yin-surface-elevated);
        color: var(--yin-text-main);
        border-radius: 10px;
        font: inherit;
        transition: all 0.2s ease;
      }
      input:focus {
        outline: none;
        border-color: var(--yin-gold);
        box-shadow: 0 0 0 3px rgba(228, 176, 40, 0.2);
      }
      button {
        margin-top: 10px;
        padding: 12px;
        border: 0;
        border-radius: 10px;
        background: var(--yin-main);
        color: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      button:hover {
        background: var(--yin-gold);
        color: #0B1849;
      }
      button:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      .error {
        color: #aa1e2c;
        margin: 0;
      }
    `,
  ],
})
export class AdminLoginComponent {
  private readonly db = inject(LocalDbService);
  private readonly router = inject(Router);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');
    try {
      await this.db.login(this.username(), this.password());
      await this.router.navigate(['/admin']);
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 429
          ? 'Đã thử đăng nhập quá nhiều lần. Vui lòng đợi khoảng 15 phút.'
          : 'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
