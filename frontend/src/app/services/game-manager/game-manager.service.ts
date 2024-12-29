import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { GameCRUDService } from '../../services/game-crud/game-crud.service';
import { EngineCommunicationService } from '../../services/engine-communication/engine-communication.service';
import { TournamentManagerService } from '../../services/tournament-manager/tournament-manager.service';
import { CurrentGameService } from '../../services/current-game/current-game.service';
import { AuthService } from '../../services/auth/auth.service';
import { Move } from '../../interfaces/move.interface';

interface WebSocketMessage {
  type?: string;
  game_id?: string | number;
  coordinate_move?: string;
  san_move?: string;
  fen_position?: string;
  end_type?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class GameManagerService {
  private apiUrl = 'http://localhost:8000/api/';
  private webSockets: Map<number, WebSocketSubject<WebSocketMessage>> = new Map();

  private messageSubject = new BehaviorSubject<WebSocketMessage | null>(null);
  public message$ = this.messageSubject.asObservable();

  private gameDetails: any = null;
  private isGameActive: boolean = false;
  private gameId: number = null;
  private engineUrl: string = null;
  private isSpectator: boolean = true;
  private isPlayingAsWhite: boolean = false;

  private wTime: number = null;
  private bTime: number = null;
  private wIncrement: number = null;
  private bIncrement: number = null;

  private engineMovingFlag: boolean = false;

  private gameState = {
    currentMove: { coordinateMove: null, sanMove: null },
    isPlayerTurn: false,
  };
  private gameStateSubject = new BehaviorSubject<typeof this.gameState>(this.gameState);
  public gameState$ = this.gameStateSubject.asObservable();

  private engineCommunicationService: any;
  private getEngineCommunicationService() {
    if (!this.engineCommunicationService) {
      this.engineCommunicationService = this.injector.get(EngineCommunicationService);
    }
    return this.engineCommunicationService;
  }

  constructor(
    private http: HttpClient,
    private gameCRUDService: GameCRUDService,
    private currentGameService: CurrentGameService,
    private tournamentManagerService: TournamentManagerService,
    private authService: AuthService,
    private injector: Injector
  ) {
    this.currentGameService.currentGameId$.subscribe(async (gameId) => {
      if (gameId) {
        this.gameId = gameId;
        await this.loadGameDetails();
      } else {
        this.gameDetails = null;
      }
    }); 

    this.reconnectAllWebSockets();
  }

  async initialize(gameId: number) {
    this.gameDetails = null;
    this.gameId = gameId;
    this.engineUrl = null;
    this.isSpectator = true;
    this.isPlayingAsWhite = false;
    
    await this.loadGameDetails();
  }

  private async loadGameDetails(): Promise<void> {
    try {
      this.gameDetails = await this.gameCRUDService.getGameDetails(this.gameId);
      const lastMove = await this.gameCRUDService.getLastMove(this.gameId);

      this.isGameActive = this.gameDetails.end_time == null;
    
      this.gameDetails.currentFen = lastMove.fen_position;

      this.isPlayingAsWhite = this.gameDetails.player_white && this.gameDetails.player_white.username === this.authService.getUsername()

      this.engineUrl = this.isPlayingAsWhite ? this.gameDetails.player_white_substitute?.url || null : this.gameDetails.player_black_substitute?.url || null;

      const playerInfo = this.isPlayingAsWhite ? this.gameDetails.player_white : this.gameDetails.player_black;
      if (playerInfo.username === this.authService.getUsername())
        this.isSpectator = false;

      const [time, increment] = this.gameDetails.format_data.time_format.split('+').map(Number);
      this.wTime = this.bTime = time * 60 * 1000;
      this.wIncrement = this.bIncrement = increment * 1000;

      this.gameState.isPlayerTurn = this.isPlayingAsWhite === (lastMove.fen_position.split(' ')[1] === 'w');
      this.gameStateSubject.next(this.gameState);
    } catch (error) {
      console.log('Failed to load game details:', error);
      this.gameDetails = null;
    }
  }

  async connectWebSocket(gameId: number): Promise<void> {
    if (this.webSockets.has(gameId)) {
      console.log(`WebSocket already connected for game ${gameId}`);
      return;
    }
  
    const socket$ = webSocket<WebSocketMessage>(`ws://localhost:8000/ws/game/${gameId}/${this.authService.getUsername()}/`);
    
    socket$.subscribe({
      next: (message) => {
        this.messageSubject.next(message);
        this.handleSocketMessage(gameId, message);
      },
      error: (err) => {
        console.error(`WebSocket error for game ${gameId}:`, err);
        setTimeout(() => this.connectWebSocket(gameId), 5000);
      },
      complete: () => {
        console.log(`WebSocket connection closed for game ${gameId}`);
        this.webSockets.delete(gameId);

        const connectedGames = JSON.parse(sessionStorage.getItem('connectedGameIds') || '[]');
        const index = connectedGames.indexOf(gameId);
        if (index > -1) {
          connectedGames.splice(index, 1);
          sessionStorage.setItem('connectedGameIds', JSON.stringify(connectedGames));
        }
      },
    });
  
    this.webSockets.set(gameId, socket$);

    const connectedGames = JSON.parse(sessionStorage.getItem('connectedGameIds') || '[]');
    if (!connectedGames.includes(gameId)) {
      connectedGames.push(gameId);
      sessionStorage.setItem('connectedGameIds', JSON.stringify(connectedGames));
    }
  }
    
  private reconnectAllWebSockets(): void {
    const connectedGames = JSON.parse(sessionStorage.getItem('connectedGameIds') || '[]');
  
    if (Array.isArray(connectedGames)) {
      connectedGames.forEach((gameId) => {
        this.connectWebSocket(gameId);
      });
    }
  }
  
  private async handleSocketMessage(gameId: number, message: WebSocketMessage): Promise<void> {
    if (!message || !message.type || !this.gameDetails) 
      return;

    if (String(message.game_id) !== String(gameId)) 
      return;

    let audio;
    switch (message.type) {
      case 'opponent_joined':
        //Sound notification?
        break;
      case 'move':
        //Sound notification?
        this.gameDetails.currentFen = message.fen_position;
        this.gameState.currentMove.coordinateMove = message.coordinate_move;
        this.gameState.currentMove.sanMove = message.san_move;
        this.gameState.isPlayerTurn = !this.gameState.isPlayerTurn;
        this.gameStateSubject.next(this.gameState);
        if(message.end_type) {
          audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
          audio.play().catch((error) => {console.error('Error playing sound:', error);});
          this.isGameActive = false;
        }
        else if (this.wTime && this.bTime)
          this.checkIfEngineShouldMove();
        break;
      case 'clock_update':       
        if (message.white_time === 0 || message.black_time === 0) {
          audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
          audio.play().catch((error) => {console.error('Error playing sound:', error);});
          this.isGameActive = false;
        }
        else {
          this.wTime = message.white_time * 1000;
          this.bTime = message.black_time * 1000;
          this.checkIfEngineShouldMove();
        }
        break;
      case 'draw_accept':
      case 'opponent_resigned':
      case 'opponent_disconnected':
      case 'engine_error':
        if(this.isGameActive) {
          audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
          audio.play().catch((error) => {console.error('Error playing sound:', error);});
          this.isGameActive = false;
        }
        break;
      case 'takeback_accept':
        this.gameState.currentMove.coordinateMove = null;
        this.gameState.currentMove.sanMove = null;
        this.gameState.isPlayerTurn = !this.gameState.isPlayerTurn;
        this.gameStateSubject.next(this.gameState);
        this.checkIfEngineShouldMove();
        break;
      case 'game_started':
        audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
        audio.play().catch((error) => {console.error('Error playing sound:', error);});
        if(this.engineUrl) {
          const engineService = this.getEngineCommunicationService();
          await engineService.ucinewgame(this.engineUrl);
        }
        break;
    }
  }

  private async checkIfEngineShouldMove(): Promise<void> {
    if (!this.gameDetails || !this.gameId || this.isSpectator || !this.isGameActive || !this.engineUrl || !this.gameDetails.currentFen || !this.gameState.isPlayerTurn || this.engineMovingFlag)
      return;

    this.engineMovingFlag = true;
    await this.makeEngineMove();
    this.engineMovingFlag = false;
  }

  private async makeEngineMove(): Promise<void> {
    const engineService = this.getEngineCommunicationService();

    const engineMove = await engineService.tryGo(
      this.engineUrl,
      this.gameId,
      this.gameDetails.currentFen,
      3,
      true,
      this.wTime,
      this.bTime,
      this.wIncrement, 
      this.bIncrement
    );
  
    if (!engineMove) {
      this.sendMessage(this.gameId, { type: 'engine_error', game_id: this.gameId });
      return;
    }

    await this.gameCRUDService.saveMove(this.gameId, { ...engineMove, type: 'move' });
    this.sendMessage(this.gameId, { ...engineMove, type: 'move', game_id: this.gameId });
  }  

  async validateMove(gameId: number, fenPosition: string, coordinateMove: string, calculateMoveResult: boolean = false): Promise<WebSocketMessage> {
    const body = {
      fen_notation_position: fenPosition,
      coordinate_notation_move: coordinateMove,
      calculate_move_result: calculateMoveResult
    };

    try {
      return await this.http.post<WebSocketMessage>(`${this.apiUrl}game/${gameId}/validate-move/`, body).toPromise();
    } catch (error) {
      console.log('Failed to validate move:', error);
      throw error;
    }
  }
  
  async sendMessage(gameId: number, message: WebSocketMessage): Promise<void> {
    try {
      const socket$ = this.webSockets.get(gameId); // Pobierz odpowiedni WebSocket
      if (socket$) {
        socket$.next(message); // Wyślij wiadomość

        if (message.type == 'move') {
          this.gameState.isPlayerTurn = !this.gameState.isPlayerTurn;
          this.gameState.currentMove.coordinateMove = message.coordinate_move;
          this.gameState.currentMove.sanMove = message.san_move;
          this.gameStateSubject.next(this.gameState);
          if(message.end_type)
            this.isGameActive = false;
        } else if (message.type == 'opponent_resigned' || message.type == 'draw_accept' || message.type == 'engine_error') {
          this.isGameActive = false;
        } else if (message.type == 'takeback_accept') {
          this.gameState.currentMove.coordinateMove = null;
          this.gameState.currentMove.sanMove = null;
          this.gameState.isPlayerTurn = !this.gameState.isPlayerTurn;
          this.gameStateSubject.next(this.gameState);
          this.checkIfEngineShouldMove();
        }
      } else {
        console.log(`WebSocket is not connected for game ${gameId}.`);
      }
    } catch (error) {
      console.log(`Failed to send WebSocket message for game ${gameId}:`, error);
    }
  }  

  disconnectAllExcept(gameIdToKeep: number = null): void {
    const connectedGames = JSON.parse(sessionStorage.getItem('connectedGameIds') || '[]');
  
    for (const [gameId, socket$] of this.webSockets.entries()) {
      if (!gameIdToKeep || gameId !== gameIdToKeep) {
        socket$.unsubscribe();
        this.webSockets.delete(gameId);

        const index = connectedGames.indexOf(gameId);
        if (index > -1) {
          connectedGames.splice(index, 1);
        }
        console.log(`WebSocket connection terminated for game ${gameId}`);
      }
    }

    sessionStorage.setItem('connectedGameIds', JSON.stringify(connectedGames));
  }
}