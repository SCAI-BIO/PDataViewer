import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { finalize, forkJoin } from 'rxjs';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import type { CohortMetadata } from '@shared/interfaces/metadata';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  // Dependencies
  private apiService = inject(Api);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandler);

  // Signals
  cohortCount = signal<number | null>(null);
  modalityCount = signal<number | null>(null);
  isLoading = signal(false);
  participantCount = signal<number | null>(null);
  variableCount = signal<number | null>(null);

  fetchAllData(): void {
    this.isLoading.set(true);

    const requests = {
      cohorts: this.apiService.fetchCohorts(),
      variables: this.apiService.fetchVariables(),
      modalities: this.apiService.fetchModalities(),
      metadata: this.apiService.fetchMetadata(),
    };

    forkJoin(requests)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.cohortCount.set(res.cohorts.length);
          this.variableCount.set(res.variables.length);
          this.modalityCount.set(res.modalities.length);

          const totalParticipants = Object.values(res.metadata).reduce(
            (sum: number, cohort: CohortMetadata) => sum + (cohort.participants || 0),
            0,
          );
          this.participantCount.set(totalParticipants);
        },
        error: (err) => this.errorHandler.handleError(err, 'loading dashboard data'),
      });
  }

  ngOnInit(): void {
    this.fetchAllData();
  }
}
