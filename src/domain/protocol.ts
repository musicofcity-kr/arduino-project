export const SENSOR_PACK_IDS = ["dht11", "hc-sr04", "ldr"] as const;

export type SensorPackId = (typeof SENSOR_PACK_IDS)[number];

export type RawMetric =
  | "temperature"
  | "humidity"
  | "distance"
  | "relativeLight";

export type RawUnit = "°C" | "%RH" | "mm" | "cm" | "m" | "count" | "relative";

export interface RawMeasurement {
  provenance: "raw";
  source: SensorPackId;
  metric: RawMetric;
  value: number;
  unit: RawUnit;
  timestampMs: number;
}

export interface PingMessage {
  kind: "ping";
}

export interface HeartbeatMessage {
  kind: "heartbeat";
  timestampMs: number | null;
}

export interface ModeMessage {
  kind: "mode";
  mode: SensorPackId;
}

export interface StopMessage {
  kind: "stop";
}

export interface AckMessage {
  kind: "ack";
  command: "PING" | "MODE" | "STOP" | "UNSPECIFIED";
  mode?: SensorPackId;
}

export interface DeviceErrorMessage {
  kind: "error";
  code: string;
  message: string;
}

export interface MeasurementMessage {
  kind: "measurement";
  sensor: SensorPackId;
  timestampMs: number;
  values: RawMeasurement[];
}

export type ProtocolMessage =
  | PingMessage
  | HeartbeatMessage
  | ModeMessage
  | StopMessage
  | AckMessage
  | DeviceErrorMessage
  | MeasurementMessage;

export type ProtocolParseErrorCode =
  | "EMPTY_INPUT"
  | "UNKNOWN_MESSAGE"
  | "INVALID_JSON"
  | "INVALID_FIELD"
  | "INVALID_SENSOR"
  | "INVALID_MEASUREMENT"
  | "INVALID_UNIT";

export interface ProtocolParseError {
  code: ProtocolParseErrorCode;
  message: string;
  raw: string;
}

export type ProtocolParseResult =
  | { ok: true; message: ProtocolMessage }
  | { ok: false; error: ProtocolParseError };

const MODE_TO_SENSOR: Readonly<Record<string, SensorPackId>> = {
  DHT11: "dht11",
  "HC-SR04": "hc-sr04",
  HC_SR04: "hc-sr04",
  LDR: "ldr",
};

const EXPECTED_METRICS: Readonly<Record<SensorPackId, readonly RawMetric[]>> = {
  dht11: ["temperature", "humidity"],
  "hc-sr04": ["distance"],
  ldr: ["relativeLight"],
};

const ALLOWED_UNITS: Readonly<Record<RawMetric, readonly string[]>> = {
  temperature: ["°C", "C"],
  humidity: ["%RH", "%"],
  distance: ["mm", "cm", "m"],
  relativeLight: ["count", "relative"],
};

const NORMALIZED_UNITS: Readonly<Record<string, RawUnit>> = {
  "°C": "°C",
  C: "°C",
  "%RH": "%RH",
  "%": "%RH",
  mm: "mm",
  cm: "cm",
  m: "m",
  count: "count",
  relative: "relative",
};

function fail(
  code: ProtocolParseErrorCode,
  message: string,
  raw: string,
): ProtocolParseResult {
  return { ok: false, error: { code, message, raw } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseSensor(value: unknown): SensorPackId | null {
  if (typeof value !== "string") return null;
  if ((SENSOR_PACK_IDS as readonly string[]).includes(value)) {
    return value as SensorPackId;
  }
  return MODE_TO_SENSOR[value.toUpperCase()] ?? null;
}

function parseTextMessage(raw: string): ProtocolParseResult {
  if (raw === "PING") return { ok: true, message: { kind: "ping" } };

  const heartbeat = /^HEARTBEAT(?::(\d+))?$/.exec(raw);
  if (heartbeat) {
    const timestampMs = heartbeat[1] === undefined ? null : Number(heartbeat[1]);
    if (timestampMs !== null && !Number.isSafeInteger(timestampMs)) {
      return fail("INVALID_FIELD", "heartbeat timestamp must be safe integer milliseconds", raw);
    }
    return { ok: true, message: { kind: "heartbeat", timestampMs } };
  }

  const mode = /^MODE:([^:]+)$/.exec(raw);
  if (mode) {
    const sensor = parseSensor(mode[1]);
    return sensor
      ? { ok: true, message: { kind: "mode", mode: sensor } }
      : fail("INVALID_SENSOR", "MODE contains an unsupported sensor pack", raw);
  }

  if (raw === "STOP") return { ok: true, message: { kind: "stop" } };

  if (raw === "ACK") {
    return { ok: true, message: { kind: "ack", command: "UNSPECIFIED" } };
  }
  if (raw === "ACK:PING") {
    return { ok: true, message: { kind: "ack", command: "PING" } };
  }
  if (raw === "ACK:STOP") {
    return { ok: true, message: { kind: "ack", command: "STOP" } };
  }
  const ackMode = /^ACK:MODE(?::([^:]+))?$/.exec(raw);
  if (ackMode) {
    if (ackMode[1] === undefined) {
      return { ok: true, message: { kind: "ack", command: "MODE" } };
    }
    const sensor = parseSensor(ackMode[1]);
    return sensor
      ? { ok: true, message: { kind: "ack", command: "MODE", mode: sensor } }
      : fail("INVALID_SENSOR", "ACK contains an unsupported sensor pack", raw);
  }

  const deviceError = /^ERROR:([A-Z0-9_\-]+):(.+)$/.exec(raw);
  if (deviceError) {
    return {
      ok: true,
      message: { kind: "error", code: deviceError[1], message: deviceError[2].trim() },
    };
  }

  return fail("UNKNOWN_MESSAGE", "unsupported protocol message", raw);
}

function parseMeasurement(record: Record<string, unknown>, raw: string): ProtocolParseResult {
  const sensor = parseSensor(record.sensor);
  if (!sensor) return fail("INVALID_SENSOR", "measurement sensor is unsupported", raw);
  if (!isTimestamp(record.timestampMs)) {
    return fail("INVALID_FIELD", "measurement timestampMs must be a non-negative integer", raw);
  }
  if (!Array.isArray(record.values) || record.values.length === 0) {
    return fail("INVALID_MEASUREMENT", "measurement values must be a non-empty array", raw);
  }

  const expected = EXPECTED_METRICS[sensor];
  const parsed: RawMeasurement[] = [];
  const seen = new Set<string>();

  for (const item of record.values) {
    if (!isRecord(item)) {
      return fail("INVALID_MEASUREMENT", "each measurement value must be an object", raw);
    }
    if (typeof item.metric !== "string" || !expected.includes(item.metric as RawMetric)) {
      return fail("INVALID_MEASUREMENT", "measurement metric does not belong to its sensor pack", raw);
    }
    if (seen.has(item.metric)) {
      return fail("INVALID_MEASUREMENT", "measurement metrics must not be duplicated", raw);
    }
    if (typeof item.value !== "number" || !Number.isFinite(item.value)) {
      return fail("INVALID_MEASUREMENT", "measurement value must be a finite number", raw);
    }
    if (typeof item.unit !== "string" || !ALLOWED_UNITS[item.metric as RawMetric].includes(item.unit)) {
      return fail("INVALID_UNIT", "measurement unit is invalid for its metric", raw);
    }
    if (item.value < 0 && item.metric !== "temperature") {
      return fail("INVALID_MEASUREMENT", "this measurement metric cannot be negative", raw);
    }

    seen.add(item.metric);
    parsed.push({
      provenance: "raw",
      source: sensor,
      metric: item.metric as RawMetric,
      value: item.value,
      unit: NORMALIZED_UNITS[item.unit],
      timestampMs: record.timestampMs,
    });
  }

  if (seen.size !== expected.length || expected.some((metric) => !seen.has(metric))) {
    return fail("INVALID_MEASUREMENT", "measurement is missing a required metric", raw);
  }

  return {
    ok: true,
    message: { kind: "measurement", sensor, timestampMs: record.timestampMs, values: parsed },
  };
}

function parseJsonMessage(record: Record<string, unknown>, raw: string): ProtocolParseResult {
  if (record.type === "measurement") return parseMeasurement(record, raw);

  if (record.type === "heartbeat") {
    if (record.timestampMs !== undefined && !isTimestamp(record.timestampMs)) {
      return fail("INVALID_FIELD", "heartbeat timestampMs must be a non-negative integer", raw);
    }
    return {
      ok: true,
      message: {
        kind: "heartbeat",
        timestampMs: (record.timestampMs as number | undefined) ?? null,
      },
    };
  }

  if (record.type === "error") {
    if (typeof record.code !== "string" || !/^[A-Z0-9_\-]+$/.test(record.code)) {
      return fail("INVALID_FIELD", "error code is invalid", raw);
    }
    if (typeof record.message !== "string" || record.message.trim() === "") {
      return fail("INVALID_FIELD", "error message is required", raw);
    }
    return {
      ok: true,
      message: { kind: "error", code: record.code, message: record.message.trim() },
    };
  }

  return fail("UNKNOWN_MESSAGE", "unsupported JSON protocol message type", raw);
}

export function parseProtocolLine(input: string): ProtocolParseResult {
  const raw = input.trim();
  if (raw === "") return fail("EMPTY_INPUT", "protocol input is empty", input);

  if (!raw.startsWith("{")) return parseTextMessage(raw);

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return fail("INVALID_JSON", "measurement JSON is malformed", raw);
  }

  return isRecord(decoded)
    ? parseJsonMessage(decoded, raw)
    : fail("INVALID_JSON", "protocol JSON must be an object", raw);
}
