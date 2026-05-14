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
      <div class="verify-card">
        <div class="card-header">
          <h2>System Security Verification</h2>
          <p class="subtitle">Exam ID: <strong>{{ examId }}</strong></p>
        </div>

        <p class="instruction">Please look directly at your camera. OFOQ AI is verifying your identity...</p>

        <div class="camera-container">
          <div class="camera-box" [class.error]="cameraError">
            <video #videoElement autoplay playsinline [class.hidden]="!isCameraReady"></video>
            <!-- Hidden canvas for capturing frames -->
            <canvas #canvasElement style="display: none;"></canvas>

            <!-- Loading Placeholder -->
            <div class="camera-overlay placeholder" *ngIf="!isCameraReady && !cameraError">
              <div class="spinner"></div>
              <p>⏳ Starting Camera...</p>
            </div>

            <!-- Error Placeholder -->
            <div class="camera-overlay error-msg" *ngIf="cameraError">
              <span class="icon">❌</span>
              <p>Camera Access Denied.</p>
              <p class="sub-err">Please allow camera access in your browser settings to continue.</p>
            </div>

            <!-- Scanning Animation -->
            <div class="scanner-bar" *ngIf="isVerifying"></div>
          </div>
        </div>

        <div class="action-area">
          <button class="btn btn-primary"
                  (click)="startVerification()"
                  [disabled]="isVerifying || !isCameraReady || successMessage !== null">
            <span *ngIf="isVerifying" class="btn-spinner"></span>
            {{ isVerifying ? 'Analyzing Face...' : 'Verify Identity' }}
          </button>

          <!-- Success Banner -->
          <div *ngIf="successMessage" class="status-banner success-banner">
            <span class="icon">✅</span> {{ successMessage }}
          </div>

          <!-- Error / Retry Banner -->
          <div *ngIf="errorMessage" class="status-banner error-banner">
            <span class="icon">⚠️</span> {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary-color: #3498db;
      --primary-dark: #2980b9;
      --bg-color: #f4f7f6;
      --card-bg: #ffffff;
      --text-main: #2c3e50;
      --text-muted: #7f8c8d;
      --error-color: #e74c3c;
      --error-bg: #fdf2f2;
      --error-border: #f8b4b4;
      --success-color: #2ecc71;
      --success-bg: #eafaf1;
      --success-border: #a3e4d7;
    }

    .verify-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: var(--bg-color);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
    }

    .verify-card {
      background: var(--card-bg);
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 500px;
      padding: 30px;
      text-align: center;
    }

    .card-header h2 {
      margin: 0 0 10px 0;
      color: var(--text-main);
      font-size: 1.5rem;
    }

    .subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 0.9rem;
    }

    .instruction {
      margin: 25px 0;
      color: var(--text-main);
      font-size: 1rem;
      line-height: 1.5;
    }

    .camera-container {
      display: flex;
      justify-content: center;
      margin-bottom: 25px;
    }

    .camera-box {
      position: relative;
      width: 320px;
      height: 240px;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      border: 4px solid #ddd;
      transition: border-color 0.3s;
    }

    .camera-box.error {
      border-color: var(--error-color);
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1); /* Mirror view for user comfort */
    }

    .hidden {
      display: none;
    }

    .camera-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      background: rgba(0,0,0,0.7);
      padding: 20px;
    }

    .camera-overlay.error-msg {
      background: rgba(0,0,0,0.85);
      color: #ffcccc;
    }

    .camera-overlay .icon {
      font-size: 3rem;
      margin-bottom: 10px;
    }

    .camera-overlay .sub-err {
      font-size: 0.8rem;
      margin-top: 10px;
      opacity: 0.8;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 4px solid white;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .scanner-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: var(--success-color);
      box-shadow: 0 0 10px var(--success-color);
      animation: scan 2s linear infinite;
      z-index: 10;
    }

    @keyframes scan {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }

    .action-area {
      margin-top: 10px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .btn:active {
      transform: translateY(1px);
    }

    .btn-primary {
      background-color: var(--primary-color);
      color: white;
      width: 100%;
    }

    .btn-primary:hover {
      background-color: var(--primary-dark);
    }

    .btn:disabled {
      background-color: #bdc3c7;
      cursor: not-allowed;
      transform: none;
    }

    .btn-spinner {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 2px solid white;
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }

    .status-banner {
      padding: 12px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 0.95rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .error-banner {
      background-color: var(--error-bg);
      color: var(--error-color);
      border: 1px solid var(--error-border);
    }

    .success-banner {
      background-color: var(--success-bg);
      color: var(--success-color);
      border: 1px solid var(--success-border);
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
    this.examId = this.route.snapshot.paramMap.get('id');
  }

  ngAfterViewInit() {
    setTimeout(() => this.initCamera(), 500);
  }

  async initCamera() {
    this.errorMessage = null;
    this.successMessage = null;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.isCameraReady = true;
          this.cdr.detectChanges();
        };
      }
    } catch (err) {
      console.error("Camera initialization failed:", err);
      this.cameraError = true;
      this.isCameraReady = false;
      this.errorMessage = "Could not access camera. Please ensure permissions are granted.";
      this.cdr.detectChanges();
    }
  }

  startVerification() {
    if (!this.isCameraReady || this.isVerifying) return;

    this.isVerifying = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.detectChanges();

    const studentId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!studentId || !token) {
      this.errorMessage = "Authentication data missing. Please log in again.";
      this.isVerifying = false;
      this.cdr.detectChanges();
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      this.errorMessage = "Failed to initialize image capture context.";
      this.isVerifying = false;
      this.cdr.detectChanges();
      return;
    }

    // ==========================================
    // 📸 IMAGE CAPTURE LOGIC: Portrait Crop (Phone Ratio)
    // ==========================================
    // Since enrollment was done via phone (vertical/portrait), we need
    // to crop the landscape webcam feed to match a vertical aspect ratio (3:4).

    const vidW = video.videoWidth;   // Usually 640
    const vidH = video.videoHeight;  // Usually 480

    // Force a portrait aspect ratio (3:4) based on the video height
    const portraitHeight = vidH;
    const portraitWidth = vidH * (3 / 4); // 480 * 0.75 = 360

    // Set canvas to the vertical phone-like dimensions
    canvas.width = portraitWidth;
    canvas.height = portraitHeight;

    // Calculate X offset to crop exactly from the horizontal center
    const startX = (vidW - portraitWidth) / 2; // (640 - 360) / 2 = 140

    // Draw only the vertical center slice onto the canvas
    // No rotation needed! The image remains straight up, but cropped like a phone photo.
    context.drawImage(
      video,
      startX, 0, portraitWidth, portraitHeight, // Source crop dimensions
      0, 0, portraitWidth, portraitHeight       // Destination canvas dimensions
    );

    // ==========================================

    canvas.toBlob((blob) => {
      if (blob) {
        this.sendPhotoToApi(blob, studentId, token);
      } else {
        this.errorMessage = "Failed to capture image from camera feed.";
        this.isVerifying = false;
        this.cdr.detectChanges();
      }
    }, 'image/jpeg', 0.95);
  }

  private sendPhotoToApi(blob: Blob, studentId: string, token: string) {
    const formData = new FormData();
    formData.append('frame', blob, 'capture.jpg');

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/verify-entry/${studentId}`;

    this.http.post<any>(url, formData, { headers })
      .subscribe({
        next: (res) => {
          this.isVerifying = false;

          if (res.access === true) {
            this.errorMessage = null;
            this.successMessage = "Identity verified successfully! Redirecting to exam...";

            if (res.session_id) {
              localStorage.setItem('currentSessionId', res.session_id);
            }

            this.turnOffCamera();

            setTimeout(() => {
              this.router.navigate(['/exam']);
            }, 2500);
          } else {
            this.successMessage = null;
            this.errorMessage = res.message || "Face does not match your enrollment data. Please try again.";
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isVerifying = false;
          this.successMessage = null;

          if (err.status === 401) {
            this.errorMessage = "Session expired or invalid token. Please login again.";
          } else if (err.status === 0) {
            this.errorMessage = "Network error or server unreachable. Check your connection.";
          } else {
            this.errorMessage = `Server Error: ${err.error?.message || 'Verification failed. Please try again.'}`;
          }

          this.cdr.detectChanges();
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
