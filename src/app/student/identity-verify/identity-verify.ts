import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-identity-verify',
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
        <p class="instruction">
          Look at the camera to verify your identity. <br>
          Ensure your face is centered, and not too close or too far.
        </p>

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
  `
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

  // سنخزن الـ session_id الجديد الراجع من سرفر الفيريفاي هنا
  serverSessionId: string | null = null;

  private mediaStream: MediaStream | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // جلب الـ ID من الرابط (سواء كان اسمه examId أو id)
    this.examId = this.route.snapshot.paramMap.get('examId') || this.route.snapshot.paramMap.get('id');
    console.log('Exam ID fetched from route:', this.examId);
  }

  ngAfterViewInit() {
    setTimeout(() => this.initCamera(), 500);
  }

  async initCamera() {
    this.errorMessage = null;
    this.successMessage = null;
    try {
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      let laptopCamera = videoDevices.find(device =>
        (device.label.toLowerCase().includes('integrated') ||
         device.label.toLowerCase().includes('webcam') ||
         device.label.toLowerCase().includes('hd') ||
         device.label.toLowerCase().includes('front')) &&
        !device.label.toLowerCase().includes('droidcam') &&
        !device.label.toLowerCase().includes('virtual')
      );

      if (!laptopCamera && videoDevices.length > 0) {
        laptopCamera = videoDevices.find(device =>
          !device.label.toLowerCase().includes('droidcam') &&
          !device.label.toLowerCase().includes('virtual')
        );
      }

      initialStream.getTracks().forEach(track => track.stop());

      const constraints: MediaStreamConstraints = {
        video: laptopCamera
          ? { deviceId: { exact: laptopCamera.deviceId } }
          : { facingMode: 'user' },
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

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
        this.successMessage = "Syncing biometric data with OFOQ AI Server...";
        this.cdr.detectChanges();

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
          this.cdr.detectChanges();
        }
      }, 'image/jpeg', 0.95);

    }, 400);
  }

  private sendFivePhotosToApi(blobs: Blob[], token: string) {
    const formData = new FormData();

    blobs.forEach((blob, index) => {
      formData.append('frames', blob, `frame_${index + 1}.jpg`);
    });

    // 💡 التعديل الأول: إرسال المتغير بالاسم الصحيح الذي يتوقعه الـ API
    const activeId = this.examId || localStorage.getItem('currentSessionId') || '';
    formData.append('activeExamSessionId', activeId);

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/verify-entry`;

    this.http.post<any>(url, formData, { headers }).subscribe({
      next: (res) => {
        this.isVerifying = false;
        if (res.verified === true || res.verified === 'true') {
          this.errorMessage = null;
          this.successMessage = "⚡ Identity Verified successfully! Access granted.";

          // 💡 التعديل الثاني: حفظ الـ session_id الجديد المرجّع من الباك إند
          this.serverSessionId = res.session_id;

          if (res.session_id) {
            localStorage.setItem('currentSessionId', res.session_id);
          }
          if (res.remaining_seconds) {
             localStorage.setItem('examRemainingSeconds', res.remaining_seconds.toString());
          }
          if (res.exam_title) {
             localStorage.setItem('examTitle', res.exam_title);
          }

          this.turnOffCamera();
          this.isVerificationSuccessful = true;

          // الانتقال التلقائي بعد 400ms أو ينتظر ضغطة الزر
          setTimeout(() => {
            this.startActualExam();
          }, 400);

        } else {
          this.successMessage = null;
          this.errorMessage = res.message || "Identity mismatch. Please center your face and try again.";
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Biometric validation crashed:', err);
        this.isVerifying = false;
        this.successMessage = null;
        this.errorMessage = "Biometric sync timeout. Please verify configuration.";
        this.cdr.detectChanges();
      }
    });
  }

  startActualExam() {
    // 💡 التعديل الثالث: استخدام الـ session_id الجديد المرجّع من ريكويست الفيريفاي
    const finalSessionId = this.serverSessionId || localStorage.getItem('currentSessionId') || this.examId;
    const token = localStorage.getItem('token');

    if (!finalSessionId) {
      this.errorMessage = "Error: No active session ID found to start the exam.";
      this.cdr.detectChanges();
      return;
    }

    this.successMessage = "Preparing exam environment... Please wait.";
    this.cdr.detectChanges();

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/start`;

    // إرسال الـ ID الجديد للباك إند
    const body = { session_id: finalSessionId };

    this.http.post(url, body, { headers }).subscribe({
      next: (res) => {
        console.log('✅ Exam session successfully recorded in Database!', res);
        // التوجيه لصفحة الامتحان بالـ ID الصحيح الجديد
        this.router.navigate(['/exam', finalSessionId]);
      },
      error: (err) => {
        console.warn('Server error on start endpoint, triggering fallback...', err);
        // حتى لو حدث خطأ، نوجه بالـ ID الجديد لتفادي الـ "Exam not found"
        this.router.navigate(['/exam', finalSessionId]);
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
