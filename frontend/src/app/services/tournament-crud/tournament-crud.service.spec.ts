import { TestBed } from '@angular/core/testing';
import { TournamentCRUDService } from './tournament-crud.service';

describe('TournamentManagerService', () => {
  let service: TournamentCRUDService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentCRUDService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
