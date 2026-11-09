import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalDbService } from '../services/local-db.service';

export const adminRoleGuard: CanActivateFn = route => {
  const db = inject(LocalDbService);
  const router = inject(Router);
  const permission = route.data['permission'] as string | undefined;
  return db.loadError() || !permission || db.hasPermission(permission)
    ? true : router.createUrlTree(['/403']);
};
