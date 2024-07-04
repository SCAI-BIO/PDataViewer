import { TestBed } from '@angular/core/testing';

import { BoxplotService } from './boxplot.service';

describe('BoxplotService', () => {
  let service: BoxplotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BoxplotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
