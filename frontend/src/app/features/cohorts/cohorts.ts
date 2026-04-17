import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, MatSort } from '@angular/material/sort';

import { finalize, map } from 'rxjs';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import type { CohortData } from '@shared/interfaces/metadata';

@Component({
  selector: 'app-cohorts',
  imports: [MatProgressSpinnerModule, MatSortModule, MatTableModule],
  templateUrl: './cohorts.html',
  styleUrl: './cohorts.scss',
})
export class Cohorts implements OnInit {
  // Dependencies
  private api = inject(Api);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandler);

  // Signals
  metadata = signal<CohortData[]>([]);
  isLoading = signal(false);

  // Table Elements
  dataSource = new MatTableDataSource<CohortData>();
  @ViewChild(MatSort) sort!: MatSort;

  // Constants
  readonly displayedColumns: string[] = [
    'cohort',
    'participants',
    'controlParticipants',
    'prodromalParticipants',
    'pdParticipants',
    'longitudinalParticipants',
    'followUpInterval',
    'location',
    'doi',
    'link',
  ];

  fetchMetadata(): void {
    this.isLoading.set(true);
    this.api
      .fetchMetadata()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        map((data) =>
          Object.keys(data).map((key) => ({
            cohort: key,
            ...data[key],
          })),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (v) => {
          this.metadata.set(v);
          this.dataSource.data = v;
          if (this.sort) this.dataSource.sort = this.sort;
        },
        error: (err) => this.errorHandler.handleError(err, 'fetching initial data'),
      });
  }

  openLink(link: string) {
    if (link) window.open(link, '_blank');
  }

  ngOnInit() {
    this.fetchMetadata();
  }
}
