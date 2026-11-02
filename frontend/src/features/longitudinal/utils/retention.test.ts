import { describe, expect, it } from "vitest";

import type { LongitudinalData } from "../types";
import {
  createRetentionSeries,
  getRetentionPercentage,
  groupRetentionByCohort,
  toRetentionPoints,
} from "./retention";

function sample(overrides: Partial<LongitudinalData> = {}): LongitudinalData {
  return {
    months: 0,
    cohort: "PPMI",
    patientCount: 80,
    totalPatientCount: 100,
    ...overrides,
  };
}

describe("getRetentionPercentage", () => {
  it("calculates the correct percentage", () => {
    expect(getRetentionPercentage(sample())).toBe(80);
  });

  it("preserves decimal precision", () => {
    expect(
      getRetentionPercentage(sample({ patientCount: 1, totalPatientCount: 3 })),
    ).toBeCloseTo(33.333333, 5);
  });

  it("accepts zero participants", () => {
    expect(getRetentionPercentage(sample({ patientCount: 0 }))).toBe(0);
  });

  it("accepts 100% retention", () => {
    expect(getRetentionPercentage(sample({ patientCount: 100 }))).toBe(100);
  });

  it.each([
    { patientCount: 50, totalPatientCount: 0 },
    { patientCount: 50, totalPatientCount: -1 },
    { patientCount: -1, totalPatientCount: 100 },
    { patientCount: 101, totalPatientCount: 100 },
    { patientCount: NaN, totalPatientCount: 100 },
    { patientCount: Infinity, totalPatientCount: 100 },
    { patientCount: 20.5, totalPatientCount: 100 },
  ])("rejects invalid counts: %j", (counts) => {
    expect(getRetentionPercentage(counts)).toBeNull();
  });
});

describe("toRetentionPoints", () => {
  it("sorts measurements chronologically", () => {
    const data = [
      sample({ months: 12 }),
      sample({ months: 0 }),
      sample({ months: 6 }),
    ];

    const points = toRetentionPoints(data);

    expect(points.map((point) => point.months)).toEqual([0, 6, 12]);

    // Verify that the input order is unchanged.
    expect(data.map((point) => point.months)).toEqual([12, 0, 6]);
  });

  it("preserves invalid retention as a gap", () => {
    const points = toRetentionPoints([
      sample({ months: 0, patientCount: 100 }),
      sample({ months: 6, patientCount: 120 }),
      sample({ months: 12, patientCount: 60 }),
    ]);

    expect(points.map((point) => point.retentionPercent)).toEqual([
      100,
      null,
      60,
    ]);
  });

  it("excludes nonfinite time coordinates", () => {
    const points = toRetentionPoints([
      sample({ months: 0 }),
      sample({ months: NaN }),
      sample({ months: Infinity }),
      sample({ months: 6 }),
    ]);

    expect(points.map((point) => point.months)).toEqual([0, 6]);
  });

  it("handles empty input", () => {
    expect(toRetentionPoints([])).toEqual([]);
  });
});

describe("createRetentionSeries", () => {
  it("uses the supplied name as the series label", () => {
    const series = createRetentionSeries("Age", [
      sample({ months: 6 }),
      sample({ months: 0 }),
    ]);

    expect(series.name).toBe("Age");
    expect(series.points.map((point) => point.months)).toEqual([0, 6]);
  });
});

describe("groupRetentionByCohort", () => {
  it("groups and sorts cohorts independently", () => {
    const data = [
      sample({ cohort: "PPMI", months: 12 }),
      sample({ cohort: "BIOFIND", months: 6 }),
      sample({ cohort: "PPMI", months: 0 }),
    ];

    const series = groupRetentionByCohort(data);

    expect(series.map((item) => item.name)).toEqual(["BIOFIND", "PPMI"]);

    expect(
      series
        .find((item) => item.name === "PPMI")
        ?.points.map((point) => point.months),
    ).toEqual([0, 12]);
  });

  it("returns no series for empty data", () => {
    expect(groupRetentionByCohort([])).toEqual([]);
  });
});
