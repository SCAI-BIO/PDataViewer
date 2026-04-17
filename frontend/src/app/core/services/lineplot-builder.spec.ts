import { TestBed } from '@angular/core/testing';

import { LineplotBuilder } from './lineplot-builder';

describe('LineplotBuilder', () => {
  let service: LineplotBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LineplotBuilder],
    });
    service = TestBed.inject(LineplotBuilder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
