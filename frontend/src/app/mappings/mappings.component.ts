import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChordDiagramService } from '../services/chord-diagram.service';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-mappings',
  standalone: true,
  imports: [CommonModule, MatSliderModule],
  templateUrl: './mappings.component.html',
  styleUrl: './mappings.component.css',
})
export class MappingsComponent implements OnInit, OnDestroy {
  modalitiesToCapitalize: string[] = ['apoe', 'csf', 'dti', 'pet'];
  public dataChunks: any[] = [];
  public maxFeatures: number = 50;
  public modalities: string[] = [];
  public noData: boolean = false;
  selectedModality: string = '';
  private API_URL = environment.API_URL;
  private cohorts: string[] = [];
  private modality: string = '';
  private subscriptions: Subscription[] = [];
  private sliderChange$: Subject<number> = new Subject<number>();

  constructor(
    private chordService: ChordDiagramService,
    private http: HttpClient
  ) {}

  formatModality(modality: string): string {
    if (modality.toLowerCase() === 'datscan') {
      return 'DaT Scan';
    } else if (this.shouldCapitalize(modality)) {
      return modality.toUpperCase();
    } else {
      return this.toTitleCase(modality);
    }
  }

  ngOnInit(): void {
    this.fetchModalities();
    this.fetchCohorts();

    this.chordService.loadColors().subscribe((colors) => {
      this.chordService.setColors(colors);
    });

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
    this.fetchData();
  }

  onSliderChange(event: any): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.sliderChange$.next(value);
  }

  shouldCapitalize(modality: string): boolean {
    return this.modalitiesToCapitalize.includes(modality.toLowerCase());
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
          this.dataChunks = this.chordService.chunkData(v, this.maxFeatures);
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
