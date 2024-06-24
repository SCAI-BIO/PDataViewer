import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CohortsComponent } from './cohorts.component';

describe('CohortsComponent', () => {
  let component: CohortsComponent;
  let fixture: ComponentFixture<CohortsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohortsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CohortsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
