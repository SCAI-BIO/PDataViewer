import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, MatSort } from '@angular/material/sort';

import { finalize, map } from 'rxjs';

import { CohortData } from '../interfaces/metadata';
import { ApiService } from '../services/api.service';
import { ApiErrorHandlerService } from '../services/api-error-handler.service';

@Component({
  selector: 'app-cohorts',
  imports: [MatProgressSpinnerModule, MatSortModule, MatTableModule],
  templateUrl: './cohorts.component.html',
  styleUrl: './cohorts.component.scss',
})
export class CohortsComponent implements OnInit {
  dataSource = new MatTableDataSource<CohortData>();
  displayedColumns: string[] = [
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
  metadata = signal<CohortData[]>([]);
  isLoading = signal(false);
  @ViewChild(MatSort) sort!: MatSort;
  private apiService = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ApiErrorHandlerService);

  fetchMetadata(): void {
    this.isLoading.set(true);
    this.apiService
      .fetchMetadata()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        map((data) =>
          Object.keys(data).map((key) => ({
            cohort: key,
            ...data[key],
          }))
        ),
        takeUntilDestroyed(this.destroyRef)
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
