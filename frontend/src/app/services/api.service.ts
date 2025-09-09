import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { ChordData } from '../interfaces/chord-diagram';
import { LongitudinalData } from '../interfaces/longitudinal-data';
import { Metadata } from '../interfaces/metadata';
import { RankData } from '../interfaces/rankdata';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  fetchBiomarkerData(
    biomarker: string,
    cohort: string,
    diagnosis: string
  ): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/biomarkers/${biomarker}/cohorts/${cohort}/diagnoses/${diagnosis}`
    );
  }

  fetchBiomarkers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers`);
  }

  fetchChordsData(modality: string): Observable<ChordData> {
    const params = new HttpParams().set('modality', modality);
    return this.http.post<ChordData>(
      `${this.apiUrl}/visualization/chords/`,
      null,
      {
        params,
      }
    );
  }

  fetchCohorts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cohorts/`);
  }

  fetchCohortsForBiomarker(biomarker: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/biomarkers/${biomarker}/cohorts`
    );
  }

  fetchDiagnosesForBiomarker(
    biomarker: string
  ): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(
      `${this.apiUrl}/biomarkers/${biomarker}/diagnoses`
    );
  }

  fetchFeatures(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cdm/features`);
  }

  fetchLongitudinalTable(tableName: string): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.apiUrl}/longitudinal/${tableName}`
    );
  }

  fetchLongitudinalTableForCohort(
    tableName: string,
    cohortName: string
  ): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.apiUrl}/longitudinal/${tableName}/${cohortName}`
    );
  }

  fetchLongitudinalTables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/longitudinal`);
  }

  fetchMetadata(): Observable<Metadata> {
    return this.http.get<Metadata>(`${this.apiUrl}/cohorts/metadata`);
  }

  fetchModalities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cdm/modalities`);
  }

  fetchRankings(features: string[]): Observable<RankData[]> {
    return this.http.post<RankData[]>(
      `${this.apiUrl}/studypicker/rank`,
      features
    );
  }
}
