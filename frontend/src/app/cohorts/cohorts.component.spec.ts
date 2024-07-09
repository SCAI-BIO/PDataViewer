import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CohortsComponent } from './cohorts.component';
import { environment } from '../../environments/environment';

describe('CohortsComponent', () => {
  let component: CohortsComponent;
  let fixture: ComponentFixture<CohortsComponent>;
  let httpMock: HttpTestingController;
  const API_URL = environment.API_URL;

  const mockData = {
    cohort1: {
      Participants: 10,
      HealthyControls: 5,
      ProdromalPatients: 3,
      PDPatients: 2,
      LongitudinalPatients: 1,
      FollowUpInterval: '6 months',
      Location: 'Location1',
      DOI: '10.1000/1',
      Link: 'http://link1.com',
    },
    cohort2: {
      Participants: 20,
      HealthyControls: 10,
      ProdromalPatients: 6,
      PDPatients: 4,
      LongitudinalPatients: 2,
      FollowUpInterval: '1 year',
      Location: 'Location2',
      DOI: '10.1000/2',
      Link: 'http://link2.com',
    },
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CohortsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CohortsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function setupTest(mockResponseData?: any) {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${API_URL}/cohorts/metadata`);
    if (mockResponseData) {
      req.flush(mockResponseData);
    } else {
      req.flush({});
    }
    fixture.detectChanges();
  }

  it('should create', () => {
    setupTest(mockData);
    expect(component).toBeTruthy();
  });

  it('should fetch and transform data correctly', () => {
    setupTest(mockData);
    expect(component.dataSource.data.length).toBe(2);
    expect(component.dataSource.data[0].cohort).toBe('cohort1');
    expect(component.dataSource.data[1].cohort).toBe('cohort2');
  });

  it('should sort data by "cohort" column in ascending order', () => {
    setupTest(mockData);
    const sortHeader = fixture.debugElement.query(By.css('.mat-sort-header'));
    expect(component.sort.active).toBe('cohort');
    expect(component.sort.direction).toBe('asc');
  });

  it('should handle HTTP error gracefully', () => {
    const consoleSpy = spyOn(console, 'error');
    fixture.detectChanges();
    const req = httpMock.expectOne(`${API_URL}/cohorts/metadata`);
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching data',
      jasmine.anything()
    );
  });

  it('should open link in a new tab', () => {
    const spy = spyOn(window, 'open');
    component.openLink('http://example.com');
    expect(spy).toHaveBeenCalledWith('http://example.com', '_blank');
  });

  it('should clean up on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
