import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sketchUrl = new URL("./UniversalSensorFirmware/UniversalSensorFirmware.ino", import.meta.url);

test("firmware source exposes the required command and response contract", async () => {
  const source = await readFile(sketchUrl, "utf8");
  for (const token of ["PING", "MODE:DHT11", "MODE:HC_SR04", "MODE:LDR", "STOP", "ACK:", "ERROR:", "heartbeat", "measurement"]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /pulseIn\(HC_ECHO_PIN, HIGH, HC_TIMEOUT_US\)/);
  assert.match(source, /Fresh_read_timed_out_no_stale_value_sent/);
  assert.match(source, /const uint8_t HC_TRIG_PIN = 9;/);
  assert.match(source, /const uint8_t HC_ECHO_PIN = 10;/);
  assert.match(source, /\\"timestampMs\\"/);
  assert.doesNotMatch(source, /timestamp_ms/);
  assert.doesNotMatch(source, /\\"raw\\"|\\"derived\\"/);
  assert.match(source, /\\"sensor\\":\\"dht11\\"/);
  assert.match(source, /\\"metric\\":\\"temperature\\"/);
  assert.match(source, /\\"unit\\":\\"C\\"/);
  assert.match(source, /\\"metric\\":\\"humidity\\"/);
  assert.match(source, /\\"unit\\":\\"%\\"/);
  assert.match(source, /\\"sensor\\":\\"hc-sr04\\"/);
  assert.match(source, /\\"metric\\":\\"distance\\"/);
  assert.match(source, /\\"unit\\":\\"cm\\"/);
  assert.match(source, /\\"sensor\\":\\"ldr\\"/);
  assert.match(source, /\\"metric\\":\\"relativeLight\\"/);
  assert.match(source, /\\"unit\\":\\"count\\"/);
});

test("STOP disables measurements before acknowledging the command", async () => {
  const source = await readFile(sketchUrl, "utf8");
  const start = source.indexOf('strcmp(command, "STOP")');
  const end = source.indexOf("} else {", start);
  const block = source.slice(start, end);
  assert.ok(start > 0);
  assert.ok(block.indexOf("activeMode = MODE_NONE") < block.indexOf('emitAck("STOP")'));
  assert.match(source, /activeMode != MODE_NONE && now - lastMeasurementAt >= interval/);
});

test("mode activation clears readiness and validates a fresh read before ACK", async () => {
  const source = await readFile(sketchUrl, "utf8");
  for (const [functionName, readCall, ack] of [
    ["activateDht11", "readDht11", "MODE:DHT11"],
    ["activateHcSr04", "readHcSr04", "MODE:HC_SR04"],
    ["activateLdr", "readLdr", "MODE:LDR"],
  ]) {
    const start = source.indexOf(`bool ${functionName}()`);
    const end = source.indexOf("\n}\n", start);
    const block = source.slice(start, end);
    assert.ok(block.indexOf("activeMode = MODE_NONE") < block.indexOf(readCall));
    assert.ok(block.indexOf(readCall) < block.indexOf(`emitAck(\"${ack}\")`));
  }
});
