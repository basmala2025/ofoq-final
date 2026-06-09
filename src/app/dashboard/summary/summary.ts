import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { SummaryService, SessionSummary } from '../summary';

@Component({
  selector: 'app-session-summary',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './summary.html',
  styleUrls: ['./summary.css']
})
export class sessionSummaryData implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('focusTimelineCanvas') focusTimelineCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('attendancePieCanvas') attendancePieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('focusRadarCanvas') focusRadarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('performanceBarCanvas') performanceBarCanvas!: ElementRef<HTMLCanvasElement>;

  summary: SessionSummary | null = null;

  // Calculated metrics
  peakFocus = 0;
  lowestFocus = 0;
  focusVariance = 0;
  engagementScore = 0;
  sessionDate = '';
  sessionTime = '';

  // Performance categories
  highPerformers = 0;
  moderatePerformers = 0;
  needsAttention = 0;

  private charts: Chart[] = [];

  constructor(
    private router: Router,
    private summaryService: SummaryService
  ) {}

  ngOnInit(): void {
    this.summary = this.summaryService.getSummary();

    if (!this.summary) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.calculateMetrics();
    this.setDateTime();
  }

  ngAfterViewInit(): void {
    if (this.summary) {
      this.createCharts();
    }
  }

  private setDateTime(): void {
    const now = new Date();
    this.sessionDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.sessionTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private calculateMetrics(): void {
    if (!this.summary) return;

    const focusValues = (this.summary as any).focusHistory?.map((h: any) => h.focus) || [this.summary.averageFocus];
    this.peakFocus = Math.round(Math.max(...focusValues));
    this.lowestFocus = Math.round(Math.min(...focusValues));

    // Calculate variance
    const avg = focusValues.reduce((a: number, b: number) => a + b, 0) / focusValues.length;
    const variance = focusValues.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / focusValues.length;
    this.focusVariance = Math.round(Math.sqrt(variance));

    const attendanceRate = Math.round((this.summary.presentStudents / this.summary.totalStudents) * 100);
    this.engagementScore = Math.round(
      (attendanceRate * 0.3) +
      (this.summary.averageFocus * 0.5) +
      ((100 - this.focusVariance) * 0.2)
    );

    // Categorize performance
    if (this.summary.averageFocus >= 80) {
      this.highPerformers = Math.round(this.summary.presentStudents * 0.7);
      this.moderatePerformers = Math.round(this.summary.presentStudents * 0.25);
      this.needsAttention = this.summary.presentStudents - this.highPerformers - this.moderatePerformers;
    } else if (this.summary.averageFocus >= 60) {
      this.highPerformers = Math.round(this.summary.presentStudents * 0.4);
      this.moderatePerformers = Math.round(this.summary.presentStudents * 0.45);
      this.needsAttention = this.summary.presentStudents - this.highPerformers - this.moderatePerformers;
    } else {
      this.highPerformers = Math.round(this.summary.presentStudents * 0.2);
      this.moderatePerformers = Math.round(this.summary.presentStudents * 0.4);
      this.needsAttention = this.summary.presentStudents - this.highPerformers - this.moderatePerformers;
    }
  }

  private createCharts(): void {
    this.createFocusTimelineChart();
    this.createAttendancePieChart();
    this.createFocusRadarChart();
    this.createPerformanceBarChart();
  }

  private createFocusTimelineChart(): void {
    const focusHistory = (this.summary as any).focusHistory || [];

    if (focusHistory.length === 0) return;

    const chart = new Chart(this.focusTimelineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: focusHistory.map((h: any) => h.time),
        datasets: [{
          label: 'Focus Level',
          data: focusHistory.map((h: any) => h.focus),
          borderColor: '#7113c8',
          backgroundColor: 'rgba(113, 19, 200, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#7113c8',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }, {
          label: 'Average',
          data: Array(focusHistory.length).fill(this.summary!.averageFocus),
          borderColor: '#10b981',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { font: { size: 14, weight: 'bold' } }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Focus %', font: { size: 14, weight: 'bold' } },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            title: { display: true, text: 'Time', font: { size: 14, weight: 'bold' } },
            ticks: { maxRotation: 45, minRotation: 45 },
            grid: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private createAttendancePieChart(): void {
    const chart = new Chart(this.attendancePieCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [this.summary!.presentStudents, this.summary!.absentStudents],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 14, weight: 'bold' },
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = this.summary!.totalStudents;
                const percentage = Math.round(((value ?? 0) / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private createFocusRadarChart(): void {
    const attendanceRate = Math.round((this.summary!.presentStudents / this.summary!.totalStudents) * 100);

    const chart = new Chart(this.focusRadarCanvas.nativeElement, {
      type: 'radar',
      data: {
        labels: ['Attendance', 'Avg Focus', 'Peak Focus', 'Consistency', 'Engagement'],
        datasets: [{
          label: 'Session Metrics',
          data: [
            attendanceRate,
            this.summary!.averageFocus,
            this.peakFocus,
            Math.max(0, 100 - this.focusVariance),
            this.engagementScore
          ],
          backgroundColor: 'rgba(113, 19, 200, 0.2)',
          borderColor: '#7113c8',
          borderWidth: 3,
          pointBackgroundColor: '#7113c8',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              font: { size: 12 }
            },
            pointLabels: {
              font: { size: 13, weight: 'bold' }
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
    this.charts.push(chart);
  }

  private createPerformanceBarChart(): void {
    const chart = new Chart(this.performanceBarCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['High Performers', 'Moderate', 'Needs Attention'],
        datasets: [{
          label: 'Number of Students',
          data: [this.highPerformers, this.moderatePerformers, this.needsAttention],
          backgroundColor: ['#10b981', '#eab308', '#ef4444'],
          borderRadius: 8,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                const total = this.summary!.presentStudents;
                const percentage = Math.round(((value ?? 0) / total) * 100);
                return `${value} students (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Students', font: { size: 14, weight: 'bold' } },
            ticks: { stepSize: 5 }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  getEngagementLevel(): string {
    if (this.engagementScore >= 80) return 'Excellent';
    if (this.engagementScore >= 60) return 'Good';
    if (this.engagementScore >= 40) return 'Fair';
    return 'Needs Improvement';
  }

  getEngagementColor(): string {
    if (this.engagementScore >= 80) return '#10b981';
    if (this.engagementScore >= 60) return '#22c55e';
    if (this.engagementScore >= 40) return '#eab308';
    return '#ef4444';
  }

  downloadReport(): void {
    window.print();
  }

  exportToCSV(): void {
    if (!this.summary) return;

    let csv = 'Student Name,Status,Average Focus\n';
    this.summary.students.forEach((student: any) => {
      const status = student.present ? 'Present' : 'Absent';
      const focus = student.averageFocus !== undefined ? `${student.averageFocus}%` : 'N/A';
      csv += `${student.name},${status},${focus}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-report-${Date.now()}.csv`;
    link.click();
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.charts.forEach(chart => chart.destroy());

    this.summaryService.clearSummary();
  }
}
