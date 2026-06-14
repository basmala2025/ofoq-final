import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { AudioRecordingService } from '../../services/audio-recording';
import { SummaryService, SessionSummary } from '../summary';
import { DataService } from '../../services/data';
import * as signalR from '@microsoft/signalr';

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
  private hubConnection!: signalR.HubConnection;

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

    this.loadInitialAttendance();
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

  private loadInitialAttendance(): void {
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
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://your-backend-api.com/attendanceHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('SignalR Connected successfully! Waiting for real-time data...'))
      .catch(err => console.error('Error while starting SignalR connection: ', err));

    this.hubConnection.on('StudentAttended', (payload: any) => {
      console.log('New student checked in live:', payload);
      this.handleLiveStudentAttendance(payload);
    });
  }

  private handleLiveStudentAttendance(payload: any): void {
    const studentIndex = this.students.findIndex(s => s.id === payload.studentId);

    const updatedStudent: Student = {
      id: payload.studentId,
      name: payload.studentName,
      academicId: payload.academicId,
      checkInTime: payload.checkInTime,
      present: payload.status === 'Present'
    };

    if (studentIndex > -1) {
      this.students[studentIndex] = updatedStudent;
    } else {
      this.students.push(updatedStudent);
    }

    this.recalculateStatistics();
  }

  private recalculateStatistics(): void {
    this.totalStudents = this.students.length;
    this.presentStudents = this.students.filter(s => s.present).length;
    this.absentStudents = this.totalStudents - this.presentStudents;

    this.attendanceRate = this.totalStudents > 0
      ? Math.round((this.presentStudents / this.totalStudents) * 100)
      : 0;
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

    if (this.hubConnection) {
      this.hubConnection.off('StudentAttended');
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped.'))
        .catch(err => console.error('Error stopping SignalR connection:', err));
    }
  }
}
