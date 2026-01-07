import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Observable, Subscription, map, startWith } from 'rxjs';

import { LongitudinalData } from '../interfaces/longitudinal-data';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';
import { LineplotService } from '../services/lineplot.service';

@Component({
  selector: 'app-longitudinal',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './longitudinal.component.html',
  styleUrl: './longitudinal.component.scss',
})
export class LongitudinalComponent implements OnInit, OnDestroy {
  colors: Record<string, string> = {};
  data: LongitudinalData[] = [];
  filteredVariables: Observable<string[]> | null = null;
  longitudinalTables: string[] = [];
  isLoading = signal(false);
  selectedVariable = '';
  variableCtrl = new FormControl();
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private lineplotService = inject(LineplotService);
  private subscriptions: Subscription[] = [];

  displayFn(option: string): string {
    return option ? option : '';
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

  fetchLongitudinalTable(tableName: string): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchLongitudinalTable(tableName).subscribe({
      next: (v) => (this.data = v),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching longitudinal table');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchLongitudinalTables(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchLongitudinalTables().subscribe({
      next: (v) => (this.longitudinalTables = v),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching longitudinal tables');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  filterTableName(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.longitudinalTables.filter((longitudinalTable) =>
      longitudinalTable.toLowerCase().includes(filterValue)
    );
  }

  generateLineplot(): void {
    const title = `Longitudinal data for ${this.selectedVariable}`;
    this.lineplotService.createLineplot(this.data, this.colors, title, 'lineplot');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit() {
    this.fetchLongitudinalTables();
    this.fetchColors();
    this.filteredVariables = this.variableCtrl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterTableName(value || ''))
    );
  }

  removeVariable(): void {
    this.selectedVariable = '';
  }

  variableSelected(event: MatAutocompleteSelectedEvent): void {
    const longitudinal = event.option.value;
    if (longitudinal) {
      this.selectedVariable = longitudinal;
      this.variableCtrl.setValue('');
      this.fetchLongitudinalTable(this.selectedVariable);
    }
  }
}
