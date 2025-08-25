import { TestBed } from '@angular/core/testing';

import { LongitudinalUtilsService } from './longitudinal-utils.service';

describe('LongitudinalUtilsService', () => {
  let service: LongitudinalUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LongitudinalUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
