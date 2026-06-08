import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinnerModule],
  templateUrl: './loading-spinner.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './loading-spinner.scss',
})
export class LoadingSpinner {}
