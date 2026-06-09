import { Injectable } from '@angular/core';
import { ExamStateService } from './exam-state.services';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ProctoringService {
  private mediaStream: MediaStream | null = null;
  private cvWebSocket: WebSocket | null = null;
  private hubConnection!: signalR.HubConnection;
  private audioRecorder: MediaRecorder | null = null;
  private streamInterval: any;
  private verifyInterval: any; // تايمر التوثيق الدوري

  private readonly VOICE_API_URL = 'https://gannaeslam38-ofoq-ai-engine.hf.space/analyze_audio';

  constructor(private examState: ExamStateService) {}

  async startProctoring(videoElement: HTMLVideoElement, sessionId: string | null) {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        }
      });

      if (videoElement) {
        videoElement.srcObject = this.mediaStream;
        videoElement.muted = true;
        videoElement.volume = 0;
      }

      this.connectVisionWebSocket(sessionId, videoElement);
      this.startAudioMonitoring();
      this.startSignalRConnection();

      // 1. تشغيل التوثيق الدوري كل 5 دقايق
      if(sessionId) this.startPeriodicIdentityVerify(videoElement, sessionId);

    } catch (err) {
      this.examState.logOutput('\nError: Camera and Microphone access required.');
    }
  }

 private connectVisionWebSocket(sessionId: string | null, videoElement: HTMLVideoElement) {
    if (!sessionId) return;

const wsUrl = `wss://jerold-unmimetic-jess.ngrok-free.dev/ws/exam/${sessionId}`;
   console.log("DEBUG: Connecting to:", wsUrl); // هل ده بيطبع؟
       this.cvWebSocket = new WebSocket(wsUrl);

    this.cvWebSocket.onopen = () => {
      console.log('✅ Connected to Vision AI WebSocket');
      this.startVideoStreaming(videoElement);
    };

    // 👈 ضيفي السطر ده هنا بالظبط عشان نشوف الداتا اللي جاية من الـ AI
   this.cvWebSocket.onmessage = (event) => {
  try {
    const response = JSON.parse(event.data);

    // 1. لو السيرفر بيعمل Skip للفريم
    if (response.status === 'skipped') return;

    // 2. منطق الـ Alarm بناءً على الـ Severity
    switch (response.severity) {
      case 'WARNING':
        this.examState.processAIVerdict('WARNING', response.action || 'Warning!', response.alarm_count);
        break;
      case 'CHEATING_ALARM':
        this.examState.processAIVerdict('CHEATING_ALARM', response.action || 'Cheating detected!', response.alarm_count);
        break;
      case 'EXAM_CLOSED':
        this.examState.endExam('Forced by AI', '');
        alert("Exam has been terminated!");
        break;
      default:
        // كل شيء تمام (null)
        break;
    }
  } catch (e) {
    console.error("Error parsing AI response:", e);
  }
};
  }

 private startVideoStreaming(videoElement: HTMLVideoElement) {
    this.streamInterval = setInterval(() => {
      if (this.examState.isExamFinished) return;

      if (videoElement && videoElement.readyState === 4 && this.cvWebSocket?.readyState === WebSocket.OPEN) {
        const canvas = document.createElement('canvas');

        // 🚀 تصغير أبعاد الصورة للنص لتسريع الإرسال وتقليل الحجم
        canvas.width = videoElement.videoWidth / 2;
        canvas.height = videoElement.videoHeight / 2;

        canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // 🚀 تقليل الـ Quality لـ 0.3 (كافية جداً للـ AI)
        canvas.toBlob((blob) => {
          if (blob && this.cvWebSocket?.readyState === WebSocket.OPEN) {

            // 💡 الإثبات القاطع: طباعة الوقت الحالي وحجم الفريم
            const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
            console.log(`[${timeNow}] 📤 Sending Frame... Size: ${(blob.size / 1024).toFixed(2)} KB`);

            this.cvWebSocket.send(blob);
          }
        }, 'image/jpeg', 0.3);
      }
    }, 1000);
  }
  // 3. دالة الـ Verify Periodic (كل 5 دقايق)
  private startPeriodicIdentityVerify(videoElement: HTMLVideoElement, sessionId: string) {
    this.verifyInterval = setInterval(() => {
      if (this.examState.isExamFinished) return;

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      canvas.getContext('2d')?.drawImage(videoElement, 0, 0);

canvas.toBlob((blob: Blob | null) => {
          if (blob) {
          const token = localStorage.getItem('token');
          if (!token) return;

          const formData = new FormData();
          formData.append('frame', blob, 'verify_frame.jpg');

          fetch(`https://ofoqai.runasp.net/api/v1/exam/verify-periodic/${sessionId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            // لو الباك إند رجع إن ده شخص تاني
            if (data && data.match === false) {
               this.examState.processAIVerdict('CHEATING_ALARM', "IDENTITY MISMATCH: Unrecognized person!", this.examState.violationCount + 1);
            }
          })
          .catch(err => console.error("Periodic verify failed", err));
        }
      }, 'image/jpeg', 0.9);

    }, 5 * 60 * 1000); // 5 دقائق
  }

  private startAudioMonitoring() {
    if (!this.mediaStream || this.examState.isExamFinished) return;

    this.audioRecorder = new MediaRecorder(this.mediaStream);
    const chunks: BlobPart[] = [];

    this.audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    this.audioRecorder.onstop = () => {
      if (!this.examState.isExamFinished && chunks.length > 0) {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        this.sendAudioToHuggingFace(audioBlob);
      }
      if (!this.examState.isExamFinished) {
        setTimeout(() => this.startAudioMonitoring(), 500);
      }
    };

    this.audioRecorder.start();
    setTimeout(() => {
      if (this.audioRecorder && this.audioRecorder.state === 'recording') {
        this.audioRecorder.stop();
      }
    }, 10000);
  }

  private async sendAudioToHuggingFace(audioBlob: Blob) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // ⏱️ إحباط الطلب بعد 5 ثواني

    const formData = new FormData();
    formData.append('file', audioBlob, 'exam_audio.webm');

    try {
      const response = await fetch(this.VOICE_API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal // 👈 ربط الـ Timeout بالريكويست
      });
      clearTimeout(timeoutId); // 🧹 لو رد بسرعة، نلغي التايمر

      if (!response.ok) return;

      const data = await response.json();
      if (data && (data.label === 1 || data.status !== 'Normal')) {
        this.examState.processAIVerdict('CHEATING_ALARM', `VOICE ALARM: Suspicious audio detected!`, this.examState.violationCount + 1);
      }
    } catch (error: any) {
      // التعامل الذكي مع الإلغاء
      if (error.name === 'AbortError') {
        console.warn('⚠️ Audio request timed out, skipping to free bandwidth.');
      } else {
        console.error('❌ Audio API Error:', error);
      }
    }
  }

  private startSignalRConnection() {
    const token = localStorage.getItem('token');

  this.hubConnection = new signalR.HubConnectionBuilder()
      // 🔴 التعديل هنا: غيرنا اسم المسار لـ /ws/exam
      .withUrl('https://ofoqai.runasp.net/ws/exam', {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build();

    // 4. استقبال أوامر الباك إند
    this.hubConnection.on('ReceiveAlarm', (severity: string, message: string, alarmCount: number) => {
      if (!this.examState.isExamFinished) {
this.examState.processAIVerdict('CHEATING_ALARM', message, alarmCount);      }
    });

    this.hubConnection.on('ForceSubmit', (reason: string) => {
       console.log("Received ForceSubmit from Server:", reason);
       this.examState.endExam(`Forced by Server: ${reason}`, '');
    });

    this.hubConnection.start()
      .then(() => console.log('✅ Connected to LIVE .NET SignalR Secure Channel'))
      .catch(err => console.error('❌ SignalR Connection Error: ', err));
  }

  stopEverything() {
    if (this.hubConnection) this.hubConnection.stop();
    if (this.audioRecorder && this.audioRecorder.state !== 'inactive') this.audioRecorder.stop();
    if (this.cvWebSocket) this.cvWebSocket.close();
    if (this.verifyInterval) clearInterval(this.verifyInterval);

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.streamInterval) clearInterval(this.streamInterval);
  }
}
