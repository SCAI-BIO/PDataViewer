import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Observable, Subscription, map, startWith } from 'rxjs';

import { ApiService } from '../services/api.service';
import { BoxplotService } from '../services/boxplot.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-biomarkers',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './biomarkers.component.html',
  styleUrl: './biomarkers.component.scss',
})
export class BiomarkersComponent implements OnInit, OnDestroy {
  biomarkerCtrl = new FormControl();
  biomarkerData: Record<string, number[]> = {};
  biomarkers: string[] = [];
  cohortCtrl = new FormControl();
  cohorts: string[] = [];
  colors: Record<string, string> = {};
  diagnoses: string[] = [];
  filteredBiomarkers: Observable<string[]> | null = null;
  filteredDiagnoses: Observable<string[]> | null = null;
  isLoading = signal(false);
  selectedBiomarker = '';
  selectedCohorts: string[] = [];
  showDataPoints = false;
  private apiService = inject(ApiService);
  private boxplotService = inject(BoxplotService);
  private errorHandler = inject(ApiErrorHandlerService);
  private subscriptions: Subscription[] = [];

  addCohort(event: MatChipInputEvent): void {
    let cohort = event.value;
    const input = event.chipInput;

    cohort = (cohort || '').trim();
    if (cohort && !this.selectedCohorts.includes(cohort)) {
      this.selectedCohorts.push(cohort);
      if (input) {
        input.clear();
      }
      this.cohortCtrl.setValue(null);
    }
  }

  biomarkerSelected(event: MatAutocompleteSelectedEvent): void {
    const biomarker = event.option.value;
    if (biomarker) {
      this.selectedBiomarker = biomarker;
      this.biomarkerCtrl.setValue('');
      this.fetchCohorts();
      this.fetchDiagnoses();
    }
  }

  cohortSelected(event: MatAutocompleteSelectedEvent): void {
    const cohort = event.option.value;
    if (cohort && !this.selectedCohorts.includes(cohort)) {
      this.selectedCohorts.push(cohort);
      this.cohortCtrl.setValue('');
      this.fetchBiomarkerData(cohort);
    }
  }

  displayFn(option: string): string {
    return option ? option : '';
  }

  fetchBiomarkerData(cohort_and_diagnosis: string): void {
    this.isLoading.set(true);
    const { cohort, diagnosis } = this.splitDiagnosis(cohort_and_diagnosis);
    const sub = this.apiService
      .fetchBiomarkerData(this.selectedBiomarker, cohort, diagnosis)
      .subscribe({
        next: (v) => (this.biomarkerData[cohort_and_diagnosis] = v),
        error: (err) => {
          this.isLoading.set(false);
          this.errorHandler.handleError(err, 'fetching biomarker data');
        },
        complete: () => this.isLoading.set(false),
      });
    this.subscriptions.push(sub);
  }

  fetchBiomarkers(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchBiomarkers().subscribe({
      next: (v) => (this.biomarkers = v),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching biomarkers');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchCohorts(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchCohortsForBiomarker(this.selectedBiomarker).subscribe({
      next: (v) => (this.cohorts = v),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching cohorts');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchColors(): void {
    this.isLoading.set(true);
    const sub = this.apiService
      .fetchMetadata()
      .pipe(
        map((metadata) => {
          const colors: Record<string, string> = {};
          for (const key in metadata) {
            if (Object.hasOwn(metadata, key)) {
              colors[key] = metadata[key].color;
            }
          }
          return colors;
        })
      )
      .subscribe({
        next: (v) => {
          this.colors = v;
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorHandler.handleError(err, 'fetching colors');
        },
        complete: () => this.isLoading.set(false),
      });
    this.subscriptions.push(sub);
  }

  fetchDiagnoses(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchDiagnosesForBiomarker(this.selectedBiomarker).subscribe({
      next: (v) => {
        this.diagnoses = v;
        this.filteredDiagnoses = this.cohortCtrl.valueChanges.pipe(
          startWith(''),
          map((value) => this.filterDiagnoses(value || ''))
        );
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching diagnoses');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  filterBiomarkers(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.biomarkers.filter((biomarker) => biomarker.toLowerCase().includes(filterValue));
  }

  filterDiagnoses(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.diagnoses.filter((diagnosis) => diagnosis.toLowerCase().includes(filterValue));
  }

  generateBoxplot(): void {
    this.boxplotService.createBoxplot(
      this.biomarkerData,
      this.selectedBiomarker,
      this.colors,
      this.showDataPoints,
      'boxplot'
    );
  }

  getCohortColumns(): number {
    return Math.min(this.cohorts.length, 4);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit() {
    this.fetchBiomarkers();
    this.fetchColors();
    this.filteredBiomarkers = this.biomarkerCtrl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterBiomarkers(value || ''))
    );
  }

  onToggleDataPoints(isChecked: boolean): void {
    this.showDataPoints = isChecked;
  }

  removeBiomarker(): void {
    this.selectedBiomarker = '';
    this.selectedCohorts = [];
    this.biomarkerData = {};
  }

  removeCohort(cohort: string): void {
    const index = this.selectedCohorts.indexOf(cohort);
    if (index >= 0) {
      this.selectedCohorts.splice(index, 1);
      delete this.biomarkerData[cohort];
    }
  }

  splitDiagnosis(cohort_and_diagnosis: string): {
    cohort: string;
    diagnosis: string;
  } {
    const parts = cohort_and_diagnosis.split('(');
    const cohortPart = parts[0].trim();
    const diagnosisPart = parts[1].replace('Group', '').replace(')', '').trim();

    return {
      cohort: cohortPart,
      diagnosis: diagnosisPart,
    };
  }
}
