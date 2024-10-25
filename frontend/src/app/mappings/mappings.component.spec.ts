import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { MappingsComponent } from './mappings.component';
import { environment } from '../../environments/environment';
import { ChordDiagramService } from '../services/chord-diagram.service';

describe('MappingsComponent', () => {
  let component: MappingsComponent;
  let fixture: ComponentFixture<MappingsComponent>;
  let httpMock: HttpTestingController;
  let chordService: ChordDiagramService;

  const mockModalities = ['Modality1', 'Modality2'];
  const mockCohorts = ['Cohort1', 'Cohort2'];
  const mockData = {
    nodes: [
      { name: 'Node1', group: 'Group1' },
      { name: 'Node2', group: 'Group2' },
    ],
    links: [{ source: 'Node1', target: 'Node2' }],
  };
  const emptyData = {
    nodes: [],
    links: [],
  };
  const mockCohortData = {
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChordDiagramService,
        {
          provide: ActivatedRoute,
          useValue: { params: of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MappingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    chordService = TestBed.inject(ChordDiagramService);

    // Mock loadCohortData to return mockCohortData
    spyOn(chordService, 'loadCohortData').and.returnValue(of(mockCohortData));
  });

  beforeEach(() => {
    fixture.detectChanges();

    const modalitiesReq = httpMock.expectOne(
      `${environment.API_URL}/cdm/modalities`
    );
    modalitiesReq.flush(mockModalities);

    const cohortsReq = httpMock.expectOne(`${environment.API_URL}/cdm/cohorts`);
    cohortsReq.flush(mockCohorts);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch cohort data on init and set the color scale', () => {
    const expectedColors = {
      PPMI: '#1f77b4',
      BIOFIND: '#ff7f0e',
    };
    expect(chordService['colorScale'].domain()).toEqual(
      Object.keys(expectedColors)
    );
    expect(chordService['colorScale'].range()).toEqual(
      Object.values(expectedColors)
    );
  });

  it('should fetch modalities on init', () => {
    expect(component['modalities']).toEqual(mockModalities);
  });

  it('should fetch cohorts on init', () => {
    expect(component['cohorts']).toEqual(mockCohorts);
  });

  it('should set modality and fetch data on modality click', () => {
    component['modalities'] = mockModalities;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('.modality-buttons button')
    );
    buttons[0].triggerEventHandler('click', null);

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockData);

    expect(component['modality']).toBe(mockModalities[0]);
    expect(component['dataChunks']).toEqual([mockData]);
  });

  it('should unsubscribe from all subscriptions on destroy', () => {
    spyOn(component['subscriptions'], 'forEach').and.callThrough();
    component.ngOnDestroy();
    expect(component['subscriptions'].forEach).toHaveBeenCalled();
  });

  it('should create chord diagrams with correct data', () => {
    spyOn(chordService, 'createChordDiagrams').and.callThrough();
    component['dataChunks'] = [mockData];
    fixture.detectChanges();

    component.onModalityClick(mockModalities[0]);

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    req.flush(mockData);

    fixture.detectChanges();

    expect(chordService.createChordDiagrams).toHaveBeenCalledWith([mockData]);

    const svgElements = fixture.debugElement.queryAll(
      By.css('.chord-diagram svg')
    );
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('should display no data message when there are no data chunks', () => {
    component['modalities'] = mockModalities;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('.modality-buttons button')
    );
    buttons[0].triggerEventHandler('click', null);

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    expect(req.request.method).toBe('POST');
    req.flush(emptyData);

    fixture.detectChanges();

    const noDataMessage = fixture.debugElement.query(
      By.css('.no-data-message')
    );
    expect(noDataMessage).toBeTruthy();
    expect(noDataMessage.nativeElement.textContent).toContain(
      'Sorry, no mapping to showcase for this modality currently. We are collecting more data, keep in touch!'
    );
  });

  it('should handle errors while fetching chord data', () => {
    spyOn(console, 'error');
    component['modalities'] = mockModalities;
    component['cohorts'] = mockCohorts;
    component.onModalityClick(mockModalities[0]);

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    req.flush('Error fetching chord data', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error fetching chord data:',
      jasmine.any(Object)
    );
  });

  it('should display modality buttons with correct formatting', () => {
    component['modalities'] = mockModalities;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('.modality-buttons button')
    );

    expect(buttons.length).toBe(mockModalities.length);
    expect(buttons[0].nativeElement.textContent.trim()).toBe('Modality1');
    expect(buttons[1].nativeElement.textContent.trim()).toBe('Modality2');
  });

  it('should highlight the selected modality button', () => {
    component['modalities'] = mockModalities;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('.modality-buttons button')
    );

    buttons[0].triggerEventHandler('click', null);

    let req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    req.flush(mockData);

    fixture.detectChanges();

    expect(
      buttons[0].nativeElement.classList.contains('selected-modality')
    ).toBeTrue();

    buttons[1].triggerEventHandler('click', null);

    req = httpMock.expectOne(`${environment.API_URL}/visualization/chords/`);
    req.flush(mockData);

    fixture.detectChanges();

    expect(
      buttons[0].nativeElement.classList.contains('selected-modality')
    ).toBeFalse();
    expect(
      buttons[1].nativeElement.classList.contains('selected-modality')
    ).toBeTrue();
  });
});
