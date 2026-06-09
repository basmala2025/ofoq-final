// src/app/features/ta-dashboard/models/course.model.ts

export interface DashboardStats {
  coursesCount: number;
  studentsCount: number;
  examsCount: number;
}

export interface Course {
  id: string;      // Matches GUID format returned by the backend
  code: string;    // Matches 'code' from API response (e.g., "ML10")
  title: string;   // Matches 'title' from API response (e.g., "Machine Learning Fundamentals")
  students: number; // Matches 'students' from API response count

  // Optional client-side only UI properties
  status?: 'Active' | 'Grading' | 'Archived' | 'Review';
  bannerClass?: string; // Assigned dynamically in the frontend (e.g., "banner-1")
}
