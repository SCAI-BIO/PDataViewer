import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-study-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatChipsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.css',
})
export class StudyPickerComponent implements OnInit, OnDestroy {
  cohortRankings: any = [];
  displayedColumns: string[] = ['cohort', 'found', 'missing'];
  featureCtrl = new FormControl();
  features: string[] = [];
  filteredFeatures: Observable<string[]> | null = null;
  @Input() selectedFeatures: string[] = [];
  suggestions$: Observable<string[]> | null = null;
  private API_URL = environment.API_URL;
  private subscriptions: Subscription[] = [];
  cohortColors: any = {};

  constructor(private http: HttpClient) {}

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

  displayFn(feature: string): string {
    return feature ? feature : '';
  }

  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(`${this.API_URL}/cdm/features`);
  }

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

  fetchColors(): void {
    this.http.get<any>('/assets/colors.json').subscribe((colors) => {
      this.cohortColors = colors;
    });
  }

  ngOnInit() {
    const sub = this.fetchFeatures().subscribe((features) => {
      this.features = features.Feature;
      this.filteredFeatures = this.featureCtrl.valueChanges.pipe(
        startWith(''),
        map((value) => this._filter(value))
      );
    });
    this.subscriptions.push(sub);
    this.fetchColors();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  optionSelected(event: MatAutocompleteSelectedEvent): void {
    const feature = event.option.value;
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      this.featureCtrl.setValue('');
    }
  }

  removeFeature(feature: string): void {
    const index = this.selectedFeatures.indexOf(feature);
    if (index >= 0) {
      this.selectedFeatures.splice(index, 1);
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.features.filter((feature) =>
      feature.toLowerCase().includes(filterValue)
    );
  }
}
