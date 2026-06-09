// src/app/features/ta-dashboard/layout/navbar/navbar.component.ts

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);

  // Signal to store TA avatar initials dynamically
  userInitials = signal<string>('TA');

  ngOnInit(): void {
    this.loadUserMetadata();
  }

  // Load profile metadata saved during login sequence
  private loadUserMetadata(): void {
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      try {
        const user = JSON.parse(currentUserRaw);
        if (user && user.fullName) {
          // Get the first letter of each name part to form initials (e.g., "John Doe" -> "JD")
          const initials = user.fullName
            .split(' ')
            .map((n: string) => n.charAt(0))
            .join('')
            .toUpperCase();

          this.userInitials.set(initials.slice(0, 2)); // Keep maximum of 2 characters
        }
      } catch (e) {
        console.error('Failed to parse user metadata from localStorage', e);
      }
    }
  }

  // Clear session data and send user back to landing page
  onLogout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
