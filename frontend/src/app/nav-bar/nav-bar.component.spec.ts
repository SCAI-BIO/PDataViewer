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

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture = TestBed.createComponent(NavBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the nav-bar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the logo with correct src and alt attributes', () => {
    const logoElement = fixture.debugElement.query(By.css('.img-fluid'));
    expect(logoElement.nativeElement.src).toContain('assets/logos/logo.png');
    expect(logoElement.nativeElement.alt).toBe('pdataviewer-logo');
  });

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

@Component({
    template: '',
    standalone: false
})
class DummyComponent {}
