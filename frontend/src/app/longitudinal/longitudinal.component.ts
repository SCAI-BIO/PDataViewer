import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
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

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { LongitudinalUtilsService } from './longitudinal-utils.service';
import { LongitudinalData } from '../interfaces/longitudinal-data';
import { ApiService } from '../services/api.service';
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
  featureCtrl = new FormControl();
  filteredFeatures: Observable<string[]> | null = null;
  loading = false;
  longitudinalTables: string[] = [];
  originalVariableNameMappings: Record<string, string> = {};
  selectedFeature = '';
  @ViewChild('lineplot') private chartContainer!: ElementRef;
  private apiService = inject(ApiService);
  private http = inject(HttpClient);
  private lineplotService = inject(LineplotService);
  private longitudinalUtilsService = inject(LongitudinalUtilsService);
  private subscriptions: Subscription[] = [];

  displayFn(option: string): string {
    return option ? option : '';
  }

  featureSelected(event: MatAutocompleteSelectedEvent): void {
    const longitudinal = event.option.value;
    if (longitudinal) {
      this.selectedFeature = longitudinal;
      this.featureCtrl.setValue('');
      this.fetchLongitudinalTable(
        this.longitudinalUtilsService.transformFeatureName(longitudinal)
      );
    }
  }

  fetchColors(): void {
    this.loading = true;
    const sub = this.apiService
      .fetchMetadata()
      .pipe(
        map((metadata) => {
          const colors: Record<string, string> = {};
          for (const key in metadata) {
            if (Object.hasOwn(metadata, key)) {
              colors[key] = metadata[key].Color;
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
          console.error('Error fetching colors', err);
          this.loading = false;
          const detail = err.error?.detail;
          const message = err.error?.message || err.message;

          let errorMessage = 'An unknown error occurred.';
          if (detail && message) {
            errorMessage = `${message} — ${detail}`;
          } else if (detail || message) {
            errorMessage = detail || message;
          }

          alert(`An error occurred while fetching colors: ${errorMessage}`);
        },
        complete: () => (this.loading = false),
      });
    this.subscriptions.push(sub);
  }

  fetchLongitudinalTable(tableName: string): void {
    this.loading = true;
    const sub = this.apiService.fetchLongitudinalTable(tableName).subscribe({
      next: (v) => (this.data = v),
      error: (err) => {
        console.error('Error fetching logitudinal table', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(
          `An error occurred while fetching longitudinal table: ${errorMessage}`
        );
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchLongitudinalTables(): void {
    this.loading = true;
    const sub = this.apiService.fetchLongitudinalTables().subscribe({
      next: (v) =>
        (this.longitudinalTables = v.map((longitudinal) =>
          this.longitudinalUtilsService.transformLongitudinalName(
            this.originalVariableNameMappings,
            longitudinal
          )
        )),
      error: (err) => {
        console.error('Error fetching longitudinal tables', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(
          `An error occurred while fetching longitudinal tables: ${errorMessage}`
        );
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  generateLineplot(): void {
    const title = `Longitudinal data for ${this.selectedFeature}`;
    this.lineplotService.createLineplot(
      this.chartContainer,
      this.data,
      this.colors,
      title
    );
  }

  loadOriginalCaseMappings(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<Record<string, string>>('/lower_to_original_case.json')
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

  ngOnInit() {
    this.loadOriginalCaseMappings().then(() => {
      this.fetchLongitudinalTables();
      this.fetchColors();
      this.filteredFeatures = this.featureCtrl.valueChanges.pipe(
        startWith(''),
        map((value) =>
          this.longitudinalUtilsService.filterTableName(
            this.longitudinalTables,
            value || ''
          )
        )
      );
    });
  }

  removeFeature(): void {
    this.selectedFeature = '';
  }
}
