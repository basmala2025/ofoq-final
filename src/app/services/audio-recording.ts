import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AudioRecordingService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Base URL for the OFOQ API
  private baseUrl = 'https://ofoqai.runasp.net/api';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  /**
   * Initializes the microphone and starts recording audio chunks.
   */
  async startRecording() {
    this.audioChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log(' Microphone recording started...');
    } catch (error) {
      console.error(' Microphone Error:', error);
      throw error;
    }
  }

  /**
   * Stops recording, creates an audio blob, and uploads it to the backend.
   * @param sessionData - Data collected during the session.
   * @param lectureId - The ID of the lecture created during Start Session.
   */
  stopRecordingAndSend(sessionData: any, lectureId: string) {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.onstop = () => {
      // 1. Compile the audio chunks into a native WebM Blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

      if (audioBlob.size === 0) {
        alert('Recorded audio file is empty!');
        return;
      }

      const formData = new FormData();

      // 🔴 CRITICAL FIX: The key must be exactly 'file', NOT 'audioFile'
      formData.append('file', audioBlob, 'lecture-audio.webm');

      const uploadUrl = `${this.baseUrl}/lectures/${lectureId}/process-audio`;
      console.log(`Uploading audio directly... Size: ${(audioBlob.size / 1024).toFixed(2)} KB`);

      // 2. Send the POST request
      this.http.post<any>(uploadUrl, formData).subscribe({
        next: (res) => {
          console.log(' AI Processing Successful!', res);
          alert('Audio uploaded and processed successfully!');
        },
        error: (err) => {
          console.error(' API Processing Error:', err);
          const errorMsg = err.error?.message || err.error?.title || 'Unknown Error';
          alert(`Backend Error: ${errorMsg}`);
        }
      });

      // 3. Release microphone hardware resources
      this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
    };

    this.mediaRecorder.stop();
  }

  /**
   * Retrieves the saved summary and transcript for a specific lecture.
   */
  getLectureSummary(lectureId: string) {
    return this.http.get<any>(`${this.baseUrl}/lectures/${lectureId}/summary`);
  }
}
