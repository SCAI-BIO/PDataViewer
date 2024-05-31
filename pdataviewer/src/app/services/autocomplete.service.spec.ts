import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AutocompleteService } from './autocomplete.service';
import { environment } from '../../environments/environment';

describe('AutocompleteService', () => {
  let service: AutocompleteService;
  let httpMock: HttpTestingController;

  // Setup the testing module and inject the necessary services
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AutocompleteService],
    });
    service = TestBed.inject(AutocompleteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // Verify no outstanding requests after each test
  afterEach(() => {
    httpMock.verify();
  });

  // Test to ensure the service is created successfully
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Test to verify fetching autocomplete suggestions
  it('should fetch autocomplete suggestions', () => {
    const mockSuggestions = ['apple', 'banana', 'orange'];
    const query = 'a';

    // Call the autocomplete method and subscribe to the result
    service.autocomplete(query).subscribe({
      next: (suggestions) => {
        // Check that the suggestions length is as expected as matches the mock data
        expect(suggestions.length).toBe(3);
        expect(suggestions).toEqual(mockSuggestions);
      },
      error: () => fail('expected suggestions, not an error'),
    });

    // Expect an HTTP GET request to the specified URL
    const req = httpMock.expectOne(
      `${environment.API_URL}/autocompletion?text=${query}`
    );
    expect(req.request.method).toBe('GET');

    // Respond to the request with the mock suggestions
    req.flush(mockSuggestions);
  });

  // Test to handle errors gracefully when fetching autocomplete suggestions
  it('should handle error gracefully', () => {
    const query = 'a';
    const mockError = { status: 500, statusText: 'Server Error' };

    // Call the autocomplete method and subscribe to the result
    service.autocomplete(query).subscribe({
      next: () => fail('expected an error, not suggestions'),
      error: (error) => expect(error).toBeTruthy(), // Expect an error to be returned
    });

    // Expect an HTTP GET request to the specified URL
    const req = httpMock.expectOne(
      `${environment.API_URL}/autocompletion?text=${query}`
    );
    expect(req.request.method).toBe('GET');

    // Respond to the request with an error
    req.flush(null, mockError);
  });
});
