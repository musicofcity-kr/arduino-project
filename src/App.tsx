import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { experimentPacks, sensorPacks } from './domain/packs';
import { deriveRelativeTransmittance, deriveVelocity } from './domain/calculations';
import { parseProtocolLine } from './domain/protocol';
import type { AckMessage, RawMeasurement, SensorPackId } from './domain/protocol';
import { ExperimentCard } from './components/ExperimentCard';
import { DashboardMeasurement } from './components/DashboardMeasurement';
import { RecordActions } from './components/RecordActions';
import { SafetyCallout } from './components/SafetyCallout';
import type {
  ConnectionState,
  MeasurementSample,
  StudentExperiment,
} from './components/types';
import { WiringGuide } from './components/WiringGuide';
import { createSessionApi, measurementsToCsv } from './services/sessionApi';
import type { MeasurementDraft } from './services/sessionApi';
import {
  LIVE_SESSION_MAX_ROWS,
  fitCompleteLiveFrame,
  liveSessionFilename,
  liveSessionSamplesToCsv,
} from './services/liveSessionCsv';
import {
  Activity,
  BarChart3,
  Bell,
  Bluetooth,
  BookOpen,
  Boxes,
  Cable,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Cpu,
  Database,
  FilePlus2,
  FlaskConical,
  GraduationCap,
  Home,
  PlayCircle,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Sun,
  Thermometer,
  Users,
  Waves,
} from 'lucide-react';
import brandMark from './assets/dashboard/brand-mark.jpg';
import heroScientist from './assets/dashboard/hero-scientist.jpg';
import solarSimulation from './assets/dashboard/solar-simulation.jpg';
import teacherAvatar from './assets/dashboard/teacher-avatar.jpg';
import unoBoard from './assets/dashboard/uno-board.jpg';

interface SerialReaderLike {
  read: () => Promise<SerialReadResult>;
  cancel: () => Promise<void>;
  releaseLock: () => void;
}

interface SerialReadResult {
  value?: Uint8Array;
  done: boolean;
}

interface SerialWriterLike {
  write: (data: Uint8Array) => Promise<void>;
  releaseLock: () => void;
}

interface SerialPortLike {
  readable: { getReader: () => SerialReaderLike } | null;
  writable: { getWriter: () => SerialWriterLike } | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface SerialNavigatorLike {
  requestPort: () => Promise<SerialPortLike>;
}

const PACK_PRESENTATION: Record<SensorPackId, Pick<StudentExperiment, 'accent' | 'icon'>> = {
  dht11: { accent: 'mint', icon: '' },
  'hc-sr04': { accent: 'blue', icon: '' },
  ldr: { accent: 'amber', icon: '' },
};

function toStudentExperiment(pack: (typeof experimentPacks)[number]): StudentExperiment {
  const sensor = sensorPacks.find((candidate) => candidate.id === pack.sensorId);
  if (!sensor) throw new Error(`Sensor pack not found: ${pack.sensorId}`);
  return {
    id: pack.id,
    title: pack.name,
    sensorId: pack.sensorId,
    sensorName: pack.sensorName,
    question: pack.question,
    description: pack.description,
    modeCommand: sensor.modeCommand,
    ...PACK_PRESENTATION[pack.sensorId],
    wiring: pack.wiring.map(({ pin, unoPin, detail }) => ({ sensorPin: pin, unoPin, note: detail })),
    measurements: pack.measurements.map(({ key, label, unit, kind }) => ({
      key,
      label,
      unit: key === 'temperature' ? '°C' : unit,
      kind,
    })),
    safety: [...pack.safety],
    draft: pack.curriculum.status === 'draft',
  };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BOOT_HEARTBEAT_TIMEOUT_MS = 5000;
const PING_ACK_TIMEOUT_MS = 1800;
const MODE_ACK_TIMEOUT_MS = 5000;
const STOP_ACK_TIMEOUT_MS = 3000;
const SENSOR_FRESH_MS: Readonly<Record<SensorPackId, number>> = {
  dht11: 5000,
  'hc-sr04': 3000,
  ldr: 3000,
};
const TRANSPORT_LIVE_MS = 7000;
const RESUME_GRACE_MS = 5000;
const MAX_LINE_BUFFER = 4096;

const RECOVERABLE_DEVICE_ERRORS: Readonly<Record<SensorPackId, ReadonlySet<string>>> = {
  dht11: new Set(['DHT11_INVALID_READ']),
  'hc-sr04': new Set(['HC_SR04_TIMEOUT']),
  ldr: new Set(['LDR_INVALID_READ']),
};

function isRecoverableDeviceError(sensorId: SensorPackId, code: string): boolean {
  return RECOVERABLE_DEVICE_ERRORS[sensorId].has(code);
}

interface LiveSessionRun {
  id: string;
  experimentPackId: string;
  sensorPackId: StudentExperiment['sensorId'];
  samples: MeasurementSample[];
  truncated: boolean;
}

function createLiveRunId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const connectionLabels: Record<ConnectionState, string> = {
  idle: '센서 연결 전',
  requesting: '기기 선택 중',
  checking: 'UNO 응답 확인 중',
  ready: '센서 준비 완료',
  measuring: '측정 중',
  error: '연결 확인 필요',
  unsupported: '브라우저 확인 필요',
};

function matchesAck(message: AckMessage, command: 'PING' | 'MODE' | 'STOP', mode?: SensorPackId) {
  return message.command === command && (command === 'PING' || message.mode === mode);
}

export function createMeasurementDraft(
  experiment: Pick<StudentExperiment, 'id' | 'sensorId' | 'measurements'>,
  samples: readonly MeasurementSample[],
): MeasurementDraft | null {
  const actual = samples.filter((sample) => sample.source === 'real' || sample.source === 'derived');
  const rawKeys = new Set(actual.filter((sample) => sample.source === 'real').map((sample) => sample.key));
  const requiredRawKeys = experiment.measurements.filter((measurement) => measurement.kind === 'raw').map((measurement) => measurement.key);
  if (!actual.length || requiredRawKeys.some((key) => !rawKeys.has(key))) return null;
  const realSamples = actual.filter((sample) => sample.source === 'real');
  const derivedSamples = actual.filter((sample) => sample.source === 'derived');
  if (realSamples.some((sample) => (
    sample.rawSource !== experiment.sensorId ||
    !Number.isInteger(sample.rawTimestampMs) ||
    (sample.rawTimestampMs ?? -1) < 0
  ))) return null;
  if (derivedSamples.some((sample) => (
    !sample.calculation ||
    !Number.isInteger(sample.calculation.timestampMs) ||
    sample.calculation.timestampMs < 0 ||
    !sample.calculation.formula ||
    !Array.isArray(sample.calculation.inputs) ||
    sample.calculation.inputs.length === 0
  ))) return null;
  const raw: Record<string, { value: number; unit: string; source: SensorPackId; timestampMs: number }> = {};
  const derived: Record<string, {
    value: number;
    unit: string;
    timestampMs: number;
    formula: NonNullable<MeasurementSample['calculation']>['formula'];
    inputs: NonNullable<MeasurementSample['calculation']>['inputs'];
  }> = {};
  for (const sample of actual) {
    if (sample.source === 'real') {
      raw[sample.key] = {
        value: sample.value,
        unit: sample.unit,
        source: sample.rawSource!,
        timestampMs: sample.rawTimestampMs!,
      };
    }
    if (sample.source === 'derived') {
      derived[sample.key] = {
        value: sample.value,
        unit: sample.unit,
        timestampMs: sample.calculation!.timestampMs,
        formula: sample.calculation!.formula,
        inputs: sample.calculation!.inputs,
      };
    }
  }
  return {
    experimentPackId: experiment.id,
    source: { kind: 'measured', sensorPackId: experiment.sensorId, transport: 'web-serial' },
    raw,
    derived,
    timestamp: new Date(Math.max(...actual.map((sample) => sample.receivedAt))).toISOString(),
  };
}

export default function App() {
  const packs = useMemo(() => {
    return experimentPacks.slice(0, 3).map(toStudentExperiment);
  }, []);
  const [selectedId, setSelectedId] = useState(packs[0].id);
  const selected = packs.find((pack) => pack.id === selectedId) ?? packs[0];
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState('배선을 확인한 뒤 연결 버튼을 눌러 주세요.');
  const [samples, setSamples] = useState<MeasurementSample[]>([]);
  const [history, setHistory] = useState<MeasurementSample[]>([]);
  const [freshnessTick, setFreshnessTick] = useState(Date.now());
  const [freshnessMessage, setFreshnessMessage] = useState('');
  const [measurementStale, setMeasurementStale] = useState(false);
  const [rawLine, setRawLine] = useState('아직 수신한 메시지가 없습니다.');
  const [diagnostic, setDiagnostic] = useState('대기');
  const [recordStatus, setRecordStatus] = useState('');
  const [recordBusy, setRecordBusy] = useState(false);
  const [hasSavedRecords, setHasSavedRecords] = useState(false);
  const [liveCsvCount, setLiveCsvCount] = useState(0);
  const [liveCsvStatus, setLiveCsvStatus] = useState('');

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<SerialReaderLike | null>(null);
  const writerRef = useRef<SerialWriterLike | null>(null);
  const pendingReadRef = useRef<Promise<SerialReadResult> | null>(null);
  const lineBufferRef = useRef('');
  const measuringRef = useRef(false);
  const firmwareActiveRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const stopAckRef = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  const measurementStartedAtRef = useRef<number | null>(null);
  const lastMeasurementAtRef = useRef<number | null>(null);
  const lastTransportAtRef = useRef<number | null>(null);
  const resumeGraceUntilRef = useRef(0);
  const measurementStaleRef = useRef(false);
  const ldrReferenceRef = useRef<RawMeasurement | null>(null);
  const previousDistanceRef = useRef<RawMeasurement | null>(null);
  const anonymousSessionRef = useRef<string | null>(null);
  const liveSessionRef = useRef<LiveSessionRun | null>(null);
  const sessionApi = useMemo(() => createSessionApi(), []);

  const currentStep: 1 | 2 | 3 = connectionState === 'ready' || connectionState === 'measuring'
    ? 3
    : selected ? 2 : 1;
  const connected = connectionState === 'ready' || connectionState === 'measuring';
  const visibleSamples = samples.filter((sample) =>
    sample.source === 'demo' || freshnessTick - sample.receivedAt <= SENSOR_FRESH_MS[selected.sensorId]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setFreshnessTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const readLine = useCallback(async (deadlineMs?: number): Promise<string> => {
    const reader = readerRef.current;
    if (!reader) throw new Error('READER_UNAVAILABLE');
    while (true) {
      const newlineIndex = lineBufferRef.current.indexOf('\n');
      if (newlineIndex >= 0) {
        const line = lineBufferRef.current.slice(0, newlineIndex).trim();
        lineBufferRef.current = lineBufferRef.current.slice(newlineIndex + 1);
        if (line) {
          setRawLine(line.slice(0, 320));
          return line;
        }
      }
      const readPromise = pendingReadRef.current ?? reader.read();
      pendingReadRef.current = readPromise;
      let timeoutId: number | undefined;
      let result: SerialReadResult;
      try {
        result = deadlineMs
          ? await Promise.race([
              readPromise,
              new Promise<never>((_, reject) => {
                timeoutId = window.setTimeout(() => reject(new Error('ACK_TIMEOUT')), deadlineMs);
              }),
            ])
          : await readPromise;
      } catch (error) {
        const timedOut = error instanceof Error && error.message === 'ACK_TIMEOUT';
        if (!timedOut && pendingReadRef.current === readPromise) pendingReadRef.current = null;
        throw error;
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      }
      if (pendingReadRef.current === readPromise) pendingReadRef.current = null;
      if (result.done) throw new Error('SERIAL_CLOSED');
      if (result.value) {
        const nextBuffer = lineBufferRef.current + decoder.decode(result.value, { stream: true }).replace(/\r/g, '');
        if (nextBuffer.length > MAX_LINE_BUFFER) {
          lineBufferRef.current = '';
          throw new Error('PROTOCOL_LINE_TOO_LONG');
        }
        lineBufferRef.current = nextBuffer;
      }
    }
  }, []);

  const send = useCallback(async (command: string) => {
    if (!writerRef.current) throw new Error('WRITER_UNAVAILABLE');
    await writerRef.current.write(encoder.encode(`${command}\n`));
    setDiagnostic(`명령 전송: ${command}`);
  }, []);

  const waitForAck = useCallback(async (
    command: string,
    expectedCommand: 'PING' | 'MODE' | 'STOP',
    expectedMode?: SensorPackId,
    timeoutMs = STOP_ACK_TIMEOUT_MS,
  ) => {
    await send(command);
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const remaining = timeoutMs - (Date.now() - started);
      const line = await readLine(remaining);
      const parsed = parseProtocolLine(line);
      if (!parsed.ok) {
        setDiagnostic(`무시한 잘못된 응답: ${parsed.error.code}`);
        continue;
      }
      if (parsed.message.kind === 'error') {
        throw new Error(`DEVICE_ERROR:${parsed.message.code}`);
      }
      if (parsed.message.kind === 'ack' && matchesAck(parsed.message, expectedCommand, expectedMode)) {
        setDiagnostic(`${command} ACK 확인`);
        return;
      }
      setDiagnostic(`${command}과 일치하지 않는 응답을 무시함`);
    }
    throw new Error('ACK_TIMEOUT');
  }, [readLine, send]);

  const waitForHeartbeat = useCallback(async () => {
    const started = Date.now();
    while (Date.now() - started < BOOT_HEARTBEAT_TIMEOUT_MS) {
      const remaining = BOOT_HEARTBEAT_TIMEOUT_MS - (Date.now() - started);
      let line: string;
      try {
        line = await readLine(remaining);
      } catch (error) {
        if (error instanceof Error && error.message === 'ACK_TIMEOUT') throw new Error('BOOT_TIMEOUT');
        throw error;
      }
      const parsed = parseProtocolLine(line);
      if (parsed.ok && parsed.message.kind === 'heartbeat') {
        setDiagnostic('UNO 부팅 heartbeat 확인');
        return;
      }
      setDiagnostic('UNO 부팅 전 경계 응답을 무시함');
    }
    throw new Error('BOOT_TIMEOUT');
  }, [readLine]);

  const waitForPing = useCallback(async () => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await waitForAck('PING', 'PING', undefined, PING_ACK_TIMEOUT_MS);
        return;
      } catch (error) {
        const retryable = error instanceof Error && error.message === 'ACK_TIMEOUT' && attempt === 1;
        if (!retryable) throw error;
        setDiagnostic('첫 PING 응답이 없어 같은 포트에서 한 번 더 확인함');
      }
    }
  }, [waitForAck]);

  const closeSerial = useCallback(async () => {
    measuringRef.current = false;
    firmwareActiveRef.current = false;
    stopRequestedRef.current = false;
    measurementStartedAtRef.current = null;
    lastMeasurementAtRef.current = null;
    lastTransportAtRef.current = null;
    resumeGraceUntilRef.current = 0;
    const reader = readerRef.current;
    const writer = writerRef.current;
    const port = portRef.current;
    readerRef.current = null;
    writerRef.current = null;
    portRef.current = null;
    try { await reader?.cancel(); } catch { /* already closed */ }
    try { reader?.releaseLock(); } catch { /* lock already released */ }
    try { writer?.releaseLock(); } catch { /* lock already released */ }
    try { await port?.close(); } catch { /* disconnected by browser */ }
    pendingReadRef.current = null;
    lineBufferRef.current = '';
  }, []);

  const markMeasurementStale = useCallback((message: string) => {
    if (!measurementStaleRef.current) {
      measurementStaleRef.current = true;
      setMeasurementStale(true);
      setSamples([]);
      previousDistanceRef.current = null;
    }
    setFreshnessMessage(message);
  }, []);

  useEffect(() => {
    if (connectionState !== 'measuring' || document.hidden || freshnessTick < resumeGraceUntilRef.current) return;
    const measurementBoundary = lastMeasurementAtRef.current ?? measurementStartedAtRef.current;
    if (measurementBoundary !== null && freshnessTick - measurementBoundary >= SENSOR_FRESH_MS[selected.sensorId]) {
      markMeasurementStale('현재값 없음 · 센서는 연결되어 있고 새 측정값을 기다리고 있어요. 그래프와 CSV 기록은 유지됩니다.');
    }
    const transportBoundary = lastTransportAtRef.current ?? measurementStartedAtRef.current;
    if (transportBoundary !== null && freshnessTick - transportBoundary >= TRANSPORT_LIVE_MS) {
      measuringRef.current = false;
      firmwareActiveRef.current = false;
      measurementStartedAtRef.current = null;
      setSamples([]);
      measurementStaleRef.current = true;
      setMeasurementStale(true);
      setFreshnessMessage('현재값 없음 · 마지막 측정 기록과 CSV는 유지됩니다.');
      setConnectionState('error');
      setConnectionMessage('UNO의 heartbeat도 7초 동안 받지 못해 연결을 종료했어요. USB 케이블과 포트를 확인한 뒤 재연결해 주세요.');
      setDiagnostic('측정 오류: TRANSPORT_TIMEOUT');
      void closeSerial();
    }
  }, [closeSerial, connectionState, freshnessTick, markMeasurementStale, selected.sensorId]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (measuringRef.current) {
          markMeasurementStale('현재값 없음 · 화면이 다시 활성화되면 새 센서값을 확인합니다. 그래프와 CSV 기록은 유지됩니다.');
        }
        return;
      }
      resumeGraceUntilRef.current = Date.now() + RESUME_GRACE_MS;
      setFreshnessTick(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [markMeasurementStale]);

  useEffect(() => () => { void closeSerial(); }, [closeSerial]);

  const connect = useCallback(async () => {
    setSamples([]);
    setHistory([]);
    setFreshnessMessage('');
    measurementStaleRef.current = false;
    setMeasurementStale(false);
    ldrReferenceRef.current = null;
    previousDistanceRef.current = null;
    const serial = (navigator as Navigator & { serial?: SerialNavigatorLike }).serial;
    if (!serial) {
      setConnectionState('unsupported');
      setConnectionMessage('이 브라우저에서는 USB 직렬 연결을 지원하지 않아요. Web Serial을 지원하는 최신 Chrome 또는 Edge에서 HTTPS 주소나 localhost로 열어 주세요. Android는 최신 Chrome과 USB OTG가 필요해요.');
      return;
    }
    try {
      setConnectionState('requesting');
      setConnectionMessage('표시되는 직렬 장치 중 Arduino UNO를 선택해 주세요. COM 번호는 PC마다 달라도 괜찮아요.');
      // 필터를 의도적으로 생략한다. COM 번호와 USB 브리지 ID는 PC와 호환 보드마다 달라질 수 있다.
      const port = await serial.requestPort();
      await closeSerial();
      portRef.current = port;
      await port.open({ baudRate: 115200 });
      if (!port.readable || !port.writable) throw new Error('PORT_NOT_READY');
      readerRef.current = port.readable.getReader();
      writerRef.current = port.writable.getWriter();
      setConnectionState('checking');
      setConnectionMessage('UNO가 다시 시작될 때까지 기다린 뒤 센서 응답을 확인하고 있어요.');
      await waitForHeartbeat();
      await waitForPing();
      await waitForAck(selected.modeCommand, 'MODE', selected.sensorId, MODE_ACK_TIMEOUT_MS);
      firmwareActiveRef.current = true;
      await waitForAck('STOP', 'STOP', undefined, STOP_ACK_TIMEOUT_MS);
      firmwareActiveRef.current = false;
      setConnectionState('ready');
      setConnectionMessage(selected.sensorId === 'ldr'
        ? 'UNO 통신과 ADC 응답을 확인했어요. 이 응답만으로 실제 LDR 배선이 올바른지는 확정할 수 없으니 첫 측정값을 확인해 주세요.'
        : `${selected.sensorName}의 통신 응답을 확인하고 대기 모드로 전환했어요. 측정을 시작하면 센서 모드를 다시 확인합니다.`);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      const message = error instanceof Error ? error.message : '';
      await closeSerial();
      setConnectionState('error');
      if (name === 'NotFoundError') {
        setConnectionMessage('기기 선택이 취소되었어요. 준비되면 연결 버튼을 다시 눌러 주세요.');
      } else if (name === 'SecurityError') {
        setConnectionMessage('브라우저가 기기 선택을 허용하지 않았어요. 이 Vercel 주소를 Web Serial 지원 브라우저의 최상위 새 탭에서 직접 열고 다시 시도해 주세요.');
      } else if (name === 'NetworkError' || name === 'InvalidStateError') {
        setConnectionMessage('UNO 포트를 열 수 없어요. Arduino IDE의 시리얼 모니터처럼 COM 포트를 사용하는 프로그램을 닫고 다시 시도해 주세요.');
      } else if (message === 'BOOT_TIMEOUT') {
        setConnectionMessage('UNO가 다시 시작된 신호를 받지 못했어요. USB 데이터 케이블과 통합 펌웨어를 확인한 뒤 다시 연결해 주세요.');
      } else if (message === 'ACK_TIMEOUT') {
        setConnectionMessage('UNO 응답 시간이 지났어요. RESET 버튼을 한 번 누르고, 통합 펌웨어와 배선을 확인한 뒤 다시 연결해 주세요.');
      } else {
        setConnectionMessage('연결할 수 없어요. 다른 센서 프로그램을 닫고 USB 데이터 케이블을 다시 꽂은 뒤 재시도해 주세요.');
      }
      setDiagnostic(`연결 오류: ${message || name || 'unknown'}`);
    }
  }, [closeSerial, selected, waitForAck, waitForHeartbeat, waitForPing]);

  const disconnect = useCallback(async () => {
    await closeSerial();
    setConnectionState('idle');
    setConnectionMessage('연결을 해제했어요. 배선을 바꾸려면 지금 USB를 뽑아 주세요.');
    setSamples([]);
    setFreshnessMessage('');
  }, [closeSerial]);

  const buildSamples = useCallback((line: string): MeasurementSample[] => {
    const parsed = parseProtocolLine(line);
    if (!parsed.ok) {
      setDiagnostic(`잘못된 센서 메시지 무시: ${parsed.error.code}`);
      return [];
    }
    if (parsed.message.kind === 'error') throw new Error(`DEVICE_ERROR:${parsed.message.code}`);
    if (parsed.message.kind !== 'measurement' || parsed.message.sensor !== selected.sensorId) {
      if (parsed.message.kind === 'measurement') setDiagnostic('선택하지 않은 센서의 값을 무시함');
      return [];
    }
    const receivedAt = Date.now();
    const definitions = new Map(selected.measurements.map((definition) => [definition.key, definition]));
    const next: MeasurementSample[] = parsed.message.values.map((raw) => {
      const definition = definitions.get(raw.metric);
      let value = raw.value;
      if (raw.metric === 'distance' && raw.unit === 'mm') value /= 10;
      if (raw.metric === 'distance' && raw.unit === 'm') value *= 100;
      return {
        id: `${raw.metric}-${raw.timestampMs}`,
        key: raw.metric,
        label: definition?.label ?? raw.metric,
        value,
        unit: definition?.unit ?? raw.unit,
        source: 'real' as const,
        sourceDetail: `${raw.source} · UNO에서 수신한 센서 측정값`,
        receivedAt,
        rawSource: raw.source,
        rawTimestampMs: raw.timestampMs,
        rawUnit: raw.unit,
      };
    });

    const distance = parsed.message.values.find((value) => value.metric === 'distance');
    if (distance) {
      const previous = previousDistanceRef.current;
      previousDistanceRef.current = distance;
      if (previous) {
        const result = deriveVelocity(previous, distance);
        const definition = definitions.get('velocity');
        if (result.ok && definition) {
          next.push({
            id: `velocity-${result.value.timestampMs}`,
            key: 'velocity',
            label: definition.label,
            value: result.value.value,
            unit: result.value.unit,
            source: 'derived',
            sourceDetail: '연속 거리의 변화량 ÷ 센서 시간 변화량 (부호 유지)',
            receivedAt,
            rawSource: distance.source,
            rawTimestampMs: distance.timestampMs,
            rawUnit: distance.unit,
            calculation: result.value,
          });
        }
      }
    }

    const light = parsed.message.values.find((value) => value.metric === 'relativeLight');
    if (light) {
      if (ldrReferenceRef.current === null) ldrReferenceRef.current = light;
      const result = deriveRelativeTransmittance(light, ldrReferenceRef.current);
      const definition = definitions.get('relativeTransmittance');
      if (result.ok && definition) {
        next.push({
          id: `relativeTransmittance-${result.value.timestampMs}`,
          key: 'relativeTransmittance',
          label: definition.label,
          value: result.value.value,
          unit: result.value.unit,
          source: 'derived',
          sourceDetail: '현재 LDR 원시값 ÷ 첫 기준 원시값 × 100',
          receivedAt,
          rawSource: light.source,
          rawTimestampMs: light.timestampMs,
          rawUnit: light.unit,
          calculation: result.value,
        });
      }
    }
    return next;
  }, [selected.measurements, selected.sensorId]);

  const startMeasurement = useCallback(async () => {
    if (!connected || measuringRef.current) return;
    let receiveLoopStarted = false;
    setFreshnessMessage('새 센서값을 기다리고 있어요.');
    try {
      if (!firmwareActiveRef.current) {
        setConnectionState('checking');
        setConnectionMessage('센서 모드를 다시 시작하고 UNO 응답을 확인하고 있어요.');
        await waitForAck(selected.modeCommand, 'MODE', selected.sensorId, MODE_ACK_TIMEOUT_MS);
        firmwareActiveRef.current = true;
      }
      setSamples([]);
      setHistory([]);
      liveSessionRef.current = {
        id: createLiveRunId(),
        experimentPackId: selected.id,
        sensorPackId: selected.sensorId,
        samples: [],
        truncated: false,
      };
      setLiveCsvCount(0);
      setLiveCsvStatus('실측 데이터가 들어오면 현재 측정 CSV를 받을 수 있어요.');
      ldrReferenceRef.current = null;
      previousDistanceRef.current = null;
      measuringRef.current = true;
      receiveLoopStarted = true;
      const startedAt = Date.now();
      measurementStartedAtRef.current = startedAt;
      lastMeasurementAtRef.current = startedAt;
      lastTransportAtRef.current = startedAt;
      measurementStaleRef.current = true;
      setMeasurementStale(true);
      setConnectionState('measuring');
      setConnectionMessage('UNO에서 새 센서값을 받고 있어요.');
      while (measuringRef.current) {
        const line = await readLine();
        const parsed = parseProtocolLine(line);
        if (!parsed.ok) {
          setDiagnostic(`잘못된 센서 메시지 무시: ${parsed.error.code}`);
          continue;
        }
        lastTransportAtRef.current = Date.now();
        if (stopRequestedRef.current) {
          if (parsed.message.kind === 'ack' && matchesAck(parsed.message, 'STOP')) {
            measuringRef.current = false;
            measurementStartedAtRef.current = null;
            stopAckRef.current?.resolve();
            break;
          }
          if (parsed.message.kind === 'error') {
            if (isRecoverableDeviceError(selected.sensorId, parsed.message.code)) {
              markMeasurementStale(`현재값 없음 · ${selected.sensorName}의 새 읽기를 기다리고 있어요. 그래프와 CSV 기록은 유지됩니다.`);
              setDiagnostic(`일시적 센서 읽기 실패: ${parsed.message.code}`);
              continue;
            }
            const error = new Error(`DEVICE_ERROR:${parsed.message.code}`);
            stopAckRef.current?.reject(error);
            throw error;
          }
          setDiagnostic('STOP과 일치하지 않는 응답을 무시함');
          continue;
        }
        if (parsed.message.kind === 'error') {
          if (isRecoverableDeviceError(selected.sensorId, parsed.message.code)) {
            markMeasurementStale(`현재값 없음 · ${selected.sensorName}의 새 읽기를 기다리고 있어요. 그래프와 CSV 기록은 유지됩니다.`);
            setDiagnostic(`일시적 센서 읽기 실패: ${parsed.message.code}`);
            continue;
          }
          throw new Error(`DEVICE_ERROR:${parsed.message.code}`);
        }
        if (parsed.message.kind !== 'measurement') continue;
        const next = buildSamples(line);
        if (!next.length) continue;
        lastMeasurementAtRef.current = Date.now();
        measurementStaleRef.current = false;
        setMeasurementStale(false);
        setSamples((previous) => {
          const keys = new Set(next.map((item) => item.key));
          return [...previous.filter((item) => !keys.has(item.key)), ...next];
        });
        setHistory((previous) => [...previous, ...next].slice(-64));
        const liveRun = liveSessionRef.current;
        if (liveRun) {
          const fittedFrame = fitCompleteLiveFrame(liveRun.samples.length, next, LIVE_SESSION_MAX_ROWS);
          liveRun.samples.push(...fittedFrame.samples);
          if (fittedFrame.truncated) {
            liveRun.truncated = true;
            setLiveCsvStatus(`CSV는 최대 ${LIVE_SESSION_MAX_ROWS.toLocaleString('ko-KR')}행까지만 포함해요. 측정을 나누어 진행해 주세요.`);
          }
          setLiveCsvCount(liveRun.samples.length);
        }
        setFreshnessMessage('');
      }
    } catch (error) {
      if (!measuringRef.current && receiveLoopStarted) return;
      measuringRef.current = false;
      measurementStartedAtRef.current = null;
      setConnectionState('error');
      setConnectionMessage('측정 중 연결이 끊겼어요. 이전 값은 숨겼습니다. USB와 배선을 확인하고 다시 연결해 주세요.');
      setSamples([]);
      measurementStaleRef.current = true;
      setMeasurementStale(true);
      setFreshnessMessage('현재값 없음 · 마지막 측정 기록과 CSV는 유지됩니다.');
      setDiagnostic(`수신 오류: ${error instanceof Error ? error.message : 'unknown'}`);
      await closeSerial();
    }
  }, [buildSamples, closeSerial, connected, markMeasurementStale, readLine, selected.id, selected.modeCommand, selected.sensorId, selected.sensorName, waitForAck]);

  const stopMeasurement = useCallback(async () => {
    if (!measuringRef.current || stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    setConnectionState('checking');
    setConnectionMessage('측정을 멈추고 UNO 응답을 확인하고 있어요.');
    const ackPromise = new Promise<void>((resolve, reject) => {
      stopAckRef.current = { resolve, reject };
    });
    try {
      await send('STOP');
      await Promise.race([
        ackPromise,
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('ACK_TIMEOUT')), STOP_ACK_TIMEOUT_MS)),
      ]);
      firmwareActiveRef.current = false;
      measurementStartedAtRef.current = null;
      setConnectionState('ready');
      setConnectionMessage('측정을 멈췄어요. 다시 시작하면 센서 모드 ACK를 새로 확인합니다.');
      setSamples([]);
      setFreshnessMessage('');
      measurementStaleRef.current = false;
      setMeasurementStale(false);
    } catch (error) {
      measuringRef.current = false;
      firmwareActiveRef.current = false;
      await closeSerial();
      setConnectionState('error');
      setConnectionMessage('UNO의 STOP 응답을 확인하지 못했어요. 연결을 해제했으니 USB와 펌웨어를 확인한 뒤 다시 연결해 주세요.');
      setSamples([]);
      setFreshnessMessage('');
      measurementStaleRef.current = true;
      setMeasurementStale(true);
      setDiagnostic(`STOP 오류: ${error instanceof Error ? error.message : 'unknown'}`);
    } finally {
      stopRequestedRef.current = false;
      stopAckRef.current = null;
    }
  }, [closeSerial, send]);

  const showDemo = useCallback(() => {
    const demoByKey: Record<string, number> = {
      temperature: 23.4,
      humidity: 51.8,
      distance: 35.0,
      velocity: -0.12,
      relativeLight: 680,
      relativeTransmittance: 68.0,
    };
    const receivedAt = Date.now();
    const demo = selected.measurements.map((definition, index) => ({
      id: `demo-${definition.key}-${receivedAt}`,
      key: definition.key,
      label: definition.label,
      value: demoByKey[definition.key] ?? (index + 1) * 10,
      unit: definition.unit,
      source: 'demo' as const,
      sourceDetail: '화면 사용법을 익히기 위한 예시 데이터',
      receivedAt,
    }));
    setSamples(demo);
    setHistory(demo);
    setFreshnessMessage('데모 데이터입니다. 실제 센서 측정 결과가 아니에요.');
  }, [selected.measurements]);

  const saveCurrentResult = useCallback(async () => {
    const draft = createMeasurementDraft(selected, visibleSamples);
    if (!draft) {
      setRecordStatus('저장하지 않았어요. 최신 실측값이 필요하며 데모·시뮬레이션 값은 저장할 수 없습니다.');
      return;
    }
    setRecordBusy(true);
    setRecordStatus('현재 결과를 저장하고 있어요.');
    try {
      if (!anonymousSessionRef.current) {
        anonymousSessionRef.current = (await sessionApi.createSession()).id;
      }
      await sessionApi.appendMeasurement(anonymousSessionRef.current, draft);
      setHasSavedRecords(true);
      setRecordStatus('현재 결과를 비식별 저장 기록에 추가했어요.');
    } catch (error) {
      setRecordStatus(error instanceof Error ? `저장 실패: ${error.message}` : '저장하지 못했어요. 로컬 서버를 확인해 주세요.');
    } finally {
      setRecordBusy(false);
    }
  }, [selected, sessionApi, visibleSamples]);

  const downloadCsv = useCallback(async () => {
    if (!anonymousSessionRef.current || !hasSavedRecords) return;
    setRecordBusy(true);
    setRecordStatus('저장 기록을 불러오고 있어요.');
    try {
      const records = await sessionApi.listMeasurements(anonymousSessionRef.current);
      if (!records.length) {
        setHasSavedRecords(false);
        setRecordStatus('CSV로 받을 저장 기록이 아직 없어요.');
        return;
      }
      const url = URL.createObjectURL(new Blob([measurementsToCsv(records)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensor-records-${anonymousSessionRef.current}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setRecordStatus('저장 기록 CSV를 만들었어요. 다운로드를 확인해 주세요.');
    } catch (error) {
      setRecordStatus(error instanceof Error ? `CSV 실패: ${error.message}` : 'CSV를 만들지 못했어요.');
    } finally {
      setRecordBusy(false);
    }
  }, [hasSavedRecords, sessionApi]);

  const downloadLiveCsv = useCallback(() => {
    const liveRun = liveSessionRef.current;
    if (!liveRun?.samples.length) {
      setLiveCsvStatus('CSV로 받을 실측 데이터가 아직 없어요.');
      return;
    }
    try {
      const csv = liveSessionSamplesToCsv({
        runId: liveRun.id,
        experimentPackId: liveRun.experimentPackId,
        sensorPackId: liveRun.sensorPackId,
      }, liveRun.samples);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = liveSessionFilename(liveRun.experimentPackId);
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setLiveCsvStatus(liveRun.truncated
        ? `${liveRun.samples.length.toLocaleString('ko-KR')}행 CSV를 만들었어요. 최대 행 수 이후 값은 포함되지 않았어요.`
        : `${liveRun.samples.length.toLocaleString('ko-KR')}행의 현재 측정 CSV를 만들었어요.`);
    } catch (error) {
      setLiveCsvStatus(error instanceof Error ? `CSV 실패: ${error.message}` : '현재 측정 CSV를 만들지 못했어요.');
    }
  }, []);

  const chooseExperiment = useCallback((experiment: StudentExperiment) => {
    if (experiment.id === selected.id) return;
    if (connected) void disconnect();
    setSelectedId(experiment.id);
    setSamples([]);
    setHistory([]);
    liveSessionRef.current = null;
    setLiveCsvCount(0);
    setLiveCsvStatus('');
    setFreshnessMessage('');
    window.setTimeout(() => document.getElementById('setup')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 80);
  }, [connected, disconnect, selected.id]);

  return (
    <div className="app-shell" id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Science Modular Workbench 처음으로">
          <img src={brandMark} alt="" />
          <span><strong>Science Modular Workbench</strong><small>웹앱 기반 통합 모듈형 과학탐구 워크벤치</small></span>
        </a>

        <div className="topbar-center">
          <button type="button" className="class-selector" aria-label="현재 학급">
            <BookOpen size={17} aria-hidden="true" /> 3학년 2반 과학 <ChevronDown size={15} aria-hidden="true" />
          </button>
          <button type="button" className={`device-pill state-${connectionState}`} onClick={connected ? undefined : () => void connect()}>
            <Cpu size={18} aria-hidden="true" />
            <span><small>연결된 장치</small><strong>{connected ? 'Arduino UNO' : '장치 없음'}</strong></span>
            <span className="device-dot" aria-hidden="true" />
            <Bluetooth size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="topbar-actions">
          <button type="button" className="icon-button" aria-label="알림"><Bell size={20} /></button>
          <button type="button" className="icon-button" aria-label="도움말"><CircleHelp size={20} /></button>
          <img className="teacher-avatar" src={teacherAvatar} alt="교사 프로필" />
          <span className="teacher-name"><strong>김선생</strong><small>교사 · 관리자</small></span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </header>

      <div className="dashboard-workspace">
        <aside className="sidebar" aria-label="주요 메뉴">
          <nav>
            <a className="is-active" href="#top" aria-label="홈"><Home size={20} /> <span>홈</span></a>
            <a href="#experiments" aria-label="실험팩"><FlaskConical size={20} /> <span>실험팩</span></a>
            <a href="#setup" aria-label="센서팩"><Cpu size={20} /> <span>센서팩</span></a>
            <a href="#workflow" aria-label="수업카드"><ClipboardList size={20} /> <span>수업카드</span></a>
            <a href="#measurement" aria-label="실시간 측정"><Activity size={20} /> <span>실시간 측정</span></a>
            <a href="#simulation" aria-label="시뮬레이션"><PlayCircle size={20} /> <span>시뮬레이션</span></a>
            <a href="#records" aria-label="결과분석"><BarChart3 size={20} /> <span>결과분석</span></a>
            <a href="#readiness" aria-label="교사모드"><GraduationCap size={20} /> <span>교사모드</span></a>
          </nav>
          <div className="quick-actions">
            <strong><Boxes size={14} /> 빠른 실행</strong>
            <a href="#experiments"><FilePlus2 size={15} /> 새 실험 선택</a>
            <a href="#measurement"><PlayCircle size={15} /> 수업 시작하기</a>
          </div>
        </aside>

        <main id="main-content" className="dashboard-main">
          <div className="dashboard-grid">
            <section className="hero-panel dashboard-panel" style={{ backgroundImage: `url(${heroScientist})` }}>
              <div className="hero-copy">
                <span className="panel-kicker">SCIENCE WORKBENCH</span>
                <h1>오늘의 과학탐구</h1>
                <p>탐구하고, 측정하고, 이해하며<br />세상을 더 깊이 탐구해요!</p>
              </div>
              <div className="mode-cards" aria-label="사용 모드">
                <button type="button" className="mode-card is-active"><Users size={25} /><span><strong>학생 모드</strong><small>탐구 활동 및 실험 수행</small></span><ChevronRight size={16} /></button>
                <button type="button" className="mode-card" disabled title="교사 모드는 다음 단계에서 제공됩니다"><GraduationCap size={25} /><span><strong>교사 모드</strong><small>수업 관리 · 준비 중</small></span></button>
                <button type="button" className="mode-card" disabled title="제작자 모드는 다음 단계에서 제공됩니다"><Boxes size={25} /><span><strong>제작자 모드</strong><small>실험팩 제작 · 준비 중</small></span></button>
              </div>
            </section>

            <section className="sensor-panel dashboard-panel" id="setup" aria-labelledby="sensor-panel-title">
              <div className="panel-heading">
                <div><span className="panel-kicker">DEVICE</span><h2 id="sensor-panel-title">센서 연결 상태</h2></div>
                <RefreshCw size={16} aria-hidden="true" />
              </div>
              <div className="device-overview">
                <div>
                  <span className={`connection-chip state-${connectionState}`} role="status" aria-live="polite">{connectionLabels[connectionState]}</span>
                  <strong>{connected ? 'Arduino UNO' : '연결된 장치 없음'}</strong>
                  <small>선택 센서 · {selected.sensorName}</small>
                </div>
                <img src={unoBoard} alt="UNO 호환 센서 보드" />
              </div>
              <div className="sensor-pack-row" aria-label="지원 센서팩">
                <span><Thermometer size={17} /> DHT11</span>
                <span><Ruler size={17} /> HC-SR04</span>
                <span><Sun size={17} /> LDR</span>
              </div>
              <p className={`connection-message ${connectionState === 'error' || connectionState === 'unsupported' ? 'is-error' : ''}`}>{connectionMessage}</p>
              {connected ? (
                <button className="button button-secondary connect-button" type="button" onClick={() => void disconnect()}><Cable size={15} /> 연결 해제</button>
              ) : (
                <button className="button button-primary connect-button" type="button" onClick={() => void connect()} disabled={connectionState === 'requesting' || connectionState === 'checking'}>
                  <Bluetooth size={15} /> {connectionState === 'requesting' || connectionState === 'checking' ? 'UNO 응답을 확인하고 있어요' : `${selected.sensorName} 연결하기`}
                </button>
              )}
              <details className="sensor-details-popover">
                <summary>배선·안전 상세 보기</summary>
                <div className="sensor-details-content">
                  <WiringGuide experiment={selected} />
                  <SafetyCallout experiment={selected} />
                </div>
              </details>
            </section>

            <DashboardMeasurement
              experiment={selected}
              connected={connected}
              measuring={connectionState === 'measuring'}
              samples={visibleSamples}
              history={history}
              onStart={() => void startMeasurement()}
              onStop={stopMeasurement}
              onDemo={showDemo}
              liveCsvCount={liveCsvCount}
              liveCsvStatus={liveCsvStatus}
              onDownloadLiveCsv={downloadLiveCsv}
              freshnessMessage={freshnessMessage}
              measurementStale={measurementStale}
            />

            <section className="workflow-panel dashboard-panel" id="workflow" aria-labelledby="workflow-title">
              <div className="panel-heading"><h2 id="workflow-title">실험 워크플로우</h2></div>
              <ol>
                {[
                  ['예상하기', '가설을 세우고 예상 결과 작성', BookOpen],
                  ['실험하기', '센서 연결 후 데이터 수집', FlaskConical],
                  ['데이터 분석', '그래프 및 표로 해석', BarChart3],
                  ['오차 분석', '오차 원인 검토', RefreshCw],
                  ['결과 제출', '결과 저장 및 CSV', Database],
                ].map(([title, detail, Icon], index) => {
                  const WorkflowIcon = Icon as typeof BookOpen;
                  const step = index + 1;
                  return (
                    <li key={title as string} className={step <= currentStep ? 'is-current' : ''}>
                      <span><WorkflowIcon size={20} /></span>
                      <strong>{step} {title as string}</strong>
                      <small>{detail as string}</small>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="simulation-panel dashboard-panel" id="simulation" aria-labelledby="simulation-title">
              <div className="panel-heading"><h2 id="simulation-title"><PlayCircle size={17} /> 시뮬레이션 / 디지털 트윈</h2><span className="coming-soon">콘텐츠 준비 중</span></div>
              <div className="simulation-visual">
                <img src={solarSimulation} alt="태양·지구·달의 궤도 시각 자료" />
                <span>현재는 시각 자료 미리보기만 제공됩니다.</span>
              </div>
            </section>

            <section className="experiment-panel dashboard-panel" id="experiments" aria-labelledby="experiment-heading">
              <div className="panel-heading"><h2 id="experiment-heading">수업카드 추천</h2><a href="#experiments">전체 보기 <ChevronRight size={14} /></a></div>
              <div className="experiment-grid">
                {packs.map((pack) => (
                  <ExperimentCard key={pack.id} experiment={pack} selected={pack.id === selected.id} onSelect={chooseExperiment} />
                ))}
              </div>
            </section>

            <div className="record-panel" id="records">
              <RecordActions
                canSave={createMeasurementDraft(selected, visibleSamples) !== null}
                hasSavedRecords={hasSavedRecords}
                busy={recordBusy}
                status={recordStatus}
                onSave={() => void saveCurrentResult()}
                onDownload={() => void downloadCsv()}
              />
            </div>

            <section className="readiness-panel dashboard-panel" id="readiness" aria-labelledby="readiness-title">
              <div className="panel-heading"><h2 id="readiness-title">실험 준비 상태</h2><ShieldCheck size={17} /></div>
              <ul>
                <li><span className={selected ? 'is-ready' : ''}><FlaskConical size={15} /></span><div><strong>탐구팩 선택</strong><small>{selected.title}</small></div></li>
                <li><span className={connected ? 'is-ready' : ''}><Cpu size={15} /></span><div><strong>센서 연결</strong><small>현재 상태 · {connectionLabels[connectionState]}</small></div></li>
                <li><span className={visibleSamples.length ? 'is-ready' : ''}><Waves size={15} /></span><div><strong>측정 데이터</strong><small>{visibleSamples.length ? `${visibleSamples.length}개 최신값` : history.length ? `현재값 없음 · 마지막 기록 ${history.length}개` : '아직 측정 전'}</small></div></li>
              </ul>
              <details className="advanced-panel">
                <summary>Advanced 진단 정보</summary>
                <dl>
                  <div><dt>최근 상태</dt><dd>{diagnostic}</dd></div>
                  <div><dt>최근 raw</dt><dd><code>{rawLine}</code></dd></div>
                </dl>
              </details>
            </section>
          </div>
        </main>
      </div>

      <footer className="bottom-status">
        <span><BookOpen size={16} /> 플랫폼 안내</span>
        <span><FlaskConical size={16} /> 실험팩 <strong>3</strong></span>
        <span><Cpu size={16} /> 센서팩 <strong>3</strong></span>
        <span><Database size={16} /> 저장 기록 <strong>{hasSavedRecords ? '있음' : '0'}</strong></span>
        <span className="system-status"><i /> 시스템 상태 <strong>로컬 준비</strong></span>
        <small>V0.2.0 · 실제 하드웨어 수업 검증 전</small>
      </footer>
    </div>
  );
}
