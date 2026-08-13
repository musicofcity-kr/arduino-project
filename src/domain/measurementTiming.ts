import type { SensorPackId } from './protocol';

export const SENSOR_INTERVAL_OPTIONS_MS: Readonly<Record<SensorPackId, readonly number[]>> = {
  dht11: [2_000, 5_000, 10_000],
  'hc-sr04': [500, 1_000, 2_000, 5_000, 10_000],
  ldr: [500, 1_000, 2_000, 5_000, 10_000],
};

export const DEFAULT_SENSOR_INTERVAL_MS: Readonly<Record<SensorPackId, number>> = {
  dht11: 2_000,
  'hc-sr04': 500,
  ldr: 500,
};

export const MEASUREMENT_DURATION_OPTIONS_MS = [0, 30_000, 60_000, 180_000, 300_000, 600_000] as const;

const BASE_FRESHNESS_MS: Readonly<Record<SensorPackId, number>> = {
  dht11: 5_000,
  'hc-sr04': 3_000,
  ldr: 3_000,
};

export function isAllowedSensorInterval(sensorId: SensorPackId, intervalMs: number): boolean {
  return SENSOR_INTERVAL_OPTIONS_MS[sensorId].includes(intervalMs);
}

export function measurementFreshnessMs(sensorId: SensorPackId, intervalMs: number): number {
  return Math.max(BASE_FRESHNESS_MS[sensorId], Math.ceil(intervalMs * 1.5));
}

export function intervalLabel(intervalMs: number): string {
  return `${intervalMs / 1_000}초`;
}

export function durationLabel(durationMs: number): string {
  if (durationMs === 0) return '계속 측정';
  if (durationMs < 60_000) return `${durationMs / 1_000}초`;
  return `${durationMs / 60_000}분`;
}

export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
