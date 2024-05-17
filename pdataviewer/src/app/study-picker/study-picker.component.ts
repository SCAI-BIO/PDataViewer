import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
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
  @ViewChild('featureInput') featureInput!: ElementRef<HTMLInputElement>;
  featureCtrl = new FormControl();
  cohortRankings: any = [];
  suggestions$: Observable<string[]> | null = null;
  features: string[] = [];
  filteredFeatures: Observable<string[]> | null = null;
  selectedFeatures: string[] = [];

  constructor(private http: HttpClient) {}

  // Fetch features and initialize features and filteredFeatures when the component is initialized
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

  removeFeature(feature: string): void {
    const index = this.selectedFeatures.indexOf(feature);
    if (index >= 0) {
      this.selectedFeatures.splice(index, 1);
    }
  }

  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(this.apiUrl + 'cdm/features');
  }

  displayFn(feature: string): string {
    return feature ? feature : '';
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.features.filter((feature) =>
      feature.toLowerCase().includes(filterValue)
    );
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const feature = event.option.value;
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      this.featureInput.nativeElement.value = '';
      this.featureCtrl.setValue('');
    }
  }

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

  // Unsubscribe from subscriptions when the component is destroyed to prevent memory leaks
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
