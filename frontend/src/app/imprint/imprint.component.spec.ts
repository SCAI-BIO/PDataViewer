import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImprintComponent } from './imprint.component';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { FooterComponent } from '../footer/footer.component';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ImprintComponent', () => {
  let component: ImprintComponent;
  let fixture: ComponentFixture<ImprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserModule,
        BrowserAnimationsModule,
        NoopAnimationsModule,
        MatCardModule,
        MatToolbarModule,
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

  it('should render the Legal section title', () => {
    const legalTitle = fixture.debugElement.query(By.css('h1')).nativeElement;
    expect(legalTitle.textContent).toContain('Legal');
  });

  it('should render the Imprint and Publishing Notes card', () => {
    const cardTitle = fixture.debugElement.query(
      By.css('mat-card-title')
    ).nativeElement;
    expect(cardTitle.textContent).toContain('Imprint and Publishing Notes');
  });

  it('should render the Data Protection card', () => {
    const cardTitles = fixture.debugElement.queryAll(By.css('mat-card-title'));
    expect(cardTitles[1].nativeElement.textContent).toContain(
      'Data Protection'
    );
  });

  it('should render the Terms and Conditions card', () => {
    const cardTitles = fixture.debugElement.queryAll(By.css('mat-card-title'));
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
