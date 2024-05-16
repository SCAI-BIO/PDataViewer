import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AutocompleteService } from '../autocomplete.service';
import { HttpClient } from '@angular/common/http';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-study-picker',
  standalone: true,
  imports: [
    NavBarComponent,
    CommonModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatChipsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.css',
})
export class StudyPickerComponent implements OnInit {
  @ViewChild('featureInput') featureInput!: ElementRef<HTMLInputElement>;
  optionCtrl = new FormControl();
  private apiUrl = 'http://127.0.0.1:5000/';
  cohortRankings: any = [];
  suggestions$: Observable<string[]> | null = null;
  options: string[] = [];
  filteredOptions: Observable<string[]> | null = null;
  selectedOptions: string[] = [];

  constructor(
    private autocompleteService: AutocompleteService,
    private http: HttpClient
  ) {}

  addOption(event: Event): void {
    const chipInputEvent = event as unknown as MatChipInputEvent;
    const value = (chipInputEvent?.value || '').trim();
    if (value && !this.selectedOptions.includes(value)) {
      this.selectedOptions.push(value);
      if (chipInputEvent?.chipInput) {
        chipInputEvent.chipInput.clear();
      }
      this.optionCtrl.setValue(null);
    }
  }

  removeOption(option: string): void {
    const index = this.selectedOptions.indexOf(option);
    if (index >= 0) {
      this.selectedOptions.splice(index, 1);
    }
  }

  ngOnInit() {
    this.fetchOptions().subscribe((options) => {
      this.options = options.Feature;
      this.filteredOptions = this.optionCtrl.valueChanges.pipe(
        startWith(''),
        map((value) => this._filter(value))
      );
    });
  }

  fetchOptions(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(this.apiUrl + 'cdm/features');
  }

  displayFn(option: string): string {
    return option ? option : '';
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.options.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  onInputChange(input: string) {
    if (input.length > 2) {
      this.suggestions$ = this.autocompleteService.autocomplete(input);
    } else {
      this.suggestions$ = null;
    }
  }

  getRankings(features: string) {
    this.http
      .post<any[]>(this.apiUrl + 'studypicker/rank', [features])
      .subscribe({
        next: (v) => (this.cohortRankings = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
  }

  onSuggestionClick(suggestion: string) {
    this.featureInput.nativeElement.value = suggestion;
    this.suggestions$ = null;
  }
}
