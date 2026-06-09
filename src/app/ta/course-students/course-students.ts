// src/app/features/ta-dashboard/pages/course-students/course-students.component.ts

import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaApiService, StudentRiskInfo } from '../services/ta-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-course-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-students.html',
  styles: [`
    :host {
      display: block;
      background-color: #f8fafc;
      min-height: 100vh;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .students-container {
      max-width: 1200px;
      margin: 40px auto 0;
      padding: 0 24px 60px;
    }

    .back-btn {
      background: none; border: none; color: #475569;
      font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 25px;
      display: inline-flex; align-items: center; transition: color 0.15s ease;
    }
    .back-btn:hover { color: #5f369e; }

    .page-title-block {
      display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700;
      color: #475569; text-transform: uppercase; margin-bottom: 16px;
    }

    /* ── SEARCH & FILTER BAR ── */
    .controls-row {
      display: flex; gap: 16px; margin-bottom: 24px; align-items: center; justify-content: space-between;
    }
    .search-input {
      font-family: inherit; font-size: 14px; padding: 10px 16px; width: 100%; max-width: 340px;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: all 0.15s;
    }
    .search-input:focus { border-color: #5f369e; box-shadow: 0 0 0 3px rgba(95,54,158,0.1); }

    /* ── TABLE SYSTEM ── */
    .table-wrap {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    thead th { padding: 16px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease; }
    tbody tr:hover { background: #f8fafc; }
    tbody td { padding: 16px 20px; font-size: 14px; color: #334155; vertical-align: middle; }

    .student-display-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .student-meta-email { font-size: 12px; color: #94a3b8; margin-top: 2px; font-weight: 500; }
    .mono { font-family: monospace; font-size: 13px; color: #334155; font-weight: 600; }

    /* ── RISK BADGES (MATCHING SCREENSHOT) ── */
    .badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-safe { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-flagged { background: #fee2e2; color: #b91c1c; }

    .action-link { background: none; border: none; font-family: inherit; font-size: 13px; font-weight: 700; color: #5f369e; cursor: pointer; padding: 0; transition: color 0.15s; }
    .action-link:hover { color: #f47545; text-decoration: underline; }
  `]
})
export class CourseStudentsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taApiService = inject(TaApiService);
  private routeSubscription!: Subscription;

  courseId = signal<string | null>(null);
  students = signal<StudentRiskInfo[]>([]);
  isLoading = signal<boolean>(true);
  searchTerm = signal<string>('');

  filteredStudents = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.students();
    return this.students().filter(student =>
      student.name.toLowerCase().includes(term) ||
      student.academicId.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe({
      next: (params) => {
        const id = params.get('id');
        if (id) {
          this.courseId.set(id);
          this.loadStudentsData(id);
        }
      },
      error: (err) => {
        console.error('Error reading course routing parameters:', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadStudentsData(id: string): void {
    this.isLoading.set(true);
    this.taApiService.getEnrolledStudents(id).subscribe({
      next: (data: StudentRiskInfo[]) => {
        this.students.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load course students risk distribution matrix:', err);
        this.isLoading.set(false);
      }
    });
  }

  onBackToCourse(): void {
    this.router.navigate(['/ta-dashboard/course', this.courseId()]);
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) this.routeSubscription.unsubscribe();
  }
}
