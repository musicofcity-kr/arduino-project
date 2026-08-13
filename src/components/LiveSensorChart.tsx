import type { MeasurementSample, StudentExperiment } from './types';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 48;
const X_PADDING = 8;
const Y_PADDING = 6;
const MAX_POINTS = 24;

export interface LiveChartPoint {
  timestampMs: number;
  value: number;
  x: number;
  y: number;
}

export interface LiveChartSeries {
  key: string;
  label: string;
  unit: string;
  source: 'real' | 'demo';
  points: readonly LiveChartPoint[];
  min: number;
  max: number;
  latest: number;
  durationMs: number;
}

function sampleTimestamp(sample: MeasurementSample): number {
  return sample.rawTimestampMs ?? sample.receivedAt;
}

export function buildLiveChartSeries(
  experiment: StudentExperiment,
  history: readonly MeasurementSample[],
): LiveChartSeries[] {
  return experiment.measurements
    .filter((definition) => definition.kind !== 'derived')
    .flatMap((definition) => {
      const candidates = history.filter((sample) =>
        sample.key === definition.key &&
        (sample.source === 'real' || sample.source === 'demo') &&
        Number.isFinite(sample.value) &&
        Number.isFinite(sampleTimestamp(sample))
      );
      const source = candidates.at(-1)?.source;
      if (source !== 'real' && source !== 'demo') return [];

      let monotonic: MeasurementSample[] = [];
      for (const sample of candidates.filter((candidate) => candidate.source === source)) {
        const timestamp = sampleTimestamp(sample);
        const previous = monotonic.at(-1);
        if (previous && timestamp < sampleTimestamp(previous)) monotonic = [sample];
        else if (previous && timestamp === sampleTimestamp(previous)) monotonic[monotonic.length - 1] = sample;
        else monotonic.push(sample);
      }
      monotonic = monotonic.slice(-MAX_POINTS);
      if (!monotonic.length) return [];

      const values = monotonic.map((sample) => sample.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const firstTimestamp = sampleTimestamp(monotonic[0]);
      const lastTimestamp = sampleTimestamp(monotonic[monotonic.length - 1]);
      const durationMs = Math.max(0, lastTimestamp - firstTimestamp);
      const valuePadding = max === min
        ? Math.max(Math.abs(max) * 0.05, 1)
        : (max - min) * 0.08;
      const low = min - valuePadding;
      const high = max + valuePadding;

      const points = monotonic.map((sample, index) => {
        const timestampMs = sampleTimestamp(sample);
        const x = durationMs > 0
          ? X_PADDING + ((timestampMs - firstTimestamp) / durationMs) * (CHART_WIDTH - X_PADDING * 2)
          : CHART_WIDTH / 2;
        const y = Y_PADDING + ((high - sample.value) / (high - low)) * (CHART_HEIGHT - Y_PADDING * 2);
        return { timestampMs, value: sample.value, x, y };
      });

      return [{
        key: definition.key,
        label: definition.label,
        unit: definition.unit,
        source,
        points,
        min,
        max,
        latest: values.at(-1) ?? values[0],
        durationMs,
      }];
    });
}

interface LiveSensorChartProps {
  experiment: StudentExperiment;
  history: readonly MeasurementSample[];
  connected: boolean;
  measuring: boolean;
}

export function LiveSensorChart({ experiment, history, connected, measuring }: LiveSensorChartProps) {
  const series = buildLiveChartSeries(experiment, history);
  const stateLabel = series.some((item) => item.source === 'demo')
    ? '예시 데이터'
    : measuring
      ? '실시간 수신'
      : series.length
        ? '마지막 측정 기록 · 현재값 아님'
        : connected
          ? '측정 시작을 누르세요'
          : '센서를 연결하면 그래프가 표시됩니다';

  return (
    <section className="compact-history live-chart" aria-labelledby="live-chart-title">
      <div className="live-chart-heading">
        <strong id="live-chart-title">실시간 그래프</strong>
        <small role="status" aria-live="polite" aria-atomic="true">{stateLabel}</small>
      </div>
      {series.length ? (
        <div className="live-chart-series-list">
          {series.map((item) => {
            const definition = experiment.measurements.find((candidate) => candidate.key === item.key);
            const precision = definition?.precision ?? (item.unit === 'count' ? 0 : 1);
            const titleId = `chart-${item.key}-title`;
            const descId = `chart-${item.key}-desc`;
            const pointString = item.points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
            const durationSeconds = item.durationMs / 1000;
            const delta = item.latest - item.points[0].value;
            const deltaLabel = item.points.length < 2
              ? '첫 값'
              : `첫 값 대비 ${delta > 0 ? '+' : ''}${delta.toFixed(precision)} ${item.unit}`;
            return (
              <article className={`live-chart-series live-chart-${item.key}`} key={item.key}>
                <div className="live-chart-series-header">
                  <span>{item.label} ({item.unit})</span>
                  <span>
                    현재 {item.latest.toFixed(precision)} · 최저 {item.min.toFixed(precision)} · 최고 {item.max.toFixed(precision)} · n={item.points.length}
                  </span>
                </div>
                <svg
                  data-testid={`live-chart-${item.key}`}
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  role="img"
                  aria-labelledby={`${titleId} ${descId}`}
                  focusable="false"
                  preserveAspectRatio="none"
                >
                  <title id={titleId}>{item.label} 변화 그래프</title>
                  <desc id={descId}>
                    {item.unit} 단위, 최저 {item.min.toFixed(precision)}, 최고 {item.max.toFixed(precision)}, 최신 {item.latest.toFixed(precision)}, 최근 {item.points.length}개 시점, {deltaLabel}
                  </desc>
                  <line className="live-chart-grid" x1={X_PADDING} y1={CHART_HEIGHT / 2} x2={CHART_WIDTH - X_PADDING} y2={CHART_HEIGHT / 2} />
                  {item.points.length === 1 ? (
                    <circle className="live-chart-line" cx={item.points[0].x} cy={item.points[0].y} r="3" />
                  ) : (
                    <polyline className="live-chart-line" points={pointString} vectorEffect="non-scaling-stroke" />
                  )}
                </svg>
                <small className="live-chart-axis">{durationSeconds > 0 ? `최근 ${durationSeconds.toFixed(1)}초` : '첫 값'} · {deltaLabel} · {item.source === 'real' ? '실측 원시값' : '예시값'}</small>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="compact-history-empty">{stateLabel}</div>
      )}
    </section>
  );
}
