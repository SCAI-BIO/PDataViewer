import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { StudyPickerComponent } from './study-picker.component';
import { environment } from '../../environments/environment';
import { RankData } from '../interfaces/rankdata';

describe('StudyPickerComponent', () => {
  let component: StudyPickerComponent;
  let fixture: ComponentFixture<StudyPickerComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StudyPickerComponent,
        HttpClientTestingModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyPickerComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // Mock initial feature fetch request
    const req1 = httpMock.expectOne(`${environment.API_URL}/cdm/features`);
    req1.flush({ Feature: ['feature1', 'feature2'] });

    // Mock initial cohort data fetch request
    const req2 = httpMock.expectOne(`${environment.API_URL}/cohorts/metadata`);
    req2.flush({
      PPMI: {
        Participants: 1758,
        HealthyControls: 237,
        ProdromalPatients: 1239,
        PDPatients: 902,
        LongitudinalPatients: 1244,
        FollowUpInterval: '6 Months',
        Location: 'USA, Europe',
        DOI: 'https://doi.org/10.1016/j.pneurobio.2011.09.005',
        Link: 'https://ida.loni.usc.edu/login.jsp',
        Color: '#1f77b4',
      },
      BIOFIND: {
        Participants: 215,
        HealthyControls: 96,
        ProdromalPatients: 0,
        PDPatients: 119,
        LongitudinalPatients: 0,
        FollowUpInterval: '14 Days',
        Location: 'USA',
        DOI: 'https://doi.org/10.1002/mds.26613',
        Link: 'https://ida.loni.usc.edu/login.jsp',
        Color: '#ff7f0e',
      },
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch features on init', () => {
    expect(component.features).toEqual(['feature1', 'feature2']);
  });

  it('should fetch cohort data on init', () => {
    expect(component.cohortData).toEqual({
      PPMI: {
        Participants: 1758,
        HealthyControls: 237,
        ProdromalPatients: 1239,
        PDPatients: 902,
        LongitudinalPatients: 1244,
        FollowUpInterval: '6 Months',
        Location: 'USA, Europe',
        DOI: 'https://doi.org/10.1016/j.pneurobio.2011.09.005',
        Link: 'https://ida.loni.usc.edu/login.jsp',
        Color: '#1f77b4',
      },
      BIOFIND: {
        Participants: 215,
        HealthyControls: 96,
        ProdromalPatients: 0,
        PDPatients: 119,
        LongitudinalPatients: 0,
        FollowUpInterval: '14 Days',
        Location: 'USA',
        DOI: 'https://doi.org/10.1002/mds.26613',
        Link: 'https://ida.loni.usc.edu/login.jsp',
        Color: '#ff7f0e',
      },
    });

    expect(component.cohortColors).toEqual({
      PPMI: '#1f77b4',
      BIOFIND: '#ff7f0e',
    });

    expect(component.cohortLinks).toEqual({
      PPMI: 'https://ida.loni.usc.edu/login.jsp',
      BIOFIND: 'https://ida.loni.usc.edu/login.jsp',
    });
  });

  it('should add a feature', () => {
    component.addFeature({
      value: 'newFeature',
      chipInput: { clear: () => {} },
    } as any);
    expect(component.selectedFeatures).toContain('newFeature');
  });

  it('should not add a duplicate feature', () => {
    component.selectedFeatures = ['newFeature'];
    component.addFeature({
      value: 'newFeature',
      chipInput: { clear: () => {} },
    } as any);
    expect(component.selectedFeatures.length).toBe(1);
  });

  it('should remove a feature', () => {
    component.selectedFeatures = ['feature1'];
    component.removeFeature('feature1');
    expect(component.selectedFeatures).not.toContain('feature1');
  });

  it('should get rankings', () => {
    const mockRankings: RankData[] = [
      { cohort: 'cohort1', found: '10', missing: '5' },
    ];
    component.getRankings(['feature1']);
    const req = httpMock.expectOne(`${environment.API_URL}/studypicker/rank`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRankings);

    expect(component.cohortRankings).toEqual(mockRankings);
  });

  it('should filter features', () => {
    component.features = ['feature1', 'feature2', 'modality'];
    const result = component['_filter']('fea');
    expect(result).toEqual(['feature1', 'feature2']);
  });
});
