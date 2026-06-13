import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';

export interface SecurityEvent {
  type: 'WARNING' | 'CHEATING_ALARM';
  msg: string;
}

@Injectable({ providedIn: 'root' })
export class ExamStateService {
  sessionId: string | null = null;
  isExamFinished = false;

  // Real-time communication channel between AI services and the Editor UI
  securityEvents$ = new Subject<SecurityEvent>();
  outputLog$ = new BehaviorSubject<string>('System Initialized. Status: Secure.');

  constructor(private http: HttpClient, private router: Router) {}

  initSession() {
    this.sessionId = localStorage.getItem('currentSessionId');
    const token = localStorage.getItem('token');

    if (!this.sessionId || !token) {
      this.logOutput('[CRITICAL]: Invalid session. Redirecting to verification...');
      this.router.navigate(['/exam/verify', this.sessionId || '']);
      return;
    }
    this.logOutput('[System]: Joined active exam session successfully.');
  }

 processAIVerdict(type: 'WARNING' | 'CHEATING_ALARM', msg: string) {
    this.securityEvents$.next({ type, msg });
  }

  // Invoked for forced immediate termination (e.g., from SignalR 'ForceSubmit' or WebSocket 'EXAM_CLOSED')
  endExam(reason: string) {
    const sessionId = localStorage.getItem('currentSessionId');
    const token = localStorage.getItem('token');
    if (!token || !sessionId) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/end/${sessionId}`;

    console.log(`🔍 Attempting to force-end session: ${sessionId}. Reason: ${reason}`);

    this.http.post(url, {}, { headers }).subscribe({
      next: () => {
        this.isExamFinished = true;
        this.router.navigate(['/results']);
      },
      error: (err) => console.error('Failed to end exam', err)
    });
  }

  logOutput(msg: string) {
    const currentLog = this.outputLog$.getValue();
    this.outputLog$.next(`${currentLog}\n${msg}`);
  }
}
