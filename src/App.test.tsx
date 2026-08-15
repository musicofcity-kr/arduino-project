import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App, { createMeasurementDraft } from './App';
import type { MeasurementSample, StudentExperiment } from './components/types';

const textEncoder = new TextEncoder();
const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

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

function installResponsiveSerial(
  initialHeartbeat = true,
  measurementModeDelayMs = 0,
  sensorMode: 'DHT11' | 'HC_SR04' = 'DHT11',
  failModeAt = 0,
  failIntervalAt = 0,
  intervalAckOverride = '',
) {
  const queued: Uint8Array[] = initialHeartbeat
    ? [textEncoder.encode('{"type":"heartbeat","timestampMs":0}\n')]
    : [];
  const pending: Array<(result: { value?: Uint8Array; done: boolean }) => void> = [];
  const writes: string[] = [];
  let modeCount = 0;
  let intervalCount = 0;
  let inputEnded = false;
  const enqueue = (line: string) => {
    const value = textEncoder.encode(`${line}\n`);
    const resolve = pending.shift();
    if (resolve) resolve({ value, done: false });
    else queued.push(value);
  };
  const endInput = () => {
    inputEnded = true;
    const resolve = pending.shift();
    if (resolve) resolve({ value: undefined, done: true });
  };
  const reader = {
    read: vi.fn(() => queued.length
      ? Promise.resolve({ value: queued.shift(), done: false })
      : inputEnded
        ? Promise.resolve({ value: undefined, done: true })
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
      else if (command.startsWith('SET_INTERVAL:')) {
        intervalCount += 1;
        if (intervalCount === failIntervalAt) enqueue('ERROR:INVALID_INTERVAL:test failure');
        else if (intervalAckOverride) enqueue(intervalAckOverride);
        else enqueue(`ACK:INTERVAL:${command.slice('SET_INTERVAL:'.length)}`);
      }
      else if (command === `MODE:${sensorMode}`) {
        modeCount += 1;
        if (modeCount === failModeAt) {
          enqueue(`ERROR:${sensorMode}_INVALID_READ:test failure`);
        } else if (modeCount >= 2 && measurementModeDelayMs > 0) {
          window.setTimeout(() => enqueue(`ACK:MODE:${sensorMode}`), measurementModeDelayMs);
        } else {
          enqueue(`ACK:MODE:${sensorMode}`);
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
  return { writes, enqueue, endInput, reader, writer, port, requestPort };
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
  if (originalCreateObjectUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (originalRevokeObjectUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Student Easy Mode protocol boundary', () => {
  it('requests every browser-visible serial port without COM or USB filters', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();

    expect(serial.requestPort).toHaveBeenCalledTimes(1);
    expect(serial.requestPort.mock.calls[0]).toEqual([]);
  });

  it('fails clearly when the current PC or mobile browser has no Web Serial API', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));

    expect(screen.getByText('브라우저 확인 필요')).toBeInTheDocument();
    expect(screen.getByText(/Web Serial을 지원하는 최신 Chrome 또는 Edge/)).toBeInTheDocument();
    expect(screen.getByText(/Android는 최신 Chrome과 USB OTG가 필요/)).toBeInTheDocument();
  });

  it('waits for a boot heartbeat before sending PING', async () => {
    const serial = installResponsiveSerial(false);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(serial.writes).toEqual([]);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /거리와 운동 탐구 선택/ })).toBeDisabled();

    await act(async () => {
      serial.enqueue('{"type":"heartbeat","timestampMs":0}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    expect(serial.writes).toEqual(['PING\n', 'MODE:DHT11\n', 'STOP\n']);
    expect(screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' })).toBeEnabled();
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
    expect(screen.getByText('설정 확인 중')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /기기 없이 데모 데이터 보기/ })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getByText('측정 중')).toBeInTheDocument();
    expect(serial.writes).toEqual([
      'PING\n',
      'MODE:DHT11\n',
      'STOP\n',
      'SET_INTERVAL:DHT11:2000\n',
      'MODE:DHT11\n',
    ]);

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
      'ACK:INTERVAL:DHT11:2000',
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
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(0행\)/ })).toBeDisabled();
  });

  it('offers sensor-safe interval presets and resets the default when the sensor changes', () => {
    render(<App />);

    const dhtInterval = screen.getByLabelText('얼마마다 측정할까요?') as HTMLSelectElement;
    expect(Array.from(dhtInterval.options, (option) => option.value)).toEqual(['2000', '5000', '10000']);
    expect(dhtInterval.value).toBe('2000');
    expect(Array.from((screen.getByLabelText('얼마 동안 측정할까요?') as HTMLSelectElement).options, (option) => option.value))
      .toEqual(['0', '30000', '60000', '180000', '300000', '600000']);

    fireEvent.click(screen.getByRole('button', { name: /거리와 운동 탐구 선택/ }));
    const distanceInterval = screen.getByLabelText('얼마마다 측정할까요?') as HTMLSelectElement;
    expect(Array.from(distanceInterval.options, (option) => option.value)).toEqual(['500', '1000', '2000', '5000', '10000']);
    expect(distanceInterval.value).toBe('500');
  });

  it('lets students select every supported sensor from the connection panel', () => {
    render(<App />);

    const dht = screen.getByRole('button', { name: 'DHT11 센서팩 선택' });
    const ultrasonic = screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' });
    const light = screen.getByRole('button', { name: 'LDR 센서팩 선택' });
    expect(dht).toHaveAttribute('aria-pressed', 'true');
    expect(ultrasonic).toBeEnabled();
    expect(light).toBeEnabled();

    fireEvent.click(ultrasonic);
    expect(ultrasonic).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /HC-SR04 연결하기/ })).toBeInTheDocument();
    expect((screen.getByLabelText('얼마마다 측정할까요?') as HTMLSelectElement).value).toBe('500');

    fireEvent.click(light);
    expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /LDR \+ 10 kΩ 전압 분배기 연결하기/ })).toBeInTheDocument();
  });

  it('closes a ready sensor session before selecting another sensor', async () => {
    const serial = installResponsiveSerial();
    let releaseClose!: () => void;
    serial.port.close.mockImplementationOnce(() => new Promise<void>((resolve) => {
      releaseClose = resolve;
    }));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' }));

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(serial.port.close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'DHT11 센서팩 선택' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /거리와 운동 탐구 선택/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /HC-SR04 연결하기/ })).not.toBeInTheDocument();

    await act(async () => {
      releaseClose();
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    expect(await screen.findByRole('button', { name: /HC-SR04 연결하기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies the selected device interval before MODE and locks timing while measuring', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.change(screen.getByLabelText('얼마마다 측정할까요?'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('얼마 동안 측정할까요?'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();

    expect(serial.writes.slice(-2)).toEqual(['SET_INTERVAL:DHT11:5000\n', 'MODE:DHT11\n']);
    expect(screen.getByLabelText('얼마마다 측정할까요?')).toBeDisabled();
    expect(screen.getByLabelText('얼마 동안 측정할까요?')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'HC-SR04 센서팩 선택' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /거리와 운동 탐구 선택/ })).toBeDisabled();
    expect(screen.getByRole('timer')).toHaveTextContent(/남은 시간 00:(29|30)/);
  });

  it('fails closed without starting a run when UNO rejects the interval', async () => {
    const serial = installResponsiveSerial(true, 0, 'DHT11', 0, 1);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));

    expect(await screen.findByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.getByText(/최신 통합 펌웨어를 업로드/)).toBeInTheDocument();
    expect(serial.writes.filter((command) => command === 'MODE:DHT11\n')).toHaveLength(1);
    expect(serial.writes.at(-1)).toBe('SET_INTERVAL:DHT11:2000\n');
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(0행\)/ })).toBeDisabled();
  });

  it('rejects an interval ACK for another sensor instead of starting MODE', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial(true, 0, 'DHT11', 0, 0, 'ACK:INTERVAL:HC_SR04:2000');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
      for (let index = 0; index < 12; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('연결 확인 필요')).toBeInTheDocument();
    expect(serial.writes.filter((command) => command === 'MODE:DHT11\n')).toHaveLength(1);
    expect(serial.writes.at(-1)).toBe('SET_INTERVAL:DHT11:2000\n');
  });

  it('keeps the previous graph and CSV when the next interval setting is rejected', async () => {
    const serial = installResponsiveSerial(true, 0, 'DHT11', 0, 2);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 멈춘 측정 CSV 받기 \(2행\)/ })).toBeEnabled();
  });

  it('auto-stops a timed run exactly once while heartbeat keeps the same port alive', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.change(screen.getByLabelText('얼마 동안 측정할까요?'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    expect(screen.getByText('측정 중')).toBeInTheDocument();

    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    for (let elapsed = 2_000; elapsed <= 30_000; elapsed += 2_000) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
        serial.enqueue(`{"type":"heartbeat","timestampMs":${elapsed}}`);
        for (let index = 0; index < 8; index += 1) await Promise.resolve();
      });
    }

    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    expect(screen.getAllByText(/30초 측정.*완료/).length).toBeGreaterThan(0);
    expect(serial.writes.filter((command) => command === 'STOP\n')).toHaveLength(2);
    expect(serial.port.close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /완료한 측정 CSV 받기 \(2행\)/ })).toBeEnabled();
  });

  it('does not call a zero-row timed run complete', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.change(screen.getByLabelText('얼마 동안 측정할까요?'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });

    for (let elapsed = 2_000; elapsed <= 30_000; elapsed += 2_000) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
        serial.enqueue(`{"type":"heartbeat","timestampMs":${elapsed}}`);
        for (let index = 0; index < 8; index += 1) await Promise.resolve();
      });
    }

    expect(screen.getByText(/시간이 끝났지만 유효한 센서 측정값은 없어요/)).toBeInTheDocument();
    expect(screen.getByText(/30초 시간 종료 · 유효 측정값 없음/)).toBeInTheDocument();
    expect(screen.queryByText(/30초 측정이 완료/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /중단된 측정 CSV 받기 \(0행\)/ })).toBeDisabled();
  });

  it('excludes frames received after the absolute deadline before automatic STOP runs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T00:00:00.000Z'));
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.change(screen.getByLabelText('얼마 동안 측정할까요?'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    vi.setSystemTime(new Date('2026-08-13T00:00:31.000Z'));
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":31000,"values":[{"metric":"temperature","value":99,"unit":"C"},{"metric":"humidity","value":99,"unit":"%"}]}');
      for (let index = 0; index < 16; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /완료한 측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(screen.queryByText('99.0')).not.toBeInTheDocument();
  });

  it('sends only one run STOP when manual stop meets the automatic deadline', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.change(screen.getByLabelText('얼마 동안 측정할까요?'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });

    for (let elapsed = 2_000; elapsed <= 28_000; elapsed += 2_000) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
        serial.enqueue(`{"type":"heartbeat","timestampMs":${elapsed}}`);
        for (let index = 0; index < 6; index += 1) await Promise.resolve();
      });
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(1_999); });
    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      for (let index = 0; index < 12; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    expect(serial.writes.filter((command) => command === 'STOP\n')).toHaveLength(2);
  });

  it('graphs both DHT11 raw metrics and keeps the live CSV session beyond the chart buffer', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();

    await act(async () => {
      for (let index = 1; index <= 33; index += 1) {
        serial.enqueue(JSON.stringify({
          type: 'measurement',
          sensor: 'dht11',
          timestampMs: index * 500,
          values: [
            { metric: 'temperature', value: 20 + index / 10, unit: 'C' },
            { metric: 'humidity', value: 40 + index / 10, unit: '%' },
          ],
        }));
      }
      for (let index = 0; index < 100; index += 1) await Promise.resolve();
    });

    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByTestId('live-chart-humidity')).toBeInTheDocument();
    expect(screen.getAllByText(/n=24/)).toHaveLength(2);
    const liveCsvButton = screen.getByRole('button', { name: /측정 CSV 받기 \(66행\)/ });
    expect(liveCsvButton).toBeEnabled();

    const createObjectUrl = vi.fn(() => 'blob:live-session');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fireEvent.click(liveCsvButton);
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
    expect(createObjectUrl).toHaveBeenCalledWith(expect.objectContaining({ type: 'text/csv;charset=utf-8' }));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:live-session');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('66행의 이번 측정 CSV를 만들었어요.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    expect(screen.getByText(/마지막 측정 기록 · 현재값 아님/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(66행\)/ })).toBeEnabled();
  });

  it('keeps the same DHT11 port, graph, and live CSV after one recoverable read error', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();

    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();

    await act(async () => {
      serial.enqueue('ERROR:DHT11_INVALID_READ:Fresh_read_failed_no_stale_value_sent');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getByText('측정 중')).toBeInTheDocument();
    expect(screen.queryByText(/측정 중 연결이 끊겼어요/)).not.toBeInTheDocument();
    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.requestPort).toHaveBeenCalledTimes(1);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(serial.port.close).not.toHaveBeenCalled();

    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":3000,"values":[{"metric":"temperature","value":23.2,"unit":"C"},{"metric":"humidity","value":50.4,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getAllByText(/n=2/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(4행\)/ })).toBeEnabled();
    expect(serial.requestPort).toHaveBeenCalledTimes(1);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(serial.port.close).not.toHaveBeenCalled();
  });

  it('marks an active run interrupted when the user disconnects', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /연결 해제/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });

    expect(screen.getByRole('button', { name: /중단된 측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.port.close).toHaveBeenCalledTimes(1);
  });

  it('keeps a manually stopped run classified after the port is disconnected', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /연결 해제/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });

    expect(screen.getByRole('button', { name: /직접 멈춘 측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.port.close).toHaveBeenCalledTimes(1);
  });

  it('ends on SERIAL_CLOSED while preserving the last graph and live CSV', async () => {
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();

    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();

    await act(async () => {
      serial.endInput();
      for (let index = 0; index < 12; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.getByText(/측정 중 연결이 끊겼어요/)).toBeInTheDocument();
    expect(screen.getByText(/수신 오류: SERIAL_CLOSED/)).toBeInTheDocument();
    expect(screen.getByText(/마지막 측정 기록 · 현재값 아님/)).toBeInTheDocument();
    expect(screen.getByTestId('live-chart-temperature')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.requestPort).toHaveBeenCalledTimes(1);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(serial.reader.cancel).toHaveBeenCalledTimes(1);
    expect(serial.port.close).toHaveBeenCalledTimes(1);
  });

  it('keeps the completed live CSV when the next MODE check fails', async () => {
    const serial = installResponsiveSerial(true, 0, 'DHT11', 3);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23,"unit":"C"},{"metric":"humidity","value":50,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(screen.getByText(/마지막 측정 기록 · 현재값 아님/)).toBeInTheDocument();
  });

  it('starts HC-SR04 derived calculations from a clean baseline after STOP', async () => {
    const serial = installResponsiveSerial(true, 0, 'HC_SR04');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /거리와 운동 탐구 선택/ }));
    fireEvent.click(screen.getByRole('button', { name: /HC-SR04 연결하기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"hc-sr04","timestampMs":1000,"values":[{"metric":"distance","value":20,"unit":"cm"}]}');
      serial.enqueue('{"type":"measurement","sensor":"hc-sr04","timestampMs":1500,"values":[{"metric":"distance","value":18,"unit":"cm"}]}');
      for (let index = 0; index < 12; index += 1) await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(3행\)/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /측정 멈추기/ }));
    expect(await screen.findByText('센서 준비 완료')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"hc-sr04","timestampMs":2000,"values":[{"metric":"distance","value":17,"unit":"cm"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(1행\)/ })).toBeEnabled();
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
    expect(await screen.findByText('측정을 멈췄지만 유효한 센서 측정값은 없어요. 배선과 센서를 확인해 주세요.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    expect(await screen.findByText('측정 중')).toBeInTheDocument();
    expect(serial.writes).toEqual([
      'PING\n',
      'MODE:DHT11\n',
      'STOP\n',
      'SET_INTERVAL:DHT11:2000\n',
      'MODE:DHT11\n',
      'STOP\n',
      'SET_INTERVAL:DHT11:2000\n',
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

  it('marks delayed DHT11 data stale without closing and recovers on the same port', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });
    expect(screen.getByText('센서 준비 완료')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });
    expect(screen.getByText('측정 중')).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText(/센서는 연결되어 있고 새 측정값을 기다리고 있어요/)).toBeInTheDocument();
    expect(screen.getByText('현재값 대기')).toBeInTheDocument();
    expect(serial.reader.cancel).not.toHaveBeenCalled();
    expect(serial.port.close).not.toHaveBeenCalled();

    await act(async () => {
      serial.enqueue('{"type":"heartbeat","timestampMs":5000}');
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":6000,"values":[{"metric":"temperature","value":23.4,"unit":"C"},{"metric":"humidity","value":51.2,"unit":"%"}]}');
      for (let index = 0; index < 12; index += 1) await Promise.resolve();
    });
    expect(screen.getAllByText('실시간 수신')).toHaveLength(2);
    expect(screen.queryByText(/센서는 연결되어 있고 새 측정값을 기다리고 있어요/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.requestPort).toHaveBeenCalledTimes(1);
    expect(serial.port.open).toHaveBeenCalledTimes(1);
    expect(serial.port.close).not.toHaveBeenCalled();
  });

  it('uses heartbeat as transport evidence without treating it as a current sensor value', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    expect(screen.getByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    for (let timestampMs = 3000; timestampMs <= 9000; timestampMs += 2000) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        serial.enqueue(`{"type":"heartbeat","timestampMs":${timestampMs}}`);
        for (let index = 0; index < 6; index += 1) await Promise.resolve();
      });
    }

    expect(screen.getByText('현재값 대기')).toBeInTheDocument();
    expect(screen.getByText(/센서는 연결되어 있고 새 측정값을 기다리고 있어요/)).toBeInTheDocument();
    expect(screen.getByText(/마지막 측정 기록 · 현재값 아님/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.port.close).not.toHaveBeenCalled();
  });

  it('closes only after transport silence while preserving the last graph and live CSV', async () => {
    vi.useFakeTimers();
    const serial = installResponsiveSerial();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /DHT11 연결하기/ }));
    await act(async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /바로 측정 시작/ }));
    await act(async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); });
    expect(screen.getByText('측정 중')).toBeInTheDocument();
    await act(async () => {
      serial.enqueue('{"type":"measurement","sensor":"dht11","timestampMs":1000,"values":[{"metric":"temperature","value":23.1,"unit":"C"},{"metric":"humidity","value":50.2,"unit":"%"}]}');
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
      await vi.advanceTimersByTimeAsync(7000);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });

    expect(screen.getByText('연결 확인 필요')).toBeInTheDocument();
    expect(screen.getByText(/heartbeat도 7초 동안 받지 못해/)).toBeInTheDocument();
    expect(screen.getByText(/측정 오류: TRANSPORT_TIMEOUT/)).toBeInTheDocument();
    expect(screen.getByText(/마지막 측정 기록 · 현재값 아님/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /측정 CSV 받기 \(2행\)/ })).toBeEnabled();
    expect(serial.reader.cancel).toHaveBeenCalledTimes(1);
    expect(serial.port.close).toHaveBeenCalledTimes(1);
  });
});
