import { TestBed } from '@angular/core/testing';

import { BiomarkerUtilsService } from './biomarker-utils.service';

describe('BiomarkerUtilsService', () => {
  let service: BiomarkerUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BiomarkerUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
