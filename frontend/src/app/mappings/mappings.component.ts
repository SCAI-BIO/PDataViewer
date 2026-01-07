import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Subscription } from 'rxjs';

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
export class MappingsComponent implements OnInit, OnDestroy {
  cohorts: string[] = [];
  currentIndex = 0;
  dataChunks: ChordData[] = [];
  modalities: string[] = [];
  isLoading = signal(false);
  selectedModality = '';
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private chordService = inject(ChordDiagramService);
  private errorHandler = inject(ApiErrorHandlerService);
  private subscriptions: Subscription[] = [];

  fetchCohorts(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchCohorts().subscribe({
      next: (v) => {
        this.cohorts = v;
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching cohorts');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchData(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchChordsData(this.selectedModality).subscribe({
      next: (v) => {
        this.currentIndex = 0;
        this.dataChunks = this.chordService.chunkData(v, 40);

        this.cdr.detectChanges();
        setTimeout(() => {
          this.chordService.createChordDiagrams(this.dataChunks, this.currentIndex);
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching chord data');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchModalities(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchModalities().subscribe({
      next: (v) => {
        this.modalities = v;
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching modalities');
      },
      complete: () => this.isLoading.set(false),
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

  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.chordService.createChordDiagrams(this.dataChunks, this.currentIndex);
    }
  }
}
