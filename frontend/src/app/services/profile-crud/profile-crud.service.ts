import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileCRUDService {
  private apiUrl = 'http://localhost:8000/api/';

  constructor(private http: HttpClient) {}

  getUserProfile(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}user/${userId}/profile/get/`);
  }

  updateUserProfile(userId: number, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}user/${userId}/profile/update/`, userData);
  }

  getUserEngines(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}user/${userId}/engines/get/`);
  }

  getUserGames(userId: number, page: number = 1, pageSize: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}user/${userId}/games/get/`, {
      params: { page: page.toString(), page_size: pageSize.toString() },
    });
  }
  
  getUserTournaments(userId: number, page: number = 1, pageSize: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}user/${userId}/tournaments/get/`, {
      params: { page: page.toString(), page_size: pageSize.toString() },
    });
  }
}
