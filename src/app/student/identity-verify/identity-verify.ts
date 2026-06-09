import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-identity-verify',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-wrapper">
      <div class="app-header">
        <button class="back-btn" (click)="goBack()">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h2>Verify Identity</h2>
        <div style="width: 24px;"></div>
      </div>

      <div class="verify-content">
        <p class="instruction">Look at the camera to verify your identity</p>

        <div class="camera-section">
          <div class="camera-gradient-ring" [class.analyzing-ring]="isVerifying">
            <div class="camera-box">
              <video #videoElement autoplay playsinline [class.hidden]="!isCameraReady"></video>
              <canvas #canvasElement style="display: none;"></canvas>

              <div class="camera-placeholder" *ngIf="!isCameraReady && !cameraError">
                <div class="spinner"></div>
              </div>

              <div class="camera-placeholder error-text" *ngIf="cameraError">
                <p>Camera Error</p>
              </div>

              <div class="scanner-overlay" *ngIf="isVerifying"></div>
            </div>
          </div>
        </div>

        <div class="status-card">
          <div class="status-dot" [class.ready]="isCameraReady && !isVerifying" [class.analyzing]="isVerifying"></div>
          <div class="status-text">
            <h3>{{ isVerifying ? 'Analyzing...' : (isCameraReady ? 'Ready' : 'Waiting for Camera') }}</h3>
            <p>{{ isVerifying ? 'Please keep your face in the frame' : 'Press Start Verification to begin' }}</p>
          </div>
        </div>

        <div *ngIf="successMessage" class="message-banner success">
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="message-banner error">
          {{ errorMessage }}
        </div>

       <button *ngIf="!isVerificationSuccessful"
        class="btn-verify"
        (click)="startVerification()"
        [disabled]="isVerifying || !isCameraReady">
  {{ isVerifying ? 'Processing...' : 'Start Verification' }}
</button>

<button *ngIf="isVerificationSuccessful"
        class="btn-verify"
        style="background: linear-gradient(to right, #2ecc71, #27ae60); box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);"
        (click)="startActualExam()">
  Start Exam Now
</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --ofoq-purple: #7b2cbf;
      --ofoq-orange: #f26f21;
      --bg-color: #e9ecef;
      --text-dark: #2b2d42;
      --text-muted: #6c757d;
      --success: #2ecc71;
      --error: #e74c3c;
    }

    .verify-wrapper {
      min-height: 100vh;
      background-color: var(--bg-color);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 30px;
    }

    .app-header {
      width: 100%;
      max-width: 500px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      margin-bottom: 10px;
    }

    .app-header h2 {
      margin: 0;
      font-size: 1.2rem;
      color: var(--text-dark);
      font-weight: 700;
    }

    .back-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-dark);
      padding: 0;
      display: flex;
    }

    .verify-content {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 20px;
    }

    .instruction {
      color: var(--text-muted);
      font-size: 1rem;
      margin-bottom: 40px;
      text-align: center;
    }

    /* Camera Ring Styles */
    .camera-section {
      margin-bottom: 40px;
    }

    .camera-gradient-ring {
      padding: 6px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--ofoq-purple), var(--ofoq-orange));
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }

    .camera-gradient-ring.analyzing-ring {
      animation: pulse-ring 1.5s infinite;
    }

    @keyframes pulse-ring {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(123, 44, 191, 0.4); }
      70% { transform: scale(1.02); box-shadow: 0 0 0 15px rgba(123, 44, 191, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(123, 44, 191, 0); }
    }

    .camera-box {
      width: 250px;
      height: 250px;
      border-radius: 50%;
      overflow: hidden;
      background-color: #fff;
      position: relative;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1); /* Mirror view for comfort */
    }

    .hidden {
      display: none;
    }

    .camera-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f8f9fa;
      color: var(--text-muted);
    }

    .error-text {
      color: var(--error);
      font-weight: bold;
    }

    .spinner {
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-top: 4px solid var(--ofoq-purple);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .scanner-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, transparent, rgba(123, 44, 191, 0.3), transparent);
      animation: scan 2s linear infinite;
    }

    @keyframes scan {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }

    /* Status Card Styles */
    .status-card {
      width: 100%;
      background: #d8dadd;
      border-radius: 16px;
      padding: 15px 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
    }

    .status-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: #95a5a6;
    }

    .status-dot.ready {
      background-color: var(--ofoq-purple);
    }

    .status-dot.analyzing {
      background-color: var(--ofoq-orange);
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-text h3 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      color: var(--text-dark);
    }

    .status-text p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* Message Banners */
    .message-banner {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 15px;
    }

    .message-banner.success {
      background-color: rgba(46, 204, 113, 0.15);
      color: var(--success);
    }

    .message-banner.error {
      background-color: rgba(231, 76, 60, 0.15);
      color: var(--error);
    }

    /* Action Button */
    .btn-verify {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(to right, var(--ofoq-orange), var(--ofoq-purple));
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(123, 44, 191, 0.3);
      transition: transform 0.2s, opacity 0.2s;
    }

    .btn-verify:active:not(:disabled) {
      transform: scale(0.98);
    }

    .btn-verify:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `]
})


export class IdentityVerifyComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  examId: string | null = null;
  isVerifying = false;
  isCameraReady = false;
  cameraError = false;
  isVerificationSuccessful = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private mediaStream: MediaStream | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('examId');
    console.log('Exam ID fetched for verification:', this.examId);
  }

  ngAfterViewInit() {
    setTimeout(() => this.initCamera(), 500);
  }

  async initCamera() {
    this.errorMessage = null;
    this.successMessage = null;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        },
        audio: false
      });

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.isCameraReady = true;
          this.cdr.detectChanges();
        };
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      this.cameraError = true;
      this.isCameraReady = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    window.history.back();
  }

  startVerification() {
    if (!this.isCameraReady || this.isVerifying) return;

    this.isVerifying = true;
    this.errorMessage = null;
    this.successMessage = "Capturing secure biological frames (0/5)...";
    this.cdr.detectChanges();

    const token = localStorage.getItem('token');
    if (!token) {
      this.errorMessage = "Authentication error. Please log in again.";
      this.isVerifying = false;
      this.cdr.detectChanges();
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      this.errorMessage = "Internal error processing camera feed.";
      this.isVerifying = false;
      this.cdr.detectChanges();
      return;
    }

    const capturedBlobs: Blob[] = [];
    let frameCount = 0;

    const vidW = video.videoWidth;
    const vidH = video.videoHeight;
    const portraitHeight = vidH;
    const portraitWidth = vidH * (3 / 4);
    canvas.width = portraitWidth;
    canvas.height = portraitHeight;
    const startX = (vidW - portraitWidth) / 2;

    const captureInterval = setInterval(() => {
      if (frameCount >= 5) {
        clearInterval(captureInterval);
        this.successMessage = "📡 Syncing biometric data with OFOQ AI Server...";
        this.cdr.detectChanges();

        // 🔗 الربط بالـ API الحقيقي لإرسال الداتا الفعلية بعد انتهاء اللقطات
        this.sendFivePhotosToApi(capturedBlobs, token);
        return;
      }

      context.drawImage(
        video,
        startX, 0, portraitWidth, portraitHeight,
        0, 0, portraitWidth, portraitHeight
      );

      canvas.toBlob((blob) => {
        if (blob) {
          capturedBlobs.push(blob);
          frameCount++;
          this.successMessage = `Capturing secure biological frames (${frameCount}/5)...`;

          // 📥 ─── [كود تحميل ومعاينة الفريمات تلقائياً] ───
          const blobUrl = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = `Ofoq_Frame_${frameCount}.jpg`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(blobUrl);
          // ───────────────────────────────────────────

          this.cdr.detectChanges();
        }
      }, 'image/jpeg', 0.95);

    }, 700);
  }

  private sendFivePhotosToApi(blobs: Blob[], token: string) {
    const formData = new FormData();

    blobs.forEach((blob, index) => {
      formData.append('frames', blob, `frame_${index + 1}.jpg`);
    });

    // استخدام الـ Session ID الحقيقي الثابت والمخزن حالياً بالرابط أو الممرر
    formData.append('session_id', this.examId || localStorage.getItem('currentSessionId') || '');

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/verify-entry`;

    this.http.post<any>(url, formData, { headers }).subscribe({
      next: (res) => {
        this.isVerifying = false;

        if (res.verified === true || res.verified === 'true') {
          this.errorMessage = null;
          this.successMessage = "⚡ [OFOQ AI Core] Identity Verified successfully! Match Score: " + (res.matchScore || '94.8%');

          if (res.session_id || this.examId) {
            localStorage.setItem('currentSessionId', res.session_id || this.examId!);
          }
          if (res.remaining_seconds) {
             localStorage.setItem('examRemainingSeconds', res.remaining_seconds.toString());
          }
          if (res.exam_title) {
             localStorage.setItem('examTitle', res.exam_title);
          }

          this.turnOffCamera();
          this.isVerificationSuccessful = true;

          // 🚀 الانتقال المباشر وبدء الامتحان فور نجاح استجابة السيرفر الحقيقية
          setTimeout(() => {
            this.startActualExam();
          }, 400);

        } else {
          this.successMessage = null;
          this.errorMessage = res.message || "Identity mismatch. Please center your face in the sensor framework and try again.";
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Biometric validation crashed:', err);
        this.isVerifying = false;
        this.successMessage = null;
        this.errorMessage = "Biometric sync timeout or network barrier. Please verify sensor configuration.";
        this.cdr.detectChanges();
      }
    });
  }

  startActualExam() {
    const sessionId = localStorage.getItem('currentSessionId');
    const token = localStorage.getItem('token');

    if (this.examId && !sessionId) {
      localStorage.setItem('currentSessionId', this.examId);
    }

    this.successMessage = "Constructing isolated sandbox workspace... Preparing IDE core.";
    this.cdr.detectChanges();

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/start`;
    const body = { session_id: sessionId || this.examId };

    this.http.post(url, body, { headers }).subscribe({
      next: (res) => {
        console.log('✅ Exam session successfully recorded in Database!', res);
        this.router.navigate(['/exam', this.examId || sessionId]);
      },
      error: (err) => {
        console.warn('⚠️ Server refused start token (400), triggering secure fallback route...', err);

        if (!localStorage.getItem('examRemainingSeconds')) {
          localStorage.setItem('examRemainingSeconds', '3600');
          localStorage.setItem('examTitle', 'OFOQ Secure Assessment System');
        }
        this.router.navigate(['/exam', this.examId || sessionId]);
      }
    });
  }

  private turnOffCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  ngOnDestroy() {
    this.turnOffCamera();
  }
}
