import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cohorts',
  standalone: true,
  imports: [CommonModule, MatSortModule, MatTableModule],
  templateUrl: './cohorts.component.html',
  styleUrl: './cohorts.component.css',
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
  subscriptions: Subscription[] = [];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData(): void {
    const sub = this.http.get<any>('/assets/cohorts.json').subscribe((data) => {
      const transformedData = Object.keys(data).map((key) => {
        return {
          cohort: key,
          ...data[key],
        };
      });
      this.dataSource.data = transformedData;
      this.dataSource.sort = this.sort;

      const initialSortState: Sort = { active: 'cohort', direction: 'asc' };
      this.sort.active = initialSortState.active;
      this.sort.direction = initialSortState.direction;
      this.sort.sortChange.emit(initialSortState);
    });
    this.subscriptions.push(sub);
  }

  openLink(link: string) {
    window.open(link, '_blank');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
