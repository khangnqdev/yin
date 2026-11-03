import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalDbService } from '../services/local-db.service';
import { ClientAuthService } from '../services/client-auth.service';

export const adminGuard: CanActivateFn = async () => {
  const db = inject(LocalDbService);
  const clientAuth = inject(ClientAuthService);
  const router = inject(Router);

  // Chặn hoàn toàn nếu người dùng đang dùng tài khoản Client
  if (clientAuth.isLoggedIn()) {
    return router.createUrlTree(['/']);
  }

  const ok = await db.loadAdmin();
  if (!ok) {
    return router.createUrlTree(['/admin/login']);
  }

  return true;
};
