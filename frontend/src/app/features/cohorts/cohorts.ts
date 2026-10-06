import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { finalize, map } from 'rxjs';

import { Api } from '@core/services/api';
import { ApiErrorHandler } from '@core/services/api-error-handler';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import type { CohortData } from '@shared/interfaces/metadata';
import {
  COHORT_SORT_OPTIONS,
  sortCohorts,
  type CohortSortColumn,
  type CohortSortDirection,
} from '@shared/utils/cohort-sort';

@Component({
  selector: 'app-cohorts',
  imports: [
    DecimalPipe,
    LoadingSpinner,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './cohorts.html',
  styleUrl: './cohorts.scss',
})
export class Cohorts implements OnInit {
  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorHandler = inject(ApiErrorHandler);

  readonly metadata = signal<CohortData[]>([]);
  readonly isLoading = signal(false);
  readonly showMobileTable = signal(false);
  readonly sortColumn = signal<CohortSortColumn>('cohort');
  readonly sortDirection = signal<CohortSortDirection>('asc');
  readonly sortOptions = COHORT_SORT_OPTIONS;
  readonly sortedCohorts = computed(() =>
    sortCohorts(this.metadata(), this.sortColumn(), this.sortDirection()),
  );

  readonly displayedColumns = [
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

  ngOnInit(): void {
    this.fetchMetadata();
  }

  fetchMetadata(): void {
    this.isLoading.set(true);
    this.api
      .fetchMetadata()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        map((data) => Object.entries(data).map(([cohort, values]) => ({ cohort, ...values }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => this.metadata.set(rows),
        error: (error) => this.errorHandler.handleError(error, 'fetching cohort metadata'),
      });
  }

  setSortColumn(value: CohortSortColumn): void {
    this.sortColumn.set(value);
  }

  toggleSortDirection(): void {
    this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
  }

  onSortChange(sort: Sort): void {
    const option = this.sortOptions.find((item) => item.value === sort.active);
    if (!option || !sort.direction) return;
    this.sortColumn.set(option.value);
    this.sortDirection.set(sort.direction);
  }
}
