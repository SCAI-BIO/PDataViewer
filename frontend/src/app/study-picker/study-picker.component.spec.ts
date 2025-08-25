import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyPickerComponent } from './study-picker.component';

describe('StudyPickerComponent', () => {
  let component: StudyPickerComponent;
  let fixture: ComponentFixture<StudyPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyPickerComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
