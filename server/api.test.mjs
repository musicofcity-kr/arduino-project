import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createAppServer } from "./app.mjs";
import { JsonDataStore } from "./dataStore.mjs";

async function withServer(run, options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "arduino-api-"));
  const server = createAppServer({ store: new JsonDataStore(path.join(directory, "store.json")), ...options });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { await run(baseUrl); }
  finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
}

const jsonHeaders = { "Content-Type": "application/json" };
async function session(baseUrl, body = {}) {
  const response = await fetch(`${baseUrl}/api/sessions`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) });
  return { response, body: await response.json() };
}
function dht(overrides = {}) {
  return {
    experimentPackId: "humidity-weather",
    source: { kind: "measured", sensorPackId: "dht11", transport: "web-serial" },
    raw: {
      temperature: { value: 24.1, unit: "\u00b0C", source: "dht11", timestampMs: 1_000 },
      humidity: { value: 51, unit: "%RH", source: "dht11", timestampMs: 1_000 },
    },
    derived: {}, timestamp: "2026-08-11T10:00:00+09:00", ...overrides,
  };
}
async function postMeasurement(baseUrl, sessionId, measurement) {
  return fetch(`${baseUrl}/api/sessions/${sessionId}/measurements`, {
    method: "POST", headers: jsonHeaders, body: JSON.stringify(measurement),
  });
}

test("publishes frontend-aligned pack ids and exact raw/derived schemas", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/experiment-packs`);
    const { experimentPacks } = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(experimentPacks.map((pack) => pack.id), ["humidity-weather", "distance-motion", "light-transmittance"]);
    assert.deepEqual(experimentPacks.map((pack) => pack.sensorPackId), ["dht11", "hc-sr04", "ldr"]);
    assert.equal(experimentPacks[0].measurementSchema.raw.temperature.unit, "\u00b0C");
    assert.equal(experimentPacks[0].measurementSchema.raw.humidity.unit, "%RH");
    assert.equal(experimentPacks[1].measurementSchema.derived.velocity.unit, "m/s");
    assert.equal(experimentPacks[2].measurementSchema.derived.relativeTransmittance.unit, "%");
  });
});

test("stores valid DHT, HC-SR04 derived, and LDR derived records without replacing raw", async () => {
  await withServer(async (baseUrl) => {
    const created = await session(baseUrl);
    const id = created.body.session.id;
    assert.equal((await postMeasurement(baseUrl, id, dht())).status, 201);
    const hcProvenance = {
      experimentPackId: "distance-motion",
      source: { kind: "measured", sensorPackId: "hc-sr04", transport: "web-serial" },
      raw: { distance: { value: 20, unit: "cm", source: "hc-sr04", timestampMs: 2_000 } },
      derived: { velocity: {
        value: -0.4, unit: "m/s", timestampMs: 2_000,
        formula: "delta-distance/delta-time",
        inputs: [
          { source: "hc-sr04", metric: "distance", value: 20.4, unit: "cm", timestampMs: 1_000 },
          { source: "hc-sr04", metric: "distance", value: 20, unit: "cm", timestampMs: 2_000 },
        ],
      } },
      timestamp: "2026-08-11T10:00:01+09:00",
    };
    assert.equal((await postMeasurement(baseUrl, id, hcProvenance)).status, 201);
    assert.equal((await postMeasurement(baseUrl, id, {
      experimentPackId: "light-transmittance",
      source: { kind: "measured", sensorPackId: "ldr", transport: "web-serial" },
      raw: { relativeLight: { value: 512, unit: "count", source: "ldr", timestampMs: 3_000 } },
      derived: { relativeTransmittance: {
        value: 120, unit: "%", timestampMs: 3_000, formula: "sample/reference*100",
        inputs: [
          { source: "ldr", metric: "relativeLight", value: 512, unit: "count", timestampMs: 3_000 },
          { source: "ldr", metric: "relativeLight", value: 426, unit: "count", timestampMs: 1_000 },
        ],
      } },
      timestamp: "2026-08-11T10:00:02+09:00",
    })).status, 201);
    const records = await (await fetch(`${baseUrl}/api/sessions/${id}/measurements`)).json();
    assert.equal(records.measurements[1].raw.distance.value, 20);
    assert.equal(records.measurements[1].derived.velocity.value, -0.4);
    assert.deepEqual(records.measurements[1].derived.velocity, hcProvenance.derived.velocity);
    assert.equal(records.measurements[2].derived.relativeTransmittance.value, 120);
  });
});

test("rejects arbitrary metrics, wrong units, missing raw metrics, and raw-derived overlap", async () => {
  await withServer(async (baseUrl) => {
    const id = (await session(baseUrl)).body.session.id;
    const cases = [
      [dht({ raw: { temperature: { value: 24, unit: "m/s", source: "dht11", timestampMs: 1 }, humidity: { value: 50, unit: "%RH", source: "dht11", timestampMs: 1 } } }), "invalid_unit_schema"],
      [dht({ raw: { ...dht().raw, fake: { value: 1, unit: "cm", source: "dht11", timestampMs: 1 } } }), "invalid_metric_schema"],
      [dht({ raw: { temperature: dht().raw.temperature } }), "invalid_measurement_schema"],
      [{ experimentPackId: "distance-motion", source: { kind: "measured", sensorPackId: "hc-sr04", transport: "web-serial" }, raw: { distance: { value: 10, unit: "cm", source: "hc-sr04", timestampMs: 1 }, velocity: { value: 1, unit: "m/s" } }, derived: { velocity: { value: 1, unit: "m/s" } }, timestamp: "2026-08-11T10:00:00+09:00" }, "raw_derived_overlap"],
    ];
    for (const [payload, code] of cases) {
      const response = await postMeasurement(baseUrl, id, payload);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, code);
    }
  });
});

test("rejects missing or forged raw and derived provenance", async () => {
  await withServer(async (baseUrl) => {
    const id = (await session(baseUrl)).body.session.id;
    const base = {
      experimentPackId: "distance-motion",
      source: { kind: "measured", sensorPackId: "hc-sr04", transport: "web-serial" },
      raw: { distance: { value: 20, unit: "cm", source: "hc-sr04", timestampMs: 2_000 } },
      derived: { velocity: { value: 1, unit: "m/s", timestampMs: 2_000, formula: "delta-distance/delta-time", inputs: [{ source: "hc-sr04", metric: "distance", value: 19, unit: "cm", timestampMs: 1_000 }] } },
      timestamp: "2026-08-11T10:00:00+09:00",
    };
    const cases = [
      [{ ...base, raw: { distance: { value: 20, unit: "cm", timestampMs: 2_000 } } }, "invalid_provenance"],
      [{ ...base, raw: { distance: { ...base.raw.distance, source: "ldr" } } }, "invalid_provenance"],
      [{ ...base, raw: { distance: { ...base.raw.distance, timestampMs: -1 } } }, "invalid_timestamp_ms"],
      [{ ...base, derived: { velocity: { ...base.derived.velocity, formula: "sample/reference*100" } } }, "invalid_formula"],
      [{ ...base, derived: { velocity: { ...base.derived.velocity, inputs: [{ ...base.derived.velocity.inputs[0], unit: "m" }] } } }, "invalid_unit_schema"],
      [{ ...base, derived: { velocity: { ...base.derived.velocity, inputs: [] } } }, "invalid_derived_inputs"],
    ];
    for (const [payload, code] of cases) {
      const response = await postMeasurement(baseUrl, id, payload);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, code);
    }
  });
});

test("enforces source-kind transport combinations and preserves explicit demo provenance", async () => {
  await withServer(async (baseUrl) => {
    const id = (await session(baseUrl)).body.session.id;
    for (const source of [
      { kind: "measured", sensorPackId: "dht11", transport: "generated" },
      { kind: "demo", sensorPackId: "dht11", transport: "web-serial" },
      { kind: "simulated", sensorPackId: "dht11", transport: "web-serial" },
    ]) {
      const response = await postMeasurement(baseUrl, id, dht({ source }));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, "invalid_source");
    }
    const demo = await postMeasurement(baseUrl, id, dht({ source: { kind: "demo", sensorPackId: "dht11", transport: "generated" } }));
    assert.equal(demo.status, 201);
    assert.equal((await demo.json()).measurement.source.kind, "demo");
  });
});

test("rejects PII, malformed JSON, oversized bodies, invalid timestamps, bad origins, and unknown sessions", async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await session(baseUrl, { email: "student@example.test" })).response.status, 400);
    const malformed = await fetch(`${baseUrl}/api/sessions`, { method: "POST", headers: jsonHeaders, body: "{" });
    assert.equal(malformed.status, 400);
    const id = (await session(baseUrl)).body.session.id;
    assert.equal((await postMeasurement(baseUrl, id, dht({ timestamp: "2026-08-11T10:00:00" }))).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://evil.example" } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/sessions/sess_00000000-0000-4000-8000-000000000000/measurements`)).status, 404);
  });
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sessions`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ x: "y".repeat(80) }) });
    assert.equal(response.status, 413);
  }, { maxBodyBytes: 32 });
});
