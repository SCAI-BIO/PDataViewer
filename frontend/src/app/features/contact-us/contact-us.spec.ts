import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactUs } from './contact-us';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('ContactUs', () => {
  let component: ContactUs;
  let fixture: ComponentFixture<ContactUs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactUs],
      providers: [provideHttpClient(), provideRouter([])],
      teardown: { destroyAfterEach: false },
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactUs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
