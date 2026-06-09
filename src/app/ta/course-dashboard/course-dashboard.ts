// src/app/features/ta-dashboard/pages/course-dashboard/course-dashboard.component.ts

import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TaApiService } from '../services/ta-api.service';
import { CourseDetailsInfo, PastExam } from '../models/exam';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-course-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-dashboard.html',
  styleUrl:'./course-dashboard.css'

})
export class CourseDashboardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taApiService = inject(TaApiService);
  private routeSubscription!: Subscription;

  courseId = signal<string | null>(null);
  courseInfo = signal<CourseDetailsInfo | null>(null);
  exams = signal<PastExam[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe({
  next: (params) => {
    const id = params.get('id'); // This will now correctly grab the GUID from the URL
    if (id) {
      this.courseId.set(id);
      this.loadCourseDashboardData(id);
    }
  },
      error: (err) => {
        console.error('Error reading route configuration parameters:', err);
        this.isLoading.set(false);
      }
    });
  }
// src/app/features/ta-dashboard/pages/course-dashboard/course-dashboard.component.ts

private loadCourseDashboardData(id: string): void {
  this.isLoading.set(true);

  forkJoin({
    details: this.taApiService.getCourseDetails(id),
    examsList: this.taApiService.getPastExams(id)
  }).subscribe({
    next: ({ details, examsList }) => {
      this.courseInfo.set(details);

      // Safe fallback: uses examsList if present, otherwise defaults to an empty array
      this.exams.set(examsList || []);

      this.isLoading.set(false);
    },
    error: (err) => {
      console.error('Unified stream aggregation execution error encountered:', err);
      this.isLoading.set(false);
    }
  });
}

  onViewExamSummary(examId: string): void {
    this.router.navigate(['/ta-dashboard/exam-summary', examId]);
  }

  onCreateNewExam(): void {
    this.router.navigate(['/ta-dashboard/exam-builder'], {
      queryParams: { courseId: this.courseId() }
    });
  }


onViewAnalytics(examId: string): void {
  // Purely matches the newly structured dynamic wizard link configuration
  this.router.navigate(['/ta-dashboard/exam-analytics', examId]);
}

  onViewStudents(): void {
    this.router.navigate(['/ta-dashboard/course', this.courseId(), 'students']);
  }

  onBackToHome(): void {
    this.router.navigate(['/ta-dashboard']);
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
  // Inside CourseDashboardComponent class

// 1. Navigation for the General Course Analytics Screen (Passes Course GUID)
onViewCourseAnalytics(): void {
  this.router.navigate(['/ta-dashboard/course', this.courseId(), 'analytics']);
}

// 2. Navigation for the Real-Time Exam Monitoring Feed (Passes Exam GUID)
// src/app/features/ta-dashboard/pages/course-dashboard/course-dashboard.component.ts

onViewLiveExamStats(examId: string): void {
  this.router.navigate(['/ta-dashboard/exam-analytics', examId]);
}
}
