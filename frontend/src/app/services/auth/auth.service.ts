import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/token/';

  private usernameSubject = new BehaviorSubject<string | null>(this.getUsername());

  public username$ = this.usernameSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}register/`, userData);
  }

  login(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}login/`, userData).pipe(
      tap((response: any) => {
        this.saveToken(response.access);
        this.saveRefreshToken(response.refresh);
        this.saveUsername(userData.username);
        this.usernameSubject.next(userData.username);

        this.http.get(`${this.apiUrl}get-user-id/${userData.username}/`).subscribe((res: any) => {
          this.saveUserId(res.user_id);  // Przechowujemy user_id
        });
      })
    );
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
  
    return this.http.post(`${this.apiUrl}refresh/`, { refresh: refreshToken }).pipe(
      tap((response: any) => {
        this.saveToken(response.access);
        this.saveRefreshToken(response.refresh);
      }),
      catchError(error => {
        console.error('Refresh token failed', error);
        this.logout();
        return throwError(error);
      })
    );
  }  

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  saveRefreshToken(refreshToken: string) {
    localStorage.setItem('refresh_token', refreshToken);
  }

  saveUsername(username: string) {
    localStorage.setItem('username', username);
  }

  saveUserId(userid: string) {
    localStorage.setItem('user_id', userid);
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    this.usernameSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
