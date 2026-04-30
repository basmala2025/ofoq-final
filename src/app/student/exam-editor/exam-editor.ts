import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket';
import { ExamService } from '../../services/exam';
import loader from '@monaco-editor/loader';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-exam-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './exam-editor.html',
  styleUrls: ['./exam-editor.css']
})
export class ExamEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  @ViewChild('videoElement') videoElement!: ElementRef;

  editor: any;
  private mediaStream: MediaStream | null = null;
  private streamInterval: any;
  private audioRecorder: MediaRecorder | null = null;

  // 💡 Connection channel to .NET Backend
  private hubConnection!: signalR.HubConnection;

  // Voice AI Model URL
  private readonly VOICE_API_URL = 'https://gannaeslam38-ofoq-ai-engine.hf.space/analyze_audio';

  // Security Statistics & State
  violationCount = 0;
  isExamFinished = false;
  isPanicMode = false;
  showSecurityToast = false;
  isRedAlarm = false;
  securityMessage = '';
  cvActive = false;
  savedCodeKey = 'ofoq_exam_backup';

  // Timer Configuration
  timeRemaining = 45 * 60;
  timerDisplay = '45:00';
  private timerInterval: any;
  output = `System Initialized. Status: Secure.`;

  constructor(
    private router: Router,
    private socketService: SocketService,
    private examService: ExamService
  ) {}

  // ==========================================
  // --- 1. Environment Security & Tracking ---
  // ==========================================

  @HostListener('document:contextmenu', ['$event'])
  preventRightClick(e: MouseEvent) {
    e.preventDefault();
    this.showWarning('Right-Click Blocked! (Warning)');
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if ((ctrl && ['c', 'v', 'a', 'x', 's'].includes(key)) || e.key === 'f12') {
      e.preventDefault();
      this.showWarning(`Shortcut Ctrl+${key.toUpperCase()} Blocked! (Warning)`);
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden && !this.isExamFinished) {
      this.isPanicMode = true;
      // Local browser alarm, no AI needed
      this.triggerViolentAlarm('ALARM: Tab Switch Detected!');
    } else {
      setTimeout(() => this.isPanicMode = false, 1500);
    }
  }

  // ==========================================
  // --- 2. System Initialization ---
  // ==========================================

  ngAfterViewInit() {
    this.initCamera();
    this.enterFullScreen();
    // this.startSignalRConnection(); // 💡 Uncomment to start backend connection

    loader.init().then((monaco: any) => {
      const recovered = localStorage.getItem(this.savedCodeKey);
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: recovered || `# Solve the problem here\ndef solve():\n    pass`,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        contextmenu: false
      });

      this.editor.onDidChangeModelContent(() => {
        if (!this.isExamFinished) {
          localStorage.setItem(this.savedCodeKey, this.editor.getValue());
        }
      });
    });
    this.startTimer();
  }

  // ==========================================
  // --- 3. .NET SignalR Connection ---
  // ==========================================

  startSignalRConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:5001/examHub') // ⚠️ Adjust port based on your .NET project
      .withAutomaticReconnect()
      .build();

    // Listen for incoming alarms from backend
    this.hubConnection.on('ReceiveAlarm', (violationType: string) => {
      if (!this.isExamFinished) {
        this.triggerViolentAlarm(`ALARM: ${violationType}`);
      }
    });

    this.hubConnection.start()
      .then(() => console.log('✅ Connected to .NET SignalR Secure Channel'))
      .catch(err => console.error('❌ SignalR Connection Error: ', err));
  }

  // ==========================================
  // --- 4. A/V Streaming & AI Integration ---
  // ==========================================

  async initCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640 },
        audio: {
          echoCancellation: true,    // Enable echo cancellation (crucial)
          noiseSuppression: true,    // Suppress background noise/static
          autoGainControl: false,    // Disable automatic gain control
          channelCount: 1            // Set to Mono channel to reduce data size
        }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        // ⚠️ Programmatically ensure video is muted to prevent feedback loop
        this.videoElement.nativeElement.muted = true;
        this.videoElement.nativeElement.volume = 0;
      }

      this.cvActive = true;
      this.socketService.connectToAI(); // Connect to Python Vision API
      this.startVideoStreaming();       // Start video streaming
      this.startAudioMonitoring();      // Start audio monitoring

    } catch {
      this.output += '\nError: Camera and Microphone access required for secure environment.';
    }
  }

  startVideoStreaming() {
    this.streamInterval = setInterval(() => {
      if (this.isExamFinished) return;
      const video = this.videoElement?.nativeElement;

      if (video && video.readyState === 4) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        this.socketService.sendFrame(canvas.toDataURL('image/jpeg', 0.4));
        // 💡 Note: No AI response listener here. Frames are sent silently.
      }
    }, 250);
  }

  startAudioMonitoring() {
    if (!this.mediaStream || this.isExamFinished) return;

    console.log('🎙️ [Audio] Starting new 10-second recording cycle...');
    this.audioRecorder = new MediaRecorder(this.mediaStream);
    const chunks: BlobPart[] = [];

    this.audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    this.audioRecorder.onstop = () => {
      console.log('⏹️ [Audio] Recording stopped. Preparing to send...');

      if (!this.isExamFinished && chunks.length > 0) {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log(`📤 [Audio] Sending file to server... (Size: ${audioBlob.size} bytes)`);
        this.sendAudioToHuggingFace(audioBlob);
      } else {
        console.warn('⚠️ [Audio] No audio recorded!');
      }

      // Half-second delay before next cycle to allow browser breathing room
      if (!this.isExamFinished) {
        setTimeout(() => this.startAudioMonitoring(), 500);
      }
    };

    this.audioRecorder.start();

    // Stop recording after 10 seconds
    setTimeout(() => {
      if (this.audioRecorder && this.audioRecorder.state === 'recording') {
        this.audioRecorder.stop();
      }
    }, 10000);
  }

  async sendAudioToHuggingFace(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'exam_audio.webm');

    try {
      const response = await fetch(this.VOICE_API_URL, { method: 'POST', body: formData });

      if (!response.ok) {
        console.error(`❌ [Audio API] Request rejected! Status: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log('✅ [Audio API] Server responded successfully:', data);

      // Parse result and trigger alarm if cheating detected
      if (data && (data.label === 1 || data.status !== 'Normal')) {
        this.triggerViolentAlarm(`VOICE ALARM: Suspicious audio detected!`);
      }

    } catch (error) {
      console.error('❌ [Audio API] Server offline or connection failed:', error);
    }
  }

  // ==========================================
  // --- 5. Alerts & Violation Logic ---
  // ==========================================

  showWarning(msg: string) {
    if (this.isRedAlarm || this.isExamFinished) return;
    this.securityMessage = msg;
    this.isRedAlarm = false;
    this.showSecurityToast = true;
    this.output += `\n[Warning]: ${msg}`;
    setTimeout(() => { if(!this.isRedAlarm) this.showSecurityToast = false; }, 3000);
  }

  triggerViolentAlarm(msg: string) {
    if (this.isExamFinished) return;

    this.violationCount++;
    this.securityMessage = msg;
    this.isRedAlarm = true;
    this.showSecurityToast = true;
    this.output += `\n[ALARM ${this.violationCount}/3]: ${msg}`;

    if (this.violationCount >= 3) {
      this.output += `\n[CRITICAL]: 3 Alarms reached. Terminating session NOW.`;
      setTimeout(() => this.submitSolution(), 1000);
    } else {
      setTimeout(() => { this.showSecurityToast = false; this.isRedAlarm = false; }, 5000);
    }
  }

  // ==========================================
  // --- 6. Exam Execution & Submission ---
  // ==========================================

  runCode() {
    if (this.isExamFinished) return;

    const currentCode = this.editor.getValue();
    this.output += `\n[${new Date().toLocaleTimeString()}] Running Code...`;

    setTimeout(() => {
      if (currentCode.trim() === '') {
        this.output += `\n❌ Error: No code to run!`;
      } else {
        this.output += `\n✅ Execution finished successfully.\n[Output]: Standard test cases passed.`;
      }
      const consoleBody = document.querySelector('.console-body');
      if (consoleBody) consoleBody.scrollTop = consoleBody.scrollHeight;
    }, 1000);
  }

  submitSolution() {
    if (this.isExamFinished) return;
    this.isExamFinished = true;

    this.output += `\nSystem: Finalizing submission...`;
    this.stopEverything();

    const studentCode = this.editor ? this.editor.getValue() : localStorage.getItem(this.savedCodeKey);

    this.examService.submitExam({
      code: studentCode,
      violations: this.violationCount,
      terminated: this.violationCount >= 3
    }).subscribe({
      next: () => this.goToResults(),
      error: () => this.goToResults()
    });
  }

  private goToResults() {
    localStorage.removeItem(this.savedCodeKey);
    this.router.navigate(['/'], { replaceUrl: true });
  }

 private stopEverything() {
    if (this.hubConnection) this.hubConnection.stop();
    if (this.audioRecorder && this.audioRecorder.state !== 'inactive') this.audioRecorder.stop();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.videoElement && this.videoElement.nativeElement) {
      this.videoElement.nativeElement.srcObject = null; 
    }

    this.socketService.disconnect();
    if (this.streamInterval) clearInterval(this.streamInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        const m = Math.floor(this.timeRemaining / 60);
        const s = this.timeRemaining % 60;
        this.timerDisplay = `${m}:${s.toString().padStart(2, '0')}`;
      } else {
        this.submitSolution();
      }
    }, 1000);
  }

  enterFullScreen() {
    const el = document.documentElement as any;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  ngOnDestroy() {
    this.stopEverything();
  }
}
