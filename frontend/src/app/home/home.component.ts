import { DecimalPipe } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
  modalityCount = 0;
  isLoading = signal(false);
  participantCount = 0;
  variableCount = 0;
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private subscriptions: Subscription[] = [];

  fetchCohortCount(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchCohorts().subscribe({
      next: (v) => (this.cohortCount = v.length),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching cohorts');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchVariableCount(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchVariables().subscribe({
      next: (v) => (this.variableCount = v.length),
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching variables');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchModalityCount(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchModalities().subscribe({
      next: (v) => {
        this.modalityCount = v.length;
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching modalities');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  fetchParticipantCount(): void {
    this.isLoading.set(true);
    const sub = this.apiService.fetchMetadata().subscribe({
      next: (data) => {
        // sum up all participants
        this.participantCount = Object.values(data).reduce(
          (sum, cohort) => sum + (cohort.participants || 0),
          0
        );
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorHandler.handleError(err, 'fetching metadata');
      },
      complete: () => this.isLoading.set(false),
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit(): void {
    this.fetchCohortCount();
    this.fetchVariableCount();
    this.fetchModalityCount();
    this.fetchParticipantCount();
  }
}
