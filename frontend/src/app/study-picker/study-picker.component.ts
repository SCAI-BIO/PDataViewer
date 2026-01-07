import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
    RouterModule,
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
  displayedColumns: string[] = ['cohort', 'found', 'missing', 'plot', 'dataAccess'];
  filteredVariables: Observable<string[]> | null = null;
  isLoading = signal(false);
  @Input() selectedVariables: string[] = [];
  suggestions$: Observable<string[]> | null = null;
  variableCtrl = new FormControl();
  variables: string[] = [];
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private subscriptions: Subscription[] = [];

  addVariable(event: MatChipInputEvent): void {
    let variable = event.value;
    const input = event.chipInput;

    variable = (variable || '').trim();
    if (variable && !this.selectedVariables.includes(variable)) {
      this.selectedVariables.push(variable);
      if (input) {
        input.clear();
      }
      this.variableCtrl.setValue(null);
    }
  }

  availableVariables(missingVariables: string): string[] {
    const availableVariables = [...this.selectedVariables];
    const missingList = missingVariables.split(', ');

    for (const missing of missingList) {
      const indexToRemove = availableVariables.indexOf(missing);

      if (indexToRemove !== -1) {
        availableVariables.splice(indexToRemove, 1);
      }
    }

    return availableVariables;
  }

  displayFn(variable: string): string {
    return variable ? variable : '';
  }

  fetchMetadata(): void {
    this.isLoading.set(true);
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
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching metadata');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchVariables(): void {
    const sub = this.apiService.fetchVariables().subscribe({
      next: (v) => {
        this.variables = v;
        this.filteredVariables = this.variableCtrl.valueChanges.pipe(
          startWith(''),
          map((value) => this.filterVariables(value))
        );
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching variables');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchRankings(variables: string[]) {
    const sub = this.apiService.fetchRankings(variables).subscribe({
      next: (v) => (this.cohortRankings = v),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching rankings');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  filterVariables(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.variables.filter((variable) => variable.toLowerCase().includes(filterValue));
  }

  isDataAvailable(cohort: string): boolean {
    return this.dataAvailability[cohort] || false;
  }

  ngOnInit() {
    this.fetchVariables();
    this.fetchMetadata();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  optionSelected(event: MatAutocompleteSelectedEvent): void {
    const variable = event.option.value;
    if (variable && !this.selectedVariables.includes(variable)) {
      this.selectedVariables.push(variable);
      this.variableCtrl.setValue('');
    }
  }

  removeVariable(variable: string): void {
    const index = this.selectedVariables.indexOf(variable);
    if (index >= 0) {
      this.selectedVariables.splice(index, 1);
    }
  }
}
