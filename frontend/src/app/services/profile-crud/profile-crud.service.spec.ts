import { TestBed } from '@angular/core/testing';

import { ProfileCRUDService } from './profile-crud.service';

describe('ProfileCRUDService', () => {
  let service: ProfileCRUDService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileCRUDService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
