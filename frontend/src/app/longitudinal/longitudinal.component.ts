import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
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

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Metadata } from '../interfaces/metadata';
import { LongitudinalData } from '../interfaces/longitudinal-data';
import { LineplotService } from '../services/lineplot.service';

@Component({
  selector: 'app-longitudinal',
  standalone: true,
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './longitudinal.component.html',
  styleUrl: './longitudinal.component.css',
})
export class LongitudinalComponent implements OnInit, OnDestroy {
  colors: { [key: string]: string } = {};
  data: LongitudinalData[] = [];
  featureCtrl = new FormControl();
  filteredFeatures: Observable<string[]> | null = null;
  longitudinalTables: string[] = [];
  selectedFeature: string = '';
  private API_URL = environment.API_URL;
  @ViewChild('lineplot') private chartContainer!: ElementRef;
  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private lineplotService: LineplotService
  ) {}

  displayFn(option: string): string {
    return option ? option : '';
  }

  featureSelected(event: MatAutocompleteSelectedEvent): void {
    const longitudinal = event.option.value;
    if (longitudinal) {
      this.selectedFeature = longitudinal;
      this.featureCtrl.setValue('');
      this.fetchLongitudinalTable(this._transformFeatureName(longitudinal));
    }
  }

  fetchColors(): void {
    const sub = this.http
      .get<Metadata>(`${this.API_URL}/cohorts/metadata`)
      .pipe(
        map((metadata) => {
          const colors: { [key: string]: string } = {};
          for (const key in metadata) {
            if (metadata.hasOwnProperty(key)) {
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
        error: (e) => {
          console.error('Error fetching colors:', e);
        },
        complete: () => console.info('Colors successfully fetched'),
      });
    this.subscriptions.push(sub);
  }

  fetchLongitudinalTable(table_name: string): void {
    const sub = this.http
      .get<LongitudinalData[]>(`${this.API_URL}/longitudinal/${table_name}`)
      .subscribe({
        next: (v) => (this.data = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  fetchLongitudinalTables(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/longitudinal`)
      .subscribe({
        next: (v) =>
          (this.longitudinalTables = v.map((longitudinal) =>
            this._transformLongitudinalName(longitudinal)
          )),
        error: (e) => console.error(e),
        complete: () =>
          console.info('Longitudinal data tables successfully fetched'),
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

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit() {
    this.fetchLongitudinalTables();
    this.fetchColors();
    this.filteredFeatures = this.featureCtrl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterTableName(value || ''))
    );
  }

  removeFeature(): void {
    this.selectedFeature = '';
  }

  private _filterTableName(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.longitudinalTables.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  private _transformFeatureName(feature: string): string {
    feature = feature.toLowerCase();
    return feature.split(' ').join('_');
  }

  private _transformLongitudinalName(longitudinal: string): string {
    if (longitudinal.startsWith('longitudinal_')) {
      longitudinal = longitudinal.substring(13);
    }
    longitudinal = longitudinal.split('_').join(' ');
    return longitudinal.charAt(0).toUpperCase() + longitudinal.slice(1);
  }
}
