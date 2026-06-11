import { Component, OnInit } from '@angular/core';
import { CommonModule, LocationStrategy } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.html',
  styleUrls: ['./results.css'],
})
export class Results implements OnInit {
  examTitle: string = '';
  category: string = '';
  score: number = 0;
  timeTaken: string = '';
  totalLines: number = 0;
  testCases: any[] = [];
  violations: number = 0;

  constructor(
    private router: Router,
    private locationStrategy: LocationStrategy
  ) {}

  ngOnInit(): void {
    // التمرير لأعلى الصفحة عند الدخول
    window.scrollTo(0, 0);

    // تفعيل حماية زر الرجوع لمنع الطالب من العودة للامتحان
    this.preventBackButton();

    // تحميل النتائج الحقيقية المستلمة من الباك إند
    this.loadRealResults();
  }

  loadRealResults() {
    const data = localStorage.getItem('ofoq_last_result');
    if (data) {
      const parsed = JSON.parse(data);
      this.examTitle = parsed.examTitle;
      this.category = parsed.category;
      this.score = parsed.score; // النسبة المئوية المحسوبة
      this.timeTaken = parsed.timeTaken; // الوقت المتبقي عند التسليم
      this.totalLines = parsed.totalLines; // عدد سطور الكود
      this.testCases = parsed.testCases; // البنود المفصلة (Coding Output, Performance, Verdict)
      this.violations = parsed.violations; // عدد المخالفات الأمنية
    } else {
      // إذا حاول الطالب دخول الصفحة بدون امتحان، يتم توجيهه للداشبورد مباشرة
      this.router.navigate(['/dashboardstudent']);
    }
  }

  preventBackButton() {
    history.pushState(null, '', location.href);
    this.locationStrategy.onPopState(() => {
      history.pushState(null, '', location.href);
    });
  }

  get passedCount(): number {
    return this.testCases ? this.testCases.filter(t => t.passed).length : 0;
  }

  goHome() {
    // تنظيف الكاش والعودة للداشبورد بشكل آمن لمنع تكرار فتح الصفحة
    localStorage.removeItem('ofoq_last_result');
    this.router.navigate(['/dashboardstudent'], { replaceUrl: true });
  }
}
