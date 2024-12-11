import { Component, OnInit } from '@angular/core';
import { ProfileCRUDService } from '../../services/profile-crud/profile-crud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  userId!: number;
  userProfile: any = {
    name: '',
    surname: '',
    nationality: '',
    description: '',
    username: '',
    elo: 0
  };

  originalUserProfile: any;
  userEngines: any[] = [];
  hasUnsavedChanges: boolean = false;

  selectedView: string = 'games';
  data: any[] = [];
  currentPage: number = 1;
  hasMoreData: boolean = true;

  nationalities: string[] = [
    'Polska',
    'Niemcy',
    'Francja',
    'Wielka Brytania',
    'Stany Zjednoczone',
    'Hiszpania',
    'Włochy',
    'Chiny',
    'Japonia',
    'Rosja',
    'Brazylia'
  ];

  showTooltip: boolean = false;

  constructor(
    private profileCRUDService: ProfileCRUDService, 
    private route: ActivatedRoute, 
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.authService.getUserId());
    this.loadUserProfile();
    this.loadGamesOrTournamentsData();
    this.loadUserEngines();
  }

  onSelectedViewChange(view: string): void {
    if(view != 'engines')
      this.loadGamesOrTournamentsData(view);
    else {
      this.selectedView = view;
      this.currentPage = 1;
    }
  }

  private loadUserProfile(): void {
    this.profileCRUDService.getUserProfile(this.userId).subscribe((data) => {
      this.userProfile = {
        ...this.userProfile,
        ...data
      };
      this.originalUserProfile = { ...this.userProfile };
    });
  }

  loadGamesOrTournamentsData(view: string = null): void {
    if (view ? view === 'games' : this.selectedView === 'games') {
      this.profileCRUDService.getUserGames(this.userId, this.currentPage).subscribe((response: any) => {
        this.data = response.results;
        this.hasMoreData = !!response.next;
        if(view) {
          this.selectedView = view;
          this.currentPage = 1;
        }
      });
    } else if (view ? view === 'tournaments' : this.selectedView === 'tournaments') {
      this.profileCRUDService.getUserTournaments(this.userId, this.currentPage).subscribe((response: any) => {
        this.data = response.results;
        this.hasMoreData = !!response.next;
        if(view) {
          this.selectedView = view;
          this.currentPage = 1;
        }
      });
    }
  }

  getResult(result: string, isWhite: boolean): string {
    const [scoreWhite, scoreBlack] = result.split(',')[0].split('-').map(Number);
    if ((isWhite && scoreWhite > scoreBlack) || (!isWhite && scoreBlack > scoreWhite)) {
      return 'WYGRANA';
    } else if ((isWhite && scoreWhite < scoreBlack) || (!isWhite && scoreBlack < scoreWhite)) {
      return 'PRZEGRANA';
    } else {
      return 'REMIS';
    }
  }
  
  getResultClass(result: string, isWhite: boolean): string {
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
  
  getEloChange(result: string, isWhite: boolean): number {
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
  
  nextPage(): void {
    if (this.hasMoreData) {
      this.currentPage++;
      this.loadGamesOrTournamentsData();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadGamesOrTournamentsData();
    }
  }

  private loadUserEngines(): void {
    this.profileCRUDService.getUserEngines(this.userId).subscribe((data) => {
      this.userEngines = data;
    });
  }

  onFieldChange(): void {
    this.hasUnsavedChanges = this.isUserProfileChanged();
  }
  
  private isUserProfileChanged(): boolean {
    const fieldsToCheck = ['name', 'surname', 'nationality', 'description'];
    for (const field of fieldsToCheck) {
      const originalValue = this.originalUserProfile[field]?.trim() || '';
      const currentValue = this.userProfile[field]?.trim() || '';
      if (originalValue !== currentValue) {
        return true;
      }
    }
    return false;
  }

  watchGame(gameId: number): void {
    this.router.navigate(['/game', gameId]);
  }

  getPlayerModeIcon(playerMode: string, position: 'left' | 'right'): string {
    if (playerMode === 'Human-Human') {
      return 'person';
    } else if (playerMode === 'Engine-Engine') {
      return 'robot';
    }
    return '';
  }

  getMyPosition(participants: any[]): string {
    const username = this.authService.getUsername();
    const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
    const myPosition = String(sortedParticipants.findIndex((participant) => participant.player.username === username) + 1);
    return myPosition || '-';
  }

  getWinnerColorClass(winnerName: string): string {
    return winnerName === this.userProfile.username ? 'win' : 'loss';
  }
  
  watchTournament(tournamentId: number): void {
    this.router.navigate(['/tournament', tournamentId]);
  }

  goToEngineManagement(): void {
    this.router.navigate(['/chess-engine-management']);
  }
  
  saveProfile(): void {
    const { name, surname, nationality, description } = this.userProfile;
  
    this.profileCRUDService.updateUserProfile(this.userId, { name, surname, nationality, description }).subscribe({
      next: (response) => {
        this.hasUnsavedChanges = false;
        this.originalUserProfile = { ...this.userProfile };
      },
      error: (error) => {
        console.log('Error while updating profile:', error);
      }
    });
  }
}
