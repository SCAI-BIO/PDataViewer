import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxPageScrollCoreModule } from 'ngx-page-scroll-core';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterModule, NgxPageScrollCoreModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {

}
