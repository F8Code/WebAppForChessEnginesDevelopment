import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentCreatorComponent } from './tournament-creator.component';

describe('TournamentCreatorComponent', () => {
  let component: TournamentCreatorComponent;
  let fixture: ComponentFixture<TournamentCreatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TournamentCreatorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TournamentCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
