import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly navigation = [
    { path: '/cohorts', label: 'Cohorts' },
    { path: '/biomarkers', label: 'Biomarkers' },
    { path: '/study-picker', label: 'Study Picker' },
    { path: '/mappings', label: 'Mappings' },
    { path: '/longitudinal', label: 'Longitudinal' },
    { path: '/contact-us', label: 'Contact Us' },
  ];
}
