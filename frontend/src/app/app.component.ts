import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from './footer/footer.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, NavBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'pdataviewer';
}
