// src/app/features/ta-dashboard/pages/dashboard-ta/dashboard-ta.component.ts

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaApiService } from '../services/ta-api.service'; // تأكدي من مسار السيرفيس

@Component({
  selector: 'app-dashboard-ta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'dashboard-ta.html',
  styleUrl: 'dashboard-ta.css',
})
export class TaDashboardComponent implements OnInit {
  private router = inject(Router);
  private taApiService = inject(TaApiService);

  // السيرفر بيرجع الاسم حقيقي دلوقتي، وبنخليه داييناميك
  tutorName = signal<string>('Loading...');

  // الـ Signal الأساسي للمواد
  courses = signal<any[]>([]);

  // الـ Computed المظبوط بتاعك هيفضل شغال زي الساعة ويحسب المجموع لايف
  totalGlobalStudents = computed(() => {
    return this.courses().reduce((sum, course) => sum + course.students, 0);
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.taApiService.getDashboard().subscribe({
      next: (res: any) => {
        this.tutorName.set(res.tutorName);
        this.courses.set(res.courses); // هيملا المصفوفة بالـ 6 مواد اللي راجعين من الـ Swagger
      },
      error: (err) => {
        console.error('Failed to fetch dashboard data', err);
        this.tutorName.set('Error Loading Profile');
      }
    });
  }

 onOpenCourseDashboard(courseId: string): void {
  this.router.navigate(['/ta-dashboard/course', courseId]);
 }
  onDirectLogout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
