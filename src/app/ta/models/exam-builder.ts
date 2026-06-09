// src/app/features/ta-dashboard/models/exam-builder.ts

export interface TestCasePayload {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface RunModelAnswerRequest {
  referenceSolution: string;
  languageId: number;
  timeLimitSec: number;
  memoryLimitMb: number;
  testCases: TestCasePayload[];
}

export interface TestCaseResult {
  index: number;
  passed: boolean;
  status: string;
  error: string | null;
}

export interface RunModelAnswerResponse {
  success: boolean;
  message: string;
  results: TestCaseResult[];
}

export interface ExamConstraintsPayload {
  timeLimitSec: number;
  memoryLimitMb: number;
  allowedLanguage: string;
  maxAttempts: number;
}
export interface AiExamGenerationResponse {
  title: string;
  description: string;
  referenceSolution: string;
  constraints: {
    timeLimitSec: number;
    memoryLimitMb: number;
    allowedLanguage: string;
    maxAttempts: number;
  };
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
}
export interface PublishExamRequest {
  title: string;
  description: string;
  windowStart: string;
  windowEnd: string;
  durationMinutes: number;
  constraints: ExamConstraintsPayload;
  testCases: TestCasePayload[];
  totalPoints: number;
  examType: string;
}

export interface PublishExamResponse {
  success: boolean;
  message: string;
}
