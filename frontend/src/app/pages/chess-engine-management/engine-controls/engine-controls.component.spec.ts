import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngineControlsComponent } from './engine-controls.component';

describe('EngineControlsComponent', () => {
  let component: EngineControlsComponent;
  let fixture: ComponentFixture<EngineControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EngineControlsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EngineControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
