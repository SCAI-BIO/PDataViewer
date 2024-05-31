import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
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

  // Setup the testing module and inject the necessary services
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChordDiagramService,
        {
          provide: ActivatedRoute,
          useValue: { params: of({}) }, // Mock ActivatedRoute with empty params
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MappingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    chordService = TestBed.inject(ChordDiagramService);
  });

  // Initialize the component and set up HTTP expectations
  beforeEach(() => {
    fixture.detectChanges(); // Trigger initial data binding and lifecycle hooks

    // Mock HTTP responses for modalities and cohorts
    const modalitiesReq = httpMock.expectOne(
      `${environment.API_URL}/cdm/modalities`
    );
    modalitiesReq.flush(mockModalities);

    const cohortsReq = httpMock.expectOne(`${environment.API_URL}/cdm/cohorts`);
    cohortsReq.flush(mockCohorts);

    fixture.detectChanges(); // Trigger data binding after responses
  });

  // Verify no outstanding requests after each test
  afterEach(() => {
    httpMock.verify();
  });

  // Test to ensure the component is created successfully
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test to verify that modalities are fetched on component initialization
  it('should fetch modalities on init', () => {
    expect(component['modalities']).toEqual(mockModalities);
  });

  // Test to verify that cohorts are fetched on component initialization
  it('should fetch cohorts on init', () => {
    expect(component['cohorts']).toEqual(mockCohorts);
  });

  // Test to verify that modality is set and data is fetched on modality click
  it('should set modality and fetch data on modality click', () => {
    component['modalities'] = mockModalities;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('.modality-buttons button')
    );
    buttons[0].triggerEventHandler('click', null); // Simulate click on the first button

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockData);

    expect(component['modality']).toBe(mockModalities[0]);
    expect(component['dataChunks']).toEqual([mockData]); // Updated to check dataChunks
  });

  // Test to verify that all subscriptions are unsubscribed on component destruction
  it('should unsubscribe from all subscriptions on destroy', () => {
    spyOn(component['subscriptions'], 'forEach').and.callThrough();
    component.ngOnDestroy();
    expect(component['subscriptions'].forEach).toHaveBeenCalled();
  });

  // Test to verify that chord diagrams are created with the correct data
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

  // Test to verify that errors are handled gracefully when fetching chord data
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
});
