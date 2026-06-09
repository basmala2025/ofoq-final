import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AudioRecordingService {
  private http = inject(HttpClient);

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
      console.log('🎤 Microphone recording started...');
    } catch (error) {
      console.error('❌ Microphone Error:', error);
      throw error;
    }
  }

  /**
   * Stops recording, creates an audio blob, and uploads it to the backend.
   * لا ننتظر استخراج الملخص، فقط ننتظر نجاح عملية الرفع
   */
  stopRecordingAndSend(lectureId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject('Media recorder is not initialized.');
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        if (audioBlob.size === 0) {
          alert('Recorded audio file is empty!');
          reject('Empty audio file');
          return;
        }

        const formData = new FormData();
        formData.append('file', audioBlob, 'lecture-audio.webm');

        const uploadUrl = `${this.baseUrl}/lectures/${lectureId}/process-audio`;
        console.log(`🚀 Uploading audio directly... Size: ${(audioBlob.size / 1024).toFixed(2)} KB`);

        this.http.post(uploadUrl, formData).subscribe({
          next: () => {
            console.log('✅ Audio uploaded successfully! AI processing running in background.');
            resolve();
          },
          error: (err) => {
            console.error('❌ API Upload Error:', err);
            reject(err);
          }
        });

        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Retrieves the saved summary and transcript for a specific lecture.
   */
  getLectureSummary(lectureId: string) {
    return this.http.get<any>(`${this.baseUrl}/lectures/${lectureId}/summary`);
  }
}
