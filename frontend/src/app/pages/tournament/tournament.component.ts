import { Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentCRUDService } from '../../services/tournament-crud/tournament-crud.service';
import { CurrentGameService } from '../../services/current-game/current-game.service';
import { TournamentManagerService } from '../../services/tournament-manager/tournament-manager.service';
import { AuthService } from '../../services/auth/auth.service';
import { Subscription } from 'rxjs';
import { ChatComponent } from '../../shared/chat/chat.component';

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.css']
})
export class TournamentComponent implements OnInit, OnDestroy {
  tournamentId: number;
  myUsername: string;
  tournamentDetails: any;
  participants: any[] = [];
  games: any[] = [];
  isOwner: boolean = false;
  isSpectator: boolean = true;
  isTournamentStarted: boolean = false;
  isTournamentEnded: boolean = false;

  maxSlots: number = 8;
  minSlots: number = 3;
  playerSlots: any[] = [];
  resultsMatrix: any[][] = [];

  private socketSubscribtion: Subscription;

  showTooltip: boolean = false;

  @ViewChild(ChatComponent)
  chatComponent!: ChatComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentCRUDService: TournamentCRUDService,
    private currentGameService: CurrentGameService,
    private tournamentManager: TournamentManagerService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.tournamentId = Number(this.route.snapshot.params['id']);
    this.myUsername = this.authService.getUsername();

    await this.tournamentManager.connectWebSocket(this.tournamentId, this.myUsername);
    try { 
      await this.loadTournamentGames();
      await this.loadTournamentDetails();
      if (!this.isSpectator && !this.isTournamentEnded) {
        if(this.isTournamentStarted)
          await this.sendReadyStatus();
      }
    } catch (error) {
      console.log("Error during initialization:", error);
    }

    this.socketSubscribtion = this.tournamentManager.localMessage$.subscribe((message) => this.handleSocketMessage(message));
  }

  async loadTournamentDetails(): Promise<void> {
    try {
      this.tournamentDetails = await this.tournamentCRUDService.getTournamentDetails(this.tournamentId).toPromise();;
      this.participants = this.tournamentDetails.participants;

      const occupiedSlots = this.participants.map(participant => ({ ...participant, isEmpty: false }));
      const emptySlots = Array(this.tournamentDetails.player_count - this.participants.length).fill({ isEmpty: true });
      this.playerSlots = [...occupiedSlots, ...emptySlots];
      this.resultsMatrix = this.generateResultsMatrix();

      this.isOwner = this.tournamentDetails.created_by.username === this.myUsername;
      this.isSpectator = !this.participants.some((participant) => participant.player.username === this.myUsername);

      this.isTournamentStarted = !!this.tournamentDetails.start_time;
      this.isTournamentEnded = !!this.tournamentDetails.end_time;

      this.chatComponent.decodeChatMessages(this.tournamentDetails.chat);
    } catch (error) {
      console.log('Failed to load tournament details:', error);
    }
  }

  async loadTournamentGames(): Promise<void> {
    try {
      this.games = await this.tournamentCRUDService.getTournamentGames(this.tournamentId).toPromise();
    } catch (error) {
      console.log('Failed to load tournament games:', error);
    }
  }

  async increaseSlots(): Promise<void> {
    if (this.playerSlots.length < this.maxSlots) {
      this.playerSlots.push({ isEmpty: true });
      this.updateSlots();
    }
    await this.tournamentManager.sendMessage(this.tournamentId, {
      type: 'list_update',
      tournament_id: this.tournamentId,
    });
  }

  async decreaseSlots(): Promise<void> {
    if (this.playerSlots.filter(slot => slot.isEmpty).length > 0 && this.playerSlots.length > this.minSlots) {
      this.playerSlots.pop();
      this.updateSlots();
    }
    await this.tournamentManager.sendMessage(this.tournamentId, {
      type: 'list_update',
      tournament_id: this.tournamentId,
    });
  }

  async updateSlots(): Promise<void> {
    try {
      const playerCount = this.playerSlots.length;
      await this.tournamentCRUDService.updateTournamentSlots(this.tournamentId, playerCount);
      this.loadTournamentDetails();
    } catch (error) {
      console.log('Failed to update slots:', error);
    }
  }
  
  async removeParticipant(participantName: string): Promise<void> {
    if (!this.isOwner || this.isTournamentStarted || participantName == this.myUsername) return;
  
    try {
      await this.tournamentManager.sendMessage(this.tournamentId, {
        type: 'player_left',
        tournament_id: this.tournamentId,
        username: participantName,
      });

      this.playerSlots = this.playerSlots.filter(slot => slot.isEmpty || slot.player.username !== participantName);
      this.playerSlots.push({ isEmpty: true });
    } catch (error) {
      console.log('Failed to remove participant:', error);
    }
  }  

  async sendReadyStatus(): Promise<void> {
    try {
      if (!this.isTournamentStarted || this.isTournamentEnded) 
        return;

      await this.tournamentManager.sendMessage(this.tournamentId, {
        type: 'player_ready',
        tournament_id: this.tournamentId,
        username: this.myUsername
      });
    } catch (error) {
      console.log('Failed to send ready status:', error);
    }
  }

  async startTournament(): Promise<void> {
    this.isTournamentStarted = true;
    await this.tournamentManager.sendMessage(this.tournamentId, { type: 'tournament_start', tournament_id: this.tournamentId });
    let audio = new Audio('/assets/sounds/chess-sounds/start-end.mp3');
    audio.play().catch((error) => {console.error('Error playing sound:', error);});
    this.sendReadyStatus();
  }

  async handleSocketMessage(message: any): Promise<void> {
    if (!message || typeof message !== 'object' || String(message.tournament_id) !== String(this.tournamentId)) 
      return;

    switch (message.type) {
      case 'list_update':
      case 'player_joined':
        await this.loadTournamentDetails();
        break;
      case 'player_left':
        if(message.username == this.myUsername)
          this.exitTournament();
        else
          await this.loadTournamentDetails();
        break;
      case 'game_result':
        await this.loadTournamentDetails();
        await this.loadTournamentGames();
        break;
      case 'game_started':
        await this.loadTournamentGames();
        break;
      case 'tournament_end':
        await this.loadTournamentDetails();
        this.isTournamentStarted = false;
        break;
      case 'tournament_start':
        await this.sendReadyStatus();
        this.isTournamentStarted = true;
        break;
      case 'chat_update':
        this.tournamentCRUDService.fetchAllChatMessages(this.tournamentId).subscribe({
          next: (response) => {
            if (response.chat_messages)
              this.chatComponent.decodeChatMessages(response.chat_messages.join('~'));
          }, error: (error) => {
            console.log('Error downloading the chat message:', error);
          },
        });
        break;
      default:
        return;
    }
  }

  async exitTournamentButton(): Promise<void> {
    await this.tournamentManager.sendMessage(this.tournamentId, {
      type: 'player_left',
      tournament_id: this.tournamentId,
      username: this.myUsername,
    });
    this.exitTournament();
  }

  async handleChatMessage(message: string): Promise<void> {
    await this.tournamentCRUDService.sendChatMessage(this.tournamentId, message);
    this.tournamentManager.sendMessage(this.tournamentId, { type: 'chat_update', tournament_id: this.tournamentId });
  }

  generateResultsMatrix() {
    const matrix: any[][] = [];
    const playerCount = this.participants.length;

    for (let i = 0; i < playerCount; i++) {
        matrix[i] = [];
        for (let j = 0; j < playerCount; j++) {
            matrix[i][j] = i === j ? 'X' : '-';
        }
    }

    for (const game of this.games) {
        const whiteIndex = this.participants.findIndex(p => p.player.user_id === game.player_white.user_id);
        const blackIndex = this.participants.findIndex(p => p.player.user_id === game.player_black.user_id);

        if (whiteIndex !== -1 && blackIndex !== -1 && game.result) {
            if (game.result.startsWith('1-0')) {
                matrix[whiteIndex][blackIndex] = '1';
                matrix[blackIndex][whiteIndex] = '0';
            } else if (game.result.startsWith('0-1')) {
                matrix[whiteIndex][blackIndex] = '0';
                matrix[blackIndex][whiteIndex] = '1';
            } else if (game.result.startsWith('1/2-1/2')) {
                matrix[whiteIndex][blackIndex] = '1/2';
                matrix[blackIndex][whiteIndex] = '1/2';
            }
        }
    }

    return matrix;
}

  watchGame(gameId: number): void {
    this.router.navigate(['/game', gameId]);
  }

  getTournamentResult(result: string, isWhite: boolean): string {
    if(!result)
      return 'W TRAKCIE ROZGRYWKI'
    const [scoreWhite, scoreBlack] = result.split(',')[0].split('-').map(Number);
    if ((isWhite && scoreWhite > scoreBlack) || (!isWhite && scoreBlack > scoreWhite)) {
      return 'WYGRANA';
    } else if ((isWhite && scoreWhite < scoreBlack) || (!isWhite && scoreBlack < scoreWhite)) {
      return 'PRZEGRANA';
    } else {
      return 'REMIS';
    }
  }
  
  getTournamentResultClass(result: string, isWhite: boolean): string {
    if(!result)
      return 'result ongoing'
    const [scoreWhite, scoreBlack] = result.split(',')[0].split('-').map(Number);
    if ((isWhite && scoreWhite > scoreBlack) || (!isWhite && scoreBlack > scoreWhite)) {
      return 'result win';
    } else if ((isWhite && scoreWhite < scoreBlack) || (!isWhite && scoreBlack < scoreWhite)) {
      return 'result loss';
    } else {
      return 'result draw';
    }
  }
  
  getEloValue(elo: number, isRanked: boolean): string {
    return isRanked ? `${elo}` : `${elo}`;
  }
  
  getEloChange(result: string, isWhite: boolean): any {
    if(!result)
      return ''
    const eloChanges = result.split('|')[1]?.split(',') || [];
    return isWhite ? parseInt(eloChanges[0], 10) || 0 : parseInt(eloChanges[1], 10) || 0;
  }
  
  getEloChangeFormatted(result: string, isWhite: boolean): string {
    const eloChange = this.getEloChange(result, isWhite);
    return eloChange > 0 ? `+${eloChange}` : `${eloChange}`;
  }
  
  getEloChangeClass(result: string, isWhite: boolean): string {
    const eloChange = this.getEloChange(result, isWhite);
    return eloChange > 0 ? 'elo-change positive' : 'elo-change negative';
  }
  
  exitTournament(): void {
    this.tournamentManager.disconnectAllExcept();
    this.currentGameService.clearIds();

    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    if (this.socketSubscribtion)
      this.socketSubscribtion.unsubscribe();

    if(this.isSpectator || this.isTournamentEnded)
      this.tournamentManager.disconnectAllExcept(this.tournamentId);
  }
}
