import { Activity, Download, Play, Square } from 'lucide-react';
import type { MeasurementSample, StudentExperiment } from './types';
import { LiveSensorChart } from './LiveSensorChart';
import { SourceBadge } from './SourceBadge';

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
  freshnessMessage?: string;
  measurementStale?: boolean;
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
  freshnessMessage,
  measurementStale = false,
}: DashboardMeasurementProps) {
  const latestByKey = new Map(samples.map((sample) => [sample.key, sample]));

  return (
    <section className="measurement-panel dashboard-measurement" id="measurement" aria-labelledby="measurement-title">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">LIVE SENSOR</span>
          <h2 id="measurement-title">실시간 측정</h2>
        </div>
        <span className={`measurement-status ${measuring ? 'is-live' : ''}`} role="status">
          <Activity size={14} aria-hidden="true" /> {measuring ? (measurementStale ? '현재값 대기' : '실시간 수신') : connected ? '측정 준비' : '측정 전'}
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

      {freshnessMessage && <p className="freshness-warning" role="alert">{freshnessMessage}</p>}

      <div className="dashboard-measure-actions">
        {measuring ? (
          <button type="button" className="button button-danger" onClick={onStop}>
            <Square size={15} fill="currentColor" aria-hidden="true" /> 측정 멈추기
          </button>
        ) : (
          <button type="button" className="button button-primary measure-button" onClick={onStart} disabled={!connected}>
            <Play size={15} fill="currentColor" aria-hidden="true" /> 바로 측정 시작
          </button>
        )}
        <button type="button" className="text-button" onClick={onDemo} disabled={measuring}>기기 없이 데모 데이터 보기</button>
        <button
          type="button"
          className="button button-secondary live-csv-button"
          onClick={onDownloadLiveCsv}
          disabled={liveCsvCount === 0}
        >
          <Download size={15} aria-hidden="true" /> 현재 측정 CSV 받기 ({liveCsvCount}행)
        </button>
      </div>
      {liveCsvStatus && <p className="live-csv-status" role="status">{liveCsvStatus}</p>}

      <LiveSensorChart experiment={experiment} history={history} connected={connected} measuring={measuring} stale={measurementStale} />
    </section>
  );
}
