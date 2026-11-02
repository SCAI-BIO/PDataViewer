import { describe, expect, it } from "vitest";

import {
  parseDiagnosisOption,
  parseDiagnosisOptions,
} from "./diagnosis-options";

describe("parseDiagnosisOption", () => {
  it("parses a diagnosis group", () => {
    expect(parseDiagnosisOption("PPMI (PD Group)", ["PPMI"])).toEqual({
      label: "PPMI (PD Group)",
      cohort: "PPMI",
      diagnosis: "PD",
    });
  });

  it("recognizes Complete diagnoses", () => {
    expect(parseDiagnosisOption("PPMI (Complete)", ["PPMI"])).toEqual({
      label: "PPMI (Complete)",
      cohort: "PPMI",
      diagnosis: "Complete",
    });
  });

  it("handles parentheses in cohort names", () => {
    expect(
      parseDiagnosisOption("Study (Extended) (Control Group)", [
        "Study",
        "Study (Extended)",
      ]),
    ).toEqual({
      label: "Study (Extended) (Control Group)",
      cohort: "Study (Extended)",
      diagnosis: "Control",
    });
  });

  it("preserves diagnosis names containing Group", () => {
    expect(
      parseDiagnosisOption("PPMI (Risk Group Group)", ["PPMI"]),
    ).toMatchObject({
      diagnosis: "Risk Group",
    });
  });

  it("rejects unrecognized options", () => {
    expect(parseDiagnosisOption("Unknown (PD Group)", ["PPMI"])).toBeNull();

    expect(parseDiagnosisOption("PPMI (Malformed)", ["PPMI"])).toBeNull();
  });

  it("filters invalid labels from a collection", () => {
    const options = parseDiagnosisOptions(
      ["PPMI (PD Group)", "Invalid", "PPMI (Complete)"],
      ["PPMI"],
    );

    expect(options).toHaveLength(2);
  });
});
