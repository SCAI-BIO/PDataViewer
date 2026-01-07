import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';

import { Subscription } from 'rxjs';

import { LongitudinalData } from '../interfaces/longitudinal-data';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';
import { LineplotService } from '../services/lineplot.service';

@Component({
  selector: 'app-plot-longitudinal',
  imports: [MatProgressSpinnerModule],
  templateUrl: './plot-longitudinal.component.html',
  styleUrl: './plot-longitudinal.component.scss',
})
export class PlotLongitudinalComponent implements OnInit, OnDestroy {
  cohort = '';
  variables: string[] = [];
  data: LongitudinalData[] = [];
  dataFetchCount = 0;
  isLoading = signal(false);
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private lineplotService = inject(LineplotService);
  private route = inject(ActivatedRoute);
  private subscriptions: Subscription[] = [];

  fetchLongitudinalTable(tableName: string): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchLongitudinalTableForCohort(tableName, this.cohort).subscribe({
      next: (v) =>
        v.forEach((item) => {
          this.data.push({ ...item, cohort: tableName });
        }),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching longitudinal data');
      },
      complete: () => {
        this.dataFetchCount--;
        if (this.dataFetchCount === 0) {
          this.generateLineplot();
        }
        this.isLoading.set(false);
      },
    });
    this.subscriptions.push(sub);
  }

  generateLineplot(): void {
    const variables = [];
    for (const variable of this.variables) {
      variables.push(variable);
    }
    const variables_string =
      variables.length > 1
        ? variables.slice(0, -1).join(', ') + ' and ' + variables[variables.length - 1]
        : variables[0] || ''; // Handle single or empty variables case

    const title = `Longitudinal follow-ups for ${variables_string} in the ${this.cohort} cohort`;
    this.lineplotService.createLineplot(this.data, {}, title, 'lineplot');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit(): void {
    const sub = this.route.queryParams.subscribe((params) => {
      this.cohort = params['cohort'] || '';
      this.variables = params['variables'] || [];
    });
    this.subscriptions.push(sub);

    // Ensure variables is an array
    if (!Array.isArray(this.variables)) {
      this.variables = [this.variables];
    }

    // Set the count of variables to fetch data
    this.dataFetchCount = this.variables.length;

    // Fetch data for each variable
    for (const variable of this.variables) {
      this.fetchLongitudinalTable(variable);
    }
  }
}
