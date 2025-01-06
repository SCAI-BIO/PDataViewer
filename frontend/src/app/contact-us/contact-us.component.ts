import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-contact-us',
    imports: [MatCardModule, MatButtonModule, MatIconModule],
    templateUrl: './contact-us.component.html',
    styleUrl: './contact-us.component.css'
})
export class ContactUsComponent {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.matIconRegistry.addSvgIcon(
      'x',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/social-media/x.svg'
      )
    );
    this.matIconRegistry.addSvgIcon(
      'orcid',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/social-media/orcid.svg'
      )
    );
    this.matIconRegistry.addSvgIcon(
      'linkedin',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/social-media/linkedin.svg'
      )
    );
    this.matIconRegistry.addSvgIcon(
      'google-scholar',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/social-media/google-scholar.svg'
      )
    );
    this.matIconRegistry.addSvgIcon(
      'stack-overflow',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/social-media/stack-overflow.svg'
      )
    );
    this.matIconRegistry.addSvgIcon(
      'github',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/social-media/github.svg'
      )
    );
  }
}
