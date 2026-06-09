// src/app/features/ta-dashboard/pages/ta/ta.ts

import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-ta',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './ta.html',
  styleUrl: './ta.css'
})
export class Ta {
  private router = inject(Router);

  onLogout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
