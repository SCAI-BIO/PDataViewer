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

import { LongitudinalData } from '../interfaces/longitudinal-data';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';
import { LineplotService } from '../services/lineplot.service';

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
  templateUrl: './longitudinal.component.html',
  styleUrl: './longitudinal.component.scss',
})
export class LongitudinalComponent implements OnInit {
  // Dependencies
  private apiService = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandlerService);
  private lineplotService = inject(LineplotService);

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
      metadata: this.apiService.fetchMetadata(),
      tables: this.apiService.fetchLongitudinalTables(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
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
    this.apiService
      .fetchLongitudinalTable(tableName)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (v) => this.data.set(v),
        error: (err) => this.errorHandler.handleError(err, 'fetching longitudinal table'),
      });
  }

  generateLineplot(): void {
    if (this.data().length === 0) return;

    const title = `Longitudinal data for ${this.selectedVariable()}`;
    this.lineplotService.createLineplot(this.data(), this.colors(), title, 'lineplot');
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
