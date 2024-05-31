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

import { FooterComponent } from '../footer/footer.component';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-study-picker',
  standalone: true,
  imports: [
    FooterComponent,
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
  // Array of cohort rankings.
  cohortRankings: any = [];
  // Form control for the feature input.
  featureCtrl = new FormControl();
  // Array of available features.
  features: string[] = [];
  // Observable for filtered features.
  filteredFeatures: Observable<string[]> | null = null;
  // Array of features selected by the user
  @Input() selectedFeatures: string[] = [];
  // Observable for feature suggestions.
  suggestions$: Observable<string[]> | null = null;
  private API_URL = environment.API_URL;
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient) {}

  /**
   * Adds a feature to the selected features list.
   * @param event - The MatChipInputEvent object.
   */
  addFeature(event: MatChipInputEvent): void {
    let feature = event.value;
    const input = event.chipInput;

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
   * Displays the feature name in the autocomplete input.
   * @param feature - The feature to display.
   * @returns The feature name or an empty string.
   */
  displayFn(feature: string): string {
    return feature ? feature : '';
  }

  /**
   * Fetches the available features from the API.
   * @returns An Observable of the fetched features.
   */
  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(`${this.API_URL}/cdm/features`);
  }

  /**
   * Retrieves the rankings for the selected features.
   * @param features - The selected features.
   */
  getRankings(features: string[]) {
    const sub = this.http
      .post<any[]>(`${this.API_URL}/studypicker/rank`, features)
      .subscribe({
        next: (v) => (this.cohortRankings = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

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

  // Unsubscribes from subscriptions when the component is destroyed to prevent memory leaks.
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Handles the selection of a feature from the autocomplete dropdown.
   * @param event - The MatAutocompleteSelectedEvent object.
   */
  optionSelected(event: MatAutocompleteSelectedEvent): void {
    const feature = event.option.value;
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      this.featureCtrl.setValue('');
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
}
