import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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

import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';
import { BoxplotService } from '../services/boxplot.service';

@Component({
  selector: 'app-biomarkers',
  imports: [
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
export class BiomarkersComponent implements OnInit {
  biomarkerCtrl = new FormControl();
  biomarkerData = signal<Record<string, number[]>>({});
  biomarkers = signal<string[]>([]);
  cohortCtrl = new FormControl();
  cohorts = signal<string[]>([]);
  colors = signal<Record<string, string>>({});
  diagnoses = signal<string[]>([]);
  filteredBiomarkers = computed(() => {
    const query = this.biomarkerQuery()?.toLowerCase() ?? '';
    const all = this.biomarkers();
    return all.filter((b) => b.toLowerCase().includes(query));
  });
  filteredDiagnoses = computed(() => {
    const query = this.cohortQuery()?.toLowerCase() ?? '';
    const all = this.diagnoses();
    return all.filter((d) => d.toLowerCase().includes(query));
  });
  isLoading = signal(false);
  selectedBiomarker = signal<string>('');
  selectedCohorts = signal<string[]>([]);
  showDataPoints = signal(false);
  private apiService = inject(ApiService);
  private biomarkerQuery = toSignal(this.biomarkerCtrl.valueChanges, { initialValue: '' });
  private boxplotService = inject(BoxplotService);
  private cohortQuery = toSignal(this.cohortCtrl.valueChanges, { initialValue: '' });
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandlerService);

  addCohort(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    const currentSelected = this.selectedCohorts();

    if (value && !currentSelected.includes(value)) {
      this.selectedCohorts.update((list) => [...list, value]);
      event.chipInput?.clear();
      this.cohortCtrl.setValue(null);
    }
  }

  displayFn(option: string): string {
    return option ? option : '';
  }

  fetchBiomarkerData(cohortAndDiagnosis: string): void {
    this.isLoading.set(true);
    const { cohort, diagnosis } = this.splitDiagnosis(cohortAndDiagnosis);

    this.apiService
      .fetchBiomarkerData(this.selectedBiomarker(), cohort, diagnosis)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (v) => {
          this.biomarkerData.update((data) => ({
            ...data,
            [cohortAndDiagnosis]: v,
          }));
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching biomarker data'),
      });
  }

  fetchCohorts(): void {
    this.isLoading.set(true);
    this.apiService
      .fetchCohortsForBiomarker(this.selectedBiomarker())
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (v) => this.cohorts.set(v),
        error: (err) => this.errorHandler.handleError(err, 'fetching cohorts'),
      });
  }

  fetchDiagnoses(): void {
    this.isLoading.set(true);
    this.apiService
      .fetchDiagnosesForBiomarker(this.selectedBiomarker())
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (v) => this.diagnoses.set(v),
        error: (err) => this.errorHandler.handleError(err, 'fetching diagnoses'),
      });
  }

  fetchInitialData(): void {
    this.isLoading.set(true);

    const colors$ = this.apiService.fetchMetadata().pipe(
      map((metadata) => {
        const colors: Record<string, string> = {};
        for (const key in metadata) {
          if (Object.hasOwn(metadata, key)) {
            colors[key] = metadata[key].color;
          }
        }
        return colors;
      })
    );

    forkJoin({
      biomarkers: this.apiService.fetchBiomarkers(),
      colors: colors$,
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          this.biomarkers.set(results.biomarkers);
          this.colors.set(results.colors);
        },
        error: (err) => {
          this.errorHandler.handleError(err, 'fetching initial data');
        },
      });
  }

  generateBoxplot(): void {
    this.boxplotService.createBoxplot(
      this.biomarkerData(),
      this.selectedBiomarker(),
      this.colors(),
      this.showDataPoints(),
      'boxplot'
    );
  }

  getCohortColumns(): number {
    return Math.min(this.cohorts().length, 4);
  }

  ngOnInit() {
    this.fetchInitialData();
  }

  onBiomarkerSelect(event: MatAutocompleteSelectedEvent): void {
    const biomarker = event.option.value;
    if (biomarker) {
      this.selectedBiomarker.set(biomarker);
      this.selectedCohorts.set([]);
      this.biomarkerData.set({});
      const plotContainer = document.getElementById('boxplot');
      if (plotContainer) {
        plotContainer.innerHTML = '';
      }
      this.fetchCohorts();
      this.fetchDiagnoses();
    }
  }

  onCohortSelect(event: MatAutocompleteSelectedEvent): void {
    const cohort = event.option.value;
    const currentSelected = this.selectedCohorts();

    if (cohort && !currentSelected.includes(cohort)) {
      this.selectedCohorts.update((list) => [...list, cohort]);
      this.fetchBiomarkerData(cohort);
    }

    this.cohortCtrl.setValue(null);
  }

  onToggleDataPoints(isChecked: boolean): void {
    this.showDataPoints.set(isChecked);
  }

  removeCohort(cohort: string): void {
    this.selectedCohorts.update((list) => {
      const index = list.indexOf(cohort);
      if (index >= 0) {
        const newList = [...list];
        newList.splice(index, 1);
        return newList;
      }
      return list;
    });

    this.biomarkerData.update((data) => {
      const newData = { ...data };
      delete newData[cohort];
      return newData;
    });
  }

  splitDiagnosis(cohortAndDiagnosis: string): { cohort: string; diagnosis: string } {
    const parts = cohortAndDiagnosis.split('(');
    const cohortPart = parts[0].trim();
    const diagnosisPart = parts[1].replace('Group', '').replace(')', '').trim();

    return {
      cohort: cohortPart,
      diagnosis: diagnosisPart,
    };
  }
}
