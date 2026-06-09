// src/app/features/ta-dashboard/pages/exam-summary/exam-summary.component.ts

import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TaApiService } from '../services/ta-api.service';
import { Subscription } from 'rxjs';
// src/app/features/ta-dashboard/models/exam-submissions.model.ts

export interface AlarmLogItem {
  time: string; // e.g., "At +12m"
  type: string; // e.g., "TabSwitch"
}

export interface StudentSubmission {
  studentId: string;
  name: string;
  academicId: string;
  status: 'Submitted' | 'No Submission';
  grade: string;      // e.g., "15 / 20"
  alarmCount: number;
  alarmLogs: AlarmLogItem[];
}
@Component({
  selector: 'app-exam-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './examsummary.html',
  styleUrls: ['./examsummary.css']
})

export class ExamSummaryComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taApiService = inject(TaApiService);
  private routeSubscription!: Subscription;

  examId = signal<string | null>(null);
  submissions = signal<StudentSubmission[]>([]);
  isLoading = signal<boolean>(true);

  // Side panel focus tracking state
  selectedStudent = signal<StudentSubmission | null>(null);
  isPanelOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe({
      next: (params) => {
        const id = params.get('id');
        if (id) {
          this.examId.set(id);
          this.loadExamSubmissionsGrid(id);
        }
      },
      error: (err) => {
        console.error('Error fetching exam parameter contextual links:', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadExamSubmissionsGrid(id: string): void {
    this.isLoading.set(true);
    this.taApiService.getExamSubmissions(id).subscribe({
      next: (data: StudentSubmission[]) => {
        this.submissions.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to stream contextual exam submissions pipeline:', err);
        this.isLoading.set(false);
      }
    });
  }

  openStudentPanel(student: StudentSubmission): void {
    this.selectedStudent.set(student);
    this.isPanelOpen.set(true);
  }

  closeStudentPanel(): void {
    this.isPanelOpen.set(false);
  }

  onBackToCourse(): void {
    // Navigates safely out back into the global workspace layout stack
    this.router.navigate(['/ta-dashboard']);
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
}
