const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(
  value: number | null | undefined,
  fallback = "N/R",
): string {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }

  return numberFormatter.format(value);
}

const measurementFormatter = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 5,
});

export function formatMeasurement(
  value: number | null | undefined,
  fallback = "N/R",
): string {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }

  return measurementFormatter.format(value);
}
