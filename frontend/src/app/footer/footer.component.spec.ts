import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FooterComponent,
      ],
      providers: [
        provideRouter([], withComponentInputBinding()), // Provide router configuration
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial data binding
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render navigation links', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('mat-nav-list a'));
    expect(navLinks.length).toBeGreaterThan(0);

    const internalLinks = [
      '/about',
      '/imprint',
      '/cohorts',
      '/biomarkers',
      '/study-picker',
      '/ethnicity',
      '/mappings',
      '/longitudinal',
      '/tools',
      '/contact-us',
    ];

    const externalLinks = [
      'https://www.scai.fraunhofer.de/en/data_protection.html',
      'https://www.scai.fraunhofer.de/en/publishing-notes.html',
    ];

    navLinks.forEach((link) => {
      const href = link.nativeElement.getAttribute('href');

      if (href.startsWith('/')) {
        expect(internalLinks).toContain(href);
      } else {
        expect(externalLinks).toContain(href);
      }
    });
  });

  it('should render the footer text', () => {
    const footerText = fixture.debugElement.query(By.css('p.copyright'));
    expect(footerText).toBeTruthy();
    expect(footerText.nativeElement.textContent).toContain('Copyright');
  });

  it('should render all headers correctly', () => {
    const headers = fixture.debugElement.queryAll(By.css('h4 > a'));
    const headerTexts = ['PDataViewer', 'Landscape', 'Tools', 'Other'];

    headers.forEach((header, index) => {
      expect(header.nativeElement.textContent).toContain(headerTexts[index]);
    });
  });
});
