import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ChordDiagramService } from './chord-diagram.service';

describe('ChordDiagramService', () => {
  let service: ChordDiagramService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ChordDiagramService);
  });

  // Test to ensure the service is created
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
