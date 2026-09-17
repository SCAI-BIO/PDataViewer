import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import Plotly from 'plotly.js-dist-min';
import { forkJoin } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import { LineplotBuilder } from '@core/services/lineplot-builder';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { LongitudinalData } from '@shared/interfaces/longitudinal-data';

@Component({
  selector: 'app-plot-longitudinal',
  imports: [LoadingSpinner],
  templateUrl: './plot-longitudinal.html',
  styleUrl: './plot-longitudinal.scss',
})
export class PlotLongitudinal implements OnInit {
  // Dependencies
  private api = inject(Api);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandler);
  private lineplotBuilder = inject(LineplotBuilder);
  private route = inject(ActivatedRoute);

  // Signals
  cohort = signal('');
  data = signal<LongitudinalData[]>([]);
  isLoading = signal(false);
  variables = signal<string[]>([]);

  fetchAndVisualize(variables: string[], cohort: string): void {
    this.isLoading.set(true);

    const requests = variables.map((variableName) =>
      this.api.fetchLongitudinalTableForCohort(variableName, cohort).pipe(
        map((items) =>
          items.map((item) => ({
            ...item,
            cohort: variableName,
          })),
        ),
      ),
    );
    forkJoin(requests)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => {
          this.data.set(results.flat());
          void this.generateLineplot();
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching longitudinal data'),
      });
  }

  fetchQueryParams(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const cohortParam = params['cohort'] || '';
      let varsParam = params['variables'] || [];

      if (!Array.isArray(varsParam)) {
        varsParam = [varsParam];
      }

      this.cohort.set(cohortParam);
      this.variables.set(varsParam);

      if (varsParam.length > 0) {
        this.fetchAndVisualize(varsParam, cohortParam);
      }
    });
  }

  async generateLineplot(): Promise<void> {
    if (this.destroyRef.destroyed || this.data().length === 0) return;
    const vars = this.variables();
    const varsString =
      vars.length > 1
        ? vars.slice(0, -1).join(', ') + ' and ' + vars[vars.length - 1]
        : vars[0] || '';

    const title = `Longitudinal follow-ups for ${varsString} in the ${this.cohort()} cohort`;

    try {
      await this.lineplotBuilder.createLineplot(this.data(), {}, title, 'lineplot');

      requestAnimationFrame(() => {
        if (this.destroyRef.destroyed) return;
        const plotElement = document.getElementById('lineplot');
        if (!plotElement) return;

        try {
          Plotly.Plots.resize(plotElement);
        } catch (error: unknown) {
          console.error('Failed to resize longitudinal data.', error);
        }
      });
    } catch (error: unknown) {
      if (!this.destroyRef.destroyed) {
        console.error('Failed to render longitudinal plot.', error);
      }
    }
  }

  ngOnInit(): void {
    this.fetchQueryParams();
  }
}
