import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { finalize, forkJoin } from 'rxjs';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { ChordData } from '@shared/interfaces/chord-diagram';
import { ChordBuilder } from './services/chord-builder';

@Component({
  selector: 'app-mappings',
  imports: [LoadingSpinner, MatButtonModule, MatIconModule],
  templateUrl: './mappings.html',
  styleUrl: './mappings.scss',
})
export class Mappings implements OnInit {
  // Dependencies
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private chordBuilder = inject(ChordBuilder);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandler);

  // Signals
  cohorts = signal<string[]>([]);
  currentIndex = signal(0);
  modalities = signal<string[]>([]);
  dataChunks = signal<ChordData[]>([]);
  selectedModality = signal<string>('');
  isLoading = signal(false);

  constructor() {
    effect(() => {
      const modality = this.selectedModality();
      if (modality) {
        this.fetchChordData(modality);
      }
    });
  }

  fetchChordData(modality: string): void {
    this.isLoading.set(true);
    this.api
      .fetchChordsData(modality)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (v) => {
          this.currentIndex.set(0);
          const chunks = this.chordBuilder.chunkData(v, 40);
          this.dataChunks.set(chunks);
          this.cdr.detectChanges();
          setTimeout(() => {
            this.chordBuilder.createChordDiagrams(this.dataChunks(), this.currentIndex());
          });
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching chord data'),
      });
  }

  fetchInitialMetadata(): void {
    this.isLoading.set(true);

    forkJoin({
      modalities: this.api.fetchModalities(),
      cohorts: this.api.fetchCohorts(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => {
          this.modalities.set(results.modalities);
          this.cohorts.set(results.cohorts);
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching metadata'),
      });
  }

  next(): void {
    if (this.currentIndex() < this.dataChunks().length - 1) {
      this.currentIndex.update((index) => index + 1);
      this.chordBuilder.createChordDiagrams(this.dataChunks(), this.currentIndex());
    }
  }

  ngOnInit(): void {
    this.fetchInitialMetadata();
  }

  onModalityClick(modality: string): void {
    this.selectedModality.set(modality);
  }

  previous(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((index) => index - 1);
      this.chordBuilder.createChordDiagrams(this.dataChunks(), this.currentIndex());
    }
  }
}
