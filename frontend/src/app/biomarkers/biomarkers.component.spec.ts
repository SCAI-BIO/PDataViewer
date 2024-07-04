import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiomarkersComponent } from './biomarkers.component';

describe('BiomarkersComponent', () => {
  let component: BiomarkersComponent;
  let fixture: ComponentFixture<BiomarkersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiomarkersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BiomarkersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
