import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AutocompleteService {
  private API_URL = environment.API_URL;
  private autocompleteEndpoint = '/autocompletion';
  private http = inject(HttpClient);

  /**
   * Fetches autocomplete suggestions based on the input text.
   * @param input The input text for autocomplete.
   * @returns An Observable emitting an array of autocomplete suggestions.
   */
  autocomplete(input: string): Observable<string[]> {
    const params = new HttpParams().set('text', input);
    const url = `${this.API_URL}${this.autocompleteEndpoint}`;
    return this.http.get<string[]>(url, { params }).pipe(
      catchError((error) => {
        // Handle the error here
        console.error('An error occurred:', error);
        return throwError(() => error);
      })
    );
  }
}
