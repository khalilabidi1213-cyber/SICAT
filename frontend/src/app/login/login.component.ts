// src/app/login/login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = 'Commander';
  password = '••••••••';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.isLoading = true;
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('token', res.access || 'demo-token');
          localStorage.setItem('username', res.username || this.username);
        }

        if (res.is_admin) {
          window.location.href = 'http://localhost:8000/admin/';
        } else {
          this.router.navigate(['/sicat/map']);
        }
      },
      error: () => {
        // Fallback: allow immediate exploration even if backend is offline
        this.isLoading = false;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('token', 'offline-tactical-session');
          localStorage.setItem('username', this.username || 'Commander');
        }
        this.router.navigate(['/sicat/map']);
      }
    });
  }
}
