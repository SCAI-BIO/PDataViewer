import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AutocompleteService } from './autocomplete.service';

describe('AutocompleteService', () => {
  let service: AutocompleteService;

  // Setup the testing module and inject the necessary services
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AutocompleteService);
  });

  // Test to ensure the service is created successfully
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
