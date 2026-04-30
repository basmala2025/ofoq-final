import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-identity-verify',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-wrapper">
      <div class="verify-card">
        <h2>System Security Verification</h2>
        <p>Exam ID: {{ examId }}</p>
        <p>Please look directly at your camera. OFOQ AI is verifying your identity...</p>

        <div class="camera-box">
          <video #videoElement autoplay playsinline [class.hidden]="!isCameraReady"></video>

          <div class="camera-placeholder" *ngIf="!isCameraReady && !cameraError">
            <p>⏳ Starting Camera...</p>
          </div>

          <div class="camera-error" *ngIf="cameraError">
            <p>❌ Camera Access Denied.</p>
            <p>Please allow camera access in your browser settings to continue.</p>
          </div>

          <div class="scanner" *ngIf="isVerifying"></div>
        </div>

        <button class="btn btn-primary"
                (click)="startVerification()"
                [disabled]="isVerifying || !isCameraReady">
          {{ isVerifying ? 'Analyzing Face...' : 'Verify Identity' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .verify-wrapper { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f4f7f6; }
    .verify-card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; width: 400px; }

    .camera-box {
      height: 250px;
      background: #2c3e50;
      color: white;
      margin: 20px 0;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* ستايل فيديو الكاميرا */
    video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); /* عشان الكاميرا تبقى زي المراية */ }
    video.hidden { display: none; }

    .camera-placeholder, .camera-error { text-align: center; padding: 20px; }
    .camera-error { color: #e74c3c; }

    .scanner { position: absolute; width: 100%; height: 4px; background: #27ae60; box-shadow: 0 0 10px #27ae60; animation: scan 1.5s infinite; z-index: 10; }
    @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }

    .btn { width: 100%; padding: 12px; border-radius: 6px; border: none; cursor: pointer; color: white; background: #2980b9; font-weight: bold; }
    .btn:disabled { background: #95a5a6; cursor: not-allowed; }
  `]
})
export class IdentityVerifyComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  examId: string | null = null;
  isVerifying = false;
  isCameraReady = false;
  cameraError = false;
  private mediaStream: MediaStream | null = null;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id');
  }

  ngAfterViewInit() {
    this.initCamera();
  }

  async initCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;

        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.isCameraReady = true;
        };
      }
    } catch (err) {
      console.error("❌ Error accessing camera: ", err);
      this.cameraError = true;
    }
  }

  startVerification() {
    this.isVerifying = true;

    setTimeout(() => {
      this.isVerifying = false;
      this.router.navigate(['/exam']);
    }, 2000);
  }

  ngOnDestroy() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
  }
}
