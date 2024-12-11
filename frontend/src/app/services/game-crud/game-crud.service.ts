import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GameCRUDService {
  private apiUrl = 'http://localhost:8000/api/';
  
  constructor(private http: HttpClient, private authService: AuthService) {}

  createGame(gameData: any): Observable<any> {
    const userId = this.authService.getUserId();
    gameData['user_id'] = userId;

    return this.http.post(`${this.apiUrl}game/create/`, gameData);
  }

  joinGame(gameId: number, engine_url?: string): Observable<any> {
    const userId = this.authService.getUserId();
    const joinData = { user_id: userId, engine_url };
    return this.http.post(`${this.apiUrl}game/${gameId}/join/`, joinData);
  }

  fetchAllChatMessages(gameId: number): Observable<{ chat_messages: string[] }> {
    return this.http.get<{ chat_messages: string[] }>(`${this.apiUrl}game/${gameId}/chat/get/`);
  }   

  async sendChatMessage(gameId: number, formattedMessage: string): Promise<{ success: string }> {
    const payload = { message: formattedMessage };
    return await this.http.post<{ success: string }>(`${this.apiUrl}game/${gameId}/chat/last/create/`, payload).toPromise();
  }

  getGames(filterData: any): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}games/get/`, filterData);
  }

  saveInitialMove(gameId: number): Observable<any> {
    const initialMove = {
      move_time: new Date().toISOString(),
      coordinate_move: '',
      san_move: '',
      fen_position: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    };
  
    return this.http.post(`${this.apiUrl}game/${gameId}/move/0/create/`, initialMove);
  }

  updateGame(gameId: number, gameData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}game/${gameId}/update/`, gameData);
  } 
  
  async getLastMove(gameId: number): Promise<any> {
    try {
      return await this.http.get(`${this.apiUrl}game/${gameId}/move/last/`).toPromise();
    } catch (error) {
      console.log('Failed to fetch last move:', error);
      throw error;
    }
  }

  async deleteLastMove(gameId: number): Promise<any> {
    try {
      return await this.http.delete(`${this.apiUrl}game/${gameId}/move/last/delete/`).toPromise();
    } catch (error) {
      console.log('Error deleting the last move:', error);
      throw error;
    }
  }

  async getGameDetails(gameId: number): Promise<any> {
    try {
      return await this.http.get(`${this.apiUrl}game/${gameId}/get/`).toPromise();
    } catch (error) {
      console.log('Failed to fetch game details:', error);
      throw error;
    }
  }

  async getMoves(gameId: number): Promise<any> {
    const movesFromApi = await this.http.get<any[]>(`${this.apiUrl}game/${gameId}/moves/get`).toPromise();
    return movesFromApi.map(apiMove => ({
      coordinate: apiMove.coordinate_move,
      san: apiMove.san_move,
      fen: apiMove.fen_position,
    }));
  }

  async saveMove(gameId: number, move: any): Promise<void> {
    const moveNumber = this.getMoveNumberFromFen(move.fen_position);
    const currentTime = new Date().toISOString();

    const body = {
      game_id: gameId,
      move_number: moveNumber,
      move_time: currentTime,
      coordinate_move: move.coordinate_move,
      san_move: move.san_move,
      fen_position: move.fen_position
    };

    try {
      await this.http.put(`${this.apiUrl}game/${gameId}/move/${moveNumber}/update-or-create/`, body).toPromise();
    } catch (error) {
      console.log('Failed to save move:', error);
      throw error;
    }
  }

  private getMoveNumberFromFen(fen: string): number {
    const parts = fen.split(' ');
    const isWhiteTurn = parts[1] === 'w';
    const moveNumber = parseInt(parts[5], 10);
    return isWhiteTurn ? moveNumber * 2 - 2 : moveNumber * 2 - 1;
  }
}
