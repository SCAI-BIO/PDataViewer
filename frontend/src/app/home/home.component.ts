import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, MatDividerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  cohortNumber: number = 0;
  featureNumber: number = 0;
  private API_URL = environment.API_URL;
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient) {}

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
