import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChordDiagramService } from '../services/chord-diagram.service';
import { ChordData } from '../interfaces/chord-data';

@Component({
  selector: 'app-mappings',
  standalone: true,
  imports: [CommonModule, MatSliderModule],
  templateUrl: './mappings.component.html',
  styleUrl: './mappings.component.css',
})
export class MappingsComponent implements OnInit, OnDestroy {
  dataChunks: ChordData[] = [];
  // Maximum amount of features to display in a single chords diagram
  maxFeatures: number = 50;
  // Minimum amount of features for the min variable of the slider
  minFeatures: number = 20;
  modalities: string[] = [];
  noData: boolean = false;
  selectedModality: string = '';
  // Total number of features in the modality
  totalFeatures: number = 0;
  private API_URL = environment.API_URL;
  private cohorts: string[] = [];
  private modality: string = '';
  private subscriptions: Subscription[] = [];
  private sliderChange$: Subject<number> = new Subject<number>();

  constructor(
    private chordService: ChordDiagramService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.fetchModalities();
    this.fetchCohorts();

    // Load cohort data and set colors
    this.chordService.loadCohortData().subscribe({
      next: (cohortData) => {
        this.chordService.setColors(cohortData);
      },
      error: (error) => {
        console.error('Error loading cohort data:', error);
      },
    });

    // Debounce slider changes
    this.subscriptions.push(
      this.sliderChange$.pipe(debounceTime(300)).subscribe((value) => {
        this.maxFeatures = value;
        if (this.modality) {
          this.fetchData();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onModalityClick(modality: string): void {
    this.selectedModality = modality;
    this.modality = modality;
    this.maxFeatures = 50;
    this.fetchData();
  }

  onSliderChange(event: any): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.sliderChange$.next(value);
  }

  toTitleCase(modality: string): string {
    return modality.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
  }

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

  private fetchData(): void {
    const request = {
      cohorts: this.cohorts,
      modality: this.modality,
    };
    const sub = this.http
      .post<any>(`${this.API_URL}/visualization/chords/`, request)
      .subscribe({
        next: (v) => {
          this.chordService.initializeColorScale(v);
          // Adjust the maximum value of the slider
          if (v['nodes'].length > 100) {
            this.totalFeatures = 100;
          } else {
            // Round up totalFeatures for smooth scaling in the slider
            this.totalFeatures = Math.max(
              this.minFeatures,
              Math.ceil(v['nodes'].length / 10) * 10
            );
          }
          // Chunk the data based on the user adjusted value of the slider
          this.dataChunks = this.chordService.chunkData(v, this.maxFeatures);
          // Return no data message if all the chunks are empty
          this.noData = this.dataChunks.every(
            (chunk) => chunk.nodes.length === 0
          );
          if (!this.noData) {
            this.chordService.createChordDiagrams(this.dataChunks);
          }
        },
        error: (e) => console.error('Error fetching chord data:', e),
        complete: () =>
          console.info('Chord diagram data fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }

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
}
