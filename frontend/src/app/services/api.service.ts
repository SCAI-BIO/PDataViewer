import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { Metadata } from '../interfaces/metadata';
import { environment } from '../../environments/environment';

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

  fetchMetadata(): Observable<Metadata> {
    return this.http.get<Metadata>(`${this.API_URL}/cohorts/metadata`);
  }
}
