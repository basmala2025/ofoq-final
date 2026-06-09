import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from "../../dashboard/navbar/navbar";
import { CourseService } from '../../services/course-service';
import { ExamService } from '../exam';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.html',
  styleUrls: ['./dashboard-page.css'],
  imports: [Navbar, RouterLink]
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  myCourses: any[] = [];
  availableCourses: any[] = [];
  isLoading = true;
  private examSub!: Subscription;

  stats = { available: 0, completed: 12, average: 88 };

  constructor(
    private router: Router,
    private courseService: CourseService,
    private examService: ExamService
  ) {}

 ngOnInit(): void {
    this.loadDashboard();

    // 1. تشغيل الهاب بعد تظبيط الـ CORS من الباكيند
    this.examService.initExamNotificationHub();

    // 2. الاستماع للامتحانات الجديدة اللي المعيد بيعملها لحظياً
    this.examSub = this.examService.newExamStream$.subscribe({
      next: (data) => {
        console.log('New exam created by TA:', data);
        // إعادة تحميل البيانات لتحديث الكروت وظهور زرار الـ Launch Exam فوراً
        this.loadDashboard();
      }
    });
  }

 loadDashboard() {
    this.isLoading = true;
    forkJoin({
      my: this.courseService.getMyCourses(),
      available: this.courseService.getAvailableCourses()
    }).subscribe({
      next: (res: any) => {
        this.myCourses = res.my.courses || res.my;
        this.availableCourses = res.available.courses || res.available;

        // 👇 التعديل هنا: بنشيك لو الكورس جواه كائن exam فـ ده معناه إن فيه امتحان متاح
        this.stats.available = this.myCourses.filter(c => c.exam).length;

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.isLoading = false;
      }
    });
  }

  enroll(courseId: string) {
    this.courseService.enrollInCourse(courseId).subscribe({
      next: () => {
        alert('Enrolled successfully! 🎉');
        this.loadDashboard();
      },
      error: (err) => console.error('Enrollment failed:', err)
    });
  }

  startExam(examSessionId: string) {
    if (!examSessionId) {
      alert('No active exams available for this course right now.');
      return;
    }
    // 🧭 الخطوة السحرية: الطالب هيروح لصفحة الـ Verify أولاً مش الـ Editor مباشر
    this.router.navigate(['/exam/verify', examSessionId]);
  }

  logout() {
    this.examService.stopHubConnection();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.examService.stopHubConnection();
    if (this.examSub) {
      this.examSub.unsubscribe(); // تنظيف الاشتراك
    }
  }
}
