import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { Subscription } from 'rxjs';

import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { environment } from '../../environments/environment';

import { ChordDiagramService } from '../services/chord-diagram.service';

@Component({
  selector: 'app-mappings',
  standalone: true,
  imports: [NavBarComponent, CommonModule],
  templateUrl: './mappings.component.html',
  styleUrl: './mappings.component.css',
})
export class MappingsComponent implements OnInit, OnDestroy {
  // API_URL for fetching data from the backend
  private API_URL = environment.API_URL;
  // Array to hold cohort names
  private cohorts: string[] = [];
  // Currently selected modality
  private modality: string = '';
  // Array to hold subscriptions to be cleaned up on destroy
  private subscriptions: Subscription[] = [];
  // Array to hold available modalities
  public modalities: string[] = [];
  // Array to hold chunks of data for creating chord diagrams
  public dataChunks: any[] = [];

  // Inject HttpClient for making HTTP requests
  // Inject ChordDiagramService for handling chord diagram creation
  constructor(
    private http: HttpClient,
    private chordService: ChordDiagramService
  ) {}

  // Lifecycle hook that runs when the component is initialized
  ngOnInit(): void {
    this.fetchModalities(); // Fetch the available modalities
    this.fetchCohorts(); // Fetch the available cohorts
  }

  // Lifecycle hook that runs when the component is destroyed
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // Handler for modality click events
  onModalityClick(modality: string): void {
    this.modality = modality; // Set the current modality
    this.fetchData(); // Fetch data for the selected modality
  }

  // Fetch the available modalities from the backend
  private fetchModalities(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/cdm/modalities`)
      .subscribe({
        next: (v) => {
          this.modalities = v;
        },
        error: (e) => console.error('Error fetching the modalities:', e),
        complete: () => console.info('Modalities fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }

  // Fetch the available cohorts from the backend
  private fetchCohorts(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/cdm/cohorts`)
      .subscribe({
        next: (v) => {
          this.cohorts = v;
        },
        error: (e) => console.error('Error fetching cohorts:', e),
        complete: () => console.info('Cohorts fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }

  // Fetch the chord diagram data for the selected modality and cohorts
  private fetchData(): void {
    const request = {
      cohorts: this.cohorts,
      modality: this.modality,
    };
    const sub = this.http
      .post<any>(`${this.API_URL}/visualization/chords/`, request)
      .subscribe({
        next: (v) => {
          this.dataChunks = this.chordService.chunkData(v, 50); // Chunk the data
          this.chordService.createChordDiagrams(this.dataChunks); // Create the chord diagrams
        },
        error: (e) => console.error('Error fetching chord data:', e),
        complete: () =>
          console.info('Chord diagram data fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }
}
