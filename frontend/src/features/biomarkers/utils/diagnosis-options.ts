import type { BiomarkerDiagnosisOption } from "../types";

export function parseDiagnosisOption(
  label: string,
  cohorts: readonly string[],
): BiomarkerDiagnosisOption | null {
  const cohort = [...cohorts]
    .toSorted((a, b) => b.length - a.length)
    .find((name) => label.startsWith(`${name} (`) && label.endsWith(")"));

  if (!cohort) return null;

  const suffix = label.slice(cohort.length + 2, -1);

  const diagnosis =
    suffix === "Complete"
      ? "Complete"
      : suffix.endsWith(" Group")
        ? suffix.slice(0, -" Group".length).trim()
        : "";

  if (!diagnosis) return null;

  return {
    label,
    cohort,
    diagnosis,
  };
}

export function parseDiagnosisOptions(
  labels: readonly string[],
  cohorts: readonly string[],
): BiomarkerDiagnosisOption[] {
  return labels.flatMap((label) => {
    const option = parseDiagnosisOption(label, cohorts);
    return option ? [option] : [];
  });
}
