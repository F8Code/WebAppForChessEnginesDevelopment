import { TestBed } from '@angular/core/testing';

import { TournamentManagerService } from './tournament-manager.service';

describe('TournamentManagerService', () => {
  let service: TournamentManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
