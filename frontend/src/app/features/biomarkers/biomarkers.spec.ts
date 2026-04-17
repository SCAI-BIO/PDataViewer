import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Biomarkers } from './biomarkers';

describe('Biomarkers', () => {
  let component: Biomarkers;
  let fixture: ComponentFixture<Biomarkers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Biomarkers],
      providers: [provideHttpClient()],
      teardown: { destroyAfterEach: false },
    }).compileComponents();

    fixture = TestBed.createComponent(Biomarkers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
