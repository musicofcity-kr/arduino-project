import http from "node:http";
import { JsonDataStore } from "./dataStore.mjs";
import { EXPERIMENT_PACKS, findExperimentPack } from "./experimentPacks.mjs";

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const SESSION_ID_PATTERN = /^sess_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_WITH_ZONE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const SOURCE_KINDS = new Set(["measured", "simulated", "demo"]);
const SOURCE_TRANSPORT_BY_KIND = Object.freeze({
  measured: "web-serial",
  simulated: "generated",
  demo: "generated",
});
const PERSONAL_DATA_KEYS = new Set([
  "name",
  "fullname",
  "studentname",
  "studentnumber",
  "studentno",
  "studentid",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "birthdate",
  "dateofbirth",
]);

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizedKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rejectPersonalData(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (PERSONAL_DATA_KEYS.has(normalizedKey(key))) {
      throw new HttpError(400, "personal_data_not_allowed", `개인정보 필드 '${key}'는 저장할 수 없습니다.`);
    }
    rejectPersonalData(child);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_request", `${label}은(는) JSON 객체여야 합니다.`);
  }
}

function assertOnlyKeys(object, allowedKeys, label) {
  const unknownKeys = Object.keys(object).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new HttpError(400, "invalid_request", `${label}에 허용되지 않은 필드가 있습니다: ${unknownKeys.join(", ")}`);
  }
}

function assertTimestampMs(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpError(400, "invalid_timestamp_ms", `${label}은(는) 비음수 safe integer여야 합니다.`);
  }
}

function validateReadingValue(reading, definition, label) {
  if (typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
    throw new HttpError(400, "invalid_measurement_value", `${label}.value는 유한한 수여야 합니다.`);
  }
  if (reading.unit !== definition.unit) {
    throw new HttpError(400, "invalid_unit_schema", `${label}.unit은 ${definition.unit}이어야 합니다.`);
  }
  if (definition.integer && !Number.isInteger(reading.value)) {
    throw new HttpError(400, "invalid_measurement_value", `${label} 값은 정수여야 합니다.`);
  }
  if (definition.minimum !== undefined && reading.value < definition.minimum) {
    throw new HttpError(400, "invalid_measurement_value", `${label} 값이 허용 범위보다 작습니다.`);
  }
  if (definition.maximum !== undefined && reading.value > definition.maximum) {
    throw new HttpError(400, "invalid_measurement_value", `${label} 값이 허용 범위보다 큽니다.`);
  }
}

function validateDerivedInputs(inputs, rawSchema, sensorPackId, label) {
  if (!Array.isArray(inputs) || inputs.length < 1) {
    throw new HttpError(400, "invalid_derived_inputs", `${label}.inputs에는 하나 이상의 원시 입력이 필요합니다.`);
  }
  inputs.forEach((input, index) => {
    const inputLabel = `${label}.inputs[${index}]`;
    assertPlainObject(input, inputLabel);
    assertOnlyKeys(input, new Set(["source", "metric", "value", "unit", "timestampMs"]), inputLabel);
    if (input.source !== sensorPackId) {
      throw new HttpError(400, "invalid_provenance", `${inputLabel}.source가 센서 Pack과 일치하지 않습니다.`);
    }
    if (typeof input.metric !== "string" || !rawSchema[input.metric]) {
      throw new HttpError(400, "invalid_provenance", `${inputLabel}.metric이 원시 스키마와 일치하지 않습니다.`);
    }
    validateReadingValue(input, rawSchema[input.metric], inputLabel);
    assertTimestampMs(input.timestampMs, `${inputLabel}.timestampMs`);
  });
}

function validateQuantityMap(value, label, metricSchema, rawSchema, sensorPackId, { requireAll, provenance }) {
  assertPlainObject(value, label);
  const suppliedMetrics = Object.keys(value);
  const expectedMetrics = Object.keys(metricSchema);
  if (requireAll) {
    const missing = expectedMetrics.filter((metricName) => !Object.hasOwn(value, metricName));
    if (missing.length > 0) {
      throw new HttpError(400, "invalid_measurement_schema", `${label}에 필수 물리량이 없습니다: ${missing.join(", ")}`);
    }
  }

  for (const [quantity, reading] of Object.entries(value)) {
    if (!SAFE_IDENTIFIER_PATTERN.test(quantity)) {
      throw new HttpError(400, "invalid_request", `${label}의 물리량 키가 올바르지 않습니다.`);
    }

    const definition = metricSchema[quantity];
    if (!definition) {
      throw new HttpError(400, "invalid_metric_schema", `${quantity}은(는) 이 Experiment Pack의 ${label} 물리량이 아닙니다.`);
    }

    const readingLabel = `${label}.${quantity}`;
    assertPlainObject(reading, readingLabel);
    if (provenance === "raw") {
      assertOnlyKeys(reading, new Set(["value", "unit", "source", "timestampMs"]), readingLabel);
      if (reading.source !== sensorPackId) {
        throw new HttpError(400, "invalid_provenance", `${readingLabel}.source가 센서 Pack과 일치하지 않습니다.`);
      }
      validateReadingValue(reading, definition, readingLabel);
      assertTimestampMs(reading.timestampMs, `${readingLabel}.timestampMs`);
    } else {
      assertOnlyKeys(reading, new Set(["value", "unit", "timestampMs", "formula", "inputs"]), readingLabel);
      validateReadingValue(reading, definition, readingLabel);
      assertTimestampMs(reading.timestampMs, `${readingLabel}.timestampMs`);
      if (reading.formula !== definition.formula) {
        throw new HttpError(400, "invalid_formula", `${readingLabel}.formula가 허용된 공식과 일치하지 않습니다.`);
      }
      validateDerivedInputs(reading.inputs, rawSchema, sensorPackId, readingLabel);
    }
  }

  if (suppliedMetrics.length === 0 && requireAll) {
    throw new HttpError(400, "invalid_measurement_schema", `${label}에는 물리량이 필요합니다.`);
  }
}

function validateSource(value, expectedSensorPackId) {
  assertPlainObject(value, "source");
  assertOnlyKeys(value, new Set(["kind", "sensorPackId", "transport"]), "source");

  if (!SOURCE_KINDS.has(value.kind)) {
    throw new HttpError(400, "invalid_source", "source.kind는 measured, simulated, demo 중 하나여야 합니다.");
  }
  if (!SAFE_IDENTIFIER_PATTERN.test(value.sensorPackId ?? "")) {
    throw new HttpError(400, "invalid_source", "source.sensorPackId가 올바르지 않습니다.");
  }
  if (value.sensorPackId !== expectedSensorPackId) {
    throw new HttpError(400, "invalid_source", "source.sensorPackId가 Experiment Pack의 센서와 일치하지 않습니다.");
  }
  const requiredTransport = SOURCE_TRANSPORT_BY_KIND[value.kind];
  if (value.transport !== requiredTransport) {
    throw new HttpError(
      400,
      "invalid_source",
      `source.kind ${value.kind}에는 source.transport ${requiredTransport}이(가) 필요합니다.`,
    );
  }
}

function validateMeasurement(body) {
  assertPlainObject(body, "요청 본문");
  rejectPersonalData(body);
  assertOnlyKeys(body, new Set(["experimentPackId", "source", "raw", "derived", "timestamp"]), "요청 본문");

  const pack = findExperimentPack(body.experimentPackId);
  if (!pack) {
    throw new HttpError(400, "unknown_experiment_pack", "알 수 없는 Experiment Pack입니다.");
  }
  validateSource(body.source, pack.sensorPackId);
  assertPlainObject(body.raw, "raw");
  assertPlainObject(body.derived ?? {}, "derived");
  const overlap = Object.keys(body.raw).filter((metricName) => Object.hasOwn(body.derived ?? {}, metricName));
  if (overlap.length > 0) {
    throw new HttpError(400, "raw_derived_overlap", `raw와 derived에 같은 물리량을 둘 수 없습니다: ${overlap.join(", ")}`);
  }
  validateQuantityMap(body.raw, "raw", pack.measurementSchema.raw, pack.measurementSchema.raw, pack.sensorPackId, {
    requireAll: true,
    provenance: "raw",
  });
  validateQuantityMap(body.derived ?? {}, "derived", pack.measurementSchema.derived, pack.measurementSchema.raw, pack.sensorPackId, {
    requireAll: false,
    provenance: "derived",
  });

  if (
    typeof body.timestamp !== "string" ||
    !ISO_WITH_ZONE_PATTERN.test(body.timestamp) ||
    Number.isNaN(Date.parse(body.timestamp))
  ) {
    throw new HttpError(400, "invalid_timestamp", "timestamp는 시간대가 포함된 ISO 8601 문자열이어야 합니다.");
  }

  return {
    experimentPackId: body.experimentPackId,
    source: body.source,
    raw: body.raw,
    derived: body.derived ?? {},
    timestamp: body.timestamp,
  };
}

function parseAllowedOrigins(origins) {
  return new Set(origins ?? DEFAULT_ALLOWED_ORIGINS);
}

function corsDecision(request, allowedOrigins) {
  const origin = request.headers.origin;
  if (!origin) {
    return { allowed: true, origin: null };
  }
  return { allowed: allowedOrigins.has(origin), origin };
}

function applyResponseHeaders(response, allowedOrigin = null) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  response.setHeader("Vary", "Origin");
  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }
}

function sendJson(response, status, payload, allowedOrigin = null) {
  applyResponseHeaders(response, allowedOrigin);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function sendNoContent(response, status, allowedOrigin = null) {
  applyResponseHeaders(response, allowedOrigin);
  response.statusCode = status;
  response.end();
}

function validateContentLength(request, maxBodyBytes) {
  const header = request.headers["content-length"];
  if (header === undefined) {
    return;
  }
  if (!/^\d+$/.test(header)) {
    throw new HttpError(400, "invalid_content_length", "Content-Length가 올바르지 않습니다.");
  }
  if (Number(header) > maxBodyBytes) {
    throw new HttpError(413, "body_too_large", `요청 본문은 ${maxBodyBytes}바이트 이하여야 합니다.`);
  }
}

function readBody(request, maxBodyBytes) {
  validateContentLength(request, maxBodyBytes);

  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;

    const cleanup = () => {
      request.removeListener("data", onData);
      request.removeListener("end", onEnd);
      request.removeListener("error", onError);
      request.removeListener("aborted", onAborted);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      request.resume();
      reject(error);
    };
    const onData = (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBodyBytes) {
        fail(new HttpError(413, "body_too_large", `요청 본문은 ${maxBodyBytes}바이트 이하여야 합니다.`));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    const onError = () => fail(new HttpError(400, "request_stream_error", "요청 본문을 읽을 수 없습니다."));
    const onAborted = () => fail(new HttpError(400, "request_aborted", "요청 전송이 중단되었습니다."));

    request.on("data", onData);
    request.on("end", onEnd);
    request.on("error", onError);
    request.on("aborted", onAborted);
  });
}

async function readJson(request, maxBodyBytes, { optional = false } = {}) {
  const contentType = request.headers["content-type"] ?? "";
  if (contentType && !contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Content-Type은 application/json이어야 합니다.");
  }

  const text = await readBody(request, maxBodyBytes);
  if (!text.trim()) {
    if (optional) return {};
    throw new HttpError(400, "empty_json", "JSON 요청 본문이 필요합니다.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "JSON 요청 본문을 해석할 수 없습니다.");
  }
}

function methodNotAllowed(response, allowedOrigin, methods) {
  response.setHeader("Allow", methods.join(", "));
  sendJson(response, 405, { error: { code: "method_not_allowed", message: "허용되지 않은 HTTP 메서드입니다." } }, allowedOrigin);
}

export function createRequestHandler({
  store = new JsonDataStore(),
  allowedOrigins,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
} = {}) {
  const origins = parseAllowedOrigins(allowedOrigins);

  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 2) {
    throw new TypeError("maxBodyBytes must be an integer of at least 2.");
  }

  return async function requestHandler(request, response) {
    const cors = corsDecision(request, origins);
    if (!cors.allowed) {
      sendJson(response, 403, { error: { code: "origin_not_allowed", message: "허용되지 않은 요청 출처입니다." } });
      return;
    }

    const allowedOrigin = cors.origin;
    if (request.method === "OPTIONS") {
      applyResponseHeaders(response, allowedOrigin);
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Max-Age", "600");
      sendNoContent(response, 204, allowedOrigin);
      return;
    }

    try {
      const url = new URL(request.url, "http://local.invalid");

      if (url.pathname === "/api/health") {
        if (request.method !== "GET") return methodNotAllowed(response, allowedOrigin, ["GET"]);
        return sendJson(response, 200, { status: "ok", storage: "local-json", personalData: "none" }, allowedOrigin);
      }

      if (url.pathname === "/api/experiment-packs") {
        if (request.method !== "GET") return methodNotAllowed(response, allowedOrigin, ["GET"]);
        return sendJson(response, 200, { experimentPacks: EXPERIMENT_PACKS }, allowedOrigin);
      }

      const packMatch = url.pathname.match(/^\/api\/experiment-packs\/([A-Za-z0-9_-]+)$/);
      if (packMatch) {
        if (request.method !== "GET") return methodNotAllowed(response, allowedOrigin, ["GET"]);
        const pack = findExperimentPack(packMatch[1]);
        if (!pack) throw new HttpError(404, "experiment_pack_not_found", "Experiment Pack을 찾을 수 없습니다.");
        return sendJson(response, 200, { experimentPack: pack }, allowedOrigin);
      }

      if (url.pathname === "/api/sessions") {
        if (request.method !== "POST") return methodNotAllowed(response, allowedOrigin, ["POST"]);
        const body = await readJson(request, maxBodyBytes, { optional: true });
        assertPlainObject(body, "요청 본문");
        rejectPersonalData(body);
        assertOnlyKeys(body, new Set(), "요청 본문");
        const session = await store.createSession();
        return sendJson(response, 201, { session }, allowedOrigin);
      }

      const measurementsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/measurements$/);
      if (measurementsMatch) {
        const sessionId = measurementsMatch[1];
        if (!SESSION_ID_PATTERN.test(sessionId)) {
          throw new HttpError(404, "session_not_found", "세션을 찾을 수 없습니다.");
        }

        if (request.method === "GET") {
          const measurements = await store.listMeasurements(sessionId);
          if (!measurements) throw new HttpError(404, "session_not_found", "세션을 찾을 수 없습니다.");
          return sendJson(response, 200, { sessionId, measurements }, allowedOrigin);
        }

        if (request.method === "POST") {
          const body = await readJson(request, maxBodyBytes);
          const measurement = validateMeasurement(body);
          const record = await store.appendMeasurement(sessionId, measurement);
          if (!record) throw new HttpError(404, "session_not_found", "세션을 찾을 수 없습니다.");
          return sendJson(response, 201, { measurement: record }, allowedOrigin);
        }

        return methodNotAllowed(response, allowedOrigin, ["GET", "POST"]);
      }

      throw new HttpError(404, "route_not_found", "API 경로를 찾을 수 없습니다.");
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: { code: error.code, message: error.message } }, allowedOrigin);
        return;
      }
      console.error("API request failed without exposing request data:", error?.message ?? "unknown error");
      sendJson(response, 500, { error: { code: "internal_error", message: "서버가 요청을 처리하지 못했습니다." } }, allowedOrigin);
    }
  };
}

export function createAppServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}
