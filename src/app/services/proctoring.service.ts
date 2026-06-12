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
  private verifyInterval: any;

  constructor(private examState: ExamStateService) {}

  async startProctoring(videoElement: HTMLVideoElement, sessionId: string | null) {
    try {
      // Enforce HD Resolution for better AI accuracy
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 1280, ideal: 1920 },
          height: { min: 720, ideal: 1080 }
        },
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

      // Start periodic identity verification every 5 minutes
      if (sessionId) this.startPeriodicIdentityVerify(videoElement, sessionId);

    } catch (err) {
      this.examState.logOutput('\nError: Camera and Microphone access required.');
    }
  }

  private connectVisionWebSocket(sessionId: string | null, videoElement: HTMLVideoElement) {
    if (!sessionId) return;

    const wsUrl = `wss://jerold-unmimetic-jess.ngrok-free.dev/ws/exam/${sessionId}`;
    this.cvWebSocket = new WebSocket(wsUrl);

    this.cvWebSocket.onopen = () => {
      console.log('✅ Connected to Vision AI WebSocket');
      this.startVideoStreaming(videoElement);
    };

    // Listen for real-time AI computer vision data
    this.cvWebSocket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);

        // Skip dropped frames
        if (response.status === 'skipped') return;

        // Route AI verdicts based on severity
        switch (response.severity) {
          case 'WARNING':
            // Distraction < 7 seconds
            this.examState.processAIVerdict('WARNING', response.action || 'Focus Warning!');
            break;
          case 'CHEATING_ALARM':
            // Distraction > 7 seconds or explicit violation
            this.examState.processAIVerdict('CHEATING_ALARM', response.action || 'Cheating detected!');
            break;
          case 'EXAM_CLOSED':
            // Immediate forced termination by AI
            this.examState.endExam('Forced by AI Vision');
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

        // Downscale image to 50% to optimize bandwidth
        canvas.width = videoElement.videoWidth / 2;
        canvas.height = videoElement.videoHeight / 2;

        canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Compress JPEG to 0.3 quality (sufficient for FaceNet/YOLO)
        canvas.toBlob((blob) => {
          if (blob && this.cvWebSocket?.readyState === WebSocket.OPEN) {
            this.cvWebSocket.send(blob);
          }
        }, 'image/jpeg', 0.3);
      }
    }, 1000); // 1 frame per second
  }

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
            // Trigger ALARM if the face does not match the original verified user
            if (data && data.match === false) {
               this.examState.processAIVerdict('CHEATING_ALARM', "IDENTITY MISMATCH: Unrecognized person!");
            }
          })
          .catch(err => console.error("Periodic verify failed", err));
        }
      }, 'image/jpeg', 0.9);

    }, 5 * 60 * 1000); // Execute every 5 minutes
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
        this.sendAudioToBackend(audioBlob);
      }
      if (!this.examState.isExamFinished) {
        setTimeout(() => this.startAudioMonitoring(), 500);
      }
    };

    this.audioRecorder.start();
    // Record in 10-second intervals
    setTimeout(() => {
      if (this.audioRecorder && this.audioRecorder.state === 'recording') {
        this.audioRecorder.stop();
      }
    }, 10000);
  }

  private async sendAudioToBackend(audioBlob: Blob) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const token = localStorage.getItem('token');
    const examSessionId = localStorage.getItem('currentSessionId');

    if (!token || !examSessionId) return;

    const url = `https://ofoqai.runasp.net/api/v1/exam/voice-analysis/${examSessionId}`;
    const formData = new FormData();

    // ✅ التعديل السحري: غيرنا 'file' إلى 'audio' ليتوافق مع الـ Validation بتاع الباك إند
    formData.append('audio', audioBlob, 'exam_audio.webm');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return;

      const data = await response.json();

      if (data && (data.is_cheating === true || data.label === 1 || data.status !== 'Normal')) {
        this.examState.processAIVerdict('CHEATING_ALARM', `VOICE ALARM: Suspicious audio detected!`);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Audio API Error:', error);
      }
    }
  }

  private startSignalRConnection() {
    const token = localStorage.getItem('token');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://ofoqai.runasp.net/ws/exam', {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build();

    // Listen for direct commands from the backend
    this.hubConnection.on('ReceiveAlarm', (severity: string, message: string, alarmCount: number) => {
      if (!this.examState.isExamFinished) {
        this.examState.processAIVerdict('CHEATING_ALARM', message);
      }
    });

    this.hubConnection.on('ForceSubmit', (reason: string) => {
       console.log("Received ForceSubmit from Server:", reason);
       this.examState.endExam(`Forced by Server: ${reason}`);
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
