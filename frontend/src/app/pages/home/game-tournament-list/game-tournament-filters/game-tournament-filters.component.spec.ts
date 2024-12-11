import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameTournamentFiltersComponent } from './game-tournament-filters.component';

describe('GameTournamentFiltersComponent', () => {
  let component: GameTournamentFiltersComponent;
  let fixture: ComponentFixture<GameTournamentFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GameTournamentFiltersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GameTournamentFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
