import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';

import { Subscription } from 'rxjs';

import { CohortMetadata } from '../interfaces/metadata';
import { ApiService } from '../services/api.service';

interface CohortData extends CohortMetadata {
  cohort: string;
}
@Component({
  selector: 'app-cohorts',
  imports: [MatProgressSpinnerModule, MatSortModule, MatTableModule],
  templateUrl: './cohorts.component.html',
  styleUrl: './cohorts.component.scss',
})
export class CohortsComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
    'cohort',
    'participants',
    'healthyControls',
    'prodromalPatients',
    'pdPatients',
    'longitudinalPatients',
    'followUpInterval',
    'location',
    'doi',
    'link',
  ];
  dataSource = new MatTableDataSource<CohortData>();
  loading = false;
  @ViewChild(MatSort) sort!: MatSort;
  private apiService = inject(ApiService);
  private subscriptions: Subscription[] = [];

  fetchMetadata(): void {
    this.loading = true;
    const sub = this.apiService.fetchMetadata().subscribe({
      next: (data) => {
        const transformedData = Object.keys(data).map((key) => ({
          cohort: key,
          ...data[key],
        }));
        this.dataSource.data = transformedData;
        this.dataSource.sort = this.sort;

        const initialSortState: Sort = { active: 'cohort', direction: 'asc' };
        this.sort.active = initialSortState.active;
        this.sort.direction = initialSortState.direction;
        this.sort.sortChange.emit(initialSortState);
      },
      error: (err) => {
        console.error('Error fetching colors', err);
        this.loading = false;
        const detail = err.error?.detail;
        const message = err.error?.message || err.message;

        let errorMessage = 'An unknown error occurred.';
        if (detail && message) {
          errorMessage = `${message} — ${detail}`;
        } else if (detail || message) {
          errorMessage = detail || message;
        }

        alert(`An error occurred while fetching colors: ${errorMessage}`);
      },
      complete: () => (this.loading = false),
    });
    this.subscriptions.push(sub);
  }

  openLink(link: string) {
    window.open(link, '_blank');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit() {
    this.fetchMetadata();
  }
}
