import type { DerivedMeasurement } from '../domain/calculations';

export type SourceKind = 'real' | 'derived' | 'simulation' | 'demo' | 'none';

export interface WiringItem {
  sensorPin: string;
  unoPin: string;
  note?: string;
}

export interface MeasurementDefinition {
  key: string;
  label: string;
  unit: string;
  precision?: number;
  kind?: 'raw' | 'derived';
}

export interface StudentExperiment {
  id: string;
  title: string;
  sensorId: 'dht11' | 'hc-sr04' | 'ldr';
  sensorName: string;
  question: string;
  description: string;
  modeCommand: 'MODE:DHT11' | 'MODE:HC_SR04' | 'MODE:LDR';
  accent: 'mint' | 'blue' | 'amber';
  icon: string;
  wiring: WiringItem[];
  measurements: MeasurementDefinition[];
  safety: string[];
  status?: string;
  draft?: boolean;
}

export interface MeasurementSample {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  source: SourceKind;
  sourceDetail: string;
  receivedAt: number;
  rawSource?: 'dht11' | 'hc-sr04' | 'ldr';
  rawTimestampMs?: number;
  rawUnit?: string;
  calculation?: DerivedMeasurement;
}

export type ConnectionState =
  | 'idle'
  | 'requesting'
  | 'checking'
  | 'ready'
  | 'measuring'
  | 'error'
  | 'unsupported';
