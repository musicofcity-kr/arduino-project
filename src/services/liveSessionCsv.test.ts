import { describe, expect, it } from 'vitest';
import type { MeasurementSample } from '../components/types';
import { fitCompleteLiveFrame, LiveSessionCsvError, liveSessionFilename, liveSessionSamplesToCsv } from './liveSessionCsv';

const receivedAt = Date.parse('2026-08-13T04:00:00.000Z');
const context = { runId: '=unsafe-run', experimentPackId: 'humidity-weather', sensorPackId: 'dht11' as const };

function raw(key: string, value: number, unit: string, timestampMs: number): MeasurementSample {
  return {
    id: `${key}-${timestampMs}`,
    key,
    label: key,
    value,
    unit,
    source: 'real',
    sourceDetail: 'test',
    receivedAt,
    rawSource: 'dht11',
    rawTimestampMs: timestampMs,
    rawUnit: unit,
  };
}

describe('live session CSV', () => {
  it('exports DHT11 rows with BOM, CRLF, units, timestamps, and spreadsheet-safe text', () => {
    const csv = liveSessionSamplesToCsv(context, [
      raw('temperature', 29.9, '°C', 1000),
      raw('humidity', 39.4, '%RH', 1000),
    ]);

    expect(csv.startsWith('\uFEFFdatasetKind,runId')).toBe(true);
    expect(csv).toContain("live-session,'=unsafe-run,humidity-weather,dht11,1,raw,temperature,29.9,°C,1000");
    expect(csv).toContain('live-session,\'=unsafe-run,humidity-weather,dht11,2,raw,humidity,39.4,%RH,1000');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('preserves normalized HC-SR04 raw units and derived provenance', () => {
    const samples: MeasurementSample[] = [
      { ...raw('distance', 7.82, 'cm', 1500), rawSource: 'hc-sr04', rawUnit: 'mm' },
      {
        id: 'velocity-1500', key: 'velocity', label: 'velocity', value: -0.4, unit: 'm/s', source: 'derived', sourceDetail: 'test', receivedAt,
        calculation: {
          provenance: 'derived', source: 'calculation', metric: 'velocity', value: -0.4, unit: 'm/s', timestampMs: 1500,
          formula: 'delta-distance/delta-time',
          inputs: [{ source: 'hc-sr04', metric: 'distance', value: 8.02, unit: 'cm', timestampMs: 1000 }],
        },
      },
    ];
    const csv = liveSessionSamplesToCsv({ ...context, experimentPackId: 'distance-motion', sensorPackId: 'hc-sr04' }, samples);

    expect(csv).toContain('raw,distance,7.82,cm,1500');
    expect(csv).toContain('derived,velocity,-0.4,m/s,1500');
    expect(csv).toContain('delta-distance/delta-time');
    expect(csv).toContain('""source"":""hc-sr04""');
    expect(csv).not.toContain(',mm,');
  });

  it('keeps LDR as count and percent instead of claiming lux', () => {
    const light = { ...raw('relativeLight', 612, 'count', 2000), rawSource: 'ldr' as const, rawUnit: 'count' };
    const csv = liveSessionSamplesToCsv({ ...context, experimentPackId: 'light-transmittance', sensorPackId: 'ldr' }, [light]);
    expect(csv).toContain('raw,relativeLight,612,count,2000');
    expect(csv).not.toContain('lux');
  });

  it('rejects empty, demo-only, non-finite, and provenance-free samples', () => {
    const demo: MeasurementSample = { ...raw('temperature', 23, '°C', 1), source: 'demo', rawSource: undefined, rawTimestampMs: undefined };
    expect(() => liveSessionSamplesToCsv(context, [])).toThrowError(LiveSessionCsvError);
    expect(() => liveSessionSamplesToCsv(context, [demo])).toThrowError('CSV로 받을 실측 데이터가 아직 없어요.');
    expect(() => liveSessionSamplesToCsv(context, [{ ...raw('temperature', Number.NaN, '°C', 1) }])).toThrowError('출처나 시각');
    expect(() => liveSessionSamplesToCsv(context, [{ ...raw('temperature', 23, '°C', 1), rawSource: undefined }])).toThrowError('출처나 시각');
  });

  it('creates a filesystem-safe timestamped filename', () => {
    expect(liveSessionFilename('humidity/weather', new Date('2026-08-13T04:05:06.007Z')))
      .toBe('live-sensor-humidity-weather-2026-08-13T04-05-06-007Z.csv');
  });

  it('never splits a raw and derived sensor frame at the row limit', () => {
    const frame = [raw('distance', 7.82, 'cm', 3000), raw('velocity', -0.4, 'm/s', 3000)];
    expect(fitCompleteLiveFrame(9_998, frame).samples).toHaveLength(2);
    expect(fitCompleteLiveFrame(9_999, frame)).toEqual({ samples: [], truncated: true });
  });
});
