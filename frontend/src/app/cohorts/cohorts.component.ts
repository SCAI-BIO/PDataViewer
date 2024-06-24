import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-cohorts',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule],
  templateUrl: './cohorts.component.html',
  styleUrls: ['./cohorts.component.css'],
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
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData(): void {
    this.http
      .get<any>('/assets/cohorts.json')
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
        error: (err) => {
          console.error('Error fetching data', err);
        },
      });
  }

  openLink(link: string) {
    window.open(link, '_blank');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
