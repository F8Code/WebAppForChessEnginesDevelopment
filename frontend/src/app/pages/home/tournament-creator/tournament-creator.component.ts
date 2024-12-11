import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TournamentCRUDService } from '../../../services/tournament-crud/tournament-crud.service';
import { EngineManagerService } from '../../../services/engine-manager/engine-manager.service';
import { CurrentGameService } from '../../../services/current-game/current-game.service';
import { Router } from '@angular/router';

interface AcceptedEngine {
  url: string;
  name: string;
}

@Component({
  selector: 'app-tournament-creator',
  templateUrl: './tournament-creator.component.html',
  styleUrls: ['./tournament-creator.component.css']
})
export class TournamentCreatorComponent {
  @Input() isPopupOpen: boolean = false;
  @Output() popupClosed: EventEmitter<void> = new EventEmitter<void>();
  isFadingOut: boolean = false;

  user_id: string = '';
  name: string = '';
  selectedTimeFormat: string = '3+2';
  totalTime: number = 3;
  incrementTime: number = 2;
  player_mode: string = 'Human-Human';
  selectedEngineUrl: string | null = null;
  min_elo: number = 500;
  max_elo: number = 1500;
  is_ranked: boolean = true;
  is_elo_verified: boolean = false;
  description: string = '';
  acceptedEngines: AcceptedEngine[] = [];

  constructor(
    private tournamentCRUDService: TournamentCRUDService,
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

  createTournament() {
    const time_format = `${this.totalTime}+${this.incrementTime}`;

    const tournamentData = {
      user_id: this.user_id,
      name: this.name,
      engine_url: this.selectedEngineUrl,
      format_data: {
        player_mode: this.player_mode,
        time_format: time_format,
      },
      is_ranked: this.is_ranked,
      restrictions_data: {
        min_elo: this.min_elo,
        max_elo: this.max_elo,
        is_elo_verified: this.is_elo_verified,
      },
      description: this.description,
    };

    this.tournamentCRUDService.createTournament(tournamentData).subscribe({
      next: (response) => {
        const tournamentId = response.tournament_id;

        this.tournamentCRUDService.joinTournament(tournamentId, this.selectedEngineUrl).subscribe({
          error: (error) => {
            console.log('Error adding the user', error);
          }
        });

        this.currentGameService.setTournamentId(tournamentId);
        this.router.navigate(['/tournament', tournamentId]);
      },
      error: (error) => {
        console.log('Error during tournament creation', error);
      }
    });
  }

  onTimeFormatChange() {
    if (this.selectedTimeFormat !== 'custom') {
      const [time, increment] = this.selectedTimeFormat.split('+').map(Number);
      this.totalTime = time;
      this.incrementTime = increment;
    }
  }

  onPlayerModeChange() {
    if (this.player_mode !== 'Engine-Engine') {
      this.selectedEngineUrl = null;
    }
  }

  isEngineRequiredAndNotSelected(): boolean {
    return this.player_mode === 'Engine-Engine' && !this.selectedEngineUrl;
  }

  onTotalTimeChange() { }
  onIncrementTimeChange() { }
  onMinEloChange() { }
  onMaxEloChange() { }
}
