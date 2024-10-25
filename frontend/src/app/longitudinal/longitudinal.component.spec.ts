import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { LongitudinalComponent } from './longitudinal.component';
import { LongitudinalData } from '../interfaces/longitudinal-data';
import { Metadata } from '../interfaces/metadata';
import { LineplotService } from '../services/lineplot.service';
import { environment } from '../../environments/environment';

describe('LongitudinalComponent', () => {
  let component: LongitudinalComponent;
  let fixture: ComponentFixture<LongitudinalComponent>;
  let httpMock: HttpTestingController;
  let lineplotService: jasmine.SpyObj<LineplotService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('LineplotService', ['createLineplot']);

    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LineplotService, useValue: spy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    lineplotService = TestBed.inject(
      LineplotService
    ) as jasmine.SpyObj<LineplotService>;

    fixture = TestBed.createComponent(LongitudinalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();

    // Handle the HTTP requests triggered by ngOnInit
    const reqMeta = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    reqMeta.flush({
      cohort1: {
        Participants: 100,
        HealthyControls: 50,
        ProdromalPatients: 30,
        PDPatients: 20,
        LongitudinalPatients: 40,
        FollowUpInterval: '6 months',
        Location: 'Location1',
        DOI: '10.1000/xyz123',
        Link: 'http://example.com',
        Color: '#ff0000',
      },
      cohort2: {
        Participants: 200,
        HealthyControls: 100,
        ProdromalPatients: 60,
        PDPatients: 40,
        LongitudinalPatients: 80,
        FollowUpInterval: '12 months',
        Location: 'Location2',
        DOI: '10.1000/xyz456',
        Link: 'http://example.com',
        Color: '#00ff00',
      },
    });

    const reqTables = httpMock.expectOne(`${environment.API_URL}/longitudinal`);
    reqTables.flush(['longitudinal_table1', 'longitudinal_table2']);

    const reqMappings = httpMock.expectOne(
      './assets/lower_to_original_case.json'
    );
    reqMappings.flush({
      'feature name': 'Feature Name',
      'another feature': 'Another Feature',
    });

    expect(component).toBeTruthy();
  });

  it('should fetch colors on init', () => {
    const mockMetadata: Metadata = {
      cohort1: {
        Participants: 100,
        HealthyControls: 50,
        ProdromalPatients: 30,
        PDPatients: 20,
        LongitudinalPatients: 40,
        FollowUpInterval: '6 months',
        Location: 'Location1',
        DOI: '10.1000/xyz123',
        Link: 'http://example.com',
        Color: '#ff0000',
      },
      cohort2: {
        Participants: 200,
        HealthyControls: 100,
        ProdromalPatients: 60,
        PDPatients: 40,
        LongitudinalPatients: 80,
        FollowUpInterval: '12 months',
        Location: 'Location2',
        DOI: '10.1000/xyz456',
        Link: 'http://example.com',
        Color: '#00ff00',
      },
    };

    fixture.detectChanges();

    const reqMeta = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    reqMeta.flush(mockMetadata);

    const reqTables = httpMock.expectOne(`${environment.API_URL}/longitudinal`);
    reqTables.flush(['longitudinal_table1', 'longitudinal_table2']);

    const reqMappings = httpMock.expectOne(
      './assets/lower_to_original_case.json'
    );
    reqMappings.flush({
      'feature name': 'Feature Name',
      'another feature': 'Another Feature',
    });

    expect(component.colors).toEqual({
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    });
  });

  it('should fetch longitudinal tables on init', () => {
    const mockTables = ['longitudinal_table1', 'longitudinal_table2'];

    fixture.detectChanges();

    const reqMeta = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    reqMeta.flush({
      cohort1: {
        Participants: 100,
        HealthyControls: 50,
        ProdromalPatients: 30,
        PDPatients: 20,
        LongitudinalPatients: 40,
        FollowUpInterval: '6 months',
        Location: 'Location1',
        DOI: '10.1000/xyz123',
        Link: 'http://example.com',
        Color: '#ff0000',
      },
      cohort2: {
        Participants: 200,
        HealthyControls: 100,
        ProdromalPatients: 60,
        PDPatients: 40,
        LongitudinalPatients: 80,
        FollowUpInterval: '12 months',
        Location: 'Location2',
        DOI: '10.1000/xyz456',
        Link: 'http://example.com',
        Color: '#00ff00',
      },
    });

    const reqTables = httpMock.expectOne(`${environment.API_URL}/longitudinal`);
    expect(reqTables.request.method).toBe('GET');
    reqTables.flush(mockTables);

    const reqMappings = httpMock.expectOne(
      './assets/lower_to_original_case.json'
    );
    reqMappings.flush({
      'feature name': 'Feature Name',
      'another feature': 'Another Feature',
    });

    expect(component.longitudinalTables).toEqual(['Table1', 'Table2']);
  });

  it('should filter longitudinal tables', () => {
    component.longitudinalTables = ['Table1', 'Table2', 'Feature'];
    const filtered = component['_filterTableName']('table');
    expect(filtered).toEqual(['Table1', 'Table2']);
  });

  it('should transform feature name', () => {
    const transformed = component['_transformFeatureName']('Feature Name');
    expect(transformed).toBe('feature_name');
  });

  it('should transform longitudinal name', () => {
    const transformed = component['_transformLongitudinalName'](
      'longitudinal_table_name'
    );
    expect(transformed).toBe('Table name');
  });

  it('should call lineplotService.createLineplot', () => {
    const mockData: LongitudinalData[] = [
      {
        Months: 1,
        Cohort: 'cohort1',
        PatientCount: 10,
        TotalPatientCount: 100,
      },
      {
        Months: 2,
        Cohort: 'cohort2',
        PatientCount: 15,
        TotalPatientCount: 200,
      },
    ];

    component.data = mockData;
    component.colors = { cohort1: '#ff0000', cohort2: '#00ff00' };
    component.generateLineplot();
    expect(lineplotService.createLineplot).toHaveBeenCalledWith(
      component['chartContainer'],
      component.data,
      component.colors,
      'Longitudinal data for '
    );
  });
});
