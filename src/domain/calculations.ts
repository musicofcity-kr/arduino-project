import type { RawMeasurement, RawUnit, SensorPackId } from "./protocol";

export type DerivedMetric = "velocity" | "relativeTransmittance";

export interface CalculationInput {
  source: SensorPackId;
  metric: RawMeasurement["metric"];
  value: number;
  unit: RawUnit;
  timestampMs: number;
}

export interface DerivedMeasurement {
  provenance: "derived";
  source: "calculation";
  metric: DerivedMetric;
  value: number;
  unit: "m/s" | "%";
  timestampMs: number;
  formula: "delta-distance/delta-time" | "sample/reference*100";
  inputs: readonly CalculationInput[];
}

export type CalculationErrorCode =
  | "WRONG_SOURCE"
  | "WRONG_METRIC"
  | "INVALID_VALUE"
  | "INVALID_TIMESTAMP"
  | "INVALID_UNIT"
  | "UNIT_MISMATCH";

export type CalculationResult =
  | { ok: true; value: DerivedMeasurement }
  | { ok: false; error: { code: CalculationErrorCode; message: string } };

function calculationFail(code: CalculationErrorCode, message: string): CalculationResult {
  return { ok: false, error: { code, message } };
}

function copyInput(input: RawMeasurement): CalculationInput {
  return {
    source: input.source,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    timestampMs: input.timestampMs,
  };
}

function distanceInMeters(value: number, unit: RawUnit): number | null {
  if (unit === "m") return value;
  if (unit === "cm") return value / 100;
  if (unit === "mm") return value / 1_000;
  return null;
}

function validRawNumber(input: RawMeasurement): boolean {
  return Number.isFinite(input.value) && Number.isInteger(input.timestampMs) && input.timestampMs >= 0;
}

export function deriveVelocity(
  previous: RawMeasurement,
  current: RawMeasurement,
): CalculationResult {
  if (previous.source !== "hc-sr04" || current.source !== "hc-sr04") {
    return calculationFail("WRONG_SOURCE", "velocity requires two HC-SR04 measurements");
  }
  if (previous.metric !== "distance" || current.metric !== "distance") {
    return calculationFail("WRONG_METRIC", "velocity requires two distance measurements");
  }
  if (!validRawNumber(previous) || !validRawNumber(current)) {
    return calculationFail("INVALID_VALUE", "distance values and timestamps must be finite");
  }
  if (previous.value < 0 || current.value < 0) {
    return calculationFail("INVALID_VALUE", "distance cannot be negative");
  }

  const previousMeters = distanceInMeters(previous.value, previous.unit);
  const currentMeters = distanceInMeters(current.value, current.unit);
  if (previousMeters === null || currentMeters === null) {
    return calculationFail("INVALID_UNIT", "distance unit must be mm, cm, or m");
  }

  const elapsedMs = current.timestampMs - previous.timestampMs;
  if (elapsedMs <= 0) {
    return calculationFail("INVALID_TIMESTAMP", "current timestamp must be later than previous timestamp");
  }

  return {
    ok: true,
    value: {
      provenance: "derived",
      source: "calculation",
      metric: "velocity",
      value: (currentMeters - previousMeters) / (elapsedMs / 1_000),
      unit: "m/s",
      timestampMs: current.timestampMs,
      formula: "delta-distance/delta-time",
      inputs: [copyInput(previous), copyInput(current)],
    },
  };
}

export function deriveRelativeTransmittance(
  sample: RawMeasurement,
  reference: RawMeasurement,
): CalculationResult {
  if (sample.source !== "ldr" || reference.source !== "ldr") {
    return calculationFail("WRONG_SOURCE", "relative transmittance requires two LDR measurements");
  }
  if (sample.metric !== "relativeLight" || reference.metric !== "relativeLight") {
    return calculationFail("WRONG_METRIC", "relative transmittance requires relative light measurements");
  }
  if (!validRawNumber(sample) || !validRawNumber(reference)) {
    return calculationFail("INVALID_VALUE", "light values and timestamps must be finite");
  }
  if (sample.value < 0 || reference.value <= 0) {
    return calculationFail("INVALID_VALUE", "sample must be non-negative and reference must be positive");
  }
  if (sample.unit !== reference.unit) {
    return calculationFail("UNIT_MISMATCH", "sample and reference light units must match");
  }
  if (sample.unit !== "count" && sample.unit !== "relative") {
    return calculationFail("INVALID_UNIT", "LDR unit must be count or relative");
  }
  if (sample.timestampMs < reference.timestampMs) {
    return calculationFail("INVALID_TIMESTAMP", "sample timestamp cannot precede its reference");
  }

  return {
    ok: true,
    value: {
      provenance: "derived",
      source: "calculation",
      metric: "relativeTransmittance",
      value: (sample.value / reference.value) * 100,
      unit: "%",
      timestampMs: sample.timestampMs,
      formula: "sample/reference*100",
      inputs: [copyInput(sample), copyInput(reference)],
    },
  };
}

