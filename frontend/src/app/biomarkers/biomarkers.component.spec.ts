import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { BiomarkersComponent } from './biomarkers.component';
import { environment } from '../../environments/environment';
import { BoxplotService } from '../services/boxplot.service';

describe('BiomarkersComponent', () => {
  let component: BiomarkersComponent;
  let fixture: ComponentFixture<BiomarkersComponent>;
  let httpMock: HttpTestingController;
  let boxplotService: jasmine.SpyObj<BoxplotService>;

  beforeEach(async () => {
    const boxplotSpy = jasmine.createSpyObj('BoxplotService', [
      'createBoxplot',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        BrowserAnimationsModule,
        BiomarkersComponent,
      ],
      providers: [{ provide: BoxplotService, useValue: boxplotSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BiomarkersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    boxplotService = TestBed.inject(
      BoxplotService
    ) as jasmine.SpyObj<BoxplotService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();

    // Ensure fetchBiomarkers HTTP request is made
    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);

    // Ensure fetchColors HTTP request is made
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    expect(component).toBeTruthy();
  });

  it('should fetch biomarkers and colors on init', () => {
    fixture.detectChanges();

    // Ensure fetchBiomarkers HTTP request is made
    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    expect(biomarkersRequest.request.method).toBe('GET');
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);

    // Ensure fetchColors HTTP request is made
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    expect(colorsRequest.request.method).toBe('GET');
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    // Verify the component's state
    expect(component.biomarkers).toEqual(['A', 'B']);
    expect(component.colors).toEqual({
      cohort1: '#FF0000',
      cohort2: '#00FF00',
    });
  });

  it('should add cohort', () => {
    fixture.detectChanges();

    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    const event = {
      value: 'New Cohort',
      chipInput: { clear: () => {} },
    } as MatChipInputEvent;
    component.addCohort(event);
    expect(component.selectedCohorts).toContain('New Cohort');
  });

  it('should select biomarker and fetch related data', () => {
    fixture.detectChanges();

    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    const event = {
      option: { value: 'Biomarker' },
    } as MatAutocompleteSelectedEvent;
    spyOn(component, 'fetchCohorts');
    spyOn(component, 'fetchDiagnoses');
    component.biomarkerSelected(event);
    expect(component.selectedBiomarker).toBe('Biomarker');
    expect(component.fetchCohorts).toHaveBeenCalled();
    expect(component.fetchDiagnoses).toHaveBeenCalled();
  });

  it('should select cohort and fetch biomarker data', () => {
    fixture.detectChanges();

    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    const event = {
      option: { value: 'Cohort' },
    } as MatAutocompleteSelectedEvent;
    spyOn(component, 'fetchBiomarkerData');
    component.cohortSelected(event);
    expect(component.selectedCohorts).toContain('Cohort');
    expect(component.fetchBiomarkerData).toHaveBeenCalledWith('Cohort');
  });

  it('should remove cohort', () => {
    fixture.detectChanges();

    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    component.selectedCohorts = ['Cohort1', 'Cohort2'];
    component.removeCohort('Cohort1');
    expect(component.selectedCohorts).not.toContain('Cohort1');
  });

  it('should filter biomarkers', () => {
    component.biomarkers = ['Biomarker1', 'Biomarker2', 'TestBiomarker'];
    const filtered = component['_filterBiomarkers']('test');
    expect(filtered).toEqual(['TestBiomarker']);
  });

  it('should filter diagnoses', () => {
    const diagnoses = { Cohort1: ['Diag1', 'Diag2'], Cohort2: ['Diag3'] };
    const filtered = component['_filterDiagnoses']('diag1', diagnoses);
    expect(filtered).toEqual(['Cohort1 (Diag1 Group)']);
  });

  it('should call createBoxplot', () => {
    fixture.detectChanges();

    const biomarkersRequest = httpMock.expectOne(
      `${environment.API_URL}/biomarkers`
    );
    biomarkersRequest.flush(['biomarkers_a', 'biomarkers_b']);
    const colorsRequest = httpMock.expectOne(
      `${environment.API_URL}/cohorts/metadata`
    );
    colorsRequest.flush({
      cohort1: { Color: '#FF0000' },
      cohort2: { Color: '#00FF00' },
    });

    component.generateBoxplot();
    expect(boxplotService.createBoxplot).toHaveBeenCalled();
  });
});
