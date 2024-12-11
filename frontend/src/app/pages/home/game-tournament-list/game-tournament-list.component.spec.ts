import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameTournamentListComponent } from './game-tournament-list.component';

describe('GameTournamentListComponent', () => {
  let component: GameTournamentListComponent;
  let fixture: ComponentFixture<GameTournamentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GameTournamentListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GameTournamentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
