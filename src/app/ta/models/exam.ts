// src/app/features/ta-dashboard/models/exam.model.ts

export interface CourseDetailsInfo {
  code: string;                  // Matches 'code' from API response (e.g., "CS 601")
  name: string;                  // Matches 'name' from API response (e.g., "Selected Topics in AI")
  enrolledStudentsCount: number; // Matches 'enrolledStudentsCount' from API response
  semester: string;              // Matches 'semester' from API response (e.g., "Semester 2, 2025-2026")
}

// src/app/features/ta-dashboard/models/exam.model.ts

export interface PastExam {
  id: string;
  title: string;          // Changed from name -> title
  scheduledDate: string;  // Changed from date -> scheduledDate
  status: 'Scheduled' | 'Reviewing' | 'Graded'; // Backend returns 'Scheduled'
  submissionsCount: string;
  avgGrade: string;       // Matches "N/A" or percentage
  attendance: string;     // Changed from attendedCount/totalStudents to a single string
  type?: string;          // Optional for now since backend didn't send it in this payload
}
// src/app/features/ta-dashboard/models/exam-stats.model.ts

export interface CheatingAlert {
  studentName: string;
  violationType: string; // e.g., "LookingAway", "MultipleFaces", etc.
  timestamp: string;     // ISO Date-time string from the proctoring engine
  alarmCount: number;    // Total accumulated red alarms triggered by this student
}

export interface LiveExamStats {
  averageGrade: string;        // Formatted grade scale (e.g., "15.2 / 20")
  timeRemainingMinutes: number; // Remaining duration of the active exam window
  totalStudents: number;       // Combined count of all enrolled course cohort members
  attendedCount: number;       // Current number of active candidates inside the sandbox environment
  activeCheatingAlerts: CheatingAlert[]; // Top 15 synchronized real-time integrity violation logs
}
