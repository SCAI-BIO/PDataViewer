import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { StudyPickerComponent } from './study-picker/study-picker.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'study-picker',
    component: StudyPickerComponent,
  },
];
