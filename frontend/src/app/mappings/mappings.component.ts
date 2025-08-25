import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';

import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ChordData } from '../interfaces/chord';
import { ApiService } from '../services/api.service';
import { ChordDiagramService } from '../services/chord-diagram.service';

@Component({
  selector: 'app-mappings',
  imports: [CommonModule, MatProgressSpinnerModule, MatSliderModule],
  templateUrl: './mappings.component.html',
  styleUrl: './mappings.component.scss',
})
export class MappingsComponent implements OnInit, OnDestroy {
  cohorts: string[] = [];
  dataChunks: ChordData[] = [];
  loading = false;
  // Maximum amount of features to display in a single chords diagram
  maxFeatures = 50;
  // Minimum amount of features for the min variable of the slider
  minFeatures = 20;
  modality = '';
  modalities: string[] = [];
  noData = false;
  selectedModality = '';
  // Total number of features in the modality
  totalFeatures = 0;
  private apiService = inject(ApiService);
  private chordService = inject(ChordDiagramService);
  private subscriptions: Subscription[] = [];
  private sliderChange$: Subject<number> = new Subject<number>();

  fetchCohorts(): void {
    this.loading = true;
    const sub = this.apiService.fetchCohorts().subscribe({
      next: (v) => {
        this.cohorts = v;
      },
      error: (err) => {
        console.error('Error fetching cohorts', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(`An error occurred while fetching cohorts: ${errorMessage}`);
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchData(): void {
    this.loading = true;
    const request = {
      cohorts: this.cohorts,
      modality: this.modality,
    };
    const sub = this.apiService.fetchChordsData(request).subscribe({
      next: (v) => {
        // Adjust the maximum value of the slider
        if (v['nodes'].length > 100) {
          this.totalFeatures = 100;
        } else {
          // Round up totalFeatures for smooth scaling in the slider
          this.totalFeatures = Math.max(
            this.minFeatures,
            Math.ceil(v['nodes'].length / 10) * 10
          );
        }
        // Chunk the data based on the user adjusted value of the slider
        this.dataChunks = this.chordService.chunkData(v, this.maxFeatures);
        // Return no data message if all the chunks are empty
        this.noData = this.dataChunks.every(
          (chunk) => chunk.nodes.length === 0
        );
        if (!this.noData) {
          this.chordService.createChordDiagrams(this.dataChunks);
        }
      },
      error: (err) => {
        console.error('Error fetching chord data', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(`An error occurred while fetching chord data: ${errorMessage}`);
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchModalities(): void {
    this.loading = true;
    const sub = this.apiService.fetchModalities().subscribe({
      next: (v) => {
        this.modalities = v;
      },
      error: (err) => {
        console.error('Error fetching modalities', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(`An error occurred while fetching modalities: ${errorMessage}`);
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  ngOnInit(): void {
    this.fetchModalities();
    this.fetchCohorts();

    // Load cohort data and set colors
    this.chordService.loadCohortData().subscribe({
      next: (cohortData) => {
        this.chordService.setColors(cohortData);
      },
      error: (error) => {
        console.error('Error loading cohort data:', error);
      },
    });

    // Debounce slider changes
    this.subscriptions.push(
      this.sliderChange$.pipe(debounceTime(300)).subscribe((value) => {
        this.maxFeatures = value;
        if (this.modality) {
          this.fetchData();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onModalityClick(modality: string): void {
    this.selectedModality = modality;
    this.modality = modality;
    this.maxFeatures = 50;
    this.fetchData();
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    this.sliderChange$.next(value);
  }

  toTitleCase(modality: string): string {
    return modality.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
  }
}
