import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotLongitudinalComponent } from './plot-longitudinal.component';

describe('PlotLongitudinalComponent', () => {
  let component: PlotLongitudinalComponent;
  let fixture: ComponentFixture<PlotLongitudinalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotLongitudinalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlotLongitudinalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
