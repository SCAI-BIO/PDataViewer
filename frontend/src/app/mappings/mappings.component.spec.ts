import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
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

  const mockModalities = ['Modality1', 'Modality2', 'datscan', 'apoe'];
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
  const mockColors = {
    Group1: '#ff0000',
    Group2: '#00ff00',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
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

    // Mock loadColors to return mockColors
    spyOn(chordService, 'loadColors').and.returnValue(of(mockColors));
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

  it('should fetch colors on init and set the color scale', () => {
    expect(chordService['colorScale'].domain()).toEqual(
      Object.keys(mockColors)
    );
    expect(chordService['colorScale'].range()).toEqual(
      Object.values(mockColors)
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
    expect(buttons[2].nativeElement.textContent.trim()).toBe('DaT Scan');
    expect(buttons[3].nativeElement.textContent.trim()).toBe('APOE');
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
