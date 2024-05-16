import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutocompleteService {

  constructor(private http: HttpClient) { }

  autocomplete(input: string): Observable<string[]> {
    return this.http.get<string[]>('http://127.0.0.1:5000/autocompletion?text=' + input);
  }
}
