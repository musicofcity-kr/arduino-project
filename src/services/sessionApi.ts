export type MeasurementSourceKind = "measured" | "calculated" | "simulated" | "demo";
export type MeasurementTransport = "web-serial" | "manual" | "import";

export interface MeasurementSource {
  kind: MeasurementSourceKind;
  sensorPackId: string;
  transport?: MeasurementTransport;
}

export interface QuantityValue {
  value: number;
  unit: string;
}

export interface CalculationInputTrace {
  source: string;
  metric: string;
  value: number;
  unit: string;
  timestampMs: number;
}

export interface RawStoredQuantity extends QuantityValue {
  source: string;
  timestampMs: number;
}

export interface DerivedStoredQuantity extends QuantityValue {
  timestampMs: number;
  formula: string;
  inputs: readonly CalculationInputTrace[];
}

export interface MeasurementDraft {
  experimentPackId: string;
  source: MeasurementSource;
  raw: Readonly<Record<string, RawStoredQuantity>>;
  derived: Readonly<Record<string, DerivedStoredQuantity>>;
  timestamp: string;
}

export interface MeasurementRecord extends MeasurementDraft {
  id: string;
  receivedAt: string;
}

export interface AnonymousSession {
  id: string;
  createdAt: string;
}

export type SessionApiErrorCode = "NETWORK_ERROR" | "HTTP_ERROR" | "INVALID_RESPONSE" | "REQUEST_ABORTED";

export class SessionApiError extends Error {
  readonly code: SessionApiErrorCode;
  readonly status?: number;
  readonly serverCode?: string;

  constructor(code: SessionApiErrorCode, message: string, options: { status?: number; serverCode?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "SessionApiError";
    this.code = code;
    this.status = options.status;
    this.serverCode = options.serverCode;
  }
}

export interface SessionApi {
  createSession(signal?: AbortSignal): Promise<AnonymousSession>;
  appendMeasurement(sessionId: string, measurement: MeasurementDraft, signal?: AbortSignal): Promise<MeasurementRecord>;
  listMeasurements(sessionId: string, signal?: AbortSignal): Promise<readonly MeasurementRecord[]>;
}

export interface SessionApiOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSession(value: unknown): asserts value is AnonymousSession {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.createdAt !== "string") {
    throw new SessionApiError("INVALID_RESPONSE", "서버의 세션 응답 형식이 올바르지 않습니다.");
  }
}

function assertMeasurement(value: unknown): asserts value is MeasurementRecord {
  if (
    !isRecord(value) || typeof value.id !== "string" || typeof value.experimentPackId !== "string" ||
    !isRecord(value.source) || typeof value.source.kind !== "string" || typeof value.source.sensorPackId !== "string" ||
    !isRecord(value.raw) || !isRecord(value.derived) || typeof value.timestamp !== "string" || typeof value.receivedAt !== "string"
  ) throw new SessionApiError("INVALID_RESPONSE", "서버의 측정 기록 응답 형식이 올바르지 않습니다.");
  for (const reading of Object.values(value.raw)) {
    if (!isRecord(reading) || typeof reading.value !== "number" || typeof reading.unit !== "string" || typeof reading.source !== "string" || typeof reading.timestampMs !== "number")
      throw new SessionApiError("INVALID_RESPONSE", "서버의 원시 측정값 응답 형식이 올바르지 않습니다.");
  }
  for (const reading of Object.values(value.derived)) {
    if (!isRecord(reading) || typeof reading.value !== "number" || typeof reading.unit !== "string" || typeof reading.timestampMs !== "number" || typeof reading.formula !== "string" || !Array.isArray(reading.inputs))
      throw new SessionApiError("INVALID_RESPONSE", "서버의 계산 측정값 응답 형식이 올바르지 않습니다.");
  }
}

function koreanHttpMessage(status: number, serverCode?: string): string {
  if (serverCode === "session_not_found") return "실험 세션을 찾을 수 없습니다. 새 세션을 시작해 주세요.";
  if (serverCode === "invalid_source") return "센서팩과 측정값의 출처가 일치하지 않습니다.";
  if (serverCode === "invalid_timestamp") return "측정 시각 형식이 올바르지 않습니다.";
  if (serverCode === "personal_data_not_allowed") return "개인정보가 포함된 데이터는 저장할 수 없습니다.";
  return `측정 데이터 요청을 처리하지 못했습니다. (HTTP ${status})`;
}

async function requestJson(fetcher: typeof fetch, url: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new SessionApiError("REQUEST_ABORTED", "요청이 취소되었습니다.", { cause });
    }
    throw new SessionApiError("NETWORK_ERROR", "로컬 저장 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.", { cause });
  }
  let body: unknown;
  try { body = await response.json(); }
  catch (cause) { throw new SessionApiError("INVALID_RESPONSE", "서버 응답을 읽을 수 없습니다.", { status: response.status, cause }); }
  if (!response.ok) {
    const serverCode = isRecord(body) && isRecord(body.error) && typeof body.error.code === "string" ? body.error.code : undefined;
    throw new SessionApiError("HTTP_ERROR", koreanHttpMessage(response.status, serverCode), { status: response.status, serverCode });
  }
  return body;
}

export function createSessionApi(options: SessionApiOptions = {}): SessionApi {
  const fetcher = options.fetch ?? globalThis.fetch;
  const base = (options.baseUrl ?? "").replace(/\/$/, "");
  const measurementsUrl = (sessionId: string) => `${base}/api/sessions/${encodeURIComponent(sessionId)}/measurements`;
  return {
    async createSession(signal) {
      const body = await requestJson(fetcher, `${base}/api/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal });
      if (!isRecord(body)) throw new SessionApiError("INVALID_RESPONSE", "서버의 세션 응답 형식이 올바르지 않습니다.");
      assertSession(body.session);
      return body.session;
    },
    async appendMeasurement(sessionId, measurement, signal) {
      const body = await requestJson(fetcher, measurementsUrl(sessionId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(measurement), signal });
      if (!isRecord(body)) throw new SessionApiError("INVALID_RESPONSE", "서버의 측정 기록 응답 형식이 올바르지 않습니다.");
      assertMeasurement(body.measurement);
      return body.measurement;
    },
    async listMeasurements(sessionId, signal) {
      const body = await requestJson(fetcher, measurementsUrl(sessionId), { method: "GET", signal });
      if (!isRecord(body) || !Array.isArray(body.measurements)) throw new SessionApiError("INVALID_RESPONSE", "서버의 측정 목록 응답 형식이 올바르지 않습니다.");
      body.measurements.forEach(assertMeasurement);
      return body.measurements;
    },
  };
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function measurementsToCsv(records: readonly MeasurementRecord[]): string {
  const rows: unknown[][] = [["provenance", "sourceKind", "sensorPackId", "quantitySource", "metric", "value", "unit", "timestampMs", "timestamp", "receivedAt", "formula", "inputs"]];
  for (const record of records) {
    for (const [metric, reading] of Object.entries(record.raw)) {
      rows.push(["raw", record.source.kind, record.source.sensorPackId, reading.source, metric, reading.value, reading.unit, reading.timestampMs, record.timestamp, record.receivedAt, "", ""]);
    }
    for (const [metric, reading] of Object.entries(record.derived)) {
      rows.push(["derived", record.source.kind, record.source.sensorPackId, "calculation", metric, reading.value, reading.unit, reading.timestampMs, record.timestamp, record.receivedAt, reading.formula, reading.inputs]);
    }
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
