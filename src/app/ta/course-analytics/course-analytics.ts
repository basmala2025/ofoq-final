// src/app/features/ta-dashboard/pages/course-analytics/course-analytics.component.ts

import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TaApiService, GeneralCourseAnalytics } from '../services/ta-api.service';
import { Subscription } from 'rxjs';

// Definition of types for API 5 (Live Exam Tracker) Context Flow
export interface CheatingAlert {
  studentName: string;
  violationType: string;
  timestamp: string;
  alarmCount: number;
}

export interface LiveExamStats {
  averageGrade: string;
  timeRemainingMinutes: number;
  totalStudents: number;
  attendedCount: number;
  activeCheatingAlerts: CheatingAlert[];
}

@Component({
  selector: 'app-course-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-analytics.html',
  styleUrls: ['./course-analytics.css']
})
export class CourseAnalyticsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taApiService = inject(TaApiService);
  private routeSubscription!: Subscription;

  // Structural dynamic layout state flags
  isLiveExamMode = signal<boolean>(false);
  entityId = signal<string | null>(null);
  isLoading = signal<boolean>(true);

  // Dynamic conditional data store signals
  generalAnalytics = signal<GeneralCourseAnalytics | null>(null);
  liveExamStats = signal<LiveExamStats | null>(null);

  ngOnInit(): void {
    // Inspects URL string directly to evaluate targeted view composition template
    const currentUrl = this.router.url;
    if (currentUrl.includes('exam-analytics')) {
      this.isLiveExamMode.set(true);
    } else {
      this.isLiveExamMode.set(false);
    }

    this.routeSubscription = this.route.paramMap.subscribe({
      next: (params) => {
        const id = params.get('id');
        if (id) {
          this.entityId.set(id);
          if (this.isLiveExamMode()) {
            this.loadLiveExamData(id); // Fire API 5 Endpoints Flow
          } else {
            this.loadGeneralCourseData(id); // Fire API 7 Endpoints Flow
          }
        }
      },
      error: (err) => {
        console.error('Unified template evaluation configuration parsing error:', err);
        this.isLoading.set(false);
      }
    });
  }

  // VIEW 7 Layer Processor Execution Method
  private loadGeneralCourseData(courseId: string): void {
    this.isLoading.set(true);
    this.taApiService.getGeneralCourseAnalytics(courseId).subscribe({
      next: (data: GeneralCourseAnalytics) => {
        this.generalAnalytics.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to resolve global course aggregated metrics layer:', err);
        this.isLoading.set(false);
      }
    });
  }

  // VIEW 5 Layer Processor Execution Method
  private loadLiveExamData(examId: string): void {
    this.isLoading.set(true);
    this.taApiService.getLiveExamStats(examId).subscribe({
      next: (data: any) => {
        this.liveExamStats.set(data as LiveExamStats);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to stream contextual real-time session tracking matrix:', err);
        this.isLoading.set(false);
      }
    });
  }

  onBack(): void {
    if (this.isLiveExamMode()) {
      window.history.back();
    } else {
      this.router.navigate(['/ta-dashboard/course', this.entityId()]);
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
}
