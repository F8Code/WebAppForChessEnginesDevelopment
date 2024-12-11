import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChessEngineManagementComponent } from './chess-engine-management.component';

describe('ChessEngineManagementComponent', () => {
  let component: ChessEngineManagementComponent;
  let fixture: ComponentFixture<ChessEngineManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChessEngineManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChessEngineManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
