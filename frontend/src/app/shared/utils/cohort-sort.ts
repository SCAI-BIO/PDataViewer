import type { CohortData } from '@shared/interfaces/metadata';

export type CohortSortColumn =
  | 'cohort'
  | 'participants'
  | 'controlParticipants'
  | 'prodromalParticipants'
  | 'pdParticipants'
  | 'longitudinalParticipants'
  | 'location';

export type CohortSortDirection = 'asc' | 'desc';

export const COHORT_SORT_OPTIONS: readonly { value: CohortSortColumn; label: string }[] = [
  { value: 'cohort', label: 'Cohort name' },
  { value: 'participants', label: 'Participants' },
  { value: 'controlParticipants', label: 'Control participants' },
  { value: 'prodromalParticipants', label: 'Prodromal participants' },
  { value: 'pdParticipants', label: 'PD participants' },
  { value: 'longitudinalParticipants', label: 'Participants with two or more visits' },
  { value: 'location', label: 'Location' },
];

/** Keep missing values last in both directions; never mutate the API response. */
export function sortCohorts(
  rows: readonly CohortData[],
  column: CohortSortColumn,
  direction: CohortSortDirection,
): CohortData[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = a[column];
    const right = b[column];
    const leftMissing = left == null || left === '';
    const rightMissing = right == null || right === '';

    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;

    const compared = leftMissing
      ? 0
      : typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, {
            numeric: true,
            sensitivity: 'base',
          });

    return compared * factor || a.cohort.localeCompare(b.cohort);
  });
}
