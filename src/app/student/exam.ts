import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr'; // 👈 1. تعديل المسار والاسم ليكون سمول بالكامل ومطابق للباكدج الصح

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private baseUrl = 'https://ofoqai.runasp.net/api/v1/exam';
  private taUrl = 'https://ofoqai.runasp.net/api/ta';
  private hubConnection!: signalR.HubConnection; // 👈 2. تعديل هنا لـ signalR سمول

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
        transport: signalR.HttpTransportType.WebSockets
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

  // 2. [طالب] جلب تفاصيل المسألة الحالية وفلترة الـ Public Cases
  getExamDetails(examId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/details/${examId}`, { headers: this.getHeaders() });
  }

  // 3. [طالب] تسجيل مخالفة الـ Tab Switch وإرجاع حالة الـ Kill Switch
  logTabSwitch(examId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/log-tab-switch`, { examId }, { headers: this.getHeaders() });
  }

  // 4. [طالب] تشغيل الكود في الـ Sandbox الآمن للـ Judge0 (Run Code)
  runSandbox(examId: string, sourceCode: string, language: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/run-sandbox`, { examId, sourceCode, language }, { headers: this.getHeaders() });
  }

  // 5. [طالب] التسليم النهائي وإيقاف الـ Session وحساب الدرجة الثلاثية
  submitExam(examId: string, sourceCode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/submit/${examId}`, { sourceCode }, { headers: this.getHeaders() });
  }

  // 6. [طالب/معيد] جلب الـ Breakdown والدرجة النهائية الصافية من الـ DB
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
