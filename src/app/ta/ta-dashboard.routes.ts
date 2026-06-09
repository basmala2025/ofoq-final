// src/app/features/ta-dashboard/ta-dashboard.routes.ts

import { Routes } from '@angular/router';
import { CourseDashboardComponent } from './course-dashboard/course-dashboard';
import { ExamSummaryComponent } from './examsummary/examsummary';
import { ExamBuilderComponent } from './exam-builder/exam-builder';
import { CourseAnalyticsComponent } from './course-analytics/course-analytics';
import { CourseStudentsComponent } from './course-students/course-students';
import { Ta } from './ta';
import { TaDashboardComponent } from './dashboard-ta/dashboard-ta';

export const TA_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: Ta,
    children: [
      {
        path: '',
        component: TaDashboardComponent
      },
      {
        path: 'course/:id',
        component: CourseDashboardComponent
      },
      {
        path: 'course/:id/analytics',
        component: CourseAnalyticsComponent
      },
      {
        path: 'course/:id/students',
        component: CourseStudentsComponent
      },
      {
        path: 'exam-summary/:id',
        component: ExamSummaryComponent
      },
      {
        path: 'exam-analytics/:id', 
        component: CourseAnalyticsComponent
      },
      {
        path: 'exam-builder',
        component: ExamBuilderComponent
      }
    ]
  }
];
