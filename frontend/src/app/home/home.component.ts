import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';

import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

@Component({
  selector: 'app-home',
  imports: [MatProgressSpinnerModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  cohortNumber = 0;
  featureNumber = 0;
  loading = false;
  private apiService = inject(ApiService);
  private errorHandler = inject(ApiErrorHandlerService);
  private subscriptions: Subscription[] = [];

  fetchCohorts(): void {
    this.loading = true;
    const sub = this.apiService.fetchCohorts().subscribe({
      next: (v) => (this.cohortNumber = v.length),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching cohorts');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  fetchFeatures(): void {
    this.loading = true;
    const sub = this.apiService.fetchFeatures().subscribe({
      next: (v) => (this.featureNumber = v.Feature.length),
      error: (err) => {
        this.loading = false;
        this.errorHandler.handleError(err, 'fetching features');
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  ngOnInit(): void {
    this.fetchCohorts();
    this.fetchFeatures();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
