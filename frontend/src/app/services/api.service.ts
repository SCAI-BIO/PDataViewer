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

  fetchBiomarkerData(biomarker: string, cohort: string, diagnosis: string): Observable<number[]> {
    const params = new HttpParams()
      .set('biomarker', biomarker)
      .set('cohort', cohort)
      .set('diagnosis', diagnosis);
    return this.http.get<number[]>(
      `${this.apiUrl}/biomarkers/cohorts/${encodeURIComponent(
        cohort
      )}/diagnoses/${encodeURIComponent(diagnosis)}`,
      { params }
    );
  }

  fetchBiomarkers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers/`);
  }

  fetchChordsData(modality: string): Observable<ChordData> {
    const params = new HttpParams().set('modality', modality);
    return this.http.get<ChordData>(`${this.apiUrl}/visualization/chords/`, {
      params,
    });
  }

  fetchCohorts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cohorts/`);
  }

  fetchCohortsForBiomarker(biomarker: string): Observable<string[]> {
    const params = new HttpParams().set('biomarker', biomarker);
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers/cohorts`, {
      params,
    });
  }

  fetchDiagnosesForBiomarker(biomarker: string): Observable<string[]> {
    const params = new HttpParams().set('biomarker', biomarker);
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers/diagnoses`, {
      params,
    });
  }

  fetchVariables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cdm/variables`);
  }

  fetchLongitudinalTable(tableName: string): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.apiUrl}/longitudinal/${encodeURIComponent(tableName)}`
    );
  }

  fetchLongitudinalTableForCohort(
    tableName: string,
    cohortName: string
  ): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.apiUrl}/longitudinal/${encodeURIComponent(tableName)}/${encodeURIComponent(
        cohortName
      )}`
    );
  }

  fetchLongitudinalTables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/longitudinal/`);
  }

  fetchMetadata(): Observable<Metadata> {
    return this.http.get<Metadata>(`${this.apiUrl}/cohorts/metadata`);
  }

  fetchModalities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cdm/modalities`);
  }

  fetchRankings(variables: string[]): Observable<RankData[]> {
    return this.http.post<RankData[]>(`${this.apiUrl}/studypicker/rank`, variables);
  }
}
