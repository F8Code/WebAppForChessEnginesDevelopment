import { TestBed } from '@angular/core/testing';
import { GameCRUDService } from './game-crud.service';

describe('GameCRUDService', () => {
  let service: GameCRUDService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameCRUDService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
