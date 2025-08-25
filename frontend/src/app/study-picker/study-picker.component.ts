import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Metadata } from '../interfaces/metadata';
import { RankData } from '../interfaces/rankdata';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

@Component({
  selector: 'app-study-picker',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTableModule,
    ReactiveFormsModule,
  ],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.scss',
})
export class StudyPickerComponent implements OnInit, OnDestroy {
  cohortData: Metadata = {};
  cohortColors: Record<string, string> = {};
  cohortLinks: Record<string, string> = {};
  cohortRankings: RankData[] = [];
  dataAvailability: Record<string, boolean> = {
    PPMI: true,
    BIOFIND: true,
    LuxPARK: false,
    LCC: true,
    PRoBaND: false,
    OPDC: false,
    'Fox Insight': true,
    DATATOP: true,
    PINE: true,
    'UK Biobank': false,
    PostCEPT: true,
    SPARX: true,
  };
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
  loading = false;
  @Input() selectedFeatures: string[] = [];
  suggestions$: Observable<string[]> | null = null;
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];

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
    this.loading = true;
    const sub = this.apiService.fetchMetadata().subscribe({
      next: (data) => {
        this.cohortData = data;
        for (const cohort in data) {
          if (Object.hasOwn(data, cohort)) {
            this.cohortColors[cohort] = data[cohort].color;
            this.cohortLinks[cohort] = data[cohort].link;
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching metadata');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchFeatures(): void {
    const sub = this.apiService.fetchFeatures().subscribe({
      next: (v) => {
        this.features = v.Feature;
        this.filteredFeatures = this.featureCtrl.valueChanges.pipe(
          startWith(''),
          map((value) => this._filter(value))
        );
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching features');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchRankings(features: string[]) {
    const sub = this.apiService.fetchRankings(features).subscribe({
      next: (v) => (this.cohortRankings = v),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching rankings');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  isDataAvailable(cohort: string): boolean {
    return this.dataAvailability[cohort] || false;
  }

  ngOnInit() {
    this.fetchFeatures();
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
    const url = this.router
      .createUrlTree(['plot-longitudinal'], {
        queryParams: {
          cohort: cohort,
          features: availableFeatures,
        },
      })
      .toString();
    window.open(url, '_blank');
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
