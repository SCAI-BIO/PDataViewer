import { TestBed } from '@angular/core/testing';

import { BoxplotBuilder } from './boxplot-builder';

describe('BoxplotBuilder', () => {
  let service: BoxplotBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoxplotBuilder],
    });
    service = TestBed.inject(BoxplotBuilder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
