import { Component, OnInit, inject, signal, DestroyRef, computed } from '@angular/core';
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
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Metadata } from '../interfaces/metadata';
import { RankData } from '../interfaces/rankdata';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

@Component({
  selector: 'app-study-picker',
  imports: [
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTableModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.scss',
})
export class StudyPickerComponent implements OnInit {
  // Dependencies
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  // Signals
  cohortColors = signal<Record<string, string>>({});
  cohortData = signal<Metadata>({});
  cohortLinks = signal<Record<string, string>>({});
  cohortRankings = signal<RankData[]>([]);
  selectedVariables = signal<string[]>([]);
  variables = signal<string[]>([]);
  isLoading = signal(false);

  // Form Controls
  variableCtrl = new FormControl('');

  // Derived Signals
  filteredVariables = computed(() => {
    const rawQuery = this.variableQuery();
    const query = (rawQuery || '').toLowerCase();
    const allVariables = this.variables();

    return allVariables.filter((variable) => variable.toLowerCase().includes(query));
  });
  private variableQuery = toSignal(this.variableCtrl.valueChanges, { initialValue: '' });

  // Constants
  readonly dataAvailability: Record<string, boolean> = {
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
  readonly displayedColumns: string[] = ['cohort', 'found', 'missing', 'plot', 'dataAccess'];

  addVariable(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.selectedVariables().includes(value)) {
      this.selectedVariables.update((vars) => [...vars, value]);
      event.chipInput!.clear();
      this.variableCtrl.setValue(null);
    }
  }

  displayFn(variable: string): string {
    return variable ? variable : '';
  }

  fetchInitialData(): void {
    this.isLoading.set(true);
    forkJoin({
      variables: this.apiService.fetchVariables(),
      metadata: this.apiService.fetchMetadata(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          this.variables.set(results.variables);
          this.cohortData.set(results.metadata);
          const colors: Record<string, string> = {};
          const links: Record<string, string> = {};
          const data = results.metadata;

          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              colors[key] = data[key].color;
              links[key] = data[key].link;
            }
          }
          this.cohortColors.set(colors);
          this.cohortLinks.set(links);
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching initial data'),
      });
  }

  fetchRankings(variables: string[]) {
    this.isLoading.set(true);
    this.apiService
      .fetchRankings(variables)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (v) => this.cohortRankings.set(v),
        error: (err) => this.errorHandler.handleError(err, 'fetching rankings'),
      });
  }

  getAvailableVariables(missingVariablesStr: string): string[] {
    const missing = new Set(missingVariablesStr.split(', '));
    return this.selectedVariables().filter((v) => !missing.has(v));
  }

  isDataAvailable(cohort: string): boolean {
    return this.dataAvailability[cohort] || false;
  }

  ngOnInit() {
    this.fetchInitialData();
  }

  onOptionSelect(event: MatAutocompleteSelectedEvent): void {
    const variable = event.option.value;
    if (variable && !this.selectedVariables().includes(variable)) {
      this.selectedVariables.update((vars) => [...vars, variable]);
    }
    this.variableCtrl.setValue('');
  }

  removeVariable(variable: string): void {
    this.selectedVariables.update((vars) => vars.filter((v) => v !== variable));
  }
}
