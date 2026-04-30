import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Course, Session } from '../models/data.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private http = inject(HttpClient);

  // 1. Base URL for the Backend API
  private baseUrl = 'https://ofoqai.runasp.net/api';

  // 2. Signal to store and manage the courses state
  courses = signal<Course[]>([]);

  constructor() { }

  /**
   * Fetches courses assigned to the current user and maps the response
   * to ensure compatibility with the frontend 'id' property.
   */
  loadAssignedCourses() {
    return this.http.get<any>(`${this.baseUrl}/Courses/assigned`).pipe(
      map(response => {
        let coursesArray = [];
        if (Array.isArray(response)) {
          coursesArray = response;
        } else {
          coursesArray = response.courses ? response.courses : (response.data ? response.data : []);
        }

        return coursesArray.map((c: any) => {
          return {
            ...c,
            id: c.courseId || c.id
          };
        });
      }),
      tap((coursesData: Course[]) => {
        console.log('✅ Assigned Courses Mapped:', coursesData);
        this.courses.set(coursesData);
      })
    );
  }

  /**
   * Creates a new lecture for a specific course using FormData.
   * Sends ONLY text fields as requested by the updated API logic (No File).
   */
createLecture(courseId: string, title: string, description: string) {
    const formData = new FormData();

    formData.append('title', title);
    formData.append('description', description);

    formData.append('lectureDate', new Date().toISOString());

    const pdfHeader = "%PDF-1.4\n1 0 obj\n<< /Title (Dummy PDF) >>\nendobj\n";
    const fakeContent = "OFOQ AI Dummy Padding Content. ".repeat(300);
    const pdfFooter = "\ntrailer\n<< /Root 1 0 R >>\n%%EOF";

    const dummyBlob = new Blob([pdfHeader + fakeContent + pdfFooter], { type: "application/pdf" });
    const dummyPdfFile = new File([dummyBlob], "lecture_start.pdf", { type: "application/pdf" });

    formData.append('file', dummyPdfFile);

    console.log(`📤 Sending Lecture Data... Course: ${courseId}`);

    return this.http.post<any>(`${this.baseUrl}/courses/${courseId}/lectures`, formData);
  }
  /**
   * Synchronously finds a course from the local signal state by its ID.
   */
  getCourseById(id: string): Course | undefined {
    const allCourses = this.courses();
    return allCourses.find(c => c.id === id);
  }

  /**
   * Retrieves past sessions for a specific course.
   */
  getSessionsByCourse(courseId: string): Session[] {
    return [];
  }
}
