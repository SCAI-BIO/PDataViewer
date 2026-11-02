import { describe, expect, it } from "vitest";

import { calculateBoxplotStatistics, toBoxplotTuple } from "./statistics";

describe("calculateBoxplotStatistics", () => {
  it("calculates Plotly-compatible quartiles for odd samples", () => {
    const stats = calculateBoxplotStatistics([1, 2, 3, 4, 5]);

    expect(stats).not.toBeNull();
    expect(stats?.q1).toBe(1.75);
    expect(stats?.median).toBe(3);
    expect(stats?.q3).toBe(4.25);
    expect(stats?.iqr).toBe(2.5);
  });

  it("calculates quartiles for even samples", () => {
    const stats = calculateBoxplotStatistics([1, 2, 3, 4]);

    expect(stats?.q1).toBe(1.5);
    expect(stats?.median).toBe(2.5);
    expect(stats?.q3).toBe(3.5);
  });

  it("identifies outliers and uses observed whiskers", () => {
    const stats = calculateBoxplotStatistics([1, 2, 3, 4, 5, 100]);

    expect(stats?.lowerWhisker).toBe(1);
    expect(stats?.upperWhisker).toBe(5);
    expect(stats?.outliers).toEqual([100]);
    expect(stats?.n).toBe(6);
  });

  it("detects lower and upper outliers", () => {
    const stats = calculateBoxplotStatistics([-100, 1, 2, 3, 4, 5, 6, 100]);

    expect(stats?.lowerWhisker).toBe(1);
    expect(stats?.upperWhisker).toBe(6);
    expect(stats?.outliers).toEqual([-100, 100]);
  });

  it("handles constant distributions", () => {
    const stats = calculateBoxplotStatistics([5, 5, 5, 5]);

    expect(stats?.q1).toBe(5);
    expect(stats?.median).toBe(5);
    expect(stats?.q3).toBe(5);
    expect(stats?.iqr).toBe(0);
    expect(stats?.lowerWhisker).toBe(5);
    expect(stats?.upperWhisker).toBe(5);
    expect(stats?.outliers).toEqual([]);
    expect(stats?.standardDeviation).toBe(0);
  });

  it("detects outliers with zero IQR", () => {
    const stats = calculateBoxplotStatistics([5, 5, 5, 5, 5, 100]);

    expect(stats?.iqr).toBe(0);
    expect(stats?.upperWhisker).toBe(5);
    expect(stats?.outliers).toEqual([100]);
  });

  it("calculates sample mean and standard deviation", () => {
    const stats = calculateBoxplotStatistics([1, 2, 3, 4, 5]);

    expect(stats?.mean).toBe(3);
    expect(stats?.standardDeviation).toBeCloseTo(Math.sqrt(2.5));
  });

  it("handles a single observation", () => {
    const stats = calculateBoxplotStatistics([42]);

    expect(stats?.n).toBe(1);
    expect(stats?.q1).toBe(42);
    expect(stats?.median).toBe(42);
    expect(stats?.q3).toBe(42);
    expect(stats?.lowerWhisker).toBe(42);
    expect(stats?.upperWhisker).toBe(42);
    expect(stats?.standardDeviation).toBeNull();
    expect(stats?.outliers).toEqual([]);
  });

  it("excludes nonfinite values", () => {
    const stats = calculateBoxplotStatistics([
      1,
      NaN,
      2,
      Infinity,
      3,
      -Infinity,
    ]);

    expect(stats?.n).toBe(3);
    expect(stats?.excludedCount).toBe(3);
    expect(stats?.values).toEqual([1, 2, 3]);
    expect(stats?.median).toBe(2);
  });

  it("returns null for empty or invalid datasets", () => {
    expect(calculateBoxplotStatistics([])).toBeNull();
    expect(calculateBoxplotStatistics([NaN, Infinity])).toBeNull();
  });

  it("does not mutate the original measurements", () => {
    const observations = Object.freeze([5, 1, 4, 2, 3]);

    const stats = calculateBoxplotStatistics(observations);

    expect(observations).toEqual([5, 1, 4, 2, 3]);
    expect(stats?.values).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("toBoxplotTuple", () => {
  it("returns ECharts-compatible five-number data", () => {
    const stats = calculateBoxplotStatistics([1, 2, 3, 4]);

    expect(stats).not.toBeNull();

    if (!stats) return;

    expect(toBoxplotTuple(stats)).toEqual([1, 1.5, 2.5, 3.5, 4]);
  });
});
