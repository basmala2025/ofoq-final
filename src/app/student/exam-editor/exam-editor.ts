import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ExamService } from '../exam';
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

  // Exam Identification
  examId!: string;
  editor: any;
  savedCodeKey = 'ofoq_exam_backup';

  // Timer Variable for UI Tracking
  timerDisplay = '00:00';
  private timerInterval: any; // Reference tracker to clear interval on component destruction

  // Problem Properties Mapped from API
  problemTitle = 'Loading assessment...';
  problemDescription = '';
  allowedLanguage = 'cpp';

  // Security and Integrity UI States
  violationCount = 0;
  consoleOutput = 'System output idle. Click "Run Code" to benchmark calculations.';
  compileMessage = '';
  isLoading = false;

  publicTestCases: any[] = [];
  // Security Toast Overlay Configurations
  showSecurityToast = false;
  securityMessage = '';
  isRedAlarm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Extract exam ID parameter from the current active route sequence
    this.examId = this.route.snapshot.paramMap.get('examId')!;
    this.loadExamProblemDetails();
  }

  ngAfterViewInit() {
    // Enforce fullscreen workspace configuration immediately upon visual initialization
    this.enterFullScreen();
  }

  /**
   * Fetches the technical specifications and constraints of the active assessment
   */
loadExamProblemDetails() {

// 2. جوه ميثود loadExamProblemDetails وفي الـ next:
this.examService.getExamDetails(this.examId).subscribe({
  next: (res) => {
    this.problemTitle = res.title || 'Untitled Assessment';
    this.problemDescription = res.description || 'No descriptive tasks provided.';

    // 👇 السطر السحري لتخزين الـ Cases اللي جاية من الـ API
    this.publicTestCases = res.publicTestCases || [];

    const langLower = res.constraints?.allowedLanguage?.toLowerCase() || '';
    this.allowedLanguage = langLower.includes('c++') || langLower.includes('cpp') ? 'cpp' : 'python';

    const remainingSeconds = res.remainingSeconds || res.constraints?.timeLimitSec || 3600;
    this.startTimerCountdown(remainingSeconds);

    this.initMonacoEditor();
  },
  // ...
});
  }

  /**
   * Orchestrates the active ticking timer system updating the interface sequentially
   */
  startTimerCountdown(seconds: number) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const updateDisplay = (secs: number) => {
      const minutes = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      this.timerDisplay = `${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    updateDisplay(seconds); // Trigger initial synchronization tick

    this.timerInterval = setInterval(() => {
      if (seconds > 0) {
        seconds--;
        updateDisplay(seconds);
      } else {
        clearInterval(this.timerInterval);
        this.timerDisplay = "00:00";
        this.forceSubmitAndExit(); // Automatic environmental submission lock upon time expiration
      }
    }, 1000);
  }

  // =========================================================================
  // 🔐 ANTI-CHEAT INTEGRITY HOOKS: Event Interceptions & Enforcement Routines
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

  /**
   * Flags anti-cheat metrics to backend system and evaluates the execution of a forced lock out
   */
  triggerViolation(type: string) {
    this.examService.logTabSwitch(this.examId).subscribe({
      next: (res: any) => {
        this.violationCount = res.currentViolationCount;

        // Condition evaluation to invoke immediate termination protocol upon 3rd anomaly
        if (res.shouldTerminate) {
          this.isRedAlarm = true;
          this.securityMessage = res.serverMessage || 'Integrity threshold breached. Session revoked.';
          this.showSecurityToast = true;

          setTimeout(() => {
            this.forceSubmitAndExit();
          }, 3000);
        } else {
          // Warning notifications tracking the incremental thresholds
          this.securityMessage = `⚠️ Security Warning: ${type}. Violations: ${this.violationCount}/3. Deduction Imposed: ${res.integrityScoreDeduction}`;
          this.isRedAlarm = false;
          this.showSecurityToast = true;
          setTimeout(() => this.showSecurityToast = false, 4000);
        }
      }
    });
  }

  // =========================================================================
  // 💻 SANDBOX COMPILATION CORES: Monaco Configuration & Judge0 Routing Pipes
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

  /**
   * Dispatches current localized workspace matrix to the sandboxed Judge0 execution nodes
   */
  runCode() {
    if (!this.editor) return;
    this.isLoading = true;
    this.consoleOutput = 'Compiling and executing code on sandbox container...';

    const sourceCode = this.editor.getValue();
    this.examService.runSandbox(this.examId, sourceCode, this.allowedLanguage).subscribe({
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

  /**
   * Standard formal code evaluation submission sequence triggered directly by student intent
   */
  submitSolution() {
    if (!this.editor) return;
    if (!confirm('Are you sure you want to finalize your submission? This locks your grade calculation.')) return;

    const sourceCode = this.editor.getValue();
    this.examService.submitExam(this.examId, sourceCode).subscribe({
      next: (res) => {
        this.cleanupEnvironment();
        this.router.navigate(['/exam/result', this.examId]);
      },
      error: (err) => console.error('Finalization request crashed:', err)
    });
  }

  /**
   * Security enforcement script forcing payload delivery and locking context on critical alarms
   */
  forceSubmitAndExit() {
    const backupCode = this.editor ? this.editor.getValue() : (localStorage.getItem(this.savedCodeKey) || '');
    this.examService.submitExam(this.examId, backupCode).subscribe({
      next: () => {
        this.cleanupEnvironment();
        this.router.navigate(['/exam/result', this.examId]);
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
  }

  ngOnDestroy() {
    // Teardown ticking threads to block application frame leakage and performance drag
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.cleanupEnvironment();
  }
}
