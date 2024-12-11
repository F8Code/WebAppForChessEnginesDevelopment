import { TestBed } from '@angular/core/testing';

import { EngineManagerService } from './engine-manager.service';

describe('EngineManagerService', () => {
  let service: EngineManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EngineManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
