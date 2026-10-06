import type { CohortData } from '@shared/interfaces/metadata';
import { sortCohorts } from './cohort-sort';

// The API permits null counts, even though the existing frontend interface does not.
function cohort(name: string, participants: number | null): CohortData {
  return {
    cohort: name,
    participants,
    controlParticipants: 0,
    prodromalParticipants: 0,
    pdParticipants: 0,
    longitudinalParticipants: 0,
    followUpInterval: '',
    location: '',
    doi: '',
    link: '',
    color: '#610030',
  } as CohortData;
}

describe('sortCohorts', () => {
  it('sorts counts numerically without mutating the original data', () => {
    const rows = [cohort('Large', 1000), cohort('Small', 20), cohort('Medium', 300)];
    expect(sortCohorts(rows, 'participants', 'asc').map((row) => row.cohort)).toEqual([
      'Small',
      'Medium',
      'Large',
    ]);
    expect(rows.map((row) => row.cohort)).toEqual(['Large', 'Small', 'Medium']);
  });

  it('keeps unknown counts last in both directions and preserves zero', () => {
    const rows = [cohort('Unknown', null), cohort('Zero', 0), cohort('Known', 20)];
    expect(sortCohorts(rows, 'participants', 'asc').map((row) => row.cohort)).toEqual([
      'Zero',
      'Known',
      'Unknown',
    ]);
    expect(sortCohorts(rows, 'participants', 'desc').map((row) => row.cohort)).toEqual([
      'Known',
      'Zero',
      'Unknown',
    ]);
  });

  it('uses cohort names to break ties deterministically', () => {
    const rows = [cohort('Beta', 20), cohort('Alpha', 20)];
    expect(sortCohorts(rows, 'participants', 'desc').map((row) => row.cohort)).toEqual([
      'Alpha',
      'Beta',
    ]);
  });

  it('supports natural ordering of numbered cohort names', () => {
    const rows = [cohort('Study 10', 20), cohort('Study 2', 20)];
    expect(sortCohorts(rows, 'cohort', 'asc').map((row) => row.cohort)).toEqual([
      'Study 2',
      'Study 10',
    ]);
  });
});
