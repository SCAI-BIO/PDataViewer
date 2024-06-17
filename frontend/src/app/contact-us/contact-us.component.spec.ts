import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactUsComponent } from './contact-us.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let fixture: ComponentFixture<ContactUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactUsComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactUsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the contact-us component', () => {
    expect(component).toBeTruthy();
  });

  it('should have a section with id "contact-us"', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('section#contact-us')).toBeTruthy();
  });

  it('should have a section title "Contact Us"', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h4.section-title').textContent).toContain(
      'Contact Us'
    );
  });

  it('should have 6 contact cards', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelectorAll('.card-container').length).toBe(6);
  });

  it('should contain correct social media links for "Prof. Dr. Martin Hofmann-Apitius"', () => {
    const compiled = fixture.debugElement.nativeElement;
    const xLink = compiled.querySelector(
      'a[href="https://x.com/apitiushofmann"]'
    );
    const linkedinLink = compiled.querySelector(
      'a[href="https://www.linkedin.com/in/hofmannapitius"]'
    );
    expect(xLink).toBeTruthy();
    expect(linkedinLink).toBeTruthy();
  });

  it('should contain correct social media links for "Dr. Marc Jacobs"', () => {
    const compiled = fixture.debugElement.nativeElement;
    const linkedinLink = compiled.querySelector(
      'a[href="https://www.linkedin.com/in/marc-jacobs-801938242/"]'
    );
    expect(linkedinLink).toBeTruthy();
  });

  it('should contain correct email link for "Yasamin Salimi"', () => {
    const compiled = fixture.debugElement.nativeElement;
    const emailLink = compiled.querySelector(
      'a[href="mailto:yasamin.salimi@scai.fraunhofer.de"]'
    );
    expect(emailLink).toBeTruthy();
  });

  it('should contain correct email link for "Marjan Niazpoor"', () => {
    const compiled = fixture.debugElement.nativeElement;
    const emailLink = compiled.querySelector(
      'a[href="mailto:marjan.niazpoor@scai-extern.fraunhofer.de"]'
    );
    expect(emailLink).toBeTruthy();
  });
});
