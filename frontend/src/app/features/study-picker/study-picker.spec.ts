import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyPicker } from './study-picker';

describe('StudyPicker', () => {
  let component: StudyPicker;
  let fixture: ComponentFixture<StudyPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyPicker],
      providers: [provideHttpClient()],
      teardown: { destroyAfterEach: false },
    }).compileComponents();

    fixture = TestBed.createComponent(StudyPicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
