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

  // 🎯 تم تحديث الـ Key الجديد هنا تلقائياً
  private geminiApiKey = 'AQ.Ab8RN6LjwvkZMJX_OKs1x-Nf1-bTA-skORdX0uKSP86dfH5t1w';

 generateExamWithAI(prompt: string): Observable<any> {
  // 🎯 التعديل هنا: الانتقال لموديل gemini-2.5-flash على الـ v1 Endpoint
  const targetUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`;
  const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  const combinedPrompt = `
    You are an expert Computer Science Teaching Assistant (TA).
    Your task is to generate a complete programming exam question based on the user request.

    User Request: "${prompt}"

    CRITICAL: You must respond ONLY with a raw, valid JSON object matching the exact structural layout below.
    Do NOT wrap the output in markdown code blocks (like \`\`\`json ... \`\`\`), do NOT add any conversational text before or after the JSON.

    Required JSON Structure:
    {
      "title": "Clear concise exam title string",
      "description": "Detailed problem description string with instructions, constraints explanation, input/output formats, and clear examples",
      "referenceSolution": "Full, working, and highly optimized C++ or Python code solution snippet string depending on the request",
      "constraints": {
        "timeLimitSec": 2,
        "memoryLimitMb": 256,
        "allowedLanguage": "C++",
        "maxAttempts": 3
      },
      "testCases": [
        { "input": "Standard input string for test 1", "expectedOutput": "Exact expected output string for test 1", "isHidden": false },
        { "input": "Standard input string for test 2", "expectedOutput": "Exact expected output string for test 2", "isHidden": true },
        { "input": "Standard input string for test 3", "expectedOutput": "Exact expected output string for test 3", "isHidden": true }
      ]
    }
  `;

  const payload = {
    contents: [
      {
        parts: [
          { text: combinedPrompt }
        ]
      }
    ]
  };

  return this.http.post<any>(url, payload, {
    context: new HttpContext().set(TaApiService.BYPASS_AUTH, true)
  });
}
}
