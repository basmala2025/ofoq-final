import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  return token ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  const savedRole = localStorage.getItem('role')?.toLowerCase();

  if (token && savedRole) {
    if (savedRole === '3' || savedRole.includes('admin')) return router.createUrlTree(['/admin-dashboard']);
    if (savedRole === '2' || savedRole.includes('prof')) return router.createUrlTree(['/dashboard']);
    if (savedRole === '1' || savedRole === 'ta') return router.createUrlTree(['/ta-dashboard']); // بدلاً من dashboard-ta`
    return router.createUrlTree(['/dashboardstudent']);
  }
  return true;
};

export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);

  const savedRole = localStorage.getItem('role')?.toLowerCase() || '';
  const expectedRole = route.data['role']?.toLowerCase();

  let normalizedRole = 'student';
  if (savedRole === '3' || savedRole.includes('admin')) normalizedRole = 'admin';
  else if (savedRole === '2' || savedRole.includes('prof')) normalizedRole = 'professor';
  else if (savedRole === '1' || savedRole === 'ta') normalizedRole = 'ta';
  else if (savedRole === '0' || savedRole.includes('std')) normalizedRole = 'student';

  if (normalizedRole === expectedRole) {
    return true;
  }

  if (normalizedRole === 'admin') return router.createUrlTree(['/admin-dashboard']);
  if (normalizedRole === 'professor') return router.createUrlTree(['/dashboard']);
if (normalizedRole === 'ta') return router.createUrlTree(['/ta-dashboard']); // بدلاً من dashboard-ta
  if (normalizedRole === 'student') return router.createUrlTree(['/dashboardstudent']);

  localStorage.clear();
  return router.createUrlTree(['/login']);
};
