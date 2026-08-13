import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SENSOR_INTERVAL_MS,
  durationLabel,
  formatRemainingTime,
  isAllowedSensorInterval,
  measurementFreshnessMs,
} from './measurementTiming';

describe('measurement timing policy', () => {
  it('keeps the existing defaults and rejects unsafe intervals', () => {
    expect(DEFAULT_SENSOR_INTERVAL_MS).toEqual({ dht11: 2_000, 'hc-sr04': 500, ldr: 500 });
    expect(isAllowedSensorInterval('dht11', 2_000)).toBe(true);
    expect(isAllowedSensorInterval('dht11', 500)).toBe(false);
    expect(isAllowedSensorInterval('hc-sr04', 10_000)).toBe(true);
    expect(isAllowedSensorInterval('ldr', 250)).toBe(false);
  });

  it('expands sensor freshness without changing transport liveness', () => {
    expect(measurementFreshnessMs('dht11', 2_000)).toBe(5_000);
    expect(measurementFreshnessMs('dht11', 10_000)).toBe(15_000);
    expect(measurementFreshnessMs('hc-sr04', 500)).toBe(3_000);
    expect(measurementFreshnessMs('ldr', 5_000)).toBe(7_500);
  });

  it('formats duration and countdown labels for students', () => {
    expect(durationLabel(0)).toBe('계속 측정');
    expect(durationLabel(30_000)).toBe('30초');
    expect(durationLabel(180_000)).toBe('3분');
    expect(formatRemainingTime(59_001)).toBe('01:00');
    expect(formatRemainingTime(0)).toBe('00:00');
  });
});
