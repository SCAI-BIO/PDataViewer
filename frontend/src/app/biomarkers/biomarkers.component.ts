import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
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

import { BiomarkerUtilsService } from './biomarker-utils.service';
import { ApiService } from '../services/api.service';
import { BoxplotService } from '../services/boxplot.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

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
  diagnoses: Record<string, string[]> = {};
  filteredBiomarkers: Observable<string[]> | null = null;
  filteredDiagnoses: Observable<string[]> | null = null;
  loading = false;
  originalVariableNameMappings: Record<string, string> = {};
  selectedBiomarker = '';
  selectedCohorts: string[] = [];
  showDataPoints = false;
  @ViewChild('boxplot') private chartContainer!: ElementRef;
  private apiService = inject(ApiService);
  private biomarkerUtilsService = inject(BiomarkerUtilsService);
  private boxplotService = inject(BoxplotService);
  private errorHandler = inject(ApiErrorHandlerService);
  private http = inject(HttpClient);
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
    this.loading = true;
    const biomarker = this.selectedBiomarker.toLowerCase();
    const { cohort, diagnosis } =
      this.biomarkerUtilsService.splitDiagnosis(cohort_and_diagnosis);
    const sub = this.apiService
      .fetchBiomarkerData(biomarker, cohort, diagnosis)
      .subscribe({
        next: (v) => (this.biomarkerData[cohort_and_diagnosis] = v),
        error: (err) => {
          this.loading = false;
          this.errorHandler.handleError(err, 'fetching biomarker data');
        },
        complete: () => (this.loading = false),
      });
    this.subscriptions.push(sub);
  }

  fetchBiomarkers(): void {
    this.loading = true;
    const sub = this.apiService.fetchBiomarkers().subscribe({
      next: (v) =>
        (this.biomarkers = v.map((biomarker) =>
          this.biomarkerUtilsService.transformBiomarkerName(
            this.originalVariableNameMappings,
            biomarker
          )
        )),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching biomarkers');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchCohorts(): void {
    this.loading = true;
    const biomarker = this.selectedBiomarker.toLowerCase();
    const sub = this.apiService.fetchCohortsForBiomarker(biomarker).subscribe({
      next: (v) => (this.cohorts = v),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching cohorts');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchColors(): void {
    this.loading = true;
    const sub = this.apiService
      .fetchMetadata()
      .pipe(
        map((metadata) => {
          const colors: Record<string, string> = {};
          for (const key in metadata) {
            if (Object.hasOwn(metadata, key)) {
              colors[key] = metadata[key].Color;
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
          this.loading = false;
          this.errorHandler.handleError(err, 'fetching colors');
        },
        complete: () => (this.loading = false),
      });
    this.subscriptions.push(sub);
  }

  fetchDiagnoses(): void {
    this.loading = true;
    const biomarker = this.selectedBiomarker.toLowerCase();
    const sub = this.apiService
      .fetchDiagnosesForBiomarker(biomarker)
      .subscribe({
        next: (v) => (
          (this.diagnoses = v),
          (this.filteredDiagnoses = this.cohortCtrl.valueChanges.pipe(
            startWith(''),
            map((value) =>
              this.biomarkerUtilsService.filterDiagnoses(value || '', v)
            )
          ))
        ),
        error: (err) => {
          this.loading = false;
          this.errorHandler.handleError(err, 'fetching diagnoses');
        },
        complete: () => (this.loading = false),
      });
    this.subscriptions.push(sub);
  }

  generateBoxplot(): void {
    this.boxplotService.createBoxplot(
      this.chartContainer,
      this.biomarkerData,
      this.colors,
      this.showDataPoints
    );
  }

  getCohortColumns(): number {
    return Math.min(this.cohorts.length, 4);
  }

  loadOriginalCaseMappings(): void {
    this.http
      .get<Record<string, string>>('lower_to_original_case.json')
      .subscribe({
        next: (data) => {
          this.originalVariableNameMappings = data;
          console.info(
            'Lowercase to original case mappings successfully loaded'
          );
        },
        error: (e) =>
          console.error(
            'Error loading lowercase to original case mappings:',
            e
          ),
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit() {
    this.loadOriginalCaseMappings();
    this.fetchBiomarkers();
    this.fetchColors();
    this.filteredBiomarkers = this.biomarkerCtrl.valueChanges.pipe(
      startWith(''),
      map((value) =>
        this.biomarkerUtilsService.filterBiomarkers(
          this.biomarkers,
          value || ''
        )
      )
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
}
