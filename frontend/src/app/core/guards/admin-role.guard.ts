import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalDbService } from '../services/local-db.service';

export const adminRoleGuard: CanActivateFn = route => {
  const db = inject(LocalDbService);
  const router = inject(Router);
  const allowed = route.data['roles'] as string[] | undefined;
  return !allowed || allowed.includes(db.adminUser()?.role || '')
    ? true : router.createUrlTree(['/admin']);
};
