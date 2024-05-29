import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MappingsComponent } from './mappings.component';
import { environment } from '../../environments/environment';

describe('MappingsComponent', () => {
  let component: MappingsComponent;
  let fixture: ComponentFixture<MappingsComponent>;
  let httpMock: HttpTestingController;
  const mockModalities = ['Modality1', 'Modality2'];
  const mockCohorts = ['Cohort1', 'Cohort2'];
  const mockData = {
    nodes: [
      { name: 'Node1', group: 'Group1' },
      { name: 'Node2', group: 'Group2' },
    ],
    links: [{ source: 'Node1', target: 'Node2' }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MappingsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: of({}) }, // Mock ActivatedRoute with empty params
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MappingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => {
    // Call detectChanges to initiate component logic
    fixture.detectChanges();

    // Set up HTTP expectations after calling fixture.detectChanges()
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

  it('should fetch modalities on init', () => {
    expect(component['modalities']).toEqual(mockModalities);
  });

  it('should fetch cohorts on init', () => {
    expect(component['cohorts']).toEqual(mockCohorts);
  });

  it('should set modality and fetch data on modality click', () => {
    component['modalities'] = mockModalities;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].triggerEventHandler('click', null);

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockData);

    expect(component['modality']).toBe(mockModalities[0]);
    expect(component['data']).toEqual(mockData);
  });

  it('should unsubscribe from all subscriptions on destroy', () => {
    spyOn(component['subscriptions'], 'forEach').and.callThrough();
    component.ngOnDestroy();
    expect(component['subscriptions'].forEach).toHaveBeenCalled();
  });

  it('should create chord diagrams with correct data', () => {
    component['dataChunks'] = [mockData];
    fixture.detectChanges();

    component.onModalityClick(mockModalities[0]);

    const req = httpMock.expectOne(
      `${environment.API_URL}/visualization/chords/`
    );
    req.flush(mockData);

    fixture.detectChanges();

    const svgElements = fixture.debugElement.queryAll(By.css('svg'));
    expect(svgElements.length).toBeGreaterThan(0);
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
});
