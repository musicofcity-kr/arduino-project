import { Activity, Download, Play, Square, Trash2 } from 'lucide-react';
import type { MeasurementSample, StudentExperiment } from './types';
import { LiveSensorChart } from './LiveSensorChart';
import { SourceBadge } from './SourceBadge';
import {
  MEASUREMENT_DURATION_OPTIONS_MS,
  SENSOR_INTERVAL_OPTIONS_MS,
  durationLabel,
  formatRemainingTime,
  intervalLabel,
} from '../domain/measurementTiming';

interface DashboardMeasurementProps {
  experiment: StudentExperiment;
  connected: boolean;
  measuring: boolean;
  samples: MeasurementSample[];
  history: MeasurementSample[];
  onStart: () => void;
  onStop: () => void;
  onDemo: () => void;
  liveCsvCount: number;
  liveCsvStatus?: string;
  onDownloadLiveCsv: () => void;
  onClearLiveData: () => void;
  clearingLiveData: boolean;
  clearLiveDataLocked: boolean;
  freshnessMessage?: string;
  measurementStale?: boolean;
  measurementIntervalMs: number;
  measurementDurationMs: number;
  measurementRemainingMs: number | null;
  timingLocked: boolean;
  timingStatus: string;
  liveRunOutcome: 'none' | 'running' | 'completed' | 'stopped' | 'interrupted';
  onIntervalChange: (intervalMs: number) => void;
  onDurationChange: (durationMs: number) => void;
}

export function DashboardMeasurement({
  experiment,
  connected,
  measuring,
  samples,
  history,
  onStart,
  onStop,
  onDemo,
  liveCsvCount,
  liveCsvStatus,
  onDownloadLiveCsv,
  onClearLiveData,
  clearingLiveData,
  clearLiveDataLocked,
  freshnessMessage,
  measurementStale = false,
  measurementIntervalMs,
  measurementDurationMs,
  measurementRemainingMs,
  timingLocked,
  timingStatus,
  liveRunOutcome,
  onIntervalChange,
  onDurationChange,
}: DashboardMeasurementProps) {
  const latestByKey = new Map(samples.map((sample) => [sample.key, sample]));
  const runActive = measuring || (timingLocked && liveRunOutcome === 'running');
  const hasLiveData = liveCsvCount > 0 || history.length > 0;
  const demoOnly = liveCsvCount === 0 && history.length > 0 && history.every((sample) => sample.source === 'demo');
  const statusLabel = measuring
    ? (measurementStale ? '현재값 대기' : '실시간 수신')
    : timingLocked
      ? (timingStatus.includes('종료') || timingStatus.includes('멈춤') ? '종료 확인 중' : '설정 확인 중')
      : connected ? '측정 준비' : '측정 전';
  const csvPrefix = liveRunOutcome === 'running'
    ? '지금까지'
    : liveRunOutcome === 'completed'
      ? '완료한'
      : liveRunOutcome === 'stopped'
        ? '직접 멈춘'
        : liveRunOutcome === 'interrupted'
          ? '중단된'
          : '이번';

  return (
    <section className="measurement-panel dashboard-measurement" id="measurement" aria-labelledby="measurement-title">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">LIVE SENSOR</span>
          <h2 id="measurement-title">실시간 측정</h2>
        </div>
        <span className={`measurement-status ${measuring ? 'is-live' : ''}`} role="status">
          <Activity size={14} aria-hidden="true" /> {statusLabel}
        </span>
      </div>

      <div className="dashboard-metric-grid" aria-live="off">
        {experiment.measurements.map((definition) => {
          const sample = latestByKey.get(definition.key);
          return (
            <article className="measurement-card dashboard-metric-card" key={definition.key}>
              <span className="measurement-label">{definition.label}</span>
              <div className="measurement-value">
                <strong>{sample ? sample.value.toFixed(definition.precision ?? 1) : '—'}</strong>
                <span>{sample?.unit ?? definition.unit}</span>
              </div>
              <SourceBadge source={sample?.source ?? 'none'} />
              {sample && (
                <time dateTime={new Date(sample.receivedAt).toISOString()}>
                  {new Date(sample.receivedAt).toLocaleTimeString('ko-KR')} 수신
                </time>
              )}
            </article>
          );
        })}
      </div>

      <fieldset className="measurement-timing" disabled={timingLocked} aria-describedby="measurement-timing-help">
        <legend>측정 설정</legend>
        <label htmlFor="measurement-interval">
          <span>얼마마다 측정할까요?</span>
          <select
            id="measurement-interval"
            value={measurementIntervalMs}
            onChange={(event) => onIntervalChange(Number(event.target.value))}
          >
            {SENSOR_INTERVAL_OPTIONS_MS[experiment.sensorId].map((intervalMs) => (
              <option key={intervalMs} value={intervalMs}>{intervalLabel(intervalMs)}마다</option>
            ))}
          </select>
        </label>
        <label htmlFor="measurement-duration">
          <span>얼마 동안 측정할까요?</span>
          <select
            id="measurement-duration"
            value={measurementDurationMs}
            onChange={(event) => onDurationChange(Number(event.target.value))}
          >
            {MEASUREMENT_DURATION_OPTIONS_MS.map((durationMs) => (
              <option key={durationMs} value={durationMs}>{durationLabel(durationMs)}</option>
            ))}
          </select>
        </label>
        <p id="measurement-timing-help">
          설정은 측정 중 잠깁니다. 그래프는 최근 24개 점, CSV는 이번 측정의 최대 10,000행을 보관해요.
        </p>
        <output className="measurement-timer" role="timer" aria-live="off" aria-atomic="true">
          {measurementRemainingMs === null
            ? `${intervalLabel(measurementIntervalMs)}마다 · ${durationLabel(measurementDurationMs)}`
            : `남은 시간 ${formatRemainingTime(measurementRemainingMs)}`}
        </output>
        <span className="measurement-timing-status" role="status" aria-live="polite" aria-atomic="true">{timingStatus}</span>
      </fieldset>

      {freshnessMessage && <p className="freshness-warning" role="alert">{freshnessMessage}</p>}

      <div className="dashboard-measure-actions">
        {runActive ? (
          <button type="button" className="button button-danger" onClick={onStop} disabled={!measuring}>
            <Square size={15} fill="currentColor" aria-hidden="true" /> {measuring ? '측정 멈추기' : '종료 확인 중…'}
          </button>
        ) : (
          <button type="button" className="button button-primary measure-button" onClick={onStart} disabled={!connected}>
            <Play size={15} fill="currentColor" aria-hidden="true" /> 바로 측정 시작
          </button>
        )}
        <button
          type="button"
          className="button button-secondary live-csv-button"
          onClick={onDownloadLiveCsv}
          disabled={liveCsvCount === 0}
        >
          <Download size={15} aria-hidden="true" /> {csvPrefix} 측정 CSV 받기 ({liveCsvCount}행)
        </button>
        <button
          type="button"
          className="button live-clear-button"
          onClick={onClearLiveData}
          disabled={!hasLiveData || clearingLiveData || clearLiveDataLocked || (timingLocked && !measuring)}
          aria-describedby="live-clear-help"
        >
          <Trash2 size={15} aria-hidden="true" /> {clearingLiveData
            ? '기록 처리 중…'
            : measuring
              ? `비우고 새 측정 시작 (${liveCsvCount}행)`
              : demoOnly
                ? '데모 데이터 비우기'
                : `이번 측정 데이터 비우기 (${liveCsvCount}행)`}
        </button>
        <button type="button" className="text-button" onClick={onDemo} disabled={measuring || timingLocked || clearingLiveData}>기기 없이 데모 데이터 보기</button>
      </div>
      <p className="live-clear-help" id="live-clear-help">{demoOnly
        ? '화면의 데모 그래프만 비웁니다. 실측 저장 기록과 파일에는 영향을 주지 않아요.'
        : '그래프와 이번 측정 CSV만 비웁니다. 저장 기록과 이미 내려받은 파일은 유지돼요.'}</p>
      {liveCsvStatus && <p className="live-csv-status" role="status">{liveCsvStatus}</p>}

      <LiveSensorChart experiment={experiment} history={history} connected={connected} measuring={measuring} stale={measurementStale} />
    </section>
  );
}
