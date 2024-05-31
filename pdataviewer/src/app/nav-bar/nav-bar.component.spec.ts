import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavBarComponent } from './nav-bar.component';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { By } from '@angular/platform-browser';
import { RouterLinkWithHref, provideRouter } from '@angular/router';
import { Component } from '@angular/core';

describe('NavBarComponent', () => {
  let component: NavBarComponent;
  let fixture: ComponentFixture<NavBarComponent>;
  let router: Router;
  let location: Location;

  // Setup the testing module and inject necessary services
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBarComponent],
      providers: [
        provideRouter([
          { path: 'cohorts', component: DummyComponent },
          { path: 'biomarkers', component: DummyComponent },
          { path: 'study-picker', component: DummyComponent },
          { path: 'ethnicity', component: DummyComponent },
          { path: 'mappings', component: DummyComponent },
          { path: 'longitudinal', component: DummyComponent },
          { path: 'tools', component: DummyComponent },
          { path: 'contact-us', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    // Inject Router and Location
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    // Create the component instance
    fixture = TestBed.createComponent(NavBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial data binding and lifecycle hook
  });

  // Test to ensure the component is created successfully
  it('should create the nav-bar component', () => {
    expect(component).toBeTruthy();
  });

  // Test to verify the logo renders with correct src and alt attributes
  it('should render the logo with correct src and alt attributes', () => {
    const logoElement = fixture.debugElement.query(By.css('.logo img'));
    expect(logoElement.nativeElement.src).toContain('assets/logos/logo.png');
    expect(logoElement.nativeElement.alt).toBe('pdataviewer-logo');
  });

  // Test to verify the correct number of navigation links are rendered
  it('should have the correct number of navigation links', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('.nav li a'));
    expect(navLinks.length).toBe(8);
  });

  // Test to verify the navigation links render with correct routerLink attributes
  it('should render the navigation links with correct routerLink attributes', () => {
    const links = [
      { text: 'Cohorts', route: '/cohorts' },
      { text: 'Biomarkers', route: '/biomarkers' },
      { text: 'StudyPicker', route: '/study-picker' },
      { text: 'Ethnicity', route: '/ethnicity' },
      { text: 'Mappings', route: '/mappings' },
      { text: 'Longitudinal', route: '/longitudinal' },
      { text: 'Tools', route: '/tools' },
      { text: 'Contact Us', route: '/contact-us' },
    ];

    links.forEach((link, index) => {
      const navLink = fixture.debugElement.queryAll(By.css('.nav li a'))[index];
      expect(navLink.nativeElement.textContent.trim()).toBe(link.text);
      expect(navLink.attributes['ng-reflect-router-link']).toBe(link.route);
    });
  });

  // Test to verify navigation to the correct route when a link is clicked
  it('should navigate to the correct route when a link is clicked', async () => {
    const links = fixture.debugElement.queryAll(
      By.directive(RouterLinkWithHref)
    );
    const cohortsLink = links.find(
      (de) => de.properties['href'] === '/cohorts'
    );

    if (cohortsLink) {
      cohortsLink.nativeElement.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(location.path()).toBe('/cohorts');
    }
  });
});

// Dummy component for routing
@Component({ template: '' })
class DummyComponent {}
