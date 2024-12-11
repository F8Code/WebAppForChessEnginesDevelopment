import { Component, ElementRef, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { GameCRUDService } from '../../../services/game-crud/game-crud.service';
import { EngineManagerService } from '../../../services/engine-manager/engine-manager.service';
import { CurrentGameService } from '../../../services/current-game/current-game.service';
import { Router } from '@angular/router';

interface AcceptedEngine {
  url: string;
  name: string;
}

@Component({
  selector: 'app-game-creator',
  templateUrl: './game-creator.component.html',
  styleUrls: ['./game-creator.component.css']
})
export class GameCreatorComponent {
  @Input() isPopupOpen: boolean = false;
  @Output() popupClosed: EventEmitter<void> = new EventEmitter<void>();
  isFadingOut: boolean = false;

  user_id: string = '';
  selectedEngineUrl: string | null = null;
  time_format: string = '3+2';
  totalTime: number = 3;
  incrementTime: number = 2;
  player1Type: string = 'Human';
  player2Type: string = 'Human';
  min_elo: number = 500;
  max_elo: number = 1500;
  is_ranked: boolean = true;
  gameDescription: string = '';
  is_elo_verified: boolean = true;
  acceptedEngines: AcceptedEngine[] = [];

  constructor(
    private gameCRUDService: GameCRUDService,
    private engineManagerService: EngineManagerService,
    private currentGameService: CurrentGameService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.acceptedEngines = this.engineManagerService.getAcceptedEngines();
  }

  closePopup() {
    this.isFadingOut = true;
    setTimeout(() => {
      this.isPopupOpen = false;
      this.isFadingOut = false;
      this.popupClosed.emit();
    }, 300);
  }

  startQuickGame() {
    const player_mode = `${this.player1Type}-${this.player2Type}`;
    const time_format = `${this.totalTime}+${this.incrementTime}`;

    const gameData = {
      user_id: this.user_id,
      engine_url: this.selectedEngineUrl,
      format_data: {
        player_mode: player_mode,
        time_format: time_format,
      },
      is_ranked: this.is_ranked,
      restrictions_data: {
        min_elo: this.min_elo,
        max_elo: this.max_elo,
        is_elo_verified: this.is_elo_verified,
      },
      description: this.gameDescription,
    };

    this.gameCRUDService.createGame(gameData).subscribe({
      next: (response) => {
        const gameId = response.game_id;

        this.gameCRUDService.saveInitialMove(gameId).subscribe({
          error: (error) => {
            console.log('Error during saving of the initial move', error);
          }
        });

        this.currentGameService.setGameId(gameId);
        this.router.navigate(['/game', gameId]);
      },
      error: (error) => {
        console.log('Error while creating the game', error);
      }
    });
  }

  onTimeFormatChange() {
    if (this.time_format !== 'custom') {
      const [time, increment] = this.time_format.split('+').map(Number);
      this.totalTime = time;
      this.incrementTime = increment;
    }
  }

  onPlayer1TypeChange() {
    if (this.player1Type !== 'Engine') {
      this.selectedEngineUrl = null;
    }
  }

  isEngineRequiredAndNotSelected(): boolean {
    return this.player1Type === 'Engine' && !this.selectedEngineUrl;
  }

  onTotalTimeChange() { }
  onIncrementTimeChange() { }
  onMinEloChange() { }
  onMaxEloChange() { }
}
