
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Metadata, CohortMetadata } from '../interfaces/metadata';
import { environment } from '../../environments/environment';

interface CohortData extends CohortMetadata {
  cohort: string;
}
@Component({
    selector: 'app-cohorts',
    imports: [MatTableModule, MatSortModule],
    templateUrl: './cohorts.component.html',
    styleUrls: ['./cohorts.component.css']
})
export class CohortsComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
    'cohort',
    'Participants',
    'HealthyControls',
    'ProdromalPatients',
    'PDPatients',
    'LongitudinalPatients',
    'FollowUpInterval',
    'Location',
    'DOI',
    'Link',
  ];
  dataSource = new MatTableDataSource<CohortData>();
  @ViewChild(MatSort) sort!: MatSort;
  private API_URL = environment.API_URL;
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  fetchMetadata(): void {
    this.http
      .get<Metadata>(`${this.API_URL}/cohorts/metadata`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          console.error('Error fetching metadata', e);
        },
        complete: () => console.info('Metadata successfully fetched'),
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
