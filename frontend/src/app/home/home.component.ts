import { DecimalPipe } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';

import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

@Component({
  selector: 'app-home',
  imports: [DecimalPipe, MatProgressSpinnerModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  cohortCount = 0;
  featureCount = 0;
  loading = false;
  modalityCount = 0;
  participantCount = 0;
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private subscriptions: Subscription[] = [];

  fetchCohortCount(): void {
    this.loading = true;
    const sub = this.apiService.fetchCohorts().subscribe({
      next: (v) => (this.cohortCount = v.length),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching cohorts');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchFeatureCount(): void {
    this.loading = true;
    const sub = this.apiService.fetchFeatures().subscribe({
      next: (v) => (this.featureCount = v.Feature.length),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching features');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchModalityCount(): void {
    this.loading = true;
    const sub = this.apiService.fetchModalities().subscribe({
      next: (v) => {
        this.modalityCount = v.length;
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching modalities');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchParticipantCount(): void {
    this.loading = true;
    const sub = this.apiService.fetchMetadata().subscribe({
      next: (data) => {
        // sum up all participants
        this.participantCount = Object.values(data).reduce(
          (sum, cohort) => sum + (cohort.participants || 0),
          0
        );
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching metadata');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit(): void {
    this.fetchCohortCount();
    this.fetchFeatureCount();
    this.fetchModalityCount();
    this.fetchParticipantCount();
  }
}
