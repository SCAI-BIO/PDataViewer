import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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

import { finalize, forkJoin } from 'rxjs';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import { LineplotBuilder } from '@core/services/lineplot-builder';
import type { LongitudinalData } from '@shared/interfaces/longitudinal-data';

@Component({
  selector: 'app-longitudinal',
  imports: [
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './longitudinal.html',
  styleUrl: './longitudinal.scss',
})
export class Longitudinal implements OnInit {
  // Dependencies
  private api = inject(Api);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandler);
  private lineplotBuilder = inject(LineplotBuilder);

  // Signals
  colors = signal<Record<string, string>>({});
  data = signal<LongitudinalData[]>([]);
  longitudinalTables = signal<string[]>([]);
  isLoading = signal(false);
  selectedVariable = signal('');

  // Form Control
  variableCtrl = new FormControl('');

  // Derived Signals
  filteredVariables = computed(() => {
    const rawQuery = this.variableQuery();
    const query = (rawQuery || '').toLowerCase();
    const tables = this.longitudinalTables();
    return tables.filter((t) => t.toLowerCase().includes(query));
  });
  private variableQuery = toSignal(this.variableCtrl.valueChanges, { initialValue: '' });

  displayFn(option: string): string {
    return option ? option : '';
  }

  fetchInitialData(): void {
    this.isLoading.set(true);

    forkJoin({
      metadata: this.api.fetchMetadata(),
      tables: this.api.fetchLongitudinalTables(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => {
          this.longitudinalTables.set(results.tables);
          const colors: Record<string, string> = {};
          const metadata = results.metadata;
          for (const key in metadata) {
            if (Object.prototype.hasOwnProperty.call(metadata, key)) {
              colors[key] = metadata[key].color;
            }
          }
          this.colors.set(colors);
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching initial data'),
      });
  }

  fetchLongitudinalTable(tableName: string): void {
    this.isLoading.set(true);
    this.api
      .fetchLongitudinalTable(tableName)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (v) => this.data.set(v),
        error: (err) => this.errorHandler.handleError(err, 'fetching longitudinal table'),
      });
  }

  generateLineplot(): void {
    if (this.data().length === 0) return;

    const title = `Longitudinal data for ${this.selectedVariable()}`;
    this.lineplotBuilder.createLineplot(this.data(), this.colors(), title, 'lineplot');
  }

  ngOnInit() {
    this.fetchInitialData();
  }

  onVariableSelect(event: MatAutocompleteSelectedEvent): void {
    const variable = event.option.value;
    if (variable) {
      this.selectedVariable.set(variable);
      this.fetchLongitudinalTable(variable);
    }
  }

  removeVariable(): void {
    this.selectedVariable.set('');
    this.data.set([]);
  }
}
