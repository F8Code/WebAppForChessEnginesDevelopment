import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CurrentGameService {
  private currentGameId = new BehaviorSubject<number | null>(
    this.getStoredValue<number>('currentGameId', null)
  );
  private currentTournamentId = new BehaviorSubject<number | null>(
    this.getStoredValue<number>('currentTournamentId', null)
  );
  private currentTournamentGame = new BehaviorSubject<boolean>(
    this.getStoredValue<boolean>('currentTournamentGame', false)
  );

  currentGameId$ = this.currentGameId.asObservable();
  currentTournamentId$ = this.currentTournamentId.asObservable();
  currentTournamentGame$ = this.currentTournamentGame.asObservable();

  constructor() {
    this.syncWithSessionStorage();
  }

  setGameId(gameId: number, isTournamentGame: boolean = false) {
    this.currentGameId.next(gameId);
    this.currentTournamentGame.next(isTournamentGame);

    this.storeValue('currentGameId', gameId);
    this.storeValue('currentTournamentGame', isTournamentGame);

    if (!isTournamentGame) {
      this.currentTournamentId.next(null);
      this.storeValue('currentTournamentId', null);
    }
  }

  setTournamentId(tournamentId: number) {
    this.currentTournamentId.next(tournamentId);
    this.storeValue('currentTournamentId', tournamentId);

    this.currentGameId.next(null);
    this.currentTournamentGame.next(false);

    this.storeValue('currentGameId', null);
    this.storeValue('currentTournamentGame', false);
  }

  clearIds() {
    this.currentGameId.next(null);
    this.currentTournamentId.next(null);
    this.currentTournamentGame.next(false);

    this.storeValue('currentGameId', null);
    this.storeValue('currentTournamentId', null);
    this.storeValue('currentTournamentGame', false);
  }

  clearCurrentGame() {
    this.currentGameId.next(null);
    this.currentTournamentGame.next(false);

    this.storeValue('currentGameId', null);
    this.storeValue('currentTournamentGame', false);
  }

  private storeValue<T>(key: string, value: T) {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }

  private getStoredValue<T>(key: string, defaultValue: T): T {
    const storedValue = sessionStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  }

  private syncWithSessionStorage() {
    const gameId = this.getStoredValue<number>('currentGameId', null);
    const tournamentId = this.getStoredValue<number>('currentTournamentId', null);
    const tournamentGame = this.getStoredValue<boolean>('currentTournamentGame', false);

    if (gameId !== null) this.currentGameId.next(gameId);
    if (tournamentId !== null) this.currentTournamentId.next(tournamentId);
    this.currentTournamentGame.next(tournamentGame);
  }
}


