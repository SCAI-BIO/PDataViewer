import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoHarmonizerComponent } from './auto-harmonizer.component';

xdescribe('AutoHarmonizerComponent', () => {
  let component: AutoHarmonizerComponent;
  let fixture: ComponentFixture<AutoHarmonizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoHarmonizerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AutoHarmonizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
