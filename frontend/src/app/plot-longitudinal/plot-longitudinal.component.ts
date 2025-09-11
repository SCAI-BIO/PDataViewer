import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subscription } from 'rxjs';

import { LongitudinalData } from '../interfaces/longitudinal-data';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';
import { LineplotService } from '../services/lineplot.service';

@Component({
  selector: 'app-plot-longitudinal',
  imports: [],
  templateUrl: './plot-longitudinal.component.html',
  styleUrl: './plot-longitudinal.component.scss',
})
export class PlotLongitudinalComponent implements OnInit, OnDestroy {
  cohort = '';
  variables: string[] = [];
  data: LongitudinalData[] = [];
  dataFetchCount = 0;
  loading = false;
  originalVariableNameMappings: Record<string, string> = {};
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private http = inject(HttpClient);
  private lineplotService = inject(LineplotService);
  private route = inject(ActivatedRoute);
  private subscriptions: Subscription[] = [];

  fetchLongitudinalTable(tableName: string): void {
    this.loading = true;
    const variableName = this._transformLongitudinalName(tableName);
    const sub = this.apiService
      .fetchLongitudinalTableForCohort(tableName, this.cohort)
      .subscribe({
        next: (v) =>
          v.forEach((item) => {
            this.data.push({ ...item, Cohort: variableName });
          }),
        error: (err) => {
          this.loading = false;
          this.errorHandler.handleError(err, 'fetching longitudinal data');
        },
        complete: () => {
          this.dataFetchCount--;
          if (this.dataFetchCount === 0) {
            this.generateLineplot();
          }
          this.loading = false;
        },
      });
    this.subscriptions.push(sub);
  }

  generateLineplot(): void {
    const variables = [];
    for (const variable of this.variables) {
      variables.push(this._transformLongitudinalName(variable));
    }
    const variables_string =
      variables.length > 1
        ? variables.slice(0, -1).join(', ') +
          ' and ' +
          variables[variables.length - 1]
        : variables[0] || ''; // Handle single or empty variables case

    const title = `Longitudinal follow-ups for ${variables_string} in the ${this.cohort} cohort`;
    this.lineplotService.createLineplot(this.data, {}, title, 'lineplot');
  }

  loadOriginalCaseMappings(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<Record<string, string>>('lower_to_original_case.json')
        .subscribe({
          next: (data) => {
            this.originalVariableNameMappings = data;
            resolve();
          },
          error: (e) => {
            console.error(
              'Error loading lowercase to original case mappings:',
              e
            );
            reject(e);
          },
        });
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit(): void {
    this.loadOriginalCaseMappings().then(() => {
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
    });
  }

  private _transformLongitudinalName(longitudinal: string): string {
    if (longitudinal.startsWith('longitudinal_')) {
      longitudinal = longitudinal.substring(13);
    }
    longitudinal = longitudinal.split('_').join(' ');
    const mappedValue = this.originalVariableNameMappings[longitudinal];
    return mappedValue
      ? mappedValue
      : longitudinal.charAt(0).toUpperCase() + longitudinal.slice(1);
  }
}
