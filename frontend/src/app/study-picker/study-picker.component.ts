import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-study-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatChipsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.css',
})
export class StudyPickerComponent implements OnInit, OnDestroy {
  cohortColors: any = {};
  cohortLinks: any = {};
  cohortRankings: any = [];
  displayedColumns: string[] = ['cohort', 'found', 'missing', 'dataAccess'];
  featureCtrl = new FormControl();
  features: string[] = [];
  filteredFeatures: Observable<string[]> | null = null;
  @Input() selectedFeatures: string[] = [];
  suggestions$: Observable<string[]> | null = null;
  private API_URL = environment.API_URL;
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient) {}

  addFeature(event: MatChipInputEvent): void {
    let feature = event.value;
    const input = event.chipInput;

    feature = (feature || '').trim();
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      if (input) {
        input.clear();
      }
      this.featureCtrl.setValue(null);
    }
  }

  displayFn(feature: string): string {
    return feature ? feature : '';
  }

  fetchColors(): void {
    const sub = this.http
      .get<any>('/assets/colors.json')
      .subscribe((colors) => {
        this.cohortColors = colors;
      });
    this.subscriptions.push(sub);
  }

  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(`${this.API_URL}/cdm/features`);
  }

  fetchLinks(): void {
    const sub = this.http
      .get<any>('assets/application-links.json')
      .subscribe((links) => {
        this.cohortLinks = links;
      });
    this.subscriptions.push(sub);
  }

  getRankings(features: string[]) {
    const sub = this.http
      .post<any[]>(`${this.API_URL}/studypicker/rank`, features)
      .subscribe({
        next: (v) => (this.cohortRankings = v),
        error: (e) => console.error(e),
        complete: () => console.info('complete'),
      });
    this.subscriptions.push(sub);
  }

  ngOnInit() {
    const sub = this.fetchFeatures().subscribe((features) => {
      this.features = features.Feature;
      this.filteredFeatures = this.featureCtrl.valueChanges.pipe(
        startWith(''),
        map((value) => this._filter(value))
      );
    });
    this.subscriptions.push(sub);
    this.fetchColors();
    this.fetchLinks();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  openLink(url: string): void {
    window.open(url, '_blank');
  }

  optionSelected(event: MatAutocompleteSelectedEvent): void {
    const feature = event.option.value;
    if (feature && !this.selectedFeatures.includes(feature)) {
      this.selectedFeatures.push(feature);
      this.featureCtrl.setValue('');
    }
  }

  removeFeature(feature: string): void {
    const index = this.selectedFeatures.indexOf(feature);
    if (index >= 0) {
      this.selectedFeatures.splice(index, 1);
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.features.filter((feature) =>
      feature.toLowerCase().includes(filterValue)
    );
  }
}
