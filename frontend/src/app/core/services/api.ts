import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';

import type { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import type { BiomarkerDataRequest } from '@shared/interfaces/biomarker';
import type { ChordData } from '@shared/interfaces/chord-diagram';
import type { LongitudinalData } from '@shared/interfaces/longitudinal-data';
import type { Metadata } from '@shared/interfaces/metadata';
import type { RankData } from '@shared/interfaces/rankdata';

@Service()
export class Api {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  fetchBiomarkerData({ biomarker, cohort, diagnosis }: BiomarkerDataRequest): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/biomarkers/cohorts/${encodeURIComponent(cohort)}` +
        `/diagnoses/${encodeURIComponent(diagnosis)}`,
      { params: { biomarker } },
    );
  }

  fetchBiomarkers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers/`);
  }

  fetchChordsData(modality: string): Observable<ChordData> {
    return this.http.get<ChordData>(`${this.apiUrl}/visualization/chords/`, {
      params: { modality },
    });
  }

  fetchCohorts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cohorts/`);
  }

  fetchCohortsForBiomarker(biomarker: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers/cohorts`, {
      params: { biomarker },
    });
  }

  fetchDiagnosesForBiomarker(biomarker: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biomarkers/diagnoses`, {
      params: { biomarker },
    });
  }

  fetchVariables(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cdm/variables`);
  }

  fetchLongitudinalTable(tableName: string): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.apiUrl}/longitudinal/${encodeURIComponent(tableName)}`,
    );
  }

  fetchLongitudinalTableForCohort(
    tableName: string,
    cohortName: string,
  ): Observable<LongitudinalData[]> {
    return this.http.get<LongitudinalData[]>(
      `${this.apiUrl}/longitudinal/${encodeURIComponent(tableName)}/${encodeURIComponent(
        cohortName,
      )}`,
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
    return this.http.post<RankData[]>(`${this.apiUrl}/study-picker/rank`, variables);
  }
}
