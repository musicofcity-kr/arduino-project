import { Activity, Play, Square, Waves } from 'lucide-react';
import type { MeasurementSample, StudentExperiment } from './types';
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
  freshnessMessage?: string;
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
  freshnessMessage,
}: DashboardMeasurementProps) {
  const latestByKey = new Map(samples.map((sample) => [sample.key, sample]));
  const graphKey = experiment.measurements[0]?.key;
  const graphValues = history.filter((sample) => sample.key === graphKey).slice(-16);
  const max = Math.max(...graphValues.map((sample) => sample.value), 1);
  const min = Math.min(...graphValues.map((sample) => sample.value), 0);
  const range = max - min || 1;
  const points = graphValues.map((sample, index) => {
    const x = graphValues.length === 1 ? 50 : (index / (graphValues.length - 1)) * 100;
    const y = 88 - ((sample.value - min) / range) * 68;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="measurement-panel dashboard-measurement" id="measurement" aria-labelledby="measurement-title">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">LIVE SENSOR</span>
          <h2 id="measurement-title">실시간 측정</h2>
        </div>
        <span className={`measurement-status ${measuring ? 'is-live' : ''}`} role="status">
          <Activity size={14} aria-hidden="true" /> {measuring ? '실시간 수신' : connected ? '측정 준비' : '측정 전'}
        </span>
      </div>

      <div className="dashboard-metric-grid" aria-live="polite" aria-atomic="false">
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
      </div>

      <div className="compact-history" aria-label={`${experiment.measurements[0]?.label ?? '측정값'} 변화 그래프`}>
        <div>
          <span><Waves size={15} aria-hidden="true" /> 최근 변화</span>
          <small>{graphValues.length ? `${graphValues.length}개 값` : '값을 기다리는 중'}</small>
        </div>
        {graphValues.length > 1 ? (
          <svg viewBox="0 0 100 100" role="img" preserveAspectRatio="none">
            <polyline points={points} vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div className="compact-history-empty">측정을 시작하면 변화가 표시됩니다.</div>
        )}
      </div>
    </section>
  );
}
