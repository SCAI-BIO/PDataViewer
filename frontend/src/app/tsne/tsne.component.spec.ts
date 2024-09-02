import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TsneComponent } from './tsne.component';

xdescribe('TsneComponent', () => {
  let component: TsneComponent;
  let fixture: ComponentFixture<TsneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TsneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TsneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
