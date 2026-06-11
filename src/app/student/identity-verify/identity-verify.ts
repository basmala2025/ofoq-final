import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-identity-verify',
  standalone: true,          // 2. ADD THIS
  imports: [CommonModule],   // 3. ADD THIS
  styles:[`
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

    .camera-gradient-ring.success-ring {
      background: linear-gradient(135deg, #2ecc71, #27ae60);
      box-shadow: 0 0 15px rgba(46, 204, 113, 0.5);
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
      transform: scaleX(-1);
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
      flex-direction: column;
    }

    .error-text {
      color: var(--error);
      font-weight: bold;
    }

    .success-text {
      color: var(--success);
      font-weight: bold;
      font-size: 1.2rem;
      margin-top: 10px;
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

    .status-dot.success {
      background-color: var(--success);
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
    .btn-action {
      width: 100%;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      border: none;
      cursor: pointer;
      display: block;
      transition: all 0.3s ease;
      margin-top: 24px;
    }

    .btn-verify {
      background: #6366f1;
      color: white;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    }

    .btn-start-exam {
      background: linear-gradient(to right, #2ecc71, #27ae60);
      color: white;
      box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
    }

    .btn-action:active:not(:disabled) {
      transform: scale(0.98);
    }

    .btn-action:disabled {
      background: #cbd5e1 !important;
      color: #64748b !important;
      cursor: not-allowed !important;
      box-shadow: none !important;
    }

    .btn-action:not(:disabled):hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
  `],
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
        <p class="instruction" *ngIf="!isVerificationSuccessful">
          Look at the camera to verify your identity. <br>
          Ensure your face is centered, and not too close or too far.
        </p>

        <p class="instruction" *ngIf="isVerificationSuccessful" style="color: var(--success); font-weight: bold;">
          Identity successfully verified! You may now proceed.
        </p>

        <div class="camera-section">
          <div class="camera-gradient-ring" [class.analyzing-ring]="isVerifying" [class.success-ring]="isVerificationSuccessful">
            <div class="camera-box">
              <video #videoElement autoplay playsinline [class.hidden]="!isCameraReady || isVerificationSuccessful"></video>
              <canvas #canvasElement style="display: none;"></canvas>

              <div class="camera-placeholder" *ngIf="!isCameraReady && !cameraError && !isVerificationSuccessful">
                <div class="spinner"></div>
              </div>

              <div class="camera-placeholder error-text" *ngIf="cameraError && !isVerificationSuccessful">
                <p>Camera Error</p>
              </div>

              <div class="camera-placeholder" *ngIf="isVerificationSuccessful">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--success)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <p class="success-text">Verified</p>
              </div>

              <div class="scanner-overlay" *ngIf="isVerifying"></div>
            </div>
          </div>
        </div>

        <div class="status-card">
          <div class="status-dot"
               [class.ready]="isCameraReady && !isVerifying && !isVerificationSuccessful"
               [class.analyzing]="isVerifying"
               [class.success]="isVerificationSuccessful"></div>
          <div class="status-text">
            <h3>
              {{ isVerificationSuccessful ? 'Access Granted' : (isVerifying ? 'Analyzing...' : (isCameraReady ? 'Ready' : 'Waiting for Camera')) }}
            </h3>
            <p>
              {{ isVerificationSuccessful ? 'Secure session established' : (isVerifying ? 'Please keep your face in the frame' : 'Press Start Verification to begin') }}
            </p>
          </div>
        </div>

        <div *ngIf="successMessage" class="message-banner success">
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="message-banner error">
          {{ errorMessage }}
        </div>

        <button *ngIf="!isVerificationSuccessful"
                class="btn-action btn-verify"
                (click)="startVerification()"
                [disabled]="isVerifying || !isCameraReady">
          {{ isVerifying ? 'Processing...' : 'Start Verification' }}
        </button>

        <button *ngIf="isVerificationSuccessful"
                class="btn-action btn-start-exam"
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

  serverSessionId: string | null = null;
  private mediaStream: MediaStream | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
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

    // 👇 ضفنا الأبعاد عشان نجبر الكاميرا تفتح HD
     // 👇 الإعدادات الصارمة (إجبار المتصفح على جودة HD كحد أدنى)
      let constraints: MediaStreamConstraints = {
        video: laptopCamera
          ? {
              deviceId: { exact: laptopCamera.deviceId },
              width: { min: 1280, ideal: 1920 },
              height: { min: 720, ideal: 1080 }
            }
          : {
              facingMode: 'user',
              width: { min: 1280, ideal: 1920 },
              height: { min: 720, ideal: 1080 }
            },
        audio: false
      };

      try {
        // المحاولة الأولى: فتح الكاميرا بالـ HD إجبارياً
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("✅ Camera forced to HD successfully!");
      } catch (hdError) {
        console.warn("⚠️ HD not supported by this local hardware, falling back to default resolution...", hdError);
        // المحاولة التانية (Fallback): لو الهاردوير مفيش فيه 720p، نفتح بالديفولت عشان الكود ميضربش
        constraints = {
          video: laptopCamera
            ? { deviceId: { exact: laptopCamera.deviceId } }
            : { facingMode: 'user' },
          audio: false
        };
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      }

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

    // 1. حسابات القص من المنتصف
    const portraitHeight = vidH;
    const portraitWidth = vidH * (3 / 4);
    const startX = (vidW - portraitWidth) / 2;

    // 2. إجبار الكانفاس على المقاس المطلوب (التعديل الأول بتاعك)
    canvas.width = 540;
    canvas.height = 720;

    const captureInterval = setInterval(() => {
      if (frameCount >= 5) {
        clearInterval(captureInterval);
        this.successMessage = "Syncing biometric data with OFOQ AI Server...";
        this.cdr.detectChanges();

        this.sendFivePhotosToApi(capturedBlobs, token);
        return;
      }

      // 3. رسم الصورة (التعديل التاني هنا: خلينا الوجهة 540 و 720)
      context.drawImage(
        video,
        startX, 0, portraitWidth, portraitHeight, // المصدر (الفيديو المقصوص)
        0, 0, 540, 720                            // 👈 الوجهة النهائية للرسم
      );

      canvas.toBlob((blob) => {
        if (blob) {
          capturedBlobs.push(blob);
          frameCount++;
          this.successMessage = `Capturing secure biological frames (${frameCount}/5)...`;
          this.cdr.detectChanges();
        }
      }, 'image/jpeg', 0.95);

    }, 400); }
// دالة مؤقتة عشان تنزلي الصور وتشوفيها (امسحيها قبل ما ترفعي الكود النهائي)
  private downloadFramesForDebugging(blobs: Blob[]) {
    blobs.forEach((blob, index) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ofoq_test_frame_${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // تنظيف الميموري
    });
  }
 private sendFivePhotosToApi(blobs: Blob[], token: string) {
    const formData = new FormData();
    blobs.forEach((blob, index) => {
      formData.append('frames', blob, `frame_${index + 1}.jpg`);
    });

    // 👈 بنبعت الـ ExamSessionId الأصلي للفيريفاي زي ما هو
    const activeId = this.examId || localStorage.getItem('currentSessionId') || '';
    formData.append('session_id', activeId);

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `https://ofoqai.runasp.net/api/v1/exam/verify-entry`;

    this.http.post<any>(url, formData, { headers }).subscribe({
      next: (res) => {
        this.isVerifying = false;
        if (res.verified === true || res.verified === 'true') {
          this.errorMessage = null;
          this.successMessage = "⚡ Identity Verified successfully! Access granted.";

          // 👇 التعديل هنا: هنحفظ الـ ID بتاع المراقبة باسم مختلف عشان ميبوظش الـ ExamSessionId الأصلي
          if (res.session_id) {
            localStorage.setItem('proctorSessionId', res.session_id); // ده للفيجين لو احتاجه
          }
if (res.exam_session_id) {
            localStorage.setItem('currentSessionId', res.exam_session_id);
          }

          if (res.remaining_seconds) {
             localStorage.setItem('examRemainingSeconds', res.remaining_seconds.toString());
          }

          if (res.exam_title) {
             localStorage.setItem('examTitle', res.exam_title);
          }

          this.turnOffCamera();
          this.isVerificationSuccessful = true;
          this.cdr.detectChanges();
        } else {
          this.successMessage = null;
          this.errorMessage = res.message || "Identity mismatch. Please center your face and try again.";
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Biometric validation crashed:', err);
        // ... (باقي الكود)
      }
    });
  }

 startActualExam() {
    // 1. هنجيب الـ 2 IDs اللي حفظناهم من ريسبونس الفيريفاي
    const examSessionId = localStorage.getItem('currentSessionId') || this.examId;
    const proctorSessionId = localStorage.getItem('proctorSessionId');
    const token = localStorage.getItem('token');

  if (!examSessionId || !proctorSessionId) {
      this.errorMessage = "Error: Missing session data to start the exam.";
      this.cdr.detectChanges();
      return;
    }

    this.successMessage = "Preparing exam environment... Please wait.";
    this.cdr.detectChanges();

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // مسار الريكويست
    const url = `https://ofoqai.runasp.net/api/v1/exam/start`;

    // 👇 التعديل هنا: بنبعت الـ session_id في الـ Body بتاع الريكويست
    const body = { session_id: proctorSessionId };

    this.http.post(url, body, { headers }).subscribe({
      next: (res) => {
        console.log('✅ Exam session successfully recorded in Database!', res);
        // 🚀 التوجيه لصفحة الامتحان باستخدام الـ ExamSessionId الأساسي
        this.router.navigate(['/exam', examSessionId]);
      },
      error: (err) => {
        console.warn('Server error on start endpoint, triggering fallback...', err);
        this.router.navigate(['/exam', examSessionId]);
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
