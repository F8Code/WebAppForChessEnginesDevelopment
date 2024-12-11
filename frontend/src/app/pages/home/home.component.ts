import { Component } from '@angular/core';
import { CurrentGameService } from '../../services/current-game/current-game.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  showGameCreator: boolean = false;
  showTournamentCreator: boolean = false;

  isInGameOrTournament: boolean = false;

  constructor(private currentGameService: CurrentGameService) {}

  ngOnInit() {
    this.currentGameService.currentGameId$.subscribe((gameId) => {
      this.isInGameOrTournament = !!gameId;
    });
    this.currentGameService.currentTournamentId$.subscribe((tournamentId) => {
      this.isInGameOrTournament = this.isInGameOrTournament || !!tournamentId;
    });
  }

  toggleGameCreator() {
    this.showGameCreator = !this.showGameCreator;
  }

  toggleTournamentCreator() {
    this.showTournamentCreator = !this.showTournamentCreator;
  }
}
