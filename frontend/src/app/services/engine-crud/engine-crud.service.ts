import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EngineCRUDService {
  private apiUrl = 'http://localhost:8000/api/';  // Endpoint backendu Django

  constructor(private http: HttpClient, private authService: AuthService) {}

  createChessEngine(engineData: any): Observable<any> {
    const userId = this.authService.getUserId();
    engineData['user_id'] = userId;

    return this.http.post(`${this.apiUrl}engine/create/`, engineData);
  }

  getChessEngines(): Observable<any[]> {
    const userId = this.authService.getUserId();
    return this.http.get<any[]>(`${this.apiUrl}user/${userId}/engines/get/`);
  }

  updateChessEngine(originalUrl: string, engineData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}engine/${encodeURIComponent(originalUrl)}/update/`, engineData);
  }

  deleteChessEngine(url: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}engine/${encodeURIComponent(url)}/delete/`);
  }
}
