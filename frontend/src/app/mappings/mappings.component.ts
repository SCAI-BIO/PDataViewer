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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { finalize, forkJoin } from 'rxjs';

import { ChordData } from '../interfaces/chord-diagram';
import { ApiService } from '../services/api.service';
import { ChordDiagramService } from '../services/chord-diagram.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

@Component({
  selector: 'app-mappings',
  imports: [MatProgressSpinnerModule],
  templateUrl: './mappings.component.html',
  styleUrl: './mappings.component.scss',
})
export class MappingsComponent implements OnInit {
  // Dependencies
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private chordService = inject(ChordDiagramService);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandlerService);

  // Signals
  cohorts = signal<string[]>([]);
  modalities = signal<string[]>([]);
  dataChunks = signal<ChordData[]>([]);
  selectedModality = signal<string>('');
  isLoading = signal(false);
  currentIndex = 0;

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
    this.apiService
      .fetchChordsData(modality)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (v) => {
          this.currentIndex = 0;
          const chunks = this.chordService.chunkData(v, 40);
          this.dataChunks.set(chunks);
          this.cdr.detectChanges();
          setTimeout(() => {
            this.chordService.createChordDiagrams(this.dataChunks(), this.currentIndex);
          });
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching chord data'),
      });
  }

  fetchInitialMetadata(): void {
    this.isLoading.set(true);

    forkJoin({
      modalities: this.apiService.fetchModalities(),
      cohorts: this.apiService.fetchCohorts(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
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
    if (this.currentIndex < this.dataChunks().length - 1) {
      this.currentIndex++;
      this.chordService.createChordDiagrams(this.dataChunks(), this.currentIndex);
    }
  }

  ngOnInit(): void {
    this.fetchInitialMetadata();
  }

  onModalityClick(modality: string): void {
    this.selectedModality.set(modality);
  }

  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.chordService.createChordDiagrams(this.dataChunks(), this.currentIndex);
    }
  }
}
