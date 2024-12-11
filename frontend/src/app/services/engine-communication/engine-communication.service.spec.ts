import { TestBed } from '@angular/core/testing';

import { EngineCommunicationService } from './engine-communication.service';

describe('ChessService', () => {
  let service: EngineCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EngineCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
