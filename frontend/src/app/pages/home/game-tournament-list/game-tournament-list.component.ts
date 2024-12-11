import { Component, Input, OnInit } from '@angular/core';
import { GameCRUDService } from '../../../services/game-crud/game-crud.service';
import { TournamentCRUDService } from '../../../services/tournament-crud/tournament-crud.service';
import { CurrentGameService } from '../../../services/current-game/current-game.service';
import { EngineManagerService } from '../../../services/engine-manager/engine-manager.service';
import { ProfileCRUDService } from '../../../services/profile-crud/profile-crud.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-game-tournament-list',
  templateUrl: './game-tournament-list.component.html',
  styleUrls: ['./game-tournament-list.component.css']
})
export class GameTournamentListComponent implements OnInit {
  listUsedForSpectating: boolean = false;
  isInGameOrTournament: boolean = false;
  games: any[] = [];
  tournaments: any[] = [];
  currentPage: number = 1;
  totalPages: number = 5;
  isGameList: boolean = true;
  isFilterPanelOpen: boolean = false;
  acceptedEngines: any[] = [];
  selectedEngineUrls: { [id: number]: string } = {};
  showTooltip: boolean = false;
  userProfile: any = {
    name: '',
    surname: '',
    nationality: '',
    description: '',
    username: '',
    elo: 0
  };

  constructor(
    private profileCRUDService: ProfileCRUDService,
    private gameCRUDService: GameCRUDService,
    private tournamentCRUDService: TournamentCRUDService,
    private currentGameService: CurrentGameService,
    private engineManagerService: EngineManagerService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.fetchGames({});

    this.currentGameService.currentGameId$.subscribe((gameId) => {
      this.isInGameOrTournament = !!gameId;
    });
    this.currentGameService.currentTournamentId$.subscribe((tournamentId) => {
      this.isInGameOrTournament = this.isInGameOrTournament || !!tournamentId;
    });

    this.acceptedEngines = this.engineManagerService.getAcceptedEngines();

    this.profileCRUDService.getUserProfile(Number(this.authService.getUserId())).subscribe((data) => {
      this.userProfile = data;
    });
  }

  onFiltersChanged(data: any): void {
    if (this.isGameList) {
      this.fetchGames(data);
    } else {
      this.fetchTournaments(data);
    }
  }  

  fetchGames(filters: any): void {
    const gameFilterData = {
      ...filters,
      page: this.currentPage,
      status: this.listUsedForSpectating ? 'active' : 'inactive',
      user_id: this.authService.getUserId()
    };

    this.gameCRUDService.getGames(gameFilterData).subscribe((data: any[]) => {
      this.games = data;
    });
  }

  fetchTournaments(filters: any): void {
    const tournamentFilterData = {
      ...filters,
      page: this.currentPage,
      status: this.listUsedForSpectating ? 'active' : 'inactive',
      user_id: this.authService.getUserId()
    };

    this.tournamentCRUDService.getTournaments(tournamentFilterData).subscribe((data: any[]) => {
      this.tournaments = data;
    });
  }

  switchToGameList(): void {
    if (!this.isGameList) {
      this.fetchGames({});
      this.isFilterPanelOpen = false;
      setTimeout(() => {
        this.isGameList = true;
      }, 300);
    }
  }
  
  switchToTournamentList(): void {
    if (this.isGameList) {
      this.fetchTournaments({});
      this.isFilterPanelOpen = false;
      setTimeout(() => {
        this.isGameList = false;
      }, 300);
    }
  }

  refreshList(switchComponentToSpectating: boolean = null): void {
    if(switchComponentToSpectating != null)
      this.listUsedForSpectating = switchComponentToSpectating;

    this.currentPage = 1;
    if (this.isGameList) {
      this.fetchGames({});
    } else {
      this.fetchTournaments({});
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.refreshList();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.refreshList();
    }
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.refreshList();
  }

  toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  getJoiningPlayerIcon(playerMode: string): string {
    return playerMode.split('-')[1] === 'Human' ? 'person' : 'robot';
  }  

  joinGame(gameId: number): void {
    if(this.listUsedForSpectating) {
      this.router.navigate(['/game', gameId]);
      return;
    }
      
    const engine_url = this.selectedEngineUrls[gameId] || null;

    this.gameCRUDService.joinGame(gameId, engine_url).subscribe({
      next: (response) => {
        this.currentGameService.setGameId(gameId);
        this.router.navigate(['/game', gameId]);
      },
      error: (error) => {
        console.log('Error while joining the game', error);
      }
    });
  }

  getPlayerModeIcon(playerMode: string, position: 'left' | 'right'): string {
    if (playerMode === 'Human-Human') {
      return 'person';
    } else if (playerMode === 'Engine-Engine') {
      return 'robot';
    }
    return '';
  }

  getSelectedEngineElo(gameId: number): number | string {
    const selectedEngineUrl = this.selectedEngineUrls[gameId];
    const selectedEngine = this.acceptedEngines.find(engine => engine.url === selectedEngineUrl);
    return selectedEngine ? selectedEngine.elo : 0;
  }  

  joinTournament(tournamentId: number): void {
    if (this.listUsedForSpectating) {
      this.router.navigate(['/tournament', tournamentId]);
      return;
    }

    const engine_url = this.selectedEngineUrls[tournamentId] || null;

    this.tournamentCRUDService.joinTournament(tournamentId, engine_url).subscribe({
      next: () => {
        this.currentGameService.setTournamentId(tournamentId);
        this.router.navigate(['/tournament', tournamentId]);
      },
      error: (error) => console.log('Error while joining the tournament:', error)
    });
  }

  isJoinDisabled(item: any): boolean {
    const minElo = item.restrictions_data?.min_elo || 0;
    const maxElo = item.restrictions_data?.max_elo || Infinity;

    const requiresEngine = item.format_data.player_mode.split('-')[1] == 'Engine';
  
    if (requiresEngine) {
      const selectedEngineUrl = this.selectedEngineUrls[item.game_id || item.tournament_id];
      const selectedEngine = this.acceptedEngines.find(engine => engine.url === selectedEngineUrl);
      const engineElo = selectedEngine?.elo || 0;
  
      return !selectedEngine || engineElo < minElo || engineElo > maxElo;
    } else {
      const userElo = this.userProfile?.elo || 0;
  
      return userElo < minElo || userElo > maxElo;
    }
  }  
  navigateToCreateGame(): void {
    this.router.navigate(['/create-game']);
  }

  navigateToCreateTournament(): void {
    this.router.navigate(['/create-tournament']);
  }
}

