import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LongitudinalComponent } from './longitudinal.component';

describe('LongitudinalComponent', () => {
  let component: LongitudinalComponent;
  let fixture: ComponentFixture<LongitudinalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongitudinalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LongitudinalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
