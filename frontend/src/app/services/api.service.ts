import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { Metadata } from '../interfaces/metadata';
import { environment } from '../../environments/environment';
import { LongitudinalData } from '../interfaces/longitudinal-data';
import { ChordData } from '../interfaces/chord';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly API_URL = environment.API_URL;
  private http = inject(HttpClient);

  fetchBiomarkerData(
    biomarker: string,
    cohort: string,
    diagnosis: string
  ): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.API_URL}/biomarkers/${biomarker}/cohorts/${cohort}/diagnoses/${diagnosis}`
    );
  }

  fetchBiomarkers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/biomarkers`);
  }

  fetchChordsData(request: {
    cohorts: string[];
    modality: string;
  }): Observable<ChordData> {
    return this.http.post<ChordData>(
      `${this.API_URL}/visualization/chords/`,
      request
    );
  }

  fetchCohorts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/cdm/cohorts`);
  }

  fetchCohortsForBiomarker(biomarker: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.API_URL}/biomarkers/${biomarker}/cohorts`
    );
  }

  fetchDiagnosesForBiomarker(
    biomarker: string
  ): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(
      `${this.API_URL}/biomarkers/${biomarker}/diagnoses`
    );
  }

  fetchFeatures(): Observable<{ Feature: string[] }> {
    return this.http.get<{ Feature: string[] }>(`${this.API_URL}/cdm/features`);
  }

  fetchLongitudinalTable(tableName: string): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.API_URL}/longitudinal/${tableName}`
    );
  }

  fetchLongitudinalTableForCohort(
    tableName: string,
    cohortName: string
  ): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.API_URL}/longitudinal/${tableName}/${cohortName}`
    );
  }

  fetchLongitudinalTables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/longitudinal`);
  }

  fetchMetadata(): Observable<Metadata> {
    return this.http.get<Metadata>(`${this.API_URL}/cohorts/metadata`);
  }

  fetchModalities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/cdm/modalities`);
  }
}
