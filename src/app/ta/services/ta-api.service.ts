// src/app/features/ta-dashboard/services/ta-api.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { CourseDetailsInfo, LiveExamStats, PastExam } from '../models/exam';
import { RunModelAnswerRequest, RunModelAnswerResponse, PublishExamRequest, PublishExamResponse, AiExamGenerationResponse } from '../models/exam-builder';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { map } from 'rxjs/operators';

export interface StudentRiskInfo {
  id: string;
  academicId: string;
  name: string;
  riskStatus: 'Safe' | 'Warning' | 'Flagged';
}

export interface ViolationsDistribution {
  lookingAway: number;
  tabSwitch: number;
  phoneDetected: number;
  multipleFaces: number;
  noFaceDetected: number;
}

export interface CompilerStats {
  compileSuccessRate: number;
  avgExecutionTimeMs: number;
  avgMemoryLimitMb: number;
}

export interface GeneralCourseAnalytics {
  integrityIndex: number;
  violationsDistribution: ViolationsDistribution;
  compilerStats: CompilerStats;
}

export interface AlarmLogItem {
  time: string;
  type: string;
}

export interface StudentSubmission {
  studentId: string;
  name: string;
  academicId: string;
  status: 'Submitted' | 'No Submission';
  grade: string;
  alarmCount: number;
  alarmLogs: AlarmLogItem[];
}

@Injectable({
  providedIn: 'root'
})
export class TaApiService {
  private http = inject(HttpClient);
  private apiUrl = 'https://ofoqai.runasp.net/api/ta';

  public static readonly BYPASS_AUTH = new HttpContextToken<boolean>(() => false);

  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  getCourseDetails(courseId: string): Observable<CourseDetailsInfo> {
    return this.http.get<CourseDetailsInfo>(`${this.apiUrl}/courses/${courseId}/details`);
  }

  getPastExams(courseId: string): Observable<PastExam[]> {
    return this.http.get<PastExam[]>(`${this.apiUrl}/courses/${courseId}/exams`);
  }

  getEnrolledStudents(courseId: string): Observable<StudentRiskInfo[]> {
    return this.http.get<StudentRiskInfo[]>(`${this.apiUrl}/courses/${courseId}/students`);
  }

  getLiveExamStats(examId: string): Observable<LiveExamStats> {
    return this.http.get<LiveExamStats>(`${this.apiUrl}/exams/${examId}/stats`);
  }

  getExamSubmissions(examId: string): Observable<StudentSubmission[]> {
    return this.http.get<StudentSubmission[]>(`${this.apiUrl}/exams/${examId}/submissions`);
  }

  getGeneralCourseAnalytics(courseId: string): Observable<GeneralCourseAnalytics> {
    return this.http.get<GeneralCourseAnalytics>(`${this.apiUrl}/courses/${courseId}/analytics`);
  }

  /**
   * API 8: POST /api/ta/run-model-answer
   */
  runModelAnswerValidation(payload: RunModelAnswerRequest): Observable<RunModelAnswerResponse> {
    return this.http.post<RunModelAnswerResponse>(`${this.apiUrl}/run-model-answer`, payload);
  }

  /**
   * API 9: POST /api/ta/courses/{courseId}/exams
   */
  publishExam(courseId: string, payload: PublishExamRequest): Observable<PublishExamResponse> {
    return this.http.post<PublishExamResponse>(`${this.apiUrl}/courses/${courseId}/exams`, payload);
  }

  private geminiApiKey = 'AQ.Ab8RN6LjwvkZMJX_OKs1x-Nf1-bTA-skORdX0uKSP86dfH5t1w';

 generateExamWithAI(prompt: string): Observable<any> {
  const backendUrl = `http://13.62.175.4:3000/api/exams/generate-ai`;

  const payload = {
    prompt: prompt
  };

  return this.http.post<any>(backendUrl, payload, {
    context: new HttpContext().set(TaApiService.BYPASS_AUTH, true)
  });
}
}
