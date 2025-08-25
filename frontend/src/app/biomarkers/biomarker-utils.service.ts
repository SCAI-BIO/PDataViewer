import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BiomarkerUtilsService {
  filterBiomarkers(biomarkers: string[], value: string): string[] {
    const filterValue = value.toLowerCase();
    return biomarkers.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  filterDiagnoses(
    value: string,
    diagnoses: Record<string, string[]>
  ): string[] {
    const filterValue = value.toLowerCase();
    const transformedDiagnoses = this.transformDiagnoses(diagnoses);
    return transformedDiagnoses.filter((diagnosis) =>
      diagnosis.toLowerCase().includes(filterValue)
    );
  }

  transformBiomarkerName(
    originalVariableNameMappings: Record<string, string>,
    biomarker: string
  ): string {
    if (biomarker.startsWith('biomarkers_')) {
      biomarker = biomarker.substring(11);
    }
    const mappedValue = originalVariableNameMappings[biomarker];
    return mappedValue
      ? mappedValue
      : biomarker.charAt(0).toUpperCase() + biomarker.slice(1);
  }

  transformDiagnoses(diagnoses: Record<string, string[]>): string[] {
    const transformedDiagnoses = Object.entries(diagnoses).flatMap(
      ([cohort, diagnoses]) =>
        diagnoses.map((diagnosis) =>
          diagnosis === 'Complete'
            ? `${cohort} (${diagnosis})`
            : `${cohort} (${diagnosis} Group)`
        )
    );
    return transformedDiagnoses;
  }

  splitDiagnosis(cohort_and_diagnosis: string): {
    cohort: string;
    diagnosis: string;
  } {
    const parts = cohort_and_diagnosis.split('(');
    const cohortPart = parts[0].trim();
    const diagnosisPart = parts[1].replace('Group', '').replace(')', '').trim();

    return {
      cohort: cohortPart,
      diagnosis: diagnosisPart,
    };
  }
}
