export interface BoxplotStatistics {
  readonly n: number;
  readonly excludedCount: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly iqr: number;
  readonly lowerWhisker: number;
  readonly upperWhisker: number;
  readonly mean: number;
  readonly standardDeviation: number | null;
  readonly outliers: readonly number[];
  readonly values: readonly number[];
}

function quantile(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  const position = Math.max(0, Math.min(n - 1, n * p - 0.5));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const lowerValue = sorted[lower];
  const upperValue = sorted[upper];
  return lowerValue + (upperValue - lowerValue) * (position - lower);
}

function calculateMeanAndSD(values: readonly number[]) {
  let mean = 0;
  let m2 = 0;

  for (let i = 0; i < values.length; i++) {
    const delta = values[i] - mean;
    mean += delta / (i + 1);
    m2 += delta * (values[i] - mean);
  }

  return {
    mean,
    standardDeviation:
      values.length > 1 ? Math.sqrt(m2 / (values.length - 1)) : null,
  };
}

export function calculateBoxplotStatistics(
  observations: readonly number[],
): BoxplotStatistics | null {
  const values = observations
    .filter((value) => Number.isFinite(value))
    .toSorted((a, b) => a - b);

  const n = values.length;

  if (n === 0) {
    return null;
  }

  const q1 = quantile(values, 0.25);
  const median = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lowerLimit = q1 - 1.5 * iqr;
  const upperLimit = q3 + 1.5 * iqr;

  const inliers = values.filter(
    (value) => value >= lowerLimit && value <= upperLimit,
  );

  const outliers = values.filter(
    (value) => value < lowerLimit || value > upperLimit,
  );

  if (inliers.length === 0) {
    return null;
  }

  const { mean, standardDeviation } = calculateMeanAndSD(values);

  return {
    n,
    excludedCount: observations.length - n,
    q1,
    median,
    q3,
    iqr,
    lowerWhisker: inliers[0],
    upperWhisker: inliers[inliers.length - 1],
    mean,
    standardDeviation,
    outliers,
    values,
  };
}

export function toBoxplotTuple(
  stats: BoxplotStatistics,
): [number, number, number, number, number] {
  return [
    stats.lowerWhisker,
    stats.q1,
    stats.median,
    stats.q3,
    stats.upperWhisker,
  ];
}
