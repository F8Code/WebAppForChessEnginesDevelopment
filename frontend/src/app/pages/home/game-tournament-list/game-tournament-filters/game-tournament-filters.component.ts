import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';

@Component({
  selector: 'app-game-tournament-filters',
  templateUrl: './game-tournament-filters.component.html',
  styleUrl: './game-tournament-filters.component.css',
})
export class GameTournamentFiltersComponent {
  @Input() isGameList: boolean = true;
  @Input() isFilterPanelOpen: boolean = false;

  @Output() filtersChanged = new EventEmitter<any>();

  sliderOptions = {
    floor: 0,
    ceil: 100,
    step: 1,
    showTicks: true,
    getSelectionBarColor: () => '#8a6e3a',
    getPointerColor: () => '#8a6e3a',
  };

  filters = {
    game: {
      is_ranked: null,
      player_mode: null,
      min_time: 1,
      max_time: 60,
      min_increment: 0,
      max_increment: 30,
      min_elo: 500,
      max_elo: 1500,
    },
    tournament: {
      is_ranked: null,
      player_mode: null,
      min_time: 1,
      max_time: 60,
      min_increment: 0,
      max_increment: 30,
      min_elo: 500,
      max_elo: 1500,
    },
  };
  
  sort = {
    game: {
      field: 'max_elo',
      ascending: true,
    },
    tournament: {
      field: 'max_elo',
      ascending: true,
    },
  };
  
  timeSliderOptions: Options = {
    floor: 1,
    ceil: 60,
    step: 1,
    translate: (value: number): string => {
      return `${value} min`;
    }
  };

  incrementSliderOptions: Options = {
    floor: 0,
    ceil: 30,
    step: 1,
    translate: (value: number): string => {
      return `${value} sek`;
    }
  };

  eloSliderOptions: Options = {
    floor: 0,
    ceil: 5000,
    step: 100,
    translate: (value: number): string => {
      return `${value} ELO`;
    }
  };

  applyFilters(): void {
    const data = this.isGameList
      ? { filters: this.filters.game, sort: this.sort.game }
      : { filters: this.filters.tournament, sort: this.sort.tournament };

    this.filtersChanged.emit(data);
  }
}
