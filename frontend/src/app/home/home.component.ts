import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  cohortNumber: number = 0;
  private API_URL = environment.API_URL;
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchCohorts();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private fetchCohorts(): void {
    const sub = this.http.get<any[]>(`${this.API_URL}/cdm/cohorts`).subscribe({
      next: (v) => (this.cohortNumber = v.length),
      error: (e) => console.error(e),
      complete: () => console.info('complete'),
    });
    this.subscriptions.push(sub);
  }
}
