import type { MeasurementSample, StudentExperiment } from '../components/types';
import { rowsToCsv } from './csv';

export const LIVE_SESSION_MAX_ROWS = 10_000;

export interface LiveSessionCsvContext {
  runId: string;
  experimentPackId: string;
  sensorPackId: StudentExperiment['sensorId'];
  requestedIntervalMs: number;
  requestedDurationMs: number | null;
  startedAt: string;
  endedAt: string | null;
  stopReason: 'running' | 'manual' | 'automatic' | 'disconnect' | 'transport-timeout' | 'serial-error' | 'stop-error';
}

export function fitCompleteLiveFrame(
  currentRowCount: number,
  frame: readonly MeasurementSample[],
  maxRows = LIVE_SESSION_MAX_ROWS,
): { samples: MeasurementSample[]; truncated: boolean } {
  const exportable = frame.filter((sample) => sample.source === 'real' || sample.source === 'derived');
  if (exportable.length > Math.max(0, maxRows - currentRowCount)) {
    return { samples: [], truncated: exportable.length > 0 };
  }
  return { samples: exportable, truncated: false };
}

export class LiveSessionCsvError extends Error {
  constructor(public readonly code: 'EMPTY_LIVE_SESSION' | 'INVALID_LIVE_SAMPLE') {
    super(code === 'EMPTY_LIVE_SESSION'
      ? 'CSV로 받을 실측 데이터가 아직 없어요.'
      : '출처나 시각이 올바르지 않은 센서값은 CSV로 만들 수 없어요.');
    this.name = 'LiveSessionCsvError';
  }
}

function timestampFor(sample: MeasurementSample): number | null {
  if (sample.source === 'real') return sample.rawTimestampMs ?? null;
  if (sample.source === 'derived') return sample.calculation?.timestampMs ?? null;
  return null;
}

export function liveSessionSamplesToCsv(
  context: LiveSessionCsvContext,
  samples: readonly MeasurementSample[],
): string {
  const exportable = samples.filter((sample) => sample.source === 'real' || sample.source === 'derived');
  if (!exportable.length) throw new LiveSessionCsvError('EMPTY_LIVE_SESSION');
  if (
    !Number.isInteger(context.requestedIntervalMs) || context.requestedIntervalMs <= 0 ||
    (context.requestedDurationMs !== null && (!Number.isInteger(context.requestedDurationMs) || context.requestedDurationMs <= 0)) ||
    !Number.isFinite(Date.parse(context.startedAt)) ||
    (context.endedAt !== null && !Number.isFinite(Date.parse(context.endedAt)))
  ) {
    throw new LiveSessionCsvError('INVALID_LIVE_SAMPLE');
  }

  const rows: unknown[][] = [[
    'datasetKind',
    'runId',
    'experimentPackId',
    'sensorPackId',
    'requestedIntervalMs',
    'requestedDurationMs',
    'durationMode',
    'startedAt',
    'endedAt',
    'stopReason',
    'rowIndex',
    'provenance',
    'metric',
    'value',
    'unit',
    'deviceTimestampMs',
    'receivedAt',
    'formula',
    'inputs',
  ]];

  exportable.forEach((sample, index) => {
    const deviceTimestampMs = timestampFor(sample);
    const validRaw = sample.source !== 'real' || sample.rawSource === context.sensorPackId;
    const validDerived = sample.source !== 'derived' || (
      sample.calculation &&
      sample.calculation.provenance === 'derived' &&
      sample.calculation.source === 'calculation' &&
      sample.calculation.formula &&
      sample.calculation.inputs.length > 0
    );
    if (
      !Number.isFinite(sample.value) ||
      !Number.isFinite(sample.receivedAt) ||
      !Number.isInteger(deviceTimestampMs) ||
      (deviceTimestampMs ?? -1) < 0 ||
      !sample.key ||
      !sample.unit ||
      !validRaw ||
      !validDerived
    ) {
      throw new LiveSessionCsvError('INVALID_LIVE_SAMPLE');
    }

    rows.push([
      'live-session',
      context.runId,
      context.experimentPackId,
      context.sensorPackId,
      context.requestedIntervalMs,
      context.requestedDurationMs,
      context.requestedDurationMs === null ? 'continuous' : 'timed',
      context.startedAt,
      context.endedAt,
      context.stopReason,
      index + 1,
      sample.source === 'real' ? 'raw' : 'derived',
      sample.key,
      sample.value,
      sample.unit,
      deviceTimestampMs,
      new Date(sample.receivedAt).toISOString(),
      sample.calculation?.formula ?? '',
      sample.calculation?.inputs ?? '',
    ]);
  });

  return rowsToCsv(rows, { bom: true });
}

export function liveSessionFilename(experimentPackId: string, at = new Date()): string {
  const safePackId = experimentPackId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeTimestamp = at.toISOString().replace(/[:.]/g, '-');
  return `live-sensor-${safePackId}-${safeTimestamp}.csv`;
}
