import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';

import { Subject } from 'rxjs';

import { Metadata, CohortMetadata } from '../interfaces/metadata';
import { environment } from '../../environments/environment';

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
  private API_URL = environment.API_URL;
  private destroy$ = new Subject<void>();
  private http = inject(HttpClient);

  fetchMetadata(): void {
    this.loading = true;
    this.http.get<Metadata>(`${this.API_URL}/cohorts/metadata`).subscribe({
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
      error: (e) => {
        this.loading = false;
        console.error('Error fetching metadata', e);
      },
      complete: () => (this.loading = false),
    });
  }

  openLink(link: string) {
    window.open(link, '_blank');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit() {
    this.fetchMetadata();
  }
}
