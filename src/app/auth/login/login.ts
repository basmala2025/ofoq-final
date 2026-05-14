import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Navbar } from "../../navbar/navbar";
import { Dashboard } from '../../dashboard/dashboard';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Navbar],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  loginForm: FormGroup;
  isLoading = false;

  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  private readonly apiUrl = 'https://ofoqai.runasp.net/api/Auth/login';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        // Regex allows both @edu.bu.eg and @fci.bu.edu.eg
        // Validators.pattern(/^[a-zA-Z0-9._%+-]+@(edu\.bu\.eg|fci\.bu\.edu\.eg)$/i)
      ]],
      password: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  // Handle Form Submission
  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;

      // Manually build the payload to include 'rememberMe' as required by the Swagger API schema
      const credentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
        rememberMe: true
      };

      this.http.post(this.apiUrl, credentials).subscribe({
        next: (res: any) => {
          console.log('Login Successful:', res);

          // 1. Save Access Tokens to Local Storage
          // Supports multiple property names for compatibility
          localStorage.setItem('token', res.token || res.accessToken);

          // Save the refresh token if provided by the backend
          if (res.refreshToken) {
            localStorage.setItem('refreshToken', res.refreshToken);
          }

          // 2. Normalize and save the user role
          const role = res.role ? res.role.toString().toLowerCase() : 'student';
          localStorage.setItem('role', role);

          // 3. Save session metadata and user profile details
          // Important: userId/id is required for various DataService API calls
          localStorage.setItem('userId', res.userId || res.id || '');
          console.log(res.userId);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', JSON.stringify(res));

          this.isLoading = false;
          this.cdr.markForCheck(); // Trigger change detection for OnPush strategy

          // 4. Redirect user based on their specific role
          this.navigateByRole(role);
        },
        error: (err) => {
          console.error('Login Error Details:', err);
          this.isLoading = false;

          // Display error message from backend or a generic fallback
          const errorMessage = err.error?.message || 'Invalid credentials or connection error.';
          alert(errorMessage);

          this.cdr.markForCheck();
        }
      });
    } else {
      // Highlight validation errors if the form is invalid
      this.loginForm.markAllAsTouched();
    }
  }

  /**
   * Routes the user to the appropriate dashboard based on their role.
   * Handles numeric role IDs (0-3) and string-based role names.
   */
  private navigateByRole(role: string) {
    const r = role.toLowerCase().trim();
    console.log('Redirecting to role:', r);

    switch(r) {
      case '3':
      case 'super_admin':
      case 'admin':
        this.router.navigate(['/admin-dashboard']); // Matches defined admin routes
        break;

      case '2':
      case 'professor':
      case 'prof':
        this.router.navigate(['/dashboard']); // Matches defined professor routes
        break;

      case '1':
      case 'ta':
        this.router.navigate(['/dashboard-ta']); // Matches TA specific routes
        break;

      case '0':
      case 'student':
      default:
        this.router.navigate(['/dashboardstudent']); // Matches student routes
        break;
    }
  }
}
