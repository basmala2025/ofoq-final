import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'https://ofoqai.runasp.net/api/Courses';

  constructor(private http: HttpClient) {}

  getMyCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`);
  }

  getAvailableCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available`);
  }

 enrollInCourse(courseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${courseId}/enroll`, {});
  }
}
