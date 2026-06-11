import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ExamService } from '../exam';
import { ProctoringService } from '../../services/proctoring.service'; // 👈 تأكدي من مسار الخدمة
import loader from '@monaco-editor/loader';

@Component({
  selector: 'app-exam-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './exam-editor.html',
  styleUrls: ['./exam-editor.css']
})
export class ExamEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  // 👈 ربط الفيديو المخفي من الـ HTML بالكومبوننت
  @ViewChild('proctoringVideo') proctoringVideo!: ElementRef<HTMLVideoElement>;

  sessionId!: string;
  editor: any;
  savedCodeKey = 'ofoq_exam_backup';

  timerDisplay = '00:00';
  private timerInterval: any;

  problemTitle = 'Loading assessment...';
  problemDescription = '';
  allowedLanguage = 'cpp';

  violationCount = 0;
  consoleOutput = 'System output idle. Click "Run Code" to benchmark calculations.';
  compileMessage = '';
  isLoading = false;

  publicTestCases: any[] = [];
  showSecurityToast = false;
  securityMessage = '';
  isRedAlarm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private proctoringService: ProctoringService // 👈 حقن خدمة المراقبة هنا
  ) {}

  ngOnInit() {
    // جلب الـ sessionId من الـ URL أو الـ LocalStorage
    this.sessionId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('examId') || localStorage.getItem('currentSessionId')!;

    if(this.sessionId) {
      localStorage.setItem('currentSessionId', this.sessionId);
    }

    this.loadExamProblemDetails();
  }

  ngAfterViewInit() {
    this.enterFullScreen();

    // 👈 تشغيل المراقبة الشاملة (كاميرا، صوت، فيجين، SignalR) بعد تحميل الواجهة
    setTimeout(() => {
      if (this.proctoringVideo && this.proctoringVideo.nativeElement) {
        this.proctoringService.startProctoring(this.proctoringVideo.nativeElement, this.sessionId);
        console.log('👀 AI Proctoring (Vision & Audio) Started!');
      }
    }, 500);
  }

  loadExamProblemDetails() {
    this.examService.getExamDetails(this.sessionId).subscribe({
      next: (res) => {
        this.problemTitle = res.title || 'Untitled Assessment';
        this.problemDescription = res.description || 'No descriptive tasks provided.';
        this.publicTestCases = res.publicTestCases || [];

        const langLower = res.constraints?.allowedLanguage?.toLowerCase() || '';
        this.allowedLanguage = langLower.includes('c++') || langLower.includes('cpp') ? 'cpp' : 'python';

        const remainingSeconds = res.remainingSeconds || res.constraints?.timeLimitSec || 3600;
        this.startTimerCountdown(remainingSeconds);

        this.initMonacoEditor();
      },
      error: (err) => console.error("Error fetching exam details:", err)
    });
  }

  startTimerCountdown(seconds: number) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const updateDisplay = (secs: number) => {
      const minutes = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      this.timerDisplay = `${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    updateDisplay(seconds);

    this.timerInterval = setInterval(() => {
      if (seconds > 0) {
        seconds--;
        updateDisplay(seconds);
      } else {
        clearInterval(this.timerInterval);
        this.timerDisplay = "00:00";
        this.forceSubmitAndExit();
      }
    }, 1000);
  }

  // =========================================================================
  // 🔐 ANTI-CHEAT INTEGRITY HOOKS
  // =========================================================================

  @HostListener('document:contextmenu', ['$event'])
  preventRightClick(e: MouseEvent) {
    e.preventDefault();
    this.triggerViolation('Right-Click Context Menu Blocked');
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if ((ctrl && ['c', 'v', 'a', 'x', 's'].includes(key)) || e.key === 'f12') {
      e.preventDefault();
      this.triggerViolation(`Security Bypass Attempt: Ctrl+${key.toUpperCase()}`);
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden) {
      this.triggerViolation('Tab Switch Event Registered');
    }
  }

  triggerViolation(type: string) {
    this.examService.logTabSwitch(this.sessionId).subscribe({
      next: (res: any) => {
        this.violationCount = res.currentViolationCount;

        if (res.shouldTerminate) {
          this.isRedAlarm = true;
          this.securityMessage = res.serverMessage || 'Integrity threshold breached. Session revoked.';
          this.showSecurityToast = true;

          setTimeout(() => {
            this.forceSubmitAndExit();
          }, 3000);
        } else {
          this.securityMessage = `⚠️ Security Warning: ${type}. Violations: ${this.violationCount}/3. Deduction Imposed: ${res.integrityScoreDeduction}`;
          this.isRedAlarm = false;
          this.showSecurityToast = true;
          setTimeout(() => this.showSecurityToast = false, 4000);
        }
      }
    });
  }

  // =========================================================================
  // 💻 SANDBOX & MONACO EDITOR
  // =========================================================================

  initMonacoEditor() {
    loader.init().then((monaco: any) => {
      const recovered = localStorage.getItem(this.savedCodeKey);
      const defaultCode = this.allowedLanguage === 'cpp'
        ? `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Solve problem here\n    return 0;\n}`
        : `# Solve problem here\ndef main():\n    pass`;

      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: recovered || defaultCode,
        language: this.allowedLanguage,
        theme: 'vs-dark',
        automaticLayout: true,
        contextmenu: false
      });

      this.editor.onDidChangeModelContent(() => {
        localStorage.setItem(this.savedCodeKey, this.editor.getValue());
      });
    });
  }

  runCode() {
    if (!this.editor) return;
    this.isLoading = true;
    this.consoleOutput = 'Compiling and executing code on sandbox container...';

    const sourceCode = this.editor.getValue();

    this.examService.runSandbox(this.sessionId, sourceCode, this.allowedLanguage).subscribe({
      next: (res) => {
        this.compileMessage = res.compileOutput;
        this.consoleOutput = res.isPassed
          ? `✅ Passed Public Cases!\nOutput: ${res.runOutput}`
          : `❌ Failed Public Test Cases.\nOutput: ${res.runOutput}\n${res.compileOutput}`;
        this.isLoading = false;
      },
      error: (err) => {
        this.consoleOutput = '❌ Sandbox Runtime Execution Refused.';
        this.isLoading = false;
      }
    });
  }

  submitSolution() {
    if (!this.editor) return;
    if (!confirm('Are you sure you want to finalize your submission? This locks your grade calculation.')) return;

    const sourceCode = this.editor.getValue();

    this.examService.submitExam(this.sessionId, sourceCode).subscribe({
      next: (res) => {
        this.cleanupEnvironment();
        this.router.navigate(['/exam/result', this.sessionId]);
      },
      error: (err) => console.error('Finalization request crashed:', err)
    });
  }

  forceSubmitAndExit() {
    const backupCode = this.editor ? this.editor.getValue() : (localStorage.getItem(this.savedCodeKey) || '');
    this.examService.submitExam(this.sessionId, backupCode).subscribe({
      next: () => {
        this.cleanupEnvironment();
        this.router.navigate(['/exam/result', this.sessionId]);
      },
      error: () => {
        this.cleanupEnvironment();
        this.router.navigate(['/dashboard']);
      }
    });
  }

  enterFullScreen() {
    const el = document.documentElement as any;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  cleanupEnvironment() {
    localStorage.removeItem(this.savedCodeKey);
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});

    // 👈 إيقاف كل مجسات المراقبة (الكاميرا والمايك والسوكيت) عند الخروج
    this.proctoringService.stopEverything();
    console.log('🛑 AI Proctoring Stopped & Environment Cleaned');
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.cleanupEnvironment();
  }
}
