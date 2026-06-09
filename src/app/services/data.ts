import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Course, Session } from '../models/data.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private http = inject(HttpClient);

  private baseUrl = 'https://ofoqai.runasp.net/api';

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
   * Sends text fields and a dummy file as requested by the API structure.
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

    console.log(`Sending Lecture Data... Course: ${courseId}`);

    return this.http.post<any>(`${this.baseUrl}/courses/${courseId}/lectures`, formData);
  }

  /**
   * Activates the BLE attendance tracking session for a specific lecture.
   * Triggers the backend to change state and notify mobile devices.
   */
  activateAttendance(lectureId: string, durationInMinutes: number): Observable<any> {
    const url = `${this.baseUrl}/lectures/${lectureId}/activate-attendance`;
    const body = {
      durationInMinutes: durationInMinutes
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'accept': '*/*'
    });

    console.log(`Activating attendance for lecture: ${lectureId} with duration: ${durationInMinutes} mins`);
    return this.http.post<any>(url, body, { headers });
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
