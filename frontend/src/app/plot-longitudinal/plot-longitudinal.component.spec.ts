import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PlotLongitudinalComponent } from './plot-longitudinal.component';

describe('PlotLongitudinalComponent', () => {
  let component: PlotLongitudinalComponent;
  let fixture: ComponentFixture<PlotLongitudinalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({
              cohort: 'testCohort',
              features: ['feature1', 'feature2'],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlotLongitudinalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
