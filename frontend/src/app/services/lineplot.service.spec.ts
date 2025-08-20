import { TestBed } from '@angular/core/testing';

import { LineplotService } from './lineplot.service';

describe('LineplotService', () => {
  let service: LineplotService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LineplotService],
    });
    service = TestBed.inject(LineplotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
