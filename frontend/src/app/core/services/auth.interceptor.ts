import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LocalDbService } from './local-db.service';
import { ClientAuthService } from './client-auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const clientAuth = inject(ClientAuthService);
  const localDb = inject(LocalDbService);

  let modifiedRequest = request;

  // 1. Gán Token tương ứng theo cổng API
  if (request.url.startsWith('/api/client/')) {
    const clientToken = clientAuth.token();
    if (clientToken) {
      modifiedRequest = request.clone({
        setHeaders: { Authorization: `Bearer ${clientToken}` }
      });
    }
  } else if (request.url.startsWith('/api/admin/')) {
    const adminToken = localDb.token();
    if (adminToken) {
      modifiedRequest = request.clone({
        setHeaders: { Authorization: `Bearer ${adminToken}` }
      });
    }
  }

  // 2. Bắt lỗi xác thực toàn cục
  return next(modifiedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      // Xử lý 401: Token hết hạn hoặc không hợp lệ -> Thu hồi và đưa về đúng trang đăng nhập
      if (error.status === 401) {
        if (request.url.startsWith('/api/client/')) {
          clientAuth.logout();
        } else if (request.url.startsWith('/api/admin/')) {
          localDb.requireReauthentication();
          void router.navigate(['/admin/login']);
        }
      }

      if (error.status === 503 && request.url.startsWith('/api/admin/')) {
        localDb.loadError.set('Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau.');
      }

      return throwError(() => error);
    })
  );
};
