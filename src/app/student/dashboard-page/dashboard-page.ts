import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from "../../dashboard/navbar/navbar";
import { RouterLink } from '@angular/router';
import { CourseService } from '../../services/course-service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.html',
  styleUrls: ['./dashboard-page.css'],
  imports: [Navbar, RouterLink]
})
export class DashboardPageComponent implements OnInit {
  myCourses: any[] = [];
  availableCourses: any[] = [];
  isLoading = true;

  stats = {
    available: 0,
    completed: 12,
    average: 88
  };

  constructor(private router: Router, private courseService: CourseService) {}

  ngOnInit(): void {
    this.loadDashboard();
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

        this.stats.available = this.myCourses.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.isLoading = false;
      }
    });
  }

  enroll(courseId: string) {
    this.courseService.enrollInCourse(courseId as any).subscribe({
      next: () => {
        alert('Enrolled successfully! 🎉');
        this.loadDashboard();
      },
      error: (err) => console.error('Enrollment failed:', err)
    });
  }

  startExam(courseId: string) {
    this.router.navigate(['/exam/verify', courseId]);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
