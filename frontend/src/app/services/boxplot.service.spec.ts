import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BoxplotService } from './boxplot.service';

describe('BoxplotService', () => {
  let service: BoxplotService;
  let elementRef: ElementRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoxplotService],
    });
    service = TestBed.inject(BoxplotService);

    elementRef = new ElementRef(document.createElement('div'));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a boxplot', () => {
    const data = {
      cohort1: [1, 2, 3, 4, 5],
      cohort2: [6, 7, 8, 9, 10],
    };
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createBoxplot(elementRef, data, colors);

    const svgElement = elementRef.nativeElement.querySelector('svg');
    expect(svgElement).toBeTruthy();

    const rects = svgElement.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('should create the correct number of legend items', () => {
    const data = {
      cohort1: [1, 2, 3, 4, 5],
      cohort2: [6, 7, 8, 9, 10],
      cohort3: [11, 12, 13, 14, 15],
    };
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
      cohort3: '#0000ff',
    };

    service.createBoxplot(elementRef, data, colors);

    const legendItems =
      elementRef.nativeElement.querySelectorAll('rect.legend-item');
    expect(legendItems.length).toBe(3);
  });

  it('should set the correct colors for the legend items', () => {
    const data = {
      cohort1: [1, 2, 3, 4, 5],
      cohort2: [6, 7, 8, 9, 10],
    };
    const colors = {
      cohort1: '#ff0000',
      cohort2: '#00ff00',
    };

    service.createBoxplot(elementRef, data, colors);

    const legendRects =
      elementRef.nativeElement.querySelectorAll('rect.legend-item');
    expect(legendRects[0].style.fill).toBe('rgb(255, 0, 0)');
    expect(legendRects[1].style.fill).toBe('rgb(0, 255, 0)');
  });
});
