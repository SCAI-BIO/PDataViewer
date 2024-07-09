import { ElementRef } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { LineplotService } from './lineplot.service';
import { LongitudinalData } from '../interfaces/longitudinal-data';

describe('LineplotService', () => {
  let service: LineplotService;
  let elementRef: ElementRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LineplotService],
    });
    service = TestBed.inject(LineplotService);

    elementRef = new ElementRef(document.createElement('div'));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a line plot', () => {
    const data: LongitudinalData[] = [
      {
        Months: 1,
        Cohort: 'cohort1',
        PatientCount: 10,
        TotalPatientCount: 100,
      },
      {
        Months: 2,
        Cohort: 'cohort1',
        PatientCount: 15,
        TotalPatientCount: 100,
      },
      {
        Months: 1,
        Cohort: 'cohort2',
        PatientCount: 20,
        TotalPatientCount: 200,
      },
      {
        Months: 2,
        Cohort: 'cohort2',
        PatientCount: 25,
        TotalPatientCount: 200,
      },
    ];
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createLineplot(elementRef, data, colors);

    const svgElement = elementRef.nativeElement.querySelector('svg');
    expect(svgElement).toBeTruthy();

    const paths = svgElement.querySelectorAll('path.line-path');
    expect(paths.length).toBe(2);

    const circles = svgElement.querySelectorAll('circle');
    expect(circles.length).toBe(4);
  });

  it('should create the correct legend items', () => {
    const data: LongitudinalData[] = [
      {
        Months: 1,
        Cohort: 'cohort1',
        PatientCount: 10,
        TotalPatientCount: 100,
      },
      {
        Months: 2,
        Cohort: 'cohort1',
        PatientCount: 15,
        TotalPatientCount: 100,
      },
      {
        Months: 1,
        Cohort: 'cohort2',
        PatientCount: 20,
        TotalPatientCount: 200,
      },
      {
        Months: 2,
        Cohort: 'cohort2',
        PatientCount: 25,
        TotalPatientCount: 200,
      },
    ];
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createLineplot(elementRef, data, colors);

    const legend = elementRef.nativeElement.querySelector('.legend');
    const legendItems = legend.querySelectorAll('rect');
    expect(legendItems.length).toBe(2);
  });

  it('should set the correct colors for the legend items', () => {
    const data: LongitudinalData[] = [
      {
        Months: 1,
        Cohort: 'cohort1',
        PatientCount: 10,
        TotalPatientCount: 100,
      },
      {
        Months: 2,
        Cohort: 'cohort1',
        PatientCount: 15,
        TotalPatientCount: 100,
      },
      {
        Months: 1,
        Cohort: 'cohort2',
        PatientCount: 20,
        TotalPatientCount: 200,
      },
      {
        Months: 2,
        Cohort: 'cohort2',
        PatientCount: 25,
        TotalPatientCount: 200,
      },
    ];
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createLineplot(elementRef, data, colors);

    const legend = elementRef.nativeElement.querySelector('.legend');
    const legendRects = legend.querySelectorAll('rect');
    expect((legendRects[0] as SVGRectElement).getAttribute('fill')).toBe(
      '#ff0000'
    );
    expect((legendRects[1] as SVGRectElement).getAttribute('fill')).toBe(
      '#00ff00'
    );
  });

  it('should create tooltips for data points', fakeAsync(() => {
    const data: LongitudinalData[] = [
      {
        Months: 1,
        Cohort: 'cohort1',
        PatientCount: 10,
        TotalPatientCount: 100,
      },
      {
        Months: 2,
        Cohort: 'cohort1',
        PatientCount: 15,
        TotalPatientCount: 100,
      },
      {
        Months: 1,
        Cohort: 'cohort2',
        PatientCount: 20,
        TotalPatientCount: 200,
      },
      {
        Months: 2,
        Cohort: 'cohort2',
        PatientCount: 25,
        TotalPatientCount: 200,
      },
    ];
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createLineplot(elementRef, data, colors);

    const circles = elementRef.nativeElement.querySelectorAll('circle');
    expect(circles.length).toBe(4);

    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    circles[0].dispatchEvent(event);

    tick();

    const tooltip = document.querySelector('.tooltip') as HTMLElement;
    expect(tooltip).toBeTruthy();
    expect(tooltip.style.visibility).toBe('visible');
  }));

  it('should show vertical line when tooltip is visible', fakeAsync(() => {
    const data: LongitudinalData[] = [
      {
        Months: 1,
        Cohort: 'cohort1',
        PatientCount: 10,
        TotalPatientCount: 100,
      },
      {
        Months: 2,
        Cohort: 'cohort1',
        PatientCount: 15,
        TotalPatientCount: 100,
      },
      {
        Months: 1,
        Cohort: 'cohort2',
        PatientCount: 20,
        TotalPatientCount: 200,
      },
      {
        Months: 2,
        Cohort: 'cohort2',
        PatientCount: 25,
        TotalPatientCount: 200,
      },
    ];
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createLineplot(elementRef, data, colors);

    const circles = elementRef.nativeElement.querySelectorAll('circle');
    expect(circles.length).toBe(4);

    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    circles[0].dispatchEvent(event);

    tick();

    const verticalLine =
      elementRef.nativeElement.querySelector('.vertical-line');
    expect(verticalLine).toBeTruthy();
    expect(verticalLine.getAttribute('visibility')).toBe('visible');
  }));
});
