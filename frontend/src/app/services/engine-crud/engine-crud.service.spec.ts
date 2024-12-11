import { TestBed } from '@angular/core/testing';

import { EngineCRUDService } from './engine-crud.service';

describe('EngineCRUDService', () => {
  let service: EngineCRUDService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EngineCRUDService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
