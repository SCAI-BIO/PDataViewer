import { Component, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-nav-bar',
    imports: [MatButtonModule, MatMenuModule, RouterModule],
    templateUrl: './nav-bar.component.html',
    styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent {
  isToolsMenuOpen: boolean = false;

  openToolsMenu() {
    this.isToolsMenuOpen = true;
  }

  closeToolsMenu() {
    this.isToolsMenuOpen = false;
  }
}
