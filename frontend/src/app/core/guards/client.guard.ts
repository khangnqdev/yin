import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClientAuthService } from '../services/client-auth.service';
import { LocalDbService } from '../services/local-db.service';

/**
 * Guard bảo vệ các trang thuộc về Client (/account, /account/support)
 */
export const clientGuard: CanActivateFn = async () => {
  const clientAuth = inject(ClientAuthService);
  const localDb = inject(LocalDbService);
  const router = inject(Router);

  // 1. Chặn token quản trị đối với route client
  if (localDb.isLoggedIn()) {
    return router.createUrlTree(['/admin']);
  }

  // 2. Kiểm tra token client
  if (!clientAuth.token()) {
    return router.createUrlTree(['/login']);
  }

  // 3. Tải và xác thực hồ sơ client
  const profile = await clientAuth.loadProfile();
  if (!profile) {
    clientAuth.logout();
    return router.createUrlTree(['/login']);
  }

  return true;
};

/**
 * Guard chuyển hướng nếu client đã đăng nhập khi vào /login hoặc /register
 */
export const clientGuestGuard: CanActivateFn = () => {
  const clientAuth = inject(ClientAuthService);
  const localDb = inject(LocalDbService);
  const router = inject(Router);

  if (localDb.isLoggedIn()) {
    return router.createUrlTree(['/admin']);
  }

  if (clientAuth.isLoggedIn()) {
    return router.createUrlTree(['/account']);
  }

  return true;
};

