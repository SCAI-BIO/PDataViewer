import type { LongitudinalData } from "../types";

export interface RetentionPoint {
  readonly months: number;
  readonly retentionPercent: number | null;
  readonly patientCount: number;
  readonly totalPatientCount: number;
}

export interface RetentionSeries {
  readonly name: string;
  readonly points: readonly RetentionPoint[];
}

export function getRetentionPercentage(
  data: Pick<LongitudinalData, "patientCount" | "totalPatientCount">,
): number | null {
  const { patientCount, totalPatientCount } = data;

  if (
    !Number.isSafeInteger(patientCount) ||
    !Number.isSafeInteger(totalPatientCount) ||
    patientCount < 0 ||
    totalPatientCount <= 0 ||
    patientCount > totalPatientCount
  ) {
    return null;
  }

  return (patientCount / totalPatientCount) * 100;
}

export function toRetentionPoints(
  data: readonly LongitudinalData[],
): RetentionPoint[] {
  return data
    .filter((point) => Number.isFinite(point.months))
    .map((point) => ({
      months: point.months,
      retentionPercent: getRetentionPercentage(point),
      patientCount: point.patientCount,
      totalPatientCount: point.totalPatientCount,
    }))
    .toSorted((a, b) => a.months - b.months);
}

export function createRetentionSeries(
  name: string,
  data: readonly LongitudinalData[],
): RetentionSeries {
  return {
    name,
    points: toRetentionPoints(data),
  };
}

export function groupRetentionByCohort(
  data: readonly LongitudinalData[],
): RetentionSeries[] {
  const groups = new Map<string, LongitudinalData[]>();

  for (const point of data) {
    if (!Number.isFinite(point.months)) continue;

    const group = groups.get(point.cohort) ?? [];
    group.push(point);
    groups.set(point.cohort, group);
  }

  return [...groups.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([cohort, points]) => createRetentionSeries(cohort, points));
}
