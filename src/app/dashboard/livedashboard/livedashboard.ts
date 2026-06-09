import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { AudioRecordingService } from '../../services/audio-recording';
import { SummaryService, SessionSummary } from '../summary';
import { DataService } from '../../services/data';

interface Student {
  id: string;
  name: string;
  present: boolean;
  academicId?: string;
  checkInTime?: string;
}

@Component({
  selector: 'app-livedashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './livedashboard.html',
  styleUrl: './livedashboard.css'
})
export class LiveDashboard implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private audioService = inject(AudioRecordingService);
  private summaryService = inject(SummaryService);
  private dataService = inject(DataService);

  courseName = 'Artificial Intelligence';
  roomName = 'A-305';
  currentLectureId = '';

  sessionStartTime: Date = new Date();
  sessionDuration = '00:00';
  private timeInterval: any;

  isAttendanceActive = false;
  attendanceDuration = 10;
  showModal = false;
  students: Student[] = [];

  totalStudents = 0;
  presentStudents = 0;
  absentStudents = 0;
  attendanceRate = 0;

  ngOnInit(): void {
    this.currentLectureId = this.route.snapshot.paramMap.get('id') || '';

    this.route.queryParams.subscribe(params => {
      this.courseName = params['course'] || 'Artificial Intelligence';
      this.roomName = params['room'] || 'A-305';
    });

    this.startSessionTimer();
    this.setupWebSocketListener();
  }

  private startSessionTimer(): void {
    this.timeInterval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - this.sessionStartTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      this.sessionDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  openAttendanceModal(): void {
    this.showModal = true;
  }

  closeAttendanceModal(): void {
    this.showModal = false;
  }

  confirmAttendanceActivation(): void {
    this.closeAttendanceModal();

    this.dataService.activateAttendance(this.currentLectureId, this.attendanceDuration).subscribe({
      next: (response) => {
        this.isAttendanceActive = true;
        console.log('Attendance activated successfully:', response);
      },
      error: (err) => {
        console.error('Failed to activate attendance:', err);
      }
    });
  }

  private setupWebSocketListener(): void {
    console.log('Listening for real-time attendance events via WebSockets...');
    // Real-time listener registration should be implemented here
  }

  endSession(): void {
    clearInterval(this.timeInterval);

    const sessionSummaryData: SessionSummary = {
      courseName: this.courseName,
      roomName: this.roomName,
      totalStudents: this.totalStudents,
      presentStudents: this.presentStudents,
      absentStudents: this.absentStudents,
      attendanceRate: this.attendanceRate,
      averageFocus: 0,
      sessionDuration: this.sessionDuration,
      focusHistory: [],
      students: this.students.map(student => ({
        id: student.id,
        name: student.name,
        present: student.present,
        averageFocus: 0
      }))
    };

    this.summaryService.setSummary(sessionSummaryData);

    this.audioService.stopRecordingAndSend(this.currentLectureId).catch(err => {
      console.error('Background audio upload failed:', err);
    });

    this.router.navigate(['/summary']);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
  }
}
