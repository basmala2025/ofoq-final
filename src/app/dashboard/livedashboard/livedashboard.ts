import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { AudioRecordingService } from '../../services/audio-recording';

interface Student {
  id: string;
  name: string;
  present: boolean;
}

interface FocusDataPoint {
  time: string;
  focus: number;
}

@Component({
  selector: 'app-livedashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './livedashboard.html',
  styleUrls: ['./livedashboard.css']
})
export class LiveDashboard implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('focusLineChartCanvas') focusLineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('attendanceChartCanvas') attendanceChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('focusGaugeChartCanvas') focusGaugeChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('focusDistributionCanvas') focusDistributionCanvas!: ElementRef<HTMLCanvasElement>;

  courseName = 'Artificial Intelligence';
  roomName = 'A-305';
  students: Student[] = [];
  totalStudents = 0;
  presentStudents = 0;
  absentStudents = 0;
  attendanceRate = 0;
  averageFocus = 75;
  currentLectureId: string = '';
  focusHistory: FocusDataPoint[] = [];
  maxHistoryPoints = 20;
  isProcessingAI: boolean = false;

  // Focus statistics
  minFocus = 0;
  maxFocus = 0;
  focusTrend = 'stable';

  // Session duration
  sessionStartTime: Date = new Date();
  sessionDuration = '00:00';

  private focusLineChart!: Chart;
  private attendanceChart!: Chart;
  private focusGaugeChart!: Chart;
  private focusDistributionChart!: Chart;
  private updateInterval: any;
  private timeInterval: any;

  constructor(private route: ActivatedRoute, private router: Router, private audioService: AudioRecordingService) {}

  ngOnInit(): void {
    // Capture the Lecture ID from the route parameters
    this.currentLectureId = this.route.snapshot.paramMap.get('id') || '';

    // Subscribe to query parameters for display names
    this.route.queryParams.subscribe(params => {
      this.courseName = params['course'] || 'Artificial Intelligence';
      this.roomName = params['room'] || 'A-305';
    });

    console.log('👀 Captured ID in Dashboard:', this.currentLectureId);

    this.loadMockData();
    this.initializeFocusHistory();
    this.startLiveUpdates();
    this.startSessionTimer();
  }

  private loadMockData(): void {
    this.students = [
      { id: '1', name: 'Ganna Eslam', present: true },
      { id: '2', name: 'Sara Ahmed', present: false },
      { id: '3', name: 'Omar Khaled', present: true },
      { id: '4', name: 'Nour Mohamed', present: true },
      { id: '5', name: 'Ali Hassan', present: true },
      { id: '6', name: 'Mona Youssef', present: true },
      { id: '7', name: 'Youssef Ali', present: true },
      { id: '8', name: 'Laila Mostafa', present: true },
      { id: '9', name: 'Khaled Tarek', present: true },
      { id: '10', name: 'Fatma Hassan', present: false },
      ...Array.from({ length: 35 }, (_, i) => ({
        id: `${i + 11}`,
        name: `Student ${i + 11}`,
        present: Math.random() > 0.2
      }))
    ];

    this.updateStats();
  }

  private updateStats(): void {
    this.totalStudents = this.students.length;
    this.presentStudents = this.students.filter(s => s.present).length;
    this.absentStudents = this.totalStudents - this.presentStudents;
    this.attendanceRate = Math.round((this.presentStudents / this.totalStudents) * 100);
  }

  private initializeFocusHistory(): void {
    const now = new Date();
    for (let i = 19; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3000);
      this.focusHistory.push({
        time: this.formatTime(time),
        focus: 70 + Math.random() * 15
      });
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  ngAfterViewInit(): void {
    this.createCharts();
  }

  private createCharts(): void {
    // 1. Focus Over Time (Line Chart)
    this.focusLineChart = new Chart(this.focusLineChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.focusHistory.map(h => h.time),
        datasets: [{
          label: 'Average Focus %',
          data: this.focusHistory.map(h => h.focus),
          borderColor: '#7113c8',
          backgroundColor: 'rgba(113, 19, 200, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#7113c8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Focus %' }
          },
          x: {
            title: { display: true, text: 'Time' },
            ticks: { maxRotation: 45, minRotation: 45 }
          }
        }
      }
    });

    // 2. Attendance (Doughnut Chart)
    this.attendanceChart = new Chart(this.attendanceChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [this.presentStudents, this.absentStudents],
          backgroundColor: ['#1a8a61', '#f16323'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // 3. Focus Gauge (Semi-Doughnut)
    this.focusGaugeChart = new Chart(this.focusGaugeChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Focus', 'Remaining'],
        datasets: [{
          data: [this.averageFocus, 100 - this.averageFocus],
          backgroundColor: ['#7113c8', '#e5e7eb'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });

    // 4. Focus Distribution (Bar Chart)
    this.focusDistributionChart = new Chart(this.focusDistributionCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [{
          label: 'Time in Range',
          data: [2, 5, 8, 25, 60],
          backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Minutes' }
          },
          x: {
            title: { display: true, text: 'Focus Range' }
          }
        }
      }
    });
  }

  private startLiveUpdates(): void {
    this.updateInterval = setInterval(() => {
      // Update focus with realistic random variation
      const change = (Math.random() - 0.5) * 8;
      this.averageFocus = Math.max(40, Math.min(95, this.averageFocus + change));
      this.averageFocus = Math.round(this.averageFocus);

      // Add new timestamped data point
      const now = new Date();
      this.focusHistory.push({
        time: this.formatTime(now),
        focus: this.averageFocus
      });

      // Keep focus history within the max points limit
      if (this.focusHistory.length > this.maxHistoryPoints) {
        this.focusHistory.shift();
      }

      this.calculateFocusStats();
      this.updateCharts();
    }, 3000); // Trigger update every 3 seconds
  }

  private calculateFocusStats(): void {
    const recentFocus = this.focusHistory.slice(-10).map(h => h.focus);
    this.minFocus = Math.round(Math.min(...recentFocus));
    this.maxFocus = Math.round(Math.max(...recentFocus));

    // Calculate trend based on comparison of averages
    if (recentFocus.length >= 5) {
      const firstHalf = recentFocus.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const secondHalf = recentFocus.slice(5).reduce((a, b) => a + b, 0) / 5;

      if (secondHalf > firstHalf + 3) this.focusTrend = 'increasing';
      else if (secondHalf < firstHalf - 3) this.focusTrend = 'decreasing';
      else this.focusTrend = 'stable';
    }
  }

  private updateCharts(): void {
    // Refresh Line Chart Data
    this.focusLineChart.data.labels = this.focusHistory.map(h => h.time);
    this.focusLineChart.data.datasets[0].data = this.focusHistory.map(h => h.focus);
    this.focusLineChart.update('none');

    // Refresh Gauge Chart Data
    this.focusGaugeChart.data.datasets[0].data = [this.averageFocus, 100 - this.averageFocus];
    this.focusGaugeChart.update('none');
  }

  private startSessionTimer(): void {
    this.timeInterval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - this.sessionStartTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      this.sessionDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  // Helpers for dynamic styling in the template
  getFocusColor(): string {
    if (this.averageFocus >= 80) return '#10b981';
    if (this.averageFocus >= 60) return '#22c55e';
    if (this.averageFocus >= 40) return '#eab308';
    return '#ef4444';
  }

  getTrendIcon(): string {
    if (this.focusTrend === 'increasing') return '↑';
    if (this.focusTrend === 'decreasing') return '↓';
    return '→';
  }

  getTrendColor(): string {
    if (this.focusTrend === 'increasing') return '#10b981';
    if (this.focusTrend === 'decreasing') return '#ef4444';
    return '#6b7280';
  }

  endSession(): void {
    this.isProcessingAI = true;

    // Clear background timers
    clearInterval(this.updateInterval);
    clearInterval(this.timeInterval);

    const sessionData = {
      courseName: this.courseName,
      roomName: this.roomName,
      totalStudents: this.totalStudents,
      presentStudents: this.presentStudents,
      absentStudents: this.absentStudents,
      attendanceRate: this.attendanceRate,
      averageFocus: this.averageFocus,
      sessionDuration: this.sessionDuration,
      students: this.students,
      focusHistory: this.focusHistory
    };

    // Stop recording and transmit the session report
    this.audioService.stopRecordingAndSend(sessionData, this.currentLectureId as any);
  }

  ngOnDestroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.timeInterval) clearInterval(this.timeInterval);
  }
}
