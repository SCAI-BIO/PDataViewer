import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Metadata } from '../interfaces/metadata';
import { BoxplotService } from '../services/boxplot.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-biomarkers',
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
  templateUrl: './biomarkers.component.html',
  styleUrls: ['./biomarkers.component.css'],
})
export class BiomarkersComponent implements OnInit, OnDestroy {
  biomarkerCtrl = new FormControl();
  biomarkerData: { [cohort: string]: number[] } = {};
  biomarkers: string[] = [];
  cohortCtrl = new FormControl();
  cohorts: string[] = [];
  colors: { [key: string]: string } = {};
  diagnoses: { [key: string]: string[] } = {};
  filteredBiomarkers: Observable<string[]> | null = null;
  filteredDiagnoses: Observable<string[]> | null = null;
  selectedBiomarker: string = '';
  selectedCohorts: string[] = [];
  private API_URL = environment.API_URL;
  @ViewChild('boxplot') private chartContainer!: ElementRef;
  private subscriptions: Subscription[] = [];

  constructor(
    private boxplotService: BoxplotService,
    private http: HttpClient
  ) {}

  addCohort(event: MatChipInputEvent): void {
    let cohort = event.value;
    const input = event.chipInput;

    cohort = (cohort || '').trim();
    if (cohort && !this.selectedCohorts.includes(cohort)) {
      this.selectedCohorts.push(cohort);
      if (input) {
        input.clear();
      }
      this.cohortCtrl.setValue(null);
    }
  }

  biomarkerSelected(event: MatAutocompleteSelectedEvent): void {
    const biomarker = event.option.value;
    if (biomarker) {
      this.selectedBiomarker = biomarker;
      this.biomarkerCtrl.setValue('');
      this.fetchCohorts();
      this.fetchDiagnoses();
    }
  }

  cohortSelected(event: MatAutocompleteSelectedEvent): void {
    const cohort = event.option.value;
    if (cohort && !this.selectedCohorts.includes(cohort)) {
      this.selectedCohorts.push(cohort);
      this.cohortCtrl.setValue('');
      this.fetchBiomarkerData(cohort);
      console.log(this.biomarkerData);
    }
  }

  displayFn(option: string): string {
    return option ? option : '';
  }

  fetchBiomarkerData(cohort_and_diagnosis: string): void {
    const biomarker = this.selectedBiomarker.toLowerCase();
    const { cohort, diagnosis } = this._splitDiagnosis(cohort_and_diagnosis);
    const sub = this.http
      .get<number[]>(
        `${this.API_URL}/biomarkers/${biomarker}/cohorts/${cohort}/diagnoses/${diagnosis}`
      )
      .subscribe({
        next: (v) => (this.biomarkerData[cohort_and_diagnosis] = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  fetchBiomarkers(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/biomarkers`)
      .subscribe({
        next: (v) =>
          (this.biomarkers = v.map((biomarker) =>
            this._transformBiomarkerName(biomarker)
          )),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  fetchCohorts(): void {
    const biomarker = this.selectedBiomarker.toLowerCase();
    const sub = this.http
      .get<string[]>(`${this.API_URL}/biomarkers/${biomarker}/cohorts`)
      .subscribe({
        next: (v) => (this.cohorts = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
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
          console.log('Fetched colors:', this.colors);
        },
        error: (e) => {
          console.error('Error fetching colors:', e);
        },
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  fetchDiagnoses(): void {
    const biomarker = this.selectedBiomarker.toLowerCase();
    const sub = this.http
      .get<{ [key: string]: string[] }>(
        `${this.API_URL}/biomarkers/${biomarker}/diagnoses`
      )
      .subscribe({
        next: (v) => (
          (this.diagnoses = v),
          (this.filteredDiagnoses = this.cohortCtrl.valueChanges.pipe(
            startWith(''),
            map((value) => this._filterDiagnoses(value || '', v))
          ))
        ),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  generateBoxplot(): void {
    this.boxplotService.createBoxplot(
      this.chartContainer,
      this.biomarkerData,
      this.colors
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit() {
    this.fetchBiomarkers();
    this.fetchColors();
    console.log(this.colors);
    this.filteredBiomarkers = this.biomarkerCtrl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterBiomarkers(value || ''))
    );
  }

  removeBiomarker(): void {
    this.selectedBiomarker = '';
  }

  removeCohort(cohort: string): void {
    const index = this.selectedCohorts.indexOf(cohort);
    if (index >= 0) {
      this.selectedCohorts.splice(index, 1);
      delete this.biomarkerData[cohort];
    }
  }

  private _filterBiomarkers(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.biomarkers.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  private _filterDiagnoses(
    value: string,
    diagnoses: { [key: string]: string[] }
  ): string[] {
    const filterValue = value.toLowerCase();
    const transformedDiagnoses = this._transformDiagnoses(diagnoses);
    return transformedDiagnoses.filter((diagnosis) =>
      diagnosis.toLowerCase().includes(filterValue)
    );
  }

  private _transformBiomarkerName(biomarker: string): string {
    if (biomarker.startsWith('biomarkers_')) {
      biomarker = biomarker.substring(11);
    }
    return biomarker.charAt(0).toUpperCase() + biomarker.slice(1);
  }

  private _transformDiagnoses(diagnoses: {
    [key: string]: string[];
  }): string[] {
    const transformedDiagnoses = Object.entries(diagnoses).flatMap(
      ([cohort, diagnoses]) =>
        diagnoses.map((diagnosis) => `${cohort} (${diagnosis} Group)`)
    );
    return transformedDiagnoses;
  }

  private _splitDiagnosis(cohort_and_diagnosis: string): {
    cohort: string;
    diagnosis: string;
  } {
    const parts = cohort_and_diagnosis.split('(');
    const cohortPart = parts[0].trim();
    const diagnosisPart = parts[1].replace('Group', '').replace(')', '').trim();

    return {
      cohort: cohortPart,
      diagnosis: diagnosisPart,
    };
  }
}
