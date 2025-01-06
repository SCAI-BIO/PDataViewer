import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { LongitudinalData } from '../interfaces/longitudinal-data';
import { LineplotService } from '../services/lineplot.service';

@Component({
    selector: 'app-plot-longitudinal',
    imports: [],
    templateUrl: './plot-longitudinal.component.html',
    styleUrl: './plot-longitudinal.component.css'
})
export class PlotLongitudinalComponent implements OnInit, OnDestroy {
  cohort: string = '';
  variables: string[] = [];
  data: LongitudinalData[] = [];
  originalVariableNameMappings: { [key: string]: string } = {};
  private API_URL = environment.API_URL;
  @ViewChild('lineplot') private chartContainer!: ElementRef;
  private subscriptions: Subscription[] = [];
  private dataFetchCount = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private lineplotService: LineplotService
  ) {}

  fetchLongitudinalTable(table_name: string): void {
    const feature_name = this._transformLongitudinalName(table_name);
    const sub = this.http
      .get<LongitudinalData[]>(
        `${this.API_URL}/longitudinal/${table_name}/${this.cohort}`
      )
      .subscribe({
        next: (v) =>
          v.forEach((item) => {
            this.data.push({ ...item, Cohort: feature_name });
          }),
        error: (e) => console.error(e),
        complete: () => {
          this.dataFetchCount--;
          if (this.dataFetchCount === 0) {
            this.generateLineplot();
          }
        },
      });
    this.subscriptions.push(sub);
  }

  generateLineplot(): void {
    const variables = [];
    for (const variable of this.variables) {
      variables.push(this._transformLongitudinalName(variable));
    }
    const features_string =
      variables.length > 1
        ? variables.slice(0, -1).join(', ') +
          ' and ' +
          variables[variables.length - 1]
        : variables[0] || ''; // Handle single or empty features case

    const title = `Longitudinal follow-ups for ${features_string} in the ${this.cohort} cohort`;
    this.lineplotService.createLineplot(
      this.chartContainer,
      this.data,
      {},
      title
    );
  }

  loadOriginalCaseMappings(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ [key: string]: string }>('./assets/lower_to_original_case.json')
        .subscribe({
          next: (data) => {
            this.originalVariableNameMappings = data;
            console.info(
              'Lowercase to original case mappings successfully loaded'
            );
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
        this.variables = params['features'] || [];
      });
      this.subscriptions.push(sub);

      // Ensure features is an array
      if (!Array.isArray(this.variables)) {
        this.variables = [this.variables];
      }

      // Set the count of features to fetch data
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
