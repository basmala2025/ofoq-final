import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-exam-start',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="exam-wrapper">
      <div class="exam-header">
        <h2>Exam Room</h2>
      </div>

      <div class="content-box">
        <h3 *ngIf="!examStarted">Welcome to the Exam</h3>
        <p *ngIf="!examStarted" class="instructions">
          Your identity has been verified successfully. Please read the instructions carefully before starting. Once you click "Start Exam", the timer will begin, and the monitoring system will be activated.
        </p>

        <div *ngIf="errorMessage" class="message-banner error">
          {{ errorMessage }}
        </div>

        <button *ngIf="!examStarted" class="btn-start"
                (click)="startExam()"
                [disabled]="isLoading">
          {{ isLoading ? 'Starting...' : 'Start Exam Now' }}
        </button>

        <div *ngIf="examStarted" class="active-exam-view">
          <div class="timer-box">
            <h4>Time Remaining</h4>
            <p class="time">{{ formatTime(remainingSeconds) }}</p>
          </div>

          <div class="monitoring-alert">
            <span class="dot pulse"></span> Monitoring Active
          </div>

          <div class="questions-placeholder">
            <p>Exam questions will be displayed here...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --ofoq-purple: #7b2cbf;
      --ofoq-orange: #f26f21;
      --bg-color: #f4f6f9;
      --text-dark: #2b2d42;
      --error: #e74c3c;
    }
    .exam-wrapper { min-height: 100vh; background-color: var(--bg-color); padding: 20px; font-family: 'Segoe UI', Tahoma, sans-serif; }
    .exam-header { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; margin-bottom: 20px; }
    .content-box { background: white; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; }
    .instructions { color: #6c757d; line-height: 1.6; margin-bottom: 30px; }
    .message-banner.error { background-color: rgba(231, 76, 60, 0.15); color: var(--error); padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; }

    .btn-start {
      width: 100%; padding: 15px; border: none; border-radius: 8px;
      background: linear-gradient(to right, var(--ofoq-orange), var(--ofoq-purple));
      color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: transform 0.2s;
    }
    .btn-start:disabled { opacity: 0.7; cursor: not-allowed; }

    .active-exam-view { margin-top: 20px; }
    .timer-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px solid var(--ofoq-purple); margin-bottom: 20px; }
    .timer-box .time { font-size: 2rem; font-weight: bold; color: var(--text-dark); margin: 10px 0 0 0; }

    .monitoring-alert { color: #2ecc71; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px; }
    .dot { width: 10px; height: 10px; background-color: #2ecc71; border-radius: 50%; }
    .pulse { animation: pulse-animation 1.5s infinite; }
    @keyframes pulse-animation { 0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); } 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); } }

    .questions-placeholder { border: 1px dashed #ccc; padding: 40px; border-radius: 8px; color: #999; }
  `]
})
export class ExamStartComponent implements OnInit, OnDestroy {
  isLoading = false;
  examStarted = false;
  errorMessage: string | null = null;

  remainingSeconds: number = 0;
  private timerInterval: any;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    // Check if session exists from previous step
    const sessionId = localStorage.getItem('currentSessionId');
    console.log(sessionId)
    if (!sessionId) {
      this.errorMessage = "Session not found. Please go back and verify your identity.";
    }
  }

  startExam() {
    this.isLoading = true;
    this.errorMessage = null;

    const token = localStorage.getItem('token');
    const sessionId = localStorage.getItem('currentSessionId');

    if (!token || !sessionId) {
      this.errorMessage = "Missing authentication or session data.";
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const url = `https://ofoqai.runasp.net/api/v1/exam/start`;

    const body = {
      session_id: sessionId
    };

    this.http.post<any>(url, body, { headers })
      .subscribe({
        next: (res) => {
          this.isLoading = false;

          // Assuming the backend returns isSuccess or ready
          if (res && res.status !== 'error') {
            this.examStarted = true;

            // Set timer (Assuming backend returns remaining seconds, fallback to 3600)
            this.remainingSeconds = res.remainingSeconds || 3600;
            this.startTimerDown();

            // 🚀 Here you would call your Periodic Proctoring function
            // e.g., this.startProctoringLoop(sessionId);
          } else {
            this.errorMessage = "Failed to start the exam. Please try again.";
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Start Exam Error:', err);
          this.errorMessage = "Connection error. Could not start the exam.";
        }
      });
  }

  startTimerDown() {
    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
      } else {
        this.stopTimer();
        // Handle Auto-Submit Exam here
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    this.stopTimer();
  }
}
