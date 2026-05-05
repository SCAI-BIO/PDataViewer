import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';

import { finalize, map } from 'rxjs';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import type { CohortData } from '@shared/interfaces/metadata';

@Component({
  selector: 'app-cohorts',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
  ],
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

  // Use a setter to assign sort whenever the directive becomes available
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

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
