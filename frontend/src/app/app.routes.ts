import { Routes } from '@angular/router';

import { Biomarkers } from '@features/biomarkers/biomarkers';
import { Cohorts } from '@features/cohorts/cohorts';
import { ContactUs } from '@features/contact-us/contact-us';
import { Home } from '@features/home/home';
import { Longitudinal } from '@features/longitudinal/longitudinal';
import { Mappings } from '@features/mappings/mappings';
import { PlotLongitudinal } from '@features/plot-longitudinal/plot-longitudinal';
import { StudyPicker } from '@features/study-picker/study-picker';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    pathMatch: 'full',
  },
  {
    path: 'biomarkers',
    component: Biomarkers,
  },
  {
    path: 'cohorts',
    component: Cohorts,
  },
  {
    path: 'contact-us',
    component: ContactUs,
  },
  {
    path: 'longitudinal',
    component: Longitudinal,
  },
  {
    path: 'mappings',
    component: Mappings,
  },
  {
    path: 'plot-longitudinal',
    component: PlotLongitudinal,
  },
  {
    path: 'study-picker',
    component: StudyPicker,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
