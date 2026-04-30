import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Importing services and models
import { DataService } from '../../services/data'; // Note: Ensure the path is correct
import { Course, Session } from '../../models/data.model';
import { Navbar } from "../navbar/navbar"; // Added .component for safety
import { AudioRecordingService } from '../../services/audio-recording';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, Navbar],
  templateUrl: './course-details.html',
  styleUrls: ['./course-details.css']
})
export class CourseDetails implements OnInit {
  activeTab: 'active' | 'past' | 'results' = 'active';
  course?: Course;
  pastSessions: any[] = [];
  studentsResults: any[] = [];
  selectedRoom: string = 'Room A - Building 1';

  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private router = inject(Router);
  private audioService = inject(AudioRecordingService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Requested Course ID:', id);

    if (id) {
      const existingCourse = this.dataService.courses().find((c: any) => c.id === id || c.courseId === id);

      if (existingCourse) {
        this.course = existingCourse;
        this.setupStaticData();
      } else {
        this.dataService.loadAssignedCourses().subscribe(() => {
          this.course = this.dataService.courses().find((c: any) => c.id === id || c.courseId === id);
          if (this.course) {
            this.setupStaticData();
          } else {
            console.error('Course not found even after API call!');
          }
        });
      }
    }
  }

  private setupStaticData() {
    this.pastSessions = [
      { id: '1', date: 'Oct 15, 2025', duration: '1h 20m', attendance: '45/50', focus: '88%', focusLevel: 'High' },
      { id: '2', date: 'Oct 12, 2025', duration: '1h 15m', attendance: '48/50', focus: '75%', focusLevel: 'Medium' },
      { id: '3', date: 'Oct 08, 2025', duration: '1h 30m', attendance: '40/50', focus: '60%', focusLevel: 'Low' },
    ];

    this.studentsResults = [
      { id: '1', studentName: 'Ahmed Ali', date: 'Oct 10, 2025', violations: 0, score: 95, status: 'Passed' },
      { id: '2', studentName: 'Sarah Mahmoud', date: 'Oct 10, 2025', violations: 2, score: 70, status: 'Passed' },
      { id: '3', studentName: 'Omar Khaled', date: 'Oct 10, 2025', violations: 5, score: 45, status: 'Failed' },
    ];
  }

  // Handle the logic to start a live session
  onStartSession() {
    if (this.course) {
      // 1. Prepare dynamic title and description
      const lectureTitle = `Lecture - ${new Date().toLocaleDateString()}`;
      const lectureDescription = 'AI Session Initiation';

      // 2. Call the updated service method
      this.dataService.createLecture(this.course.id, lectureTitle, lectureDescription).subscribe({
        next: (response) => {
          // Extract ID from various possible response formats
          const newId = response.id || response.lectureId || (response.data?.id);

          if (newId) {
            console.log(' Lecture created successfully, ID:', newId);

            this.audioService.startRecording().then(() => {
              setTimeout(() => {
                this.router.navigate(['/livedashboard', newId], {
                  queryParams: { course: this.course?.title, room: this.selectedRoom }
                });
              }, 800);
            });
          } else {
            console.warn('Lecture created, but no ID was returned from the backend.');
          }
        },
        error: (err) => {
            console.error('API Error:', err);
            alert('Failed to create lecture session. Check the console for details.');
        }
      });
    }
  }

  viewSessionAnalytics(session: any) {
    alert(`Session Analytics:\nDate: ${session.date}\nAverage Focus: ${session.focus}`);
  }
}
