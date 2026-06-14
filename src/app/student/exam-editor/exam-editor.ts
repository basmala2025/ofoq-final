import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ExamService } from '../exam';
import { ProctoringService } from '../../services/proctoring.service';
import loader from '@monaco-editor/loader';
import { ExamStateService } from '../../services/exam-state.services';

@Component({
  selector: 'app-exam-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './exam-editor.html',
  styleUrls: ['./exam-editor.css']
})
export class ExamEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  @ViewChild('proctoringVideo') proctoringVideo!: ElementRef<HTMLVideoElement>;

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
  consoleOutput = 'System idle. Ready to execute.';
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
    private proctoringService: ProctoringService,
    private examState: ExamStateService
  ) {}

  ngOnInit() {
    this.examSessionId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('examId') || localStorage.getItem('currentSessionId')!;
    this.proctorSessionId = localStorage.getItem('proctorSessionId') || this.examSessionId;

    if (this.examSessionId) {
      localStorage.setItem('currentSessionId', this.examSessionId);
    }

    // 1. Restore violation count if the user refreshes the page
    const savedViolations = localStorage.getItem('ofoq_violation_count');
    if (savedViolations) {
      this.violationCount = parseInt(savedViolations, 10);
      if (this.violationCount >= 2) this.isRedAlarm = true;
    }

    // 2. Subscribe to AI Security Events Stream
    this.examState.securityEvents$.subscribe(event => {
      if (event.type === 'WARNING') {
        // Minor infractions (< 7s) trigger local UI warnings
        this.showWarning(`AI Vision: ${event.msg}`);
      } else if (event.type === 'CHEATING_ALARM') {
        // Severe infractions trigger official backend alarms
        this.triggerAlarm(`AI Alert: ${event.msg}`);
      }
    });

    this.loadExamProblemDetails();
  }

 ngAfterViewInit() {
    // We poll check for the video element to safely bypass any structural *ngIf delay
    const checkVideoInterval = setInterval(() => {
      if (this.proctoringVideo && this.proctoringVideo.nativeElement) {
        clearInterval(checkVideoInterval); // Stop polling once found

        const videoEl = this.proctoringVideo.nativeElement;
        this.proctoringService.startProctoring(videoEl, this.proctorSessionId);

        console.log('[OFOQ] AI Proctoring Core successfully attached to Video Element! ID:', this.proctorSessionId);
        this.cdr.detectChanges(); // Enforce change detection safely
      }
    }, 300); // Check every 300ms until the DOM renders the tag
  }

  loadExamProblemDetails() {
    this.examService.getExamDetails(this.examSessionId).subscribe({
      next: (res) => {
        this.problemTitle = res.title || 'Untitled Assessment';
        this.problemDescription = res.description || 'No descriptive tasks provided.';
        this.publicTestCases = res.publicTestCases || [];

        const langLower = res.constraints?.allowedLanguage?.toLowerCase() || '';
        this.allowedLanguage = langLower.includes('c++') || langLower.includes('cpp') ? 'cpp' : 'python';

        // Read time from LocalStorage primarily to survive refreshes
        const savedSeconds = localStorage.getItem('examRemainingSeconds');
        let totalSeconds: number;

        if (savedSeconds && parseInt(savedSeconds, 10) > 0) {
          totalSeconds = parseInt(savedSeconds, 10);
        } else {
          const durationInMinutes = res.durationMinutes || res.exam?.durationMinutes || res.constraints?.timeLimitSec / 60 || 60;
          totalSeconds = durationInMinutes * 60;
        }

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
        localStorage.setItem('examRemainingSeconds', seconds.toString());
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
    this.showWarning('Right-Click Context Menu Blocked'); // Warning Only
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if ((ctrl && ['c', 'v', 'a', 'x', 's', 'z'].includes(key)) || e.key === 'f12') {
      e.preventDefault();
      this.showWarning(`Security Bypass Attempt: Ctrl+${key.toUpperCase()}`); // Warning Only
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden) {
      this.triggerAlarm('Tab Switch Event Registered'); // Severe Alarm
    }
  }

  // Local Warning: Yellow toast, NO backend log, NO count increment
  showWarning(message: string) {
    this.securityMessage = `⚠️ Warning: ${message}`;
    this.isRedAlarm = false;
    this.showSecurityToast = true;
    setTimeout(() => this.showSecurityToast = false, 3000);
  }

triggerAlarm(reason: string) {
    const token = localStorage.getItem('token');
    if (!this.examSessionId || !token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const nextCount = this.violationCount + 1;

    const body = {
      sessionId: this.examSessionId,
      violationType: reason,
      alarmCount: nextCount
    };

    this.http.post('https://ofoqai.runasp.net/api/v1/exam/log-violation', body, { headers }).subscribe({
      next: (res: any) => {
        // نحدث العداد بناءً على رد الباك إند الموثوق فقط
        this.violationCount = res.currentViolationCount || nextCount;
        localStorage.setItem('ofoq_violation_count', this.violationCount.toString());

        if (res.forceSubmitted === true || this.violationCount >= 3 || res.shouldTerminate) {
          this.isRedAlarm = true;
          this.securityMessage = res.message || `CRITICAL: Violations threshold breached (3/3).`;
          this.showSecurityToast = true;

          // هندي مهلة للطالب يشوف التوست قبل ما نعمل التوجيه عشان الـ Guard ميتفاجئش
          setTimeout(() => {
            this.forceSubmitAndExit();
          }, 2000);
        } else {
          this.securityMessage = `🚨 ALARM: ${reason}. Violations: ${this.violationCount}/3.`;
          this.isRedAlarm = true;
          this.showSecurityToast = true;
          this.cdr.detectChanges(); // نجبر الكاميرا والـ UI يفضلوا صاحيين
          setTimeout(() => this.showSecurityToast = false, 4000);
        }
      },
      error: (err) => {
        console.error("❌ Backend log dropped. Keeping screen active.", err);
        // 💥 التعديل السحري: شيلنا الـ forceSubmit الإجباري من الـ error
        // عشان لو ريكويست الـ AI علق للحظة، الامتحان ميرميش الطالب بره ويقفل الكاميرا
        this.securityMessage = `⚠️ Sync Warning: ${reason}`;
        this.showSecurityToast = true;
        setTimeout(() => this.showSecurityToast = false, 3000);
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

    this.examService.runSandbox(this.examSessionId, sourceCode, this.allowedLanguage).subscribe({
      next: (res) => {
        this.compileMessage = res.compileOutput;
        this.consoleOutput = res.isPassed
          ? `✅ Passed Public Cases!\nOutput: ${res.runOutput}`
          : `❌ Failed Public Test Cases.\nOutput: ${res.runOutput}\n${res.compileOutput}`;
        this.isLoading = false;
      },
      error: (err) => {
        this.consoleOutput = ' Sandbox Runtime Execution Refused.';
        this.isLoading = false;
      }
    });
  }

  submitSolution() {
    if (!this.editor) return;
    if (!confirm('Are you sure you want to finalize your submission?')) return;

    const sourceCode = this.editor.getValue();
    this.isLoading = true;

    this.examService.submitExam(this.examSessionId, sourceCode).subscribe({
      next: (res) => {
        this.saveResultData(res, sourceCode);
        this.cleanupEnvironment();
        this.router.navigate(['/results']);
      },
      error: (err) => {
        console.error('Finalization request crashed:', err);
        this.isLoading = false;
      }
    });
  }

  forceSubmitAndExit() {
    const backupCode = this.editor ? this.editor.getValue() : (localStorage.getItem(this.savedCodeKey) || '');
    this.isLoading = true;

    this.examService.submitExam(this.examSessionId, backupCode).subscribe({
      next: (res) => {
        this.saveResultData(res, backupCode);
        this.cleanupEnvironment();
        this.router.navigate(['/results']);
      },
      error: () => {
        this.cleanupEnvironment();
        this.router.navigate(['/dashboardstudent']);
      }
    });
  }

  private saveResultData(backendResponse: any, submittedCode: string) {
    const linesOfCode = submittedCode ? submittedCode.split('\n').length : 0;
    const finalExamTitle = this.problemTitle !== 'Loading assessment...'
      ? this.problemTitle
      : (localStorage.getItem('examTitle') || 'Final Assessment');

    const finalScore = backendResponse.finalScore || 0;
    const maxPoints = backendResponse.maxPoints || 100;
    const percentageScore = maxPoints > 0 ? Math.round((finalScore / maxPoints) * 100) : 0;

    const breakdown = backendResponse.breakdown || {};
    const uiTestCases = [
      { name: 'Coding Output', passed: breakdown.codingOutputScore > 0, status: `Score: ${breakdown.codingOutputScore || 0}` },
      { name: 'Code Performance', passed: breakdown.performanceScore > 0, status: `Score: ${breakdown.performanceScore || 0}` },
      { name: 'System Verdict', passed: backendResponse.status?.includes('Completed') || false, status: backendResponse.verdict || 'Evaluated' }
    ];

    const resultPayload = {
      examTitle: finalExamTitle,
      category: `${this.allowedLanguage.toUpperCase()} Programming`,
      score: percentageScore,
      timeTaken: this.timerDisplay,
      totalLines: linesOfCode,
      testCases: uiTestCases,
      violations: this.violationCount
    };

    localStorage.setItem('ofoq_last_result', JSON.stringify(resultPayload));
  }

  enterFullScreen() {
    const el = document.documentElement as any;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  cleanupEnvironment() {
    localStorage.removeItem(this.savedCodeKey);
    localStorage.removeItem('examRemainingSeconds');
    localStorage.removeItem('ofoq_violation_count');

    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});

    this.proctoringService.stopEverything();
    console.log(' AI Proctoring Stopped & Environment Cleaned');
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.proctoringService.stopEverything();
    console.log(' Component destroyed, proctoring paused.');
  }
}
