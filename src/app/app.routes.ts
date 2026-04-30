import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './auth/auth-guard'; // هنكودهم في الخطوة الجاية
import { confirmExitGuard } from './exam/exam-guard'; // جارد حماية الامتحان
import { Stdprofile } from './student/stdprofile/stdprofile';
import { SessionSummary } from './dashboard/summary/summary';
import { Profprofile } from './profprofile/profprofile';
import { CourseDetails } from './dashboard/course-details/course-details';
import { Dashboard } from './dashboard/dashboard';
import { Home } from './home/home';
import { Signup } from './auth/signup/signup';
import { Login } from './auth/login/login';
import { AdminManagement } from './admin/admin-management/admin-management';
import { IdentityVerifyComponent } from './student/identity-verify/identity-verify';
export const routes: Routes = [
 { path: '', redirectTo: '/home', pathMatch: 'full' },
 { path: 'home', component: Home, canActivate: [guestGuard] },
 { path: 'signup', component: Signup },
 { path: 'login', component: Login, canActivate: [guestGuard] },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard, roleGuard],
    data: { role: 'professor' }
  },
  {
    path: 'course/:id',
    component: CourseDetails,
    canActivate: [authGuard, roleGuard],
    data: { role: 'professor' }
  },
  {
    path: 'livedashboard/:id',
    loadComponent: () => import('./dashboard/livedashboard/livedashboard').then(m => m.LiveDashboard),
    canActivate: [authGuard, roleGuard],
    data: { role: 'professor' }
  },
  { path: 'summary', component: SessionSummary, canActivate: [authGuard] },
  { path: 'profprofile', component: Profprofile, canActivate: [authGuard] },

  {
    path: 'dashboardstudent',
    loadComponent: () => import('./student/dashboard-page/dashboard-page').then(m => m.DashboardPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'student' }
  },
  {
    path: 'courses',
    loadComponent: () => import('./student/course-selection/course-selection').then(m => m.CoursesPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'exam',
    loadComponent: () => import('./student/exam-editor/exam-editor').then(m => m.ExamEditorComponent),
    canActivate: [authGuard],
    canDeactivate: [confirmExitGuard]
  },
  // { path: 'results', loadComponent: () => import('./student/results/results').then(m => m.Results), canActivate: [authGuard] },
  { path: 'stdprofile', component: Stdprofile, canActivate: [authGuard] },
  {
    path: 'admin-dashboard',
    component: AdminManagement,
  }
,
{ path: 'exam/verify/:id', component: IdentityVerifyComponent },
  // {
  //   path: 'dashboard-ta',
  // }

];
