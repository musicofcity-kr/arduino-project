import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App, { createMeasurementDraft } from './App';
import type { MeasurementSample, StudentExperiment } from './components/types';

const textEncoder = new TextEncoder();

function installSerial(input: string) {
  const chunks = [textEncoder.encode(`{"type":"heartbeat","timestampMs":0}\n${input}`)];
  const writes: string[] = [];
  const reader = {
    read: vi.fn(async () => chunks.length
      ? { value: chunks.shift(), done: false }
      : { value: undefined, done: true }),
    cancel: vi.fn(async () => undefined),
    releaseLock: vi.fn(),
  };
  const writer = {
    write: vi.fn(async (value: Uint8Array) => { writes.push(new TextDecoder().decode(value)); }),
    releaseLock: vi.fn(),
  };
  const port = {
    readable: { getReader: () => reader },
    writable: { getWriter: () => writer },
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  Object.defineProperty(navigator, 'serial', {
    configurable: true,
    value: { requestPort: vi.fn(async () => port) },
  });
  return { writes };
}

function installResponsiveSerial(initialHeartbeat = true, measurementModeDelayMs = 0) {
  const queued: Uint8Array[] = initialHeartbeat
    ? [textEncoder.encode('{"type":"heartbeat","timestampMs":0}\n')]
    : [];
  const pending: Array<(result: { value?: Uint8Array; done: boolean }) => void> = [];
  const writes: string[] = [];
  let modeCount = 0;
  const enqueue = (line: string) => {
    const value = textEncoder.encode(`${line}\n`);
    const resolve = pending.shift();
    if (resolve) resolve({ value, done: false });
    else queued.push(value);
  };
  const reader = {
    read: vi.fn(() => queued.length
      ? Promise.resolve({ value: queued.shift(), done: false })
      : new Promise<{ value?: Uint8Array; done: boolean }>((resolve) => pending.push(resolve))),
    cancel: vi.fn(async () => {
      pending.splice(0).forEach((resolve) => resolve({ value: undefined, done: true }));
    }),
    releaseLock: vi.fn(),
  };
  const writer = {
    write: vi.fn(async (value: Uint8Array) => {
      const command = new TextDecoder().decode(value).trim();
      writes.push(`${command}\n`);
      if (command === 'PING') enqueue('ACK:PING');
      else if (command === 'MODE:DHT11') {
        modeCount += 1;
        if (modeCount >= 2 && measurementModeDelayMs > 0) {
          window.setTimeout(() => enqueue('ACK:MODE:DHT11'), measurementModeDelayMs);
        } else {
          enqueue('ACK:MODE:DHT11');
        }
      }
      else if (command === 'STOP') enqueue('ACK:STOP');
    }),
    releaseLock: vi.fn(),
  };
  const port = {
    readable: { getReader: () => reader },
    writable: { getWriter: () => writer },
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  const requestPort = vi.fn(async () => port);
  Object.defineProperty(navigator, 'serial', {
    configurable: true,
    value: { requestPort },
  });
  return { writes, enqueue, reader, writer, port, requestPort };
}

function installResettingSerial() {
  const queued: Uint8Array[] = [textEncoder.encode('{"type":"heartbeat","timestampMs":0}\n')];
  const pending: Array<(result: { value?: Uint8Array; done: boolean }) => void> = [];
  const writes: string[] = [];
  let pingCount = 0;
  const enqueue = (line: string) => {
    const value = textEncoder.encode(`${line}\n`);
    const resolve = pending.shift();
    if (resolve) resolve({ value, done: false });
    else queued.push(value);
  };
  const reader = {
    read: vi.fn(() => queued.length
      ? Promise.resolve({ value: queued.shift(), done: false })
      : new Promise<{ value?: Uint8Array; done: boolean }>((resolve) => pending.push(resolve))),
    cancel: vi.fn(async () => {
      pending.splice(0).forEach((resolve) => resolve({ value: undefined, done: true }));
    }),
    releaseLock: vi.fn(),
  };
  const writer = {
    write: vi.fn(async (value: Uint8Array) => {
      const command = new TextDecoder().decode(value).trim();
      writes.push(`${command}\n`);
      if (command === 'PING') {
        pingCount += 1;
        if (pingCount === 2) enqueue('ACK:PING');
      } else if (command === 'MODE:DHT11') enqueue('ACK:MODE:DHT11');
      else if (command === 'STOP') enqueue('ACK:STOP');
    }),
    releaseLock: vi.fn(),
  };
  const port = {
    readable: { getReader: () => reader },
    writable: { getWriter: () => writer },
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  const requestPort = vi.fn(async () => port);
  Object.defineProperty(navigator, 'serial', {
    configurable: true,
    value: { requestPort },
  });
  return { writes, reader, writer, port, requestPort };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'serial');
  vi.useRealTimers();
});

describe('Student Easy Mode protocol boundary', () => {
  it('waits for a boot heartbeat before sending PING', async () => {
    const serial = installResponsiveSerial(false);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(serial.writes).toEqual([]);
    expect(serial.port.open).toHaveBeenCalledTimes(1);

    await act(async () => {
      serial.enqueue('{"type":"heartbeat","timestampMs":0}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    expect(serial.writes).toEqual(['PING\n', 'MODE:DHT11\n', 'STOP\n']);
  });

  it('recovers when UNO auto-reset drops the first PING without reopening the port', async () => {
    vi.useFakeTimers();
    const serial = installResettingSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(serial.writes).toEqual(['PING\n']);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(serial.reader.cancel).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    expect(serial.writes).toEqual(['PING\n', 'PING\n', 'MODE:DHT11\n', 'STOP\n']);
    expect(serial.requestPort).toHaveBeenCalledTimes(1);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(serial.reader.cancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /연결 해제/ }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(serial.reader.cancel).toHaveBeenCalledTimes(1);
    expect(serial.reader.releaseLock).toHaveBeenCalledTimes(1);
    expect(serial.writer.releaseLock).toHaveBeenCalledTimes(1);
    expect(serial.port.close).toHaveBeenCalledTimes(1);
  });

  it('allows a DHT11 fresh MODE ACK that arrives after three seconds when measurement starts', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial(true, 3500);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });
    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText('UNO 응답 확인 중')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getByText('측정 중')).toBeInTheDocument();
    expect(serial.writes).toEqual(['PING\n', 'MODE:DHT11\n', 'STOP\n', 'MODE:DHT11\n']);

    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });
    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
  });

  it('does not become ready when MODE ACK is for another sensor', async () => {
    const serial = installSerial('ACK:PING\nACK:MODE:HC_SR04\n');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));

    expect(await screen.findByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.queryByText('센서 준비 완료')).not.toBeInTheDocument();
    expect(serial.writes).toEqual(['PING\n', 'MODE:DHT11\n']);
  });

  it('does not display an invalid protocol measurement as real data', async () => {
    installSerial([
      'ACK:PING',
      'ACK:MODE:DHT11',
      'ACK:STOP',
      '{"type":"measurement","sensor":"dht11","timestampMs":1,"values":[{"metric":"temperature","value":"23","unit":"C"}]}',
      'ACK:MODE:DHT11',
      '{"type":"measurement","sensor":"dht11","timestampMs":2,"values":[{"metric":"temperature","value":"23","unit":"C"}]}',
      '',
    ].join('\n'));
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector('.measurement-card .source-real')).toBeNull();
  });

  it('labels demo values as demo and never as real measurements', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /기기 없이 데모 데이터 보기/ }));

    expect(container.querySelectorAll('.measurement-card .source-demo')).toHaveLength(2);
    expect(container.querySelector('.measurement-card .source-real')).toBeNull();
    expect(screen.getByText('데모 데이터입니다. 실제 센서 측정 결과가 아니에요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '현재 결과 저장' })).toBeDisabled();
  });

  it('builds exact provenance-preserving payloads for all three packs', () => {
    const at = Date.now();
    const rawSample = (sensor: StudentExperiment['sensorId'], key: string, value: number, unit: string, timestampMs: number): MeasurementSample => ({
      id: key, key, label: key, value, unit, source: 'real', sourceDetail: 'test', receivedAt: at,
      rawSource: sensor, rawTimestampMs: timestampMs, rawUnit: unit,
    });
    const derivedSample = (
      sensor: 'hc-sr04' | 'ldr',
      key: 'velocity' | 'relativeTransmittance',
      value: number,
      unit: 'm/s' | '%',
      formula: 'delta-distance/delta-time' | 'sample/reference*100',
    ): MeasurementSample => ({
      id: key, key, label: key, value, unit, source: 'derived', sourceDetail: 'test', receivedAt: at,
      calculation: {
        provenance: 'derived', source: 'calculation', metric: key, value, unit, timestampMs: 2000, formula,
        inputs: [{ source: sensor, metric: sensor === 'hc-sr04' ? 'distance' : 'relativeLight', value: 20, unit: sensor === 'hc-sr04' ? 'cm' : 'count', timestampMs: 1000 }],
      },
    });
    const pack = (id: string, sensorId: StudentExperiment['sensorId'], measurements: StudentExperiment['measurements']) => ({ id, sensorId, measurements });
    const dht = createMeasurementDraft(pack('humidity-weather', 'dht11', [
      { key: 'temperature', label: '온도', unit: '°C', kind: 'raw' },
      { key: 'humidity', label: '습도', unit: '%RH', kind: 'raw' },
    ]), [rawSample('dht11', 'temperature', 23, '°C', 1000), rawSample('dht11', 'humidity', 50, '%RH', 1000)]);
    const motion = createMeasurementDraft(pack('distance-motion', 'hc-sr04', [
      { key: 'distance', label: '거리', unit: 'cm', kind: 'raw' },
      { key: 'velocity', label: '속도', unit: 'm/s', kind: 'derived' },
    ]), [rawSample('hc-sr04', 'distance', 20, 'cm', 2000), derivedSample('hc-sr04', 'velocity', -0.4, 'm/s', 'delta-distance/delta-time')]);
    const light = createMeasurementDraft(pack('light-transmittance', 'ldr', [
      { key: 'relativeLight', label: '광 신호', unit: 'count', kind: 'raw' },
      { key: 'relativeTransmittance', label: '투과율', unit: '%', kind: 'derived' },
    ]), [rawSample('ldr', 'relativeLight', 512, 'count', 2000), derivedSample('ldr', 'relativeTransmittance', 80, '%', 'sample/reference*100')]);

    expect(dht?.raw).toEqual({
      temperature: { value: 23, unit: '°C', source: 'dht11', timestampMs: 1000 },
      humidity: { value: 50, unit: '%RH', source: 'dht11', timestampMs: 1000 },
    });
    expect(motion?.raw).toEqual({ distance: { value: 20, unit: 'cm', source: 'hc-sr04', timestampMs: 2000 } });
    expect(motion?.derived.velocity).toEqual(expect.objectContaining({
      value: -0.4, unit: 'm/s', timestampMs: 2000, formula: 'delta-distance/delta-time',
      inputs: [expect.objectContaining({ source: 'hc-sr04', metric: 'distance', timestampMs: 1000 })],
    }));
    expect(light?.raw).toEqual({ relativeLight: { value: 512, unit: 'count', source: 'ldr', timestampMs: 2000 } });
    expect(light?.derived.relativeTransmittance).toEqual(expect.objectContaining({
      value: 80, unit: '%', timestampMs: 2000, formula: 'sample/reference*100',
      inputs: [expect.objectContaining({ source: 'ldr', metric: 'relativeLight', timestampMs: 1000 })],
    }));

    expect(createMeasurementDraft(pack('distance-motion', 'hc-sr04', [
      { key: 'distance', label: '거리', unit: 'cm', kind: 'raw' },
    ]), [{ id: 'missing', key: 'distance', label: '거리', value: 1, unit: 'cm', source: 'real', sourceDetail: 'missing provenance', receivedAt: at }])).toBeNull();
    expect(createMeasurementDraft(pack('distance-motion', 'hc-sr04', [
      { key: 'distance', label: '거리', unit: 'cm', kind: 'raw' },
    ]), [rawSample('hc-sr04', 'distance', 1, 'cm', 1), { id: 'v', key: 'velocity', label: '속도', value: 1, unit: 'm/s', source: 'derived', sourceDetail: 'missing calculation', receivedAt: at }])).toBeNull();
  });

  it('requires STOP ACK and a fresh MODE ACK when measurement restarts', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    expect(await screen.findByText('측정을 멈췄어요. 다시 시작하면 센서 모드 ACK를 새로 확인합니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    expect(serial.writes).toEqual([
      'PING\n',
      'MODE:DHT11\n',
      'STOP\n',
      'MODE:DHT11\n',
      'STOP\n',
      'MODE:DHT11\n',
    ]);
  });

  it('fails closed when the serial line buffer exceeds 4096 characters', async () => {
    installSerial('X'.repeat(4097));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));

    expect(await screen.findByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.queryByText('센서 준비 완료')).not.toBeInTheDocument();
    expect(screen.getByText(/PROTOCOL_LINE_TOO_LONG/)).toBeInTheDocument();
  });

  it('ends the connection when no first measurement arrives within three seconds', async () => {
    installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();

    expect(await screen.findByText(/새 센서값이 3초 동안 오지 않았어요/, {}, { timeout: 4500 })).toBeInTheDocument();
    expect(screen.getByText(/현재값 없음/)).toBeInTheDocument();
    expect(screen.queryByText('측정 중')).not.toBeInTheDocument();
  }, 6000);
});
