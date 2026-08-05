import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import Plotly from 'plotly.js-dist-min';
import { finalize, forkJoin } from 'rxjs';

import { ApiErrorHandler } from '@core/services/api-error-handler';
import { Api } from '@core/services/api';
import { LineplotBuilder } from '@core/services/lineplot-builder';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { LongitudinalData } from '@shared/interfaces/longitudinal-data';

@Component({
  selector: 'app-longitudinal',
  imports: [
    LoadingSpinner,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './longitudinal.html',
  styleUrl: './longitudinal.scss',
})
export class Longitudinal implements OnInit {
  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorHandler = inject(ApiErrorHandler);
  private readonly lineplotBuilder = inject(LineplotBuilder);

  readonly colors = signal<Record<string, string>>({});
  readonly data = signal<LongitudinalData[]>([]);
  readonly hasVisualization = signal(false);
  readonly longitudinalTables = signal<string[]>([]);
  readonly isLoading = signal(false);
  readonly selectedVariable = signal('');

  readonly variableCtrl = new FormControl('', {
    nonNullable: true,
  });

  private readonly variableQuery = toSignal(this.variableCtrl.valueChanges, {
    initialValue: '',
  });

  readonly filteredVariables = computed(() => {
    const query = this.variableQuery().toLowerCase().trim();

    return this.longitudinalTables().filter((table) => table.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    this.fetchInitialData();
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
        next: ({ metadata, tables }) => {
          this.longitudinalTables.set(tables);

          const colors = Object.fromEntries(
            Object.entries(metadata).map(([cohort, value]) => [cohort, value.color]),
          );

          this.colors.set(colors);
        },
        error: (error) => this.errorHandler.handleError(error, 'fetching initial data'),
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
        next: (data) => {
          this.data.set(data);

          if (this.hasVisualization()) {
            this.renderLineplot();
          }
        },
        error: (error) => this.errorHandler.handleError(error, 'fetching longitudinal table'),
      });
  }

  generateLineplot(): void {
    if (this.data().length === 0) {
      return;
    }

    if (!this.hasVisualization()) {
      this.hasVisualization.set(true);

      requestAnimationFrame(() => {
        this.renderLineplot();
      });

      return;
    }

    this.renderLineplot();
  }

  onVariableSelect(event: MatAutocompleteSelectedEvent): void {
    const variable = String(event.option.value).trim();

    if (!variable) {
      return;
    }

    this.selectedVariable.set(variable);
    this.fetchLongitudinalTable(variable);
  }

  removeVariable(): void {
    this.selectedVariable.set('');
    this.variableCtrl.setValue('');
    this.data.set([]);
    this.hasVisualization.set(false);
  }

  private renderLineplot(): void {
    const data = this.data();

    if (data.length === 0) {
      return;
    }

    const title = `Longitudinal data for ${this.selectedVariable()}`;

    this.lineplotBuilder.createLineplot(data, this.colors(), title, 'lineplot');

    requestAnimationFrame(() => {
      const plotElement = document.getElementById('lineplot');

      if (plotElement) {
        Plotly.Plots.resize(plotElement);
      }
    });
  }
}
