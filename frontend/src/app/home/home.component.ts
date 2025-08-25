import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';

import { ApiService } from '../services/api.service';

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
  private subscriptions: Subscription[] = [];

  fetchCohorts(): void {
    this.loading = true;
    const sub = this.apiService.fetchCohorts().subscribe({
      next: (v) => (this.cohortNumber = v.length),
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

  fetchFeatures(): void {
    this.loading = true;
    const sub = this.apiService.fetchFeatures().subscribe({
      next: (v) => (this.featureNumber = v.Feature.length),
      error: (err) => {
        console.error('Error fetching features', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(`An error occurred while fetching features: ${errorMessage}`);
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
