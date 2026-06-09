import { Injectable } from '@angular/core';

export interface StudentSummary {
  id: string;
  name: string;
  present: boolean;
  averageFocus: number;
}

export interface FocusDataPoint {
  time: string;
  focus: number;
}

export interface SessionSummary {
  courseName: string;
  roomName: string;
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  attendanceRate: number;
  averageFocus: number;
  sessionDuration: string;
  focusHistory: FocusDataPoint[]; 
  students: StudentSummary[];
}

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private summary: SessionSummary | null = null;

  setSummary(summary: SessionSummary): void {
    this.summary = summary;
  }

  getSummary(): SessionSummary | null {
    return this.summary;
  }

  clearSummary(): void {
    this.summary = null;
  }
}
