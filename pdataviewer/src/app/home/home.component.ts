import { Component } from '@angular/core';

import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FooterComponent, NavBarComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
