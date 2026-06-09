import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SecurityEvent {
  type: 'WARNING' | 'CHEATING_ALARM' | 'CLEAR';
  msg: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExamStateService {
  sessionId: string | null = null;

  // States
  timeRemaining = 45 * 60;
  violationCount = 0;
  isExamFinished = false;

  // Observables for UI Updates
  timerDisplay$ = new BehaviorSubject<string>('45:00');
  securityEvents$ = new Subject<SecurityEvent>(); 
  outputLog$ = new BehaviorSubject<string>('System Initialized. Status: Secure.');

  private timerInterval: any;
  private readonly API_BASE = 'https://ofoqai.runasp.net/api/v1/exam';

  constructor(private http: HttpClient, private router: Router) {}

 initSession() {
    this.sessionId = localStorage.getItem('currentSessionId');
    const token = localStorage.getItem('token');

    if (!this.sessionId || !token) {
      this.logOutput('[CRITICAL]: Invalid session. Redirecting to verification...');
      alert("Invalid session. Please verify your identity first.");
      this.router.navigate(['/verify']);
      return;
    }

    this.logOutput('[System]: Joined active exam session successfully.');

  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        const m = Math.floor(this.timeRemaining / 60);
        const s = this.timeRemaining % 60;
        this.timerDisplay$.next(`${m}:${s.toString().padStart(2, '0')}`);
      } else {
        this.endExam('Time is up!', '');
      }
    }, 1000);
  }

processAIVerdict(type: 'WARNING' | 'CHEATING_ALARM' | 'CLEAR', msg: string, count: number) {
  this.violationCount = count;
  this.securityEvents$.next({ type, msg });
}
  // 3. مناداة API الـ Log Violation
  logViolationToBackend(violationMsg: string) {
    const token = localStorage.getItem('token');
    if (!this.sessionId || !token) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = {
       ProctorSessionId: this.sessionId,
       ViolationType: violationMsg
    };

    this.http.post(`${this.API_BASE}/log-violation`, body, { headers })
      .subscribe({
        next: () => console.log('Violation logged securely on server'),
        error: (err) => console.error('Failed to log violation', err)
      });
  }

endExam(reason: string, code: string) {
    const sessionId = localStorage.getItem('currentSessionId');
    const token = localStorage.getItem('token');
    if (!token || !sessionId) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const url = `https://ofoqai.runasp.net/api/v1/exam/end/${sessionId}`;
// const sessionId = localStorage.getItem('currentSessionId');
console.log("🔍 Attempting to end session with ID:", sessionId);
    this.http.post(url, {}, { headers }).subscribe({
      next: (res) => {
        console.log('Exam ended successfully!');
        this.isExamFinished = true;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('❌ Failed to end exam', err);
      }
    });
  }
  logOutput(msg: string) {
    const currentLog = this.outputLog$.getValue();
    this.outputLog$.next(`${currentLog}\n${msg}`);
  }

  private goToResults() {
    localStorage.removeItem('ofoq_exam_backup');
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
