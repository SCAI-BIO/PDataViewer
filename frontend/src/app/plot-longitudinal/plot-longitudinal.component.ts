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
  standalone: true,
  imports: [],
  templateUrl: './plot-longitudinal.component.html',
  styleUrl: './plot-longitudinal.component.css',
})
export class PlotLongitudinalComponent implements OnInit, OnDestroy {
  cohort: string = '';
  features: string[] = [];
  data: LongitudinalData[] = [];
  originalData: LongitudinalData[] = [];
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
    const features = [];
    for (const feature of this.features) {
      features.push(this._transformLongitudinalName(feature));
    }
    const features_string = features.map((item) => `${item}`).join(', ');
    const title = `Longitudinal follow-ups for ${features_string} in the ${this.cohort} cohort`;
    this.lineplotService.createLineplot(
      this.chartContainer,
      this.data,
      {},
      title
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit(): void {
    const sub = this.route.queryParams.subscribe((params) => {
      this.cohort = params['cohort'] || '';
      this.features = params['features'] || [];
    });
    this.subscriptions.push(sub);

    // Ensure features is an array
    if (!Array.isArray(this.features)) {
      this.features = [this.features];
    }

    // Set the count of features to fetch data
    this.dataFetchCount = this.features.length;

    for (const feature of this.features) {
      this.fetchLongitudinalTable(feature);
    }
  }

  private _transformLongitudinalName(longitudinal: string): string {
    if (longitudinal.startsWith('longitudinal_')) {
      longitudinal = longitudinal.substring(13);
    }
    longitudinal = longitudinal.split('_').join(' ');
    return longitudinal.charAt(0).toUpperCase() + longitudinal.slice(1);
  }
}
