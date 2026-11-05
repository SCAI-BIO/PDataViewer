/** Aggregated selections for one recorded race label. */
export interface RaceDistributionData {
  readonly name: string;
  readonly value: number;
  readonly validCount: number;
  readonly unknownCount: number;
  readonly missingCount: number;
}
