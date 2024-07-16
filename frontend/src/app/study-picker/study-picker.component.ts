import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { Metadata } from '../interfaces/metadata';
import { RankData } from '../interfaces/rankdata';
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
  cohortData: Metadata = {};
  cohortColors: { [key: string]: string } = {};
  cohortLinks: { [key: string]: string } = {};
  cohortRankings: RankData[] = [];
  displayedColumns: string[] = [
    'cohort',
    'found',
    'missing',
    'plot',
    'dataAccess',
  ];
  featureCtrl = new FormControl();
  features: string[] = [];
  filteredFeatures: Observable<string[]> | null = null;
  @Input() selectedFeatures: string[] = [];
  suggestions$: Observable<string[]> | null = null;
  private API_URL = environment.API_URL;
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient, private router: Router) {}

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

  fetchMetadata(): void {
    const sub = this.http
      .get<Metadata>(`${this.API_URL}/cohorts/metadata`)
      .subscribe((data) => {
        this.cohortData = data;
        for (const cohort in data) {
          if (data.hasOwnProperty(cohort)) {
            this.cohortColors[cohort] = data[cohort].Color;
            this.cohortLinks[cohort] = data[cohort].Link;
          }
        }
      });
    this.subscriptions.push(sub);
  }

  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(`${this.API_URL}/cdm/features`);
  }

  getRankings(features: string[]) {
    const sub = this.http
      .post<RankData[]>(`${this.API_URL}/studypicker/rank`, features)
      .subscribe({
        next: (v) => (this.cohortRankings = v),
        error: (e) => console.error(e),
        complete: () => console.info('Rankings fetched successfully.'),
      });
    this.subscriptions.push(sub);
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
    this.fetchMetadata();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  openLink(url: string): void {
    window.open(url, '_blank');
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

  redirectToPlot(cohort: string, missing: string) {
    const availableFeatures = this._availableFeatures(missing);
    this.router.navigate(['plot-longitudinal'], {
      queryParams: {
        cohort: cohort,
        features: availableFeatures,
      },
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.features.filter((feature) =>
      feature.toLowerCase().includes(filterValue)
    );
  }

  private _availableFeatures(missingFeatures: string): string[] {
    const availableFeatures = [...this.selectedFeatures];
    const missingList = missingFeatures.split(', ');

    for (const missing of missingList) {
      const indexToRemove = availableFeatures.indexOf(missing);

      if (indexToRemove !== -1) {
        availableFeatures.splice(indexToRemove, 1);
      }
    }

    return availableFeatures.map((feature) =>
      feature.toLowerCase().replace(/\s+/g, '_')
    );
  }
}
