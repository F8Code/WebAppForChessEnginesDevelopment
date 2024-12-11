import { TestBed } from '@angular/core/testing';

import { CurrentGameService } from './current-game.service';

describe('CurrentGameService', () => {
  let service: CurrentGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
