import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ExamService } from '../exam';
import { ProctoringService } from '../../services/proctoring.service';
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

  // عنصر الفيديو المخفي الخاص بالمراقبة
  @ViewChild('proctoringVideo') proctoringVideo!: ElementRef<HTMLVideoElement>;

  // فصلنا الـ IDs بناءً على تعليمات الباك إند
  examSessionId!: string;
  proctorSessionId!: string;

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
    private proctoringService: ProctoringService
  ) {}

  ngOnInit() {
    // 1. جلب الـ ExamSessionId الأصلي للـ Exam APIs
    this.examSessionId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('examId') || localStorage.getItem('currentSessionId')!;

    // 2. جلب الـ ProctorSessionId الخاص بالمراقبة (ولو مش موجود هنستخدم الأصلي كاحتياطي)
    this.proctorSessionId = localStorage.getItem('proctorSessionId') || this.examSessionId;

    if(this.examSessionId) {
      localStorage.setItem('currentSessionId', this.examSessionId);
    }

    this.loadExamProblemDetails();
  }

  ngAfterViewInit() {
    this.enterFullScreen();

    // تشغيل المراقبة باستخدام الـ proctorSessionId
    setTimeout(() => {
      if (this.proctoringVideo && this.proctoringVideo.nativeElement) {
        this.proctoringService.startProctoring(this.proctoringVideo.nativeElement, this.proctorSessionId);
        console.log('👀 AI Proctoring Started with ID:', this.proctorSessionId);
      }
    }, 500);
  }

loadExamProblemDetails() {
    this.examService.getExamDetails(this.examSessionId).subscribe({
      next: (res) => {
        this.problemTitle = res.title || 'Untitled Assessment';
        this.problemDescription = res.description || 'No descriptive tasks provided.';
        this.publicTestCases = res.publicTestCases || [];

        const langLower = res.constraints?.allowedLanguage?.toLowerCase() || '';
        this.allowedLanguage = langLower.includes('c++') || langLower.includes('cpp') ? 'cpp' : 'python';

        // 👇 التعديل هنا: بنشوف هل فيه وقت متخزن من قبل الريفرش؟
        const savedSeconds = localStorage.getItem('examRemainingSeconds');

        let totalSeconds: number;
        if (savedSeconds) {
          // لو لقاه (يعني الطالب عمل ريفريش)، بياخد الوقت اللي وقف عنده بالظبط
          totalSeconds = parseInt(savedSeconds, 10);
        } else {
          // لو مالقاهوش (يعني أول مرة يدخل الامتحان)، بياخد الوقت الأصلي من السيرفر
          const durationInMinutes = res.durationMinutes || 60;
          totalSeconds = durationInMinutes * 60;
        }

        // تشغيل التايمر بالوقت الذكي
        this.startTimerCountdown(totalSeconds);

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

        // 👇 السطر ده السحر اللي هيحمينا من الريفرش: بيحدث الثواني في الـ LocalStorage أول بأول
        localStorage.setItem('examRemainingSeconds', seconds.toString());
      } else {
        clearInterval(this.timerInterval);
        this.timerDisplay = "00:00";

        // الامتحان خلص، نمسح التايمر من الـ LocalStorage
        localStorage.removeItem('examRemainingSeconds');
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
    // إرسال محاولة الغش باستخدام الـ examSessionId
    this.examService.logTabSwitch(this.examSessionId).subscribe({
      next: (res: any) => {
        this.violationCount = res.currentViolationCount;

        // النظام بيطلع تحذيرات للمستخدم قبل تطبيق أي عقوبة إغلاق
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

    // examSessionId
    this.examService.runSandbox(this.examSessionId, sourceCode, this.allowedLanguage).subscribe({
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
    if (!confirm('Are you sure you want to finalize your submission?')) return;

    const sourceCode = this.editor.getValue();

    this.examService.submitExam(this.examSessionId, sourceCode).subscribe({
      next: (res) => {
        this.cleanupEnvironment(); 
        this.router.navigate(['/exam/result', this.examSessionId]);
      },
      error: (err) => console.error('Finalization request crashed:', err)
    });
  }
  forceSubmitAndExit() {
    const backupCode = this.editor ? this.editor.getValue() : (localStorage.getItem(this.savedCodeKey) || '');
    this.examService.submitExam(this.examSessionId, backupCode).subscribe({
      next: () => {
        this.cleanupEnvironment();
        this.router.navigate(['/exam/result', this.examSessionId]);
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
    // التنظيف النهائي للداتا بعد تسليم الامتحان بنجاح
    localStorage.removeItem(this.savedCodeKey);
    localStorage.removeItem('examRemainingSeconds');

    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    this.proctoringService.stopEverything();
    console.log('🧹 Exam finalized. Backup data cleared safely.');
  }

  ngOnDestroy() {
    // 1. إيقاف العداد
    if (this.timerInterval) clearInterval(this.timerInterval);

    // 2. إيقاف الكاميرا والمايك والسوكيت فوراً عشان الكاميرا متفضلش منورة
    this.proctoringService.stopEverything();
    console.log('🛑 Component destroyed, proctoring paused.');

    // 🔴 تم حذف this.cleanupEnvironment() من هنا عشان متمسحش الكود وقت الريفرش
  }}
