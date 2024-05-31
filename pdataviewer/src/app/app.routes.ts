import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { StudyPickerComponent } from './study-picker/study-picker.component';
import { MappingsComponent } from './mappings/mappings.component';
import { ImprintComponent } from './imprint/imprint.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'study-picker',
    component: StudyPickerComponent,
  },
  {
    path: 'mappings',
    component: MappingsComponent,
  },
  {
    path: 'imprint',
    component: ImprintComponent
  }
];
