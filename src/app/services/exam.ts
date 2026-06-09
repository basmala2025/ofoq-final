import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private baseUrl = 'https://ofoqai.runasp.net/api/v1/exam';
  private hubConnection!: signalR.HubConnection;

  public newExamStream$ = new Subject<any>();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 📡 [SignalR] تشغيل مستمع الـ WebSocket للطالب عند فتح الـ Dashboard
  initExamNotificationHub() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://ofoqai.runasp.net/ws/exam', {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: signalR.HubConnection === undefined ? signalR.HttpTransportType.WebSockets : signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('📡 Connected to OFOQ Live Exam Hub successfully via direct WebSocket!'))
      .catch((err: any) => console.error('❌ SignalR Hub Connection Error: ', err));

    this.hubConnection.on('ReceiveNewExam', (data: any) => {
      this.newExamStream$.next(data);
    });
  }

  getExamDetails(examId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/details/${examId}`, { headers: this.getHeaders() });
  }

  logTabSwitch(examId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/log-tab-switch`, { examId }, { headers: this.getHeaders() });
  }

  runSandbox(examId: string, sourceCode: string, language: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/run-sandbox`, { examId, sourceCode, language }, { headers: this.getHeaders() });
  }

  submitExam(examId: string, sourceCode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/submit/${examId}`, { sourceCode }, { headers: this.getHeaders() });
  }

  getExamResult(examId: string, studentId?: string): Observable<any> {
    let url = `${this.baseUrl}/result/${examId}`;
    if (studentId) url += `?studentId=${studentId}`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  stopHubConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
