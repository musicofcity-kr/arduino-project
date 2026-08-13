import { describe, expect, it } from "vitest";
import { deriveRelativeTransmittance, deriveVelocity } from "./calculations";
import { createInitialConnectionState, transitionConnection } from "./connectionState";
import { experimentPacks } from "./packs";
import { parseProtocolLine, type RawMeasurement } from "./protocol";

function raw(overrides: Partial<RawMeasurement> = {}): RawMeasurement {
  return {
    provenance: "raw",
    source: "hc-sr04",
    metric: "distance",
    value: 10,
    unit: "cm",
    timestampMs: 1_000,
    ...overrides,
  };
}

describe("universal protocol", () => {
  it.each([
    ["PING", "ping"],
    ["HEARTBEAT:120", "heartbeat"],
    ["MODE:HC_SR04", "mode"],
    ["ACK:MODE:HC_SR04", "ack"],
    ["ACK:INTERVAL:HC_SR04:1000", "ack"],
    ["STOP", "stop"],
    ["ACK:STOP", "ack"],
    ["ERROR:SENSOR_TIMEOUT:no echo", "error"],
  ])("parses %s", (line, kind) => {
    const result = parseProtocolLine(line);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message.kind).toBe(kind);
  });

  it("identifies STOP acknowledgements without weakening MODE correlation", () => {
    const stopAck = parseProtocolLine("ACK:STOP");
    expect(stopAck).toEqual({ ok: true, message: { kind: "ack", command: "STOP" } });

    const invalidModeAck = parseProtocolLine("ACK:MODE:UNKNOWN_SENSOR");
    expect(invalidModeAck.ok).toBe(false);
    if (!invalidModeAck.ok) expect(invalidModeAck.error.code).toBe("INVALID_SENSOR");
  });

  it("parses an exact sensor interval acknowledgement", () => {
    expect(parseProtocolLine("ACK:INTERVAL:DHT11:5000")).toEqual({
      ok: true,
      message: { kind: "ack", command: "INTERVAL", mode: "dht11", intervalMs: 5000 },
    });
    expect(parseProtocolLine("ACK:INTERVAL:UNKNOWN:5000").ok).toBe(false);
    expect(parseProtocolLine("ACK:INTERVAL:DHT11:0").ok).toBe(false);
  });

  it("parses a complete measurement and preserves raw provenance", () => {
    const result = parseProtocolLine(
      JSON.stringify({
        type: "measurement",
        sensor: "DHT11",
        timestampMs: 1234,
        values: [
          { metric: "temperature", value: 23.5, unit: "C" },
          { metric: "humidity", value: 41, unit: "%" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.message.kind === "measurement") {
      expect(result.message.values).toEqual([
        expect.objectContaining({ provenance: "raw", source: "dht11", unit: "°C", timestampMs: 1234 }),
        expect.objectContaining({ provenance: "raw", source: "dht11", unit: "%RH", timestampMs: 1234 }),
      ]);
    }
  });

  it.each([
    ["", "EMPTY_INPUT"],
    ["SURPRISE", "UNKNOWN_MESSAGE"],
    ['{"type":"measurement"', "INVALID_JSON"],
    [
      JSON.stringify({ type: "measurement", sensor: "LDR", timestampMs: 1, values: [{ metric: "relativeLight", value: 4, unit: "lux" }] }),
      "INVALID_UNIT",
    ],
  ])("fails closed for invalid input", (line, code) => {
    const result = parseProtocolLine(line);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });
});

describe("connection state", () => {
  it("cannot become active without the matching mode ACK", () => {
    let state = transitionConnection(createInitialConnectionState(), { type: "CONNECT_REQUESTED" });
    state = transitionConnection(state, { type: "PORT_OPENED", nowMs: 0 });
    state = transitionConnection(state, {
      type: "MESSAGE_RECEIVED",
      message: { kind: "ack", command: "PING" },
      receivedAtMs: 10,
    });
    state = transitionConnection(state, { type: "MODE_REQUESTED", mode: "ldr", nowMs: 20 });
    expect(state.status).toBe("awaiting-mode-ack");
    expect(state.activeMode).toBeNull();

    state = transitionConnection(state, {
      type: "MESSAGE_RECEIVED",
      message: { kind: "ack", command: "MODE", mode: "ldr" },
      receivedAtMs: 30,
    });
    expect(state.status).toBe("active");
    expect(state.activeMode).toBe("ldr");
  });

  it("fails an ACK timeout and clears any current value", () => {
    let state = transitionConnection(createInitialConnectionState(), { type: "CONNECT_REQUESTED" });
    state = transitionConnection(state, { type: "PORT_OPENED", nowMs: 0 });
    state = transitionConnection(state, { type: "TICK", nowMs: 2_000 });
    expect(state.status).toBe("error");
    expect(state.error?.code).toBe("ACK_TIMEOUT");
    expect(state.currentMeasurement).toBeNull();
  });

  it("removes a stale current measurement on sensor timeout", () => {
    let state = createInitialConnectionState();
    state = { ...state, status: "active", activeMode: "ldr" };
    state = transitionConnection(state, {
      type: "MESSAGE_RECEIVED",
      receivedAtMs: 100,
      message: {
        kind: "measurement",
        sensor: "ldr",
        timestampMs: 7,
        values: [raw({ source: "ldr", metric: "relativeLight", unit: "count", value: 500, timestampMs: 7 })],
      },
    });
    expect(state.currentMeasurement).not.toBeNull();
    state = transitionConnection(state, { type: "TICK", nowMs: 3_100 });
    expect(state.error?.code).toBe("SENSOR_TIMEOUT");
    expect(state.currentMeasurement).toBeNull();
  });
});

describe("derived calculations", () => {
  it("derives signed velocity in m/s and retains both raw inputs", () => {
    const result = deriveVelocity(raw(), raw({ value: 30, timestampMs: 1_500 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBeCloseTo(0.4);
      expect(result.value.unit).toBe("m/s");
      expect(result.value.provenance).toBe("derived");
      expect(result.value.inputs).toHaveLength(2);
    }
  });

  it("rejects zero/negative elapsed time and negative distance", () => {
    expect(deriveVelocity(raw(), raw({ timestampMs: 1_000 })).ok).toBe(false);
    expect(deriveVelocity(raw({ value: -1 }), raw({ timestampMs: 2_000 })).ok).toBe(false);
  });

  it("derives relative transmittance without clamping and rejects unsafe reference/units", () => {
    const sample = raw({ source: "ldr", metric: "relativeLight", unit: "count", value: 250, timestampMs: 2_000 });
    const reference = raw({ source: "ldr", metric: "relativeLight", unit: "count", value: 500, timestampMs: 1_000 });
    const result = deriveRelativeTransmittance(sample, reference);
    expect(result.ok && result.value.value).toBe(50);
    expect(deriveRelativeTransmittance(sample, { ...reference, value: 0 }).ok).toBe(false);
    expect(deriveRelativeTransmittance(sample, { ...reference, unit: "relative" }).ok).toBe(false);
  });
});

describe("pack metadata", () => {
  it("keeps all three curriculum mappings draft and unverified", () => {
    expect(experimentPacks).toHaveLength(3);
    for (const pack of experimentPacks) {
      expect(pack.curriculum).toEqual(expect.objectContaining({ status: "draft", verification: "unverified", codes: [] }));
      expect(pack.safety.length).toBeGreaterThan(0);
    }
  });

  it("uses Korean student-facing copy and states the critical measurement limits", () => {
    for (const pack of experimentPacks) {
      expect(pack.name).toMatch(/[가-힣]/);
      expect(pack.question).toMatch(/[가-힣]/);
      expect(pack.description).toMatch(/[가-힣]/);
      expect(pack.wiring.every((step) => /[가-힣]/.test(step.detail))).toBe(true);
      expect(pack.measurements.every((measurement) => /[가-힣]/.test(measurement.label))).toBe(true);
      expect(pack.safety.every((message) => /[가-힣]/.test(message))).toBe(true);
    }

    const humidity = experimentPacks.find((pack) => pack.sensorId === "dht11");
    expect(humidity?.measurements.find((item) => item.key === "humidity")?.label).toBe("상대습도");

    const motion = experimentPacks.find((pack) => pack.sensorId === "hc-sr04");
    expect(motion?.description).toContain("거리가 증가하면 양수(+), 감소하면 음수(-)");
    expect(motion?.measurements.find((item) => item.key === "velocity")?.label).toContain("부호 있는 속도 추정값");

    const light = experimentPacks.find((pack) => pack.sensorId === "ldr");
    expect(light?.sensorName).toContain("10 kΩ 전압 분배기");
    expect(light?.wiring.map((step) => step.unoPin)).toEqual(["5V", "A0", "GND"]);
    expect(light?.description).toContain("절대 조도(lux)가 아닙니다");
    expect(light?.measurements.find((item) => item.key === "relativeLight")?.label).toContain("원시 상대광 신호");
    expect(light?.measurements.find((item) => item.key === "relativeTransmittance")?.label).toContain("기준값 대비 상대 투과율");
  });
});
