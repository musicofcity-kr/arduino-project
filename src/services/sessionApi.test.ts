import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createSessionApi, measurementsToCsv, SessionApiError, type MeasurementDraft } from "./sessionApi";

const draft: MeasurementDraft = {
  experimentPackId: "distance-motion",
  source: { kind: "measured", sensorPackId: "hc-sr04", transport: "web-serial" },
  raw: { distance: { value: 20, unit: "cm", source: "hc-sr04", timestampMs: 1_500 } },
  derived: { velocity: { value: -0.4, unit: "m/s", timestampMs: 1_500, formula: "delta-distance/delta-time", inputs: [{ source: "hc-sr04", metric: "distance", value: 30, unit: "cm", timestampMs: 1_000 }] } },
  timestamp: "2026-08-11T01:00:00.000Z",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("session API", () => {
  it("converts network and HTTP failures into explicit Korean errors", async () => {
    const networkApi = createSessionApi({ fetch: vi.fn().mockRejectedValue(new TypeError("offline")) });
    await expect(networkApi.createSession()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    const httpApi = createSessionApi({ fetch: vi.fn().mockResolvedValue(response({ error: { code: "session_not_found" } }, 404)) });
    await expect(httpApi.listMeasurements("missing")).rejects.toEqual(expect.objectContaining<Partial<SessionApiError>>({ code: "HTTP_ERROR", status: 404, message: expect.stringContaining("세션") }));
  });
});

describe("real local session API path", () => {
  const cleanup: Array<() => Promise<void>> = [];
  afterEach(async () => { await Promise.all(cleanup.splice(0).map((run) => run())); });

  it("creates, appends, lists, and exports complete raw/derived provenance", async () => {
    // @ts-expect-error The production Node server is an ESM JavaScript module without declarations.
    const { createAppServer } = await import("../../server/app.mjs");
    // @ts-expect-error The production JSON store is an ESM JavaScript module without declarations.
    const { JsonDataStore } = await import("../../server/dataStore.mjs");
    const directory = await mkdtemp(path.join(tmpdir(), "session-api-vitest-"));
    const server = createAppServer({ store: new JsonDataStore(path.join(directory, "store.json")) });
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    cleanup.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve()));
      await rm(directory, { recursive: true, force: true });
    });

    const address = server.address() as AddressInfo;
    const api = createSessionApi({ baseUrl: `http://127.0.0.1:${address.port}` });
    const session = await api.createSession();
    await api.appendMeasurement(session.id, draft);
    const records = await api.listMeasurements(session.id);
    expect(records).toHaveLength(1);
    expect(records[0].raw.distance).toEqual(draft.raw.distance);
    expect(records[0].derived.velocity).toEqual(draft.derived.velocity);

    const csv = measurementsToCsv(records);
    expect(csv).toContain("raw,measured,hc-sr04,hc-sr04,distance,20,cm,1500");
    expect(csv).toContain("derived,measured,hc-sr04,calculation,velocity,-0.4,m/s,1500");
    expect(csv).toContain("delta-distance/delta-time");
    expect(csv).toContain('""source"":""hc-sr04""');
    expect(csv).toContain(records[0].receivedAt);
  });
});
