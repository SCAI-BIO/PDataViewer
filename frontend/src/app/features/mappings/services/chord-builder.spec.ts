import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ChordBuilder } from './chord-builder';

describe('ChordDiagram', () => {
  let service: ChordBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ChordBuilder);
  });

  // Test to ensure the service is created
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
