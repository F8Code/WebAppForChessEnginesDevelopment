import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { CurrentGameService } from '../services/current-game/current-game.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  username: string | null = null;
  usernameSubscription: Subscription;
  currentGameId: number | null = null;
  currentTournamentId: number | null = null;
  isTournamentGame: boolean = false;
  private gameSubscription: Subscription;
  private tournamentSubscription: Subscription;
  private tournamentGameSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private currentGameService: CurrentGameService
  ) {
    this.username = this.authService.getUsername();
  }

  ngOnInit() {
    this.usernameSubscription = this.authService.username$.subscribe((username) => {
      this.username = username;
    });

    this.gameSubscription = this.currentGameService.currentGameId$.subscribe((gameId) => {
      this.currentGameId = gameId;
    });

    this.tournamentSubscription = this.currentGameService.currentTournamentId$.subscribe((tournamentId) => {
      this.currentTournamentId = tournamentId;
    });

    this.tournamentGameSubscription = this.currentGameService.currentTournamentGame$.subscribe((isTournamentGame) => {
      this.isTournamentGame = isTournamentGame;
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  logout() {
    this.authService.logout();
    this.currentGameService.clearIds();
  }

  ngOnDestroy(): void {
    this.usernameSubscription?.unsubscribe();
    this.gameSubscription?.unsubscribe();
    this.tournamentSubscription?.unsubscribe();
    this.tournamentGameSubscription?.unsubscribe();
  }
}

