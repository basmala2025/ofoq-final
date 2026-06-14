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
      // Enforce HD Resolution for optimized AI feature extraction accuracy
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

      // Fire periodic identity verification checks if session ID exists
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

    this.cvWebSocket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);

        // Skip processing when server drops frames intentionally
        if (response.status === 'skipped') return;

        // Delegate AI real-time verdicts directly to the state bridge
        switch (response.severity) {
          case 'WARNING':
            // Distraction duration calculated under 7 seconds
            this.examState.processAIVerdict('WARNING', response.action || 'Focus Warning!');
            break;
          case 'CHEATING_ALARM':
            // Gaze deviation exceeded 7 seconds threshold
            this.examState.processAIVerdict('CHEATING_ALARM', response.action || 'Cheating detected!');
            break;
          case 'EXAM_CLOSED':
            // High-risk anomaly detected forcing immediate shutdown
            this.examState.endExam('Forced by AI Vision');
            break;
        }
      } catch (e) {
        console.error("Error parsing AI Vision response:", e);
      }
    };
  }

  private startVideoStreaming(videoElement: HTMLVideoElement) {
    this.streamInterval = setInterval(() => {
      if (this.examState.isExamFinished) return;

      if (videoElement && videoElement.readyState === 4 && this.cvWebSocket?.readyState === WebSocket.OPEN) {
        const canvas = document.createElement('canvas');

        // Scale down dimensions by 50% to optimize bandwidth consumption
        canvas.width = videoElement.videoWidth / 2;
        canvas.height = videoElement.videoHeight / 2;

        canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Compress frame payload to 0.3 quality standard for fast transport
        canvas.toBlob((blob) => {
          if (blob && this.cvWebSocket?.readyState === WebSocket.OPEN) {
            this.cvWebSocket.send(blob);
          }
        }, 'image/jpeg', 0.3);
      }
    }, 1000); // Steady 1 FPS streaming rate
  }

  private startPeriodicIdentityVerify(videoElement: HTMLVideoElement, sessionId: string) {
    this.verifyInterval = setInterval(() => {
      if (this.examState.isExamFinished) return;

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      canvas.getContext('2d')?.drawImage(videoElement, 0, 0);

      // Convert captured matrix directly to Base64 to mirror original verification pipelines
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);

      const token = localStorage.getItem('token');
      if (!token) return;

      const payload = {
        image: base64Image
      };

      fetch(`https://ofoqai.runasp.net/api/v1/exam/verify-periodic/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        console.log('📸 [OFOQ] Periodic Face Verification Context Loaded:', data);
        // Intercept mismatches instantly to trigger severe red alert logs
        if (data && (data.match === false || data.isSuccess === false || data.status === 'Failed')) {
          this.examState.processAIVerdict('CHEATING_ALARM', "IDENTITY MISMATCH: Unrecognized face footprint sitting in front of code workspace!");
        }
      })
      .catch(err => console.error("❌ Periodic validation pipe dropped frame payload:", err));

    }, 5 * 60 * 1000); // Validation guard loops seamlessly every 5 minutes
  }

  private startAudioMonitoring() {
    if (!this.mediaStream || this.examState.isExamFinished) return;

    const options = { mimeType: 'audio/webm;codecs=opus' };
    try {
      this.audioRecorder = new MediaRecorder(this.mediaStream, options);
    } catch (e) {
      this.audioRecorder = new MediaRecorder(this.mediaStream);
    }

    const chunks: BlobPart[] = [];

    this.audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    this.audioRecorder.onstop = () => {
      if (!this.examState.isExamFinished && chunks.length > 0) {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        this.sendAudioToBackend(audioBlob);
      }

      // Allow a 25-second cool-down window to safely clear the AI model's computation queues
      if (!this.examState.isExamFinished) {
        setTimeout(() => this.startAudioMonitoring(), 25000);
      }
    };

    this.audioRecorder.start();

    // Record comprehensive 20-second blocks to accumulate substantial audio data for inference
    setTimeout(() => {
      if (this.audioRecorder && this.audioRecorder.state === 'recording') {
        this.audioRecorder.stop();
      }
    }, 20000);
  }

  private async sendAudioToBackend(audioBlob: Blob) {
    // Upgraded watchdog timeout window to 90 seconds to tolerate deep transformer network delays
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    // Direct integration detour bypasses proxy bottlenecks straight to Hugging Face
    const huggingFaceUrl = 'https://gannaeslam38-ofoq-ai-engine.hf.space/analyze_audio';
    const formData = new FormData();
    formData.append('file', audioBlob, 'exam_audio.wav');

    try {
      console.log('// Sending compressed binary audio slice directly to AI Engine space...');
      const response = await fetch(huggingFaceUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ Hugging Face space returned standard down-status: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('🎤 [OFOQ Smart API] Voice Analytics Signal Processed:', data);

      // Evaluate raw responses matching custom pipeline output parameters
      if (data && (data.is_cheating === true || data.label === 1 || data.status === 'Cheating' || data.status !== 'Normal')) {
        console.log('🚨 Voice anomaly matched. Relaying cheating verdict payload up to state controller...');
        this.examState.processAIVerdict('CHEATING_ALARM', `VOICE ALARM: Whispering or multi-voice background activity flagged!`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Audio request timed out! Model took more than 90 seconds to return embedding states.');
      } else {
        console.error('❌ Audio AI Engine Interface Error:', error);
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

    this.hubConnection.on('ReceiveAlarm', (severity: string, message: string, alarmCount: number) => {
      if (!this.examState.isExamFinished) {
        this.examState.processAIVerdict('CHEATING_ALARM', message);
      }
    });

    this.hubConnection.on('ForceSubmit', (reason: string) => {
       console.log("Received ForceSubmit execution token from live hub:", reason);
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
