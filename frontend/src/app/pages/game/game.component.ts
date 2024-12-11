import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, first } from 'rxjs';
import { CurrentGameService } from '../../services/current-game/current-game.service';
import { GameManagerService } from '../../services/game-manager/game-manager.service';
import { GameCRUDService } from '../../services/game-crud/game-crud.service';
import { AuthService } from '../../services/auth/auth.service';
import { GameActionsComponent } from './game-actions/game-actions.component';
import { PlayerInfo } from '../../interfaces/player-info.interface';
import { Move } from '../../interfaces/move.interface';
import { ChessBoardComponent } from './chess-board/chess-board.component';
import { ChatComponent } from '../../shared/chat/chat.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  gameId: number;
  playerInfo: PlayerInfo;
  opponentInfo: PlayerInfo;

  gameDetails: any;

  isSpectator: boolean = true;
  playingAsWhite: boolean = true;
  playingAsEngine: boolean = false;
  currentFen: string;
  isLookingAtLastMove: boolean = true;
  isGameActive: boolean = false;
  isGameLoaded: boolean = false;
  isPlayerTurn: boolean = false;
  currentMove: { coordinateMove: string; sanMove: string; };
  invalidMoveButton: boolean = false;

  private gameStateSubscription: Subscription;
  private socketSubscribtion: Subscription;
  private moveBuffer: any[] = [];

  whiteTime: number = 0;
  blackTime: number = 0;

  sanPairs: { moveNumber: number; white: string; black?: string; whiteIndex: number; blackIndex?: number }[] = [];
  moves: Move[] = [];
  currentMoveIndex: number = 0;

  @ViewChild(GameActionsComponent)
  gameActionsComponent!: GameActionsComponent;

  @ViewChild(ChessBoardComponent)
  chessBoardComponent!: ChessBoardComponent;

  @ViewChild(ChatComponent)
  chatComponent!: ChatComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private currentGameService: CurrentGameService,
    private gameManagerService: GameManagerService,
    private gameCRUDService: GameCRUDService,
    private authService: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.gameId = Number(this.route.snapshot.params['id']);

    this.gameManagerService.initialize(this.gameId);
    this.gameManagerService.connectWebSocket(this.gameId);
    this.gameStateSubscription = this.gameManagerService.gameState$.subscribe((state) => {
      this.currentMove = { ...state.currentMove };
      this.isPlayerTurn = state.isPlayerTurn;
    });

    try { 
      await this.fetchGameDetails();
    } catch (error) {
      console.log("Error during initialization:", error);
    }

    this.socketSubscribtion = this.gameManagerService.message$.subscribe(message => this.handleSocketMessage(message));
  }

  async fetchGameDetails(): Promise<void> {
    try {
      this.gameDetails = await this.gameCRUDService.getGameDetails(this.gameId);
      
      if (!(this.gameDetails.player_black && this.gameDetails.player_white)) {
        if(this.gameDetails.player_white)
          this.playerInfo = this.gameDetails.player_white;
        else
          this.playerInfo = this.gameDetails.player_black;

        return;
      }

      this.chatComponent.decodeChatMessages(this.gameDetails.chat);

      this.playingAsWhite = this.gameDetails.player_white.username === this.authService.getUsername();

      this.playerInfo = this.playingAsWhite ? this.gameDetails.player_white : this.gameDetails.player_black;
      this.playerInfo.engine = this.playingAsWhite ? this.gameDetails.player_white_substitute : this.gameDetails.player_black_substitute;
      this.opponentInfo = this.playingAsWhite ? this.gameDetails.player_black : this.gameDetails.player_white;
      this.opponentInfo.engine = this.playingAsWhite ? this.gameDetails.player_black_substitute : this.gameDetails.player_white_substitute;

      if (this.playerInfo.username === this.authService.getUsername())
        this.isSpectator = false;

      if (this.playerInfo.engine)
        this.playingAsEngine = true;

      if (!this.gameDetails.result)
        this.isGameActive = true;

      await this.fetchGameMoves();
    } catch (error) {
      console.log("Failed to fetch game details:", error);
    }
  }

  async fetchGameMoves(): Promise<void> {
    try {
      this.moves = await this.gameCRUDService.getMoves(this.gameId);
      this.currentMoveIndex = this.moves.length - 1;

      this.chessBoardComponent.updateBoardFromFen(this.moves[this.currentMoveIndex].fen);
      this.isPlayerTurn = this.playingAsWhite === (this.moves[this.currentMoveIndex].fen.split(' ')[1] === "w");
      this.isGameLoaded = true;

      if(this.currentMoveIndex == 0 && !this.isSpectator)
        this.gameManagerService.sendMessage(this.gameId, { type: 'opponent_joined', game_id: this.gameId });
    } catch (error) {
      console.log("Failed to fetch last move:", error);
    }
  }

  async onPlayerMove(move: { coordinateMove: string }): Promise<void> {
    if (this.isPlayerTurn && this.isGameActive) {
      try {
        const response = await this.gameManagerService.validateMove(this.gameId, this.moves[this.moves.length - 1].fen, move.coordinateMove, true);
        if (response.is_move_valid) {
          this.updateGameState(response);
          await this.gameCRUDService.saveMove(this.gameId, { ...response, type: "move" });
          this.gameManagerService.sendMessage(this.gameId, { ...response, type: "move", game_id: this.gameId });
        } else {
          this.invalidMoveButton = !this.invalidMoveButton;
        }
      } catch (error) {
        console.log("Failed to process player move:", error);
      }
    }
  }

  async updateGameState(message: any): Promise<void> {
    this.moves = [...this.moves, { coordinate: message.coordinate_move, san: message.san_move, fen: message.fen_position }];
    if(this.currentMoveIndex == this.moves.length - 2) {
      this.currentMoveIndex += 1;
    }

    if (message.end_type)
      this.isGameActive = false;
  }

  handleSocketMessage(message: any): Promise<void> {
    if (!message || typeof message !== 'object' || String(message.game_id) !== String(this.gameId))
      return;

    switch (message.type) {
      case 'opponent_joined':
        if (!this.isGameLoaded) {
          this.fetchGameDetails();
          if (this.moveBuffer.length > 0)
            this.updateGameState(this.moveBuffer.shift());
        }
        break;
      case 'move':
        if (!this.isGameLoaded)
          this.moveBuffer.push(message);
        else {
          this.updateGameState(message);
        }
        if(message.end_type) {
          this.isGameActive = false;
          this.gameActionsComponent.clearAllHighlights();
        }   
      case 'clock_update':
        this.whiteTime = message.white_time;
        this.blackTime = message.black_time;
        if (message.white_time === 0 || message.black_time === 0) {
          this.isGameActive = false;
          this.gameActionsComponent.clearAllHighlights();
        }
        break;
      case 'chat_update':
        this.gameCRUDService.fetchAllChatMessages(this.gameId).subscribe({
          next: (response) => {
            if (response.chat_messages)
              this.chatComponent.decodeChatMessages(response.chat_messages.join('~'));
          }, error: (error) => {
            console.log('Error downloading a chat message:', error);
          },
        });
        break;
      case 'takeback_offer':   
        if(!this.isSpectator)
          this.gameActionsComponent.highlightUndoFromParent();
        break;
      case 'takeback_accept':
        this.gameActionsComponent.clearUndoHighlight();

        if(this.currentMoveIndex == this.moves.length - 1) {
          this.currentMoveIndex -= 1;
          this.chessBoardComponent.updateBoardFromFen(this.moves[this.currentMoveIndex].fen);
        }
        this.moves = this.moves.slice(0, -1);
        break;
      case 'draw_offer':
        if(!this.isSpectator)
          this.gameActionsComponent.highlightDrawFromParent();
        break;
      case 'draw_accept':
      case 'opponent_resigned':
      case 'opponent_disconnected':
        this.isGameActive = false;
        this.gameActionsComponent.clearAllHighlights(); 
        break;
      default:
        break;
      case 'game_end':
        this.fetchGameDetails();
        break;
    }
  }

  async handleResignButton() {
    this.isGameActive = false; 
    this.gameManagerService.sendMessage(this.gameId, { type: 'opponent_resigned', game_id: this.gameId });
    this.gameActionsComponent.clearAllHighlights(); 
  }

  async handleOfferDrawButton() {
    this.gameManagerService.sendMessage(this.gameId, { type: 'draw_offer', game_id: this.gameId });
  }

  async handleAcceptDrawButton() {
    this.isGameActive = false;
    this.gameManagerService.sendMessage(this.gameId, { type: 'draw_accept', game_id: this.gameId });
    this.gameActionsComponent.clearAllHighlights();
  }

  async handleOfferUndoButton() {
    if(this.moves.length == 1 || this.playerInfo.engine || this.opponentInfo.engine) {
      this.gameActionsComponent.clearUndoHighlight();
      return;
    }

    this.gameManagerService.sendMessage(this.gameId, { type: 'takeback_offer', game_id: this.gameId });
  }

  async handleAcceptUndoButton() {
    await this.gameCRUDService.deleteLastMove(this.gameId);

    this.gameManagerService.sendMessage(this.gameId, { type: 'takeback_accept', game_id: this.gameId });

    if(this.currentMoveIndex == this.moves.length - 1) {
      this.currentMoveIndex -= 1;
      this.chessBoardComponent.updateBoardFromFen(this.moves[this.currentMoveIndex].fen);
    }
    this.moves = this.moves.slice(0, -1);
  }

  async handleChatMessage(content: string): Promise<void> {
    await this.gameCRUDService.sendChatMessage(this.gameId, content);
    this.gameManagerService.sendMessage(this.gameId, {type: "chat_update", game_id: this.gameId});
  }

  formatTime(seconds: number): string {
    const roundedSeconds = Math.round(seconds);
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  goToMove(index: number): void {
    if (index >= 0 && index < this.moves.length) {
      this.currentMoveIndex = index;
      this.chessBoardComponent.updateBoardFromFen(this.moves[this.currentMoveIndex].fen);
    }

    this.isLookingAtLastMove = this.currentMoveIndex == this.moves.length - 1 ? true : false;
  }

  async exitGame(): Promise<void> {
    if(!this.isSpectator || !this.gameDetails.start_time)
      await this.gameManagerService.sendMessage(this.gameId, {type: 'opponent_disconnected', gameId: this.gameId,});
    this.gameManagerService.disconnectAllExcept();
    this.currentGameService.clearCurrentGame();

    const tournamentId = await this.currentGameService.currentTournamentId$.pipe(first()).toPromise();
    if(tournamentId) {
      this.router.navigate(['/tournament', tournamentId]);
    }
    else
      this.router.navigate(['/']);
  }

  ngOnDestroy() {
    if(this.gameStateSubscription)
      this.gameStateSubscription.unsubscribe();
    
    if (this.socketSubscribtion)
      this.socketSubscribtion.unsubscribe();

    if(this.isSpectator || !this.isGameActive)
      this.gameManagerService.disconnectAllExcept(this.gameId);
  }

  parseInt(text: string): number {
    return Number.parseInt(text, 10);
  }

  isRankedGame(): boolean {
    return !!this.gameDetails?.is_ranked;
  }
  
  hasEloChange(result: string | undefined, isWhite: boolean, isPlayer: boolean): boolean {
    if (!result || !this.isRankedGame()) return false;
    const eloChanges = result.split('|')[1]?.split(',');
    return !!eloChanges && !!eloChanges[isWhite === isPlayer ? 0 : 1];
  }
  
  getEloChange(result: string | undefined, isWhite: boolean, isPlayer: boolean): string {
    if (!result || !this.isRankedGame()) return '';
    const eloChanges = result.split('|')[1]?.split(',');
    return isWhite === isPlayer ? eloChanges[0] || '0' : eloChanges[1] || '0';
  }
  
  getEloChangeStyle(result: string | undefined, isWhite: boolean, isPlayer: boolean): { [key: string]: string } {
    const change = parseInt(this.getEloChange(result, isWhite, isPlayer), 10);
    return {
      color: change > 0 ? 'green' : 'red'
    };
  }
}