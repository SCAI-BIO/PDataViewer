import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { StudyPickerComponent } from './study-picker.component';
import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

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
        MatFormFieldModule,
        MatAutocompleteModule,
        MatInputModule,
        MatChipsModule,
        MatIconModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}), // Mock ActivatedRoute with empty params
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyPickerComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // Mock initial feature fetch request
    const req1 = httpMock.expectOne(`${environment.API_URL}/cdm/features`);
    req1.flush({ Feature: ['feature1', 'feature2'] });

    // Mock initial colors fetch request
    const req2 = httpMock.expectOne('/assets/colors.json');
    req2.flush({
      PPMI: '#1f77b4',
      BIOFIND: '#ff7f0e',
      LuxPARK: '#2ca02c',
      LCC: '#d62728',
      'Fox Insight': '#9467bd',
      PRoBaND: '#8c564b',
      OPDC: '#e377c2',
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

  it('should fetch colors on init', () => {
    expect(component.cohortColors).toEqual({
      PPMI: '#1f77b4',
      BIOFIND: '#ff7f0e',
      LuxPARK: '#2ca02c',
      LCC: '#d62728',
      'Fox Insight': '#9467bd',
      PRoBaND: '#8c564b',
      OPDC: '#e377c2',
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
    const mockRankings = [{ cohort: 'cohort1', found: 10, missing: 5 }];
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
