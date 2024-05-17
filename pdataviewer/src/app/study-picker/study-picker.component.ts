import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { NavBarComponent } from '../nav-bar/nav-bar.component';

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
    MatIconModule,
  ],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.css',
})
export class StudyPickerComponent implements OnInit, OnDestroy {
  private apiUrl = 'http://127.0.0.1:5000/';
  private subscriptions: Subscription[] = [];
  // Form control for the feature input.
  featureCtrl = new FormControl();
  // Array of cohort rankings.
  cohortRankings: any = [];
  // Observable for feature suggestions.
  suggestions$: Observable<string[]> | null = null;
  // Array of available features.
  features: string[] = [];
  // Observable for filtered features.
  filteredFeatures: Observable<string[]> | null = null;
  @Input() selectedFeatures: string[] = [];

  constructor(private http: HttpClient) {}

  // Fetches features and initializes features and filteredFeatures when the component is initialized.
  ngOnInit() {
    const sub = this.fetchFeatures().subscribe((features) => {
      this.features = features.Feature;
      this.filteredFeatures = this.featureCtrl.valueChanges.pipe(
        startWith(''),
        map((value) => this._filter(value))
      );
    });
    this.subscriptions.push(sub);
  }

  /**
   * Adds a feature to the selected features list.
   * @param event - The MatChipInputEvent object.
   */
  addFeature(event: MatChipInputEvent): void {
    const input = event.chipInput;
    let feature = event.value;

    feature = (feature || '').trim();
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      if (input) {
        input.clear();
      }
      this.featureCtrl.setValue(null);
    }
  }

  /**
   * Removes a feature from the selected features list.
   * @param feature - The feature to remove.
   */
  removeFeature(feature: string): void {
    const index = this.selectedFeatures.indexOf(feature);
    if (index >= 0) {
      this.selectedFeatures.splice(index, 1);
    }
  }

  /**
   * Fetches the available features from the API.
   * @returns An Observable of the fetched features.
   */
  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(this.apiUrl + 'cdm/features');
  }

  /**
   * Displays the feature name in the autocomplete input.
   * @param feature - The feature to display.
   * @returns The feature name or an empty string.
   */
  displayFn(feature: string): string {
    return feature ? feature : '';
  }

  /**
   * Filters the features based on the input value.
   * @param value - The input value to filter by.
   * @returns An array of filtered features.
   */
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.features.filter((feature) =>
      feature.toLowerCase().includes(filterValue)
    );
  }

  /**
   * Handles the selection of a feature from the autocomplete dropdown.
   * @param event - The MatAutocompleteSelectedEvent object.
   */
  selected(event: MatAutocompleteSelectedEvent): void {
    const feature = event.option.value;
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      this.featureCtrl.setValue('');
    }
  }

  /**
   * Retrieves the rankings for the selected features.
   * @param features - The selected features.
   */
  getRankings(features: string[]) {
    const sub = this.http
      .post<any[]>(this.apiUrl + 'studypicker/rank', features)
      .subscribe({
        next: (v) => (this.cohortRankings = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  // Unsubscribes from subscriptions when the component is destroyed to prevent memory leaks.
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
