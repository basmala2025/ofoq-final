import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'https://ofoqai.runasp.net/api/Courses';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getMyCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
  }

  getAvailableCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/available`, { headers: this.getHeaders() });
  }

  enrollInCourse(courseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${courseId}/enroll`, {}, { headers: this.getHeaders() });
  }
}
