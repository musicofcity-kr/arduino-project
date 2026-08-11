import type { MeasurementSample, SourceKind, StudentExperiment } from './types';
import { SourceBadge } from './SourceBadge';

interface MeasurementPanelProps {
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

const sourceKinds: SourceKind[] = ['real', 'derived', 'simulation', 'demo'];

export function MeasurementPanel({
  experiment,
  connected,
  measuring,
  samples,
  history,
  onStart,
  onStop,
  onDemo,
  freshnessMessage,
}: MeasurementPanelProps) {
  const latestByKey = new Map(samples.map((sample) => [sample.key, sample]));
  const graphKey = experiment.measurements[0]?.key;
  const graphValues = history.filter((sample) => sample.key === graphKey).slice(-16);
  const max = Math.max(...graphValues.map((sample) => sample.value), 1);
  const min = Math.min(...graphValues.map((sample) => sample.value), 0);
  const range = max - min || 1;
  const points = graphValues.map((sample, index) => {
    const x = graphValues.length === 1 ? 50 : (index / (graphValues.length - 1)) * 100;
    const y = 92 - ((sample.value - min) / range) * 78;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="measurement-panel" aria-labelledby="measurement-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">3단계</p>
          <h2 id="measurement-title">바로 측정하고 변화를 관찰해요</h2>
        </div>
        {measuring && <span className="live-indicator" role="status"><i aria-hidden="true" />새 값 받는 중</span>}
      </div>

      <div className="measurement-grid" aria-live="polite" aria-atomic="false">
        {experiment.measurements.map((definition) => {
          const sample = latestByKey.get(definition.key);
          return (
            <article className="measurement-card" key={definition.key}>
              <span className="measurement-label">{definition.label}</span>
              <div className="measurement-value">
                <strong>{sample ? sample.value.toFixed(definition.precision ?? 1) : '—'}</strong>
                <span>{sample?.unit ?? definition.unit}</span>
              </div>
              <SourceBadge source={sample?.source ?? 'none'} />
              {sample && (
                <>
                  <p className="source-detail">{sample.sourceDetail}</p>
                  <time dateTime={new Date(sample.receivedAt).toISOString()}>
                    {new Date(sample.receivedAt).toLocaleTimeString('ko-KR')} 수신
                    {sample.rawTimestampMs !== undefined ? ` · 기기 시각 ${sample.rawTimestampMs} ms` : ''}
                  </time>
                  {sample.calculation && (
                    <details className="calculation-provenance">
                      <summary>계산 근거 보기</summary>
                      <p>공식: {sample.calculation.formula}</p>
                      <ul>
                        {sample.calculation.inputs.map((input, index) => (
                          <li key={`${input.metric}-${input.timestampMs}-${index}`}>
                            {input.source} {input.metric}: {input.value} {input.unit} @ {input.timestampMs} ms
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>

      {freshnessMessage && <p className="freshness-warning" role="alert">{freshnessMessage}</p>}

      <div className="chart-card">
        <div>
          <strong>{experiment.measurements[0]?.label ?? '측정값'} 변화</strong>
          <span>최근 측정값 최대 16개</span>
        </div>
        {graphValues.length > 1 ? (
          <svg className="mini-chart" viewBox="0 0 100 100" role="img" aria-label={`${experiment.measurements[0]?.label} 최근 변화 그래프`} preserveAspectRatio="none">
            <line x1="0" y1="92" x2="100" y2="92" className="chart-axis" />
            <polyline points={points} className="chart-line" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div className="chart-empty">측정을 시작하면 변화가 선으로 나타나요.</div>
        )}
      </div>

      <div className="measurement-actions">
        {measuring ? (
          <button type="button" className="button button-danger" onClick={onStop}>측정 멈추기</button>
        ) : (
          <button type="button" className="button button-primary measure-button" onClick={onStart} disabled={!connected}>
            <span aria-hidden="true">▶</span> 바로 측정 시작
          </button>
        )}
        {!connected && <p>먼저 위에서 UNO 응답을 확인해 주세요.</p>}
        <button type="button" className="text-button" onClick={onDemo} disabled={measuring}>기기 없이 데모 데이터 보기</button>
      </div>

      <details className="provenance-legend">
        <summary>데이터 출처 표시는 어떻게 읽나요?</summary>
        <div>
          {sourceKinds.map((source) => <SourceBadge key={source} source={source} />)}
        </div>
        <p>데모와 시뮬레이션은 실제 센서 측정이 아닙니다. 계산값은 어떤 실측값에서 계산했는지 함께 기록합니다.</p>
      </details>
    </section>
  );
}
