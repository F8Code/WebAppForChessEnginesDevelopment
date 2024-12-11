import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Router } from '@angular/router';
import { CurrentGameService } from '../../services/current-game/current-game.service';
import { AuthService } from '../../services/auth/auth.service';

interface WebSocketMessage {
  type?: string;
  tournament_id?: string | number;
  username?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class TournamentManagerService {
  private apiUrl = 'http://localhost:8000/api/';
  private webSockets: Map<number, WebSocketSubject<WebSocketMessage>> = new Map();

  private localMessageSubject = new BehaviorSubject<WebSocketMessage | null>(null);
  public localMessage$ = this.localMessageSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private authService: AuthService,
    private currentGameService: CurrentGameService,
  ) {
      this.reconnectAllWebSockets();
  }

  connectWebSocket(tournamentId: number, username: string): void {
    if (this.webSockets.has(tournamentId)) {
      console.log(`WebSocket already connected for tournament ${tournamentId}`);
      return;
    }

    const socket$ = webSocket<WebSocketMessage>(`ws://localhost:8000/ws/tournament/${tournamentId}/${username}/`);

    socket$.subscribe({
      next: (message) => {
        if (!message || typeof message !== 'object' || String(message.tournament_id) !== String(tournamentId)) 
          return;

        this.localMessageSubject.next(message);
        this.handleSocketMessage(tournamentId, message);
      },
      error: (err) => {
        console.log(`WebSocket error for tournament ${tournamentId}:`, err);
        setTimeout(() => this.connectWebSocket(tournamentId, username), 5000);
      },
      complete: () => {
        console.log(`WebSocket connection closed for tournament ${tournamentId}`);
        this.webSockets.delete(tournamentId);

        const connectedTournaments = JSON.parse(sessionStorage.getItem('connectedTournamentIds') || '[]');
        const index = connectedTournaments.indexOf(tournamentId);
        if (index > -1) {
          connectedTournaments.splice(index, 1);
          sessionStorage.setItem('connectedTournamentIds', JSON.stringify(connectedTournaments));
        }
      }
    });

    this.webSockets.set(tournamentId, socket$);

    const connectedTournaments = JSON.parse(sessionStorage.getItem('connectedTournamentIds') || '[]');
    if (!connectedTournaments.includes(tournamentId)) {
      connectedTournaments.push(tournamentId);
      sessionStorage.setItem('connectedTournamentIds', JSON.stringify(connectedTournaments));
    }
  }

  private reconnectAllWebSockets(): void {
    const connectedTournaments = JSON.parse(sessionStorage.getItem('connectedTournamentIds') || '[]');

    if (Array.isArray(connectedTournaments)) {
      connectedTournaments.forEach((tournamentId) => {
        const username = this.authService.getUsername();
        if (username) {
          this.connectWebSocket(tournamentId, username);
        }
      });
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleSocketMessage(tournamentId: number, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'tournament_start':
        this.sendReadyStatus();
        let audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
        audio.play().catch((error) => {console.error('Error playing sound:', error);});
        break;
      case 'game_started':
        this.navigateToGame(message);
        break;
      case 'game_result':
        await this.delay(2500);
        this.router.navigate(['/tournament', await this.currentGameService.currentTournamentId$.pipe(first()).toPromise()]);
        this.currentGameService.clearCurrentGame();
        this.checkReadyStatusIfNeeded(message);
        break;
      case 'tournament_end':
        await this.delay(2500);
        this.router.navigate(['/tournament', await this.currentGameService.currentTournamentId$.pipe(first()).toPromise()]);
        audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
        audio.play().catch((error) => {console.error('Error playing sound:', error);});
        this.currentGameService.clearIds();

        break;
    }
  }

  async checkReadyStatusIfNeeded(message: WebSocketMessage): Promise<void> {
    const { game_id, player1, player2 } = message;
    const username = this.authService.getUsername();
    if (username !== player1 && username !== player2) 
      return;

    await this.sendReadyStatus();
  }

  async sendReadyStatus(): Promise<void> {
    try {
      const tournamentId = await this.currentGameService.currentTournamentId$.pipe(first()).toPromise();
      await this.sendMessage(tournamentId, {
        type: 'player_ready',
        tournament_id: Number(tournamentId),
        username: this.authService.getUsername(),
      });
    } catch (error) {
      console.log('Failed to send ready status:', error);
    }
  }
  
  private async navigateToGame(message: WebSocketMessage): Promise<void> {
    const { game_id, player1, player2 } = message;
    const username = this.authService.getUsername();
    if (username !== player1 && username !== player2) 
      return;

    await this.delay(5000);

    this.currentGameService.setGameId(game_id, true);
    this.router.navigate(['/game', game_id]);
  }

  async sendMessage(tournamentId: number, message: WebSocketMessage): Promise<void> {
    const socket$ = this.webSockets.get(tournamentId);
    if (socket$) {
      socket$.next(message);
    } else {
      console.log(`WebSocket is not connected for tournament ${tournamentId}.`);
    }
  }

  disconnectAllExcept(tournamentIdToKeep: number = null): void {
    const connectedTournaments = JSON.parse(sessionStorage.getItem('connectedTournamentIds') || '[]');

    for (const [tournamentId, socket$] of this.webSockets.entries()) {
      if (!tournamentIdToKeep || tournamentId !== tournamentIdToKeep) {
        socket$.unsubscribe();
        this.webSockets.delete(tournamentId);

        const index = connectedTournaments.indexOf(tournamentId);
        if (index > -1) {
          connectedTournaments.splice(index, 1);
        }

        console.log(`WebSocket connection terminated for tournament ${tournamentId}`);
      }
    }

    sessionStorage.setItem('connectedTournamentIds', JSON.stringify(connectedTournaments));
  }
}
