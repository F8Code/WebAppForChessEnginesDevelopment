import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TournamentCRUDService {
  private apiUrl = 'http://localhost:8000/api/';  // Endpoint Django

  constructor(private http: HttpClient, private authService: AuthService) {}

  createTournament(tournamentData: any): Observable<any> {
    const userId = this.authService.getUserId();
    tournamentData['user_id'] = userId;
    
    return this.http.post(`${this.apiUrl}tournament/create/`, tournamentData);
  }

  getTournaments(filterData: any): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}tournaments/get/`, filterData);
  }

  getTournamentParticipants(tournamentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}tournament/${tournamentId}/participants/get`);
  }

  getTournamentDetails(tournamentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}tournament/${tournamentId}/get/`);
  }

  fetchAllChatMessages(tournamentId: number): Observable<{ chat_messages: string[] }> {
    return this.http.get<{ chat_messages: string[] }>(`${this.apiUrl}tournament/${tournamentId}/chat/get/`);
  }  

  async sendChatMessage(tournamentId: number, formattedMessage: string): Promise<{ success: string }> {
    const payload = { message: formattedMessage };
    return await this.http.post<{ success: string }>(`${this.apiUrl}tournament/${tournamentId}/chat/last/create/`, payload).toPromise();
  } 

  async updateTournamentSlots(tournamentId: number, availableSlots: number): Promise<{ success: string }> {
    const payload = { player_count: availableSlots };
    return await this.http.patch<{ success: string }>(`${this.apiUrl}tournament/${tournamentId}/slots/update/`, payload).toPromise();
  }
  
  getTournamentGames(tournamentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}tournament/${tournamentId}/games/get/`);
  }  
  
  joinTournament(tournamentId: number, engine_url?: string): Observable<any> {
    const userId = this.authService.getUserId();

    return this.http.post(`${this.apiUrl}tournament/${tournamentId}/participant/${userId}/create/`, { engine_url });
  }

  removeParticipant(tournamentId: number, participantId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}tournament/${tournamentId}/participant/${participantId}/delete/`);
  }
}
