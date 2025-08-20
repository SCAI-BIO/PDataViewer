import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';
@Component({
  selector: 'app-home',
  imports: [RouterModule, MatDividerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  cohortNumber = 0;
  featureNumber = 0;
  private API_URL = environment.API_URL;
  private http = inject(HttpClient);
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.fetchCohorts();
    this.fetchFeatures();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private fetchCohorts(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/cdm/cohorts`)
      .subscribe({
        next: (v) => (this.cohortNumber = v.length),
        error: (e) => console.error(e),
        complete: () => console.info('Cohorts successfully fetched'),
      });
    this.subscriptions.push(sub);
  }

  private fetchFeatures(): void {
    const sub = this.http
      .get<{ Feature: string[] }>(`${this.API_URL}/cdm/features`)
      .subscribe({
        next: (v) => (this.featureNumber = v.Feature.length),
        error: (e) => console.error(e),
        complete: () => console.info('Features successfully fetched'),
      });
    this.subscriptions.push(sub);
  }
}
