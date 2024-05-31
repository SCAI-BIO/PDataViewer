import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImprintComponent } from './imprint.component';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ImprintComponent', () => {
  let component: ImprintComponent;
  let fixture: ComponentFixture<ImprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ImprintComponent,
        NavBarComponent,
        FooterComponent,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}), // Mocked ActivatedRoute with observable params
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImprintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the Imprint component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the navigation component', () => {
    const navElement = fixture.debugElement.query(By.css('app-nav-bar'));
    expect(navElement).toBeTruthy();
  });

  it('should render the footer component', () => {
    const footerElement = fixture.debugElement.query(By.css('app-footer'));
    expect(footerElement).toBeTruthy();
  });

  it('should render the Legal section title', () => {
    const legalTitle = fixture.debugElement.query(By.css('h3')).nativeElement;
    expect(legalTitle.textContent).toContain('Legal');
  });

  it('should render the Imprint and Publishing Notes card', () => {
    const cardTitle = fixture.debugElement.query(
      By.css('.card-title')
    ).nativeElement;
    expect(cardTitle.textContent).toContain('Imprint and Publishing Notes');
  });

  it('should render the Data Protection card', () => {
    const cardTitles = fixture.debugElement.queryAll(By.css('.card-title'));
    expect(cardTitles[1].nativeElement.textContent).toContain(
      'Data Protection'
    );
  });

  it('should render the Terms and Conditions card', () => {
    const cardTitles = fixture.debugElement.queryAll(By.css('.card-title'));
    expect(cardTitles[2].nativeElement.textContent).toContain(
      'Fraunhofer SCAI Terms and Conditions'
    );
  });

  it('should have a link to imprint and publishing notes', () => {
    const imprintLink = fixture.debugElement.query(
      By.css(
        'a[href="https://www.scai.fraunhofer.de/en/publishing-notes.html"]'
      )
    );
    expect(imprintLink).toBeTruthy();
  });

  it('should have a link to data protection information', () => {
    const dataProtectionLink = fixture.debugElement.query(
      By.css('a[href="https://www.scai.fraunhofer.de/en/data_protection.html"]')
    );
    expect(dataProtectionLink).toBeTruthy();
  });

  it('should have a link to terms and conditions', () => {
    const termsLink = fixture.debugElement.query(
      By.css('a[href="https://www.scaiview.com/en/terms-and-conditions.html"]')
    );
    expect(termsLink).toBeTruthy();
  });
});
