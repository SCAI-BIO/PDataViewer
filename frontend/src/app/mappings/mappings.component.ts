import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';

import { Subscription, Subject } from 'rxjs';

import { ChordData } from '../interfaces/chord-diagram';
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
  currentIndex = 0;
  dataChunks: ChordData[] = [];
  loading = false;
  modalities: string[] = [];
  noData = false;
  selectedModality = '';
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
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
      modality: this.selectedModality,
    };
    const sub = this.apiService.fetchChordsData(request).subscribe({
      next: (v) => {
        this.currentIndex = 0;
        this.dataChunks = this.chordService.chunkData(v, 40);

        this.cdr.detectChanges();
        setTimeout(() => {
          this.chordService.createChordDiagrams(
            this.dataChunks,
            this.currentIndex
          );
        });
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

  next(): void {
    if (this.currentIndex < this.dataChunks.length - 1) {
      this.currentIndex++;
      this.chordService.createChordDiagrams(this.dataChunks, this.currentIndex);
    }
  }

  ngOnInit(): void {
    this.fetchModalities();
    this.fetchCohorts();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onModalityClick(modality: string): void {
    this.selectedModality = modality;
    this.fetchData();
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    this.sliderChange$.next(value);
  }

  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.chordService.createChordDiagrams(this.dataChunks, this.currentIndex);
    }
  }

  toTitleCase(modality: string): string {
    return modality.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
  }
}
