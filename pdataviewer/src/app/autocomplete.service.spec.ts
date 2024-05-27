import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AutocompleteService } from './autocomplete.service';
import { environment } from '../environments/environment';

describe('AutocompleteService', () => {
  let service: AutocompleteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AutocompleteService]
    });
    service = TestBed.inject(AutocompleteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch autocomplete suggestions', () => {
    const mockSuggestions = ['apple', 'banana', 'orange'];
    const query = 'a';

    service.autocomplete(query).subscribe({
      next: suggestions => {
        expect(suggestions.length).toBe(3);
        expect(suggestions).toEqual(mockSuggestions);
      },
      error: () => fail('expected suggestions, not an error')
    });

    const req = httpMock.expectOne(`${environment.API_URL}/autocompletion?text=${query}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSuggestions);
  });

  it('should handle error gracefully', () => {
    const query = 'a';
    const mockError = { status: 500, statusText: 'Server Error' };

    service.autocomplete(query).subscribe({
      next: () => fail('expected an error, not suggestions'),
      error: error => expect(error).toBeTruthy()
    });

    const req = httpMock.expectOne(`${environment.API_URL}/autocompletion?text=${query}`);
    expect(req.request.method).toBe('GET');
    req.flush(null, mockError);
  });
});
