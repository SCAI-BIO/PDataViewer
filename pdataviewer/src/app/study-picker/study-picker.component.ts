import { Component } from '@angular/core';

import { NavBarComponent } from '../nav-bar/nav-bar.component';

@Component({
  selector: 'app-study-picker',
  standalone: true,
  imports: [NavBarComponent],
  templateUrl: './study-picker.component.html',
  styleUrl: './study-picker.component.css'
})
export class StudyPickerComponent {

}
