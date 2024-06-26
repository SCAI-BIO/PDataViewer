import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { StudyPickerComponent } from './study-picker/study-picker.component';
import { MappingsComponent } from './mappings/mappings.component';
import { ImprintComponent } from './imprint/imprint.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { CohortsComponent } from './cohorts/cohorts.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'cohorts',
    component: CohortsComponent,
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
    component: ImprintComponent,
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
