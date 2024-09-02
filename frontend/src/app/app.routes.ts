import { Routes } from '@angular/router';
import { AutoHarmonizerComponent } from './auto-harmonizer/auto-harmonizer.component';
import { BiomarkersComponent } from './biomarkers/biomarkers.component';
import { CohortsComponent } from './cohorts/cohorts.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { HomeComponent } from './home/home.component';
import { LongitudinalComponent } from './longitudinal/longitudinal.component';
import { MappingsComponent } from './mappings/mappings.component';
import { ImprintComponent } from './imprint/imprint.component';
import { PlotLongitudinalComponent } from './plot-longitudinal/plot-longitudinal.component';
import { StudyPickerComponent } from './study-picker/study-picker.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'auto-harmonizer',
    component: AutoHarmonizerComponent,
  },
  {
    path: 'biomarkers',
    component: BiomarkersComponent,
  },
  {
    path: 'cohorts',
    component: CohortsComponent,
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
  },
  {
    path: 'longitudinal',
    component: LongitudinalComponent,
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
    path: 'plot-longitudinal',
    component: PlotLongitudinalComponent,
  },
  {
    path: 'study-picker',
    component: StudyPickerComponent,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
