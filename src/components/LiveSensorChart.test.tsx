import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MeasurementSample, StudentExperiment } from './types';
import { buildLiveChartSeries, LiveSensorChart } from './LiveSensorChart';

const dhtExperiment: StudentExperiment = {
  id: 'humidity-weather', title: 'DHT', sensorId: 'dht11', sensorName: 'DHT11', question: '', description: '',
  modeCommand: 'MODE:DHT11', accent: 'mint', icon: '', wiring: [], safety: [],
  measurements: [
    { key: 'temperature', label: '온도', unit: '°C', precision: 1, kind: 'raw' },
    { key: 'humidity', label: '상대습도', unit: '%RH', precision: 1, kind: 'raw' },
  ],
};

function sample(key: string, value: number, timestampMs: number, source: 'real' | 'demo' = 'real'): MeasurementSample {
  return {
    id: `${source}-${key}-${timestampMs}`,
    key,
    label: key,
    value,
    unit: key === 'humidity' ? '%RH' : '°C',
    source,
    sourceDetail: 'test',
    receivedAt: timestampMs + 10_000,
    rawSource: source === 'real' ? 'dht11' : undefined,
    rawTimestampMs: source === 'real' ? timestampMs : undefined,
    rawUnit: source === 'real' ? (key === 'humidity' ? '%' : 'C') : undefined,
  };
}

describe('LiveSensorChart', () => {
  it('renders independent DHT11 temperature and humidity graphs with explicit units and stats', () => {
    const history = [
      sample('temperature', 20, 1000), sample('humidity', 40, 1000),
      sample('temperature', 21, 1500), sample('humidity', 42, 1500),
      sample('temperature', 24, 3000), sample('humidity', 44, 3000),
    ];
    render(<LiveSensorChart experiment={dhtExperiment} history={history} connected measuring />);

    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByTestId('live-chart-humidity')).toBeInTheDocument();
    expect(screen.getByText(/온도 \(°C\)/)).toBeInTheDocument();
    expect(screen.getByText(/상대습도 \(%RH\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/n=3/)).toHaveLength(2);
    expect(screen.getAllByText(/첫 값 대비 \+4\.0 °C/)).toHaveLength(2);
    expect(screen.getAllByText(/첫 값 대비 \+4\.0 %RH/)).toHaveLength(2);

    const temperature = buildLiveChartSeries(dhtExperiment, history)[0];
    expect(temperature.points.map((point) => point.x)).toEqual([8, 84, 312]);
  });

  it('keeps only raw sensor metrics in the chart', () => {
    const motion: StudentExperiment = {
      ...dhtExperiment,
      id: 'distance-motion', sensorId: 'hc-sr04', sensorName: 'HC-SR04', modeCommand: 'MODE:HC_SR04',
      measurements: [
        { key: 'distance', label: '거리', unit: 'cm', kind: 'raw' },
        { key: 'velocity', label: '속도', unit: 'm/s', kind: 'derived' },
      ],
    };
    const rawDistance = { ...sample('distance', 7.82, 1000), unit: 'cm', rawSource: 'hc-sr04' as const };
    const velocity = { ...sample('velocity', -0.4, 1000), source: 'derived' as const, unit: 'm/s' };
    const model = buildLiveChartSeries(motion, [rawDistance, velocity]);
    expect(model.map((item) => item.key)).toEqual(['distance']);
  });

  it('does not join reset timestamps or real and demo sources, and never emits invalid coordinates', () => {
    const history = [
      sample('temperature', 20, 9000),
      sample('temperature', 21, 100),
      sample('temperature', 21, 200),
      sample('temperature', 99, 300, 'demo'),
    ];
    const series = buildLiveChartSeries(dhtExperiment, history)[0];
    expect(series.source).toBe('demo');
    expect(series.points).toHaveLength(1);
    expect(series.points[0]).toEqual(expect.objectContaining({ x: 160, value: 99 }));
    expect(Number.isFinite(series.points[0].y)).toBe(true);
  });
});
