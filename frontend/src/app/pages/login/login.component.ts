import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  errorMessage: string = '';
  loginForm: FormGroup;
  registerForm: FormGroup;
  isRegistering = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
    });

    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  passwordValidator(control) {
    const hasNumber = /\d/.test(control.value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(control.value);
    return hasNumber && hasSpecialChar ? null : { passwordInvalid: true };
  }

  toggleRegister() {
    this.isRegistering = !this.isRegistering;
  }

  onSubmit() {
    if (this.isRegistering) {
      this.authService.register(this.registerForm.value).subscribe({
        next: (response) => {
          console.log('Registration successful', response);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.log('Registration failed', error);
          this.errorMessage = 'Registration failed. Please try again.';
        }
      });
    } else {
      this.authService.login(this.loginForm.value).subscribe({
        next: (response: any) => {
          console.log('Login successful', response);
          this.authService.saveToken(response.access);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          console.log('Login failed', error);
          this.errorMessage = 'Login failed. Please check your credentials.';
        }
      });
    }
  }
  
}
