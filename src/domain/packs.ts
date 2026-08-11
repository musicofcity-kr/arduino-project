import type { RawMetric, RawUnit, SensorPackId } from "./protocol";

export interface WiringStep {
  pin: string;
  unoPin: string;
  detail: string;
}

export interface PackMeasurement {
  key: RawMetric | "velocity" | "relativeTransmittance";
  label: string;
  unit: RawUnit | "m/s" | "%";
  kind: "raw" | "derived";
}

export interface SensorPack {
  id: SensorPackId;
  name: string;
  sensorName: string;
  modeCommand: "MODE:DHT11" | "MODE:HC_SR04" | "MODE:LDR";
  wiring: readonly WiringStep[];
  measurements: readonly PackMeasurement[];
  safety: readonly string[];
}

export interface CurriculumDraft {
  framework: "2022 revised Korean high school science curriculum";
  status: "draft";
  verification: "unverified";
  codes: readonly string[];
}

export interface ExperimentPack {
  id: string;
  name: string;
  sensorId: SensorPackId;
  sensorName: string;
  question: string;
  description: string;
  wiring: readonly WiringStep[];
  measurements: readonly PackMeasurement[];
  safety: readonly string[];
  curriculum: CurriculumDraft;
}

export const sensorPacks: readonly SensorPack[] = [
  {
    id: "dht11",
    name: "온도·상대습도 센서팩",
    sensorName: "DHT11",
    modeCommand: "MODE:DHT11",
    wiring: [
      { pin: "VCC", unoPin: "5V", detail: "모든 배선을 확인한 뒤 전원을 연결하세요." },
      { pin: "GND", unoPin: "GND", detail: "UNO와 센서의 접지를 함께 연결하세요." },
      { pin: "DATA", unoPin: "D2", detail: "모듈의 데이터 핀을 연결하세요. 모듈이 아닌 단일 센서는 풀업 저항이 필요할 수 있습니다." },
    ],
    measurements: [
      { key: "temperature", label: "온도", unit: "°C", kind: "raw" },
      { key: "humidity", label: "상대습도", unit: "%RH", kind: "raw" },
    ],
    safety: [
      "배선을 바꾸기 전에 USB 전원을 분리하세요.",
      "전선이나 센서가 뜨거워지거나 이상한 냄새가 나면 즉시 전원을 분리하세요.",
    ],
  },
  {
    id: "hc-sr04",
    name: "거리·운동 센서팩",
    sensorName: "HC-SR04",
    modeCommand: "MODE:HC_SR04",
    wiring: [
      { pin: "VCC", unoPin: "5V", detail: "모든 배선을 확인한 뒤 전원을 연결하세요." },
      { pin: "GND", unoPin: "GND", detail: "UNO와 센서의 접지를 함께 연결하세요." },
      { pin: "TRIG", unoPin: "D9", detail: "UNO가 초음파 측정을 시작하도록 신호를 보내는 핀입니다." },
      { pin: "ECHO", unoPin: "D10", detail: "UNO에서 되돌아온 초음파 신호를 읽는 핀입니다. 이 배선을 3.3 V 보드에 그대로 사용하지 마세요." },
    ],
    measurements: [
      { key: "distance", label: "센서와 물체 사이 거리", unit: "cm", kind: "raw" },
      { key: "velocity", label: "센서 축 방향의 부호 있는 속도 추정값", unit: "m/s", kind: "derived" },
    ],
    safety: [
      "배선을 바꾸기 전에 USB 전원을 분리하세요.",
      "움직이는 물체와 손이 보드나 케이블에 부딪히지 않도록 거리를 두세요.",
      "속도는 센서 축 방향의 거리 변화로 계산한 추정값입니다. 센서에서 멀어지면 양수(+), 가까워지면 음수(-)이며 별도의 속도 센서가 측정한 값이 아닙니다.",
    ],
  },
  {
    id: "ldr",
    name: "상대광·투과 센서팩",
    sensorName: "LDR module",
    modeCommand: "MODE:LDR",
    wiring: [
      { pin: "VCC", unoPin: "5V", detail: "모든 배선을 확인한 뒤 전원을 연결하세요." },
      { pin: "GND", unoPin: "GND", detail: "UNO와 센서의 접지를 함께 연결하세요." },
      { pin: "AO", unoPin: "A0", detail: "LDR 모듈의 아날로그 출력 핀을 연결하세요." },
    ],
    measurements: [
      { key: "relativeLight", label: "원시 상대광 신호(절대 조도 아님)", unit: "count", kind: "raw" },
      { key: "relativeTransmittance", label: "기준값 대비 상대 투과율", unit: "%", kind: "derived" },
    ],
    safety: [
      "배선을 바꾸기 전에 USB 전원을 분리하세요.",
      "강한 조명이나 레이저를 직접 바라보지 마세요.",
      "LDR 값은 원시 상대 신호입니다. 별도 교정 없이 절대 조도 단위인 lux로 보고하지 마세요.",
    ],
  },
] as const;

const curriculumDraft: CurriculumDraft = {
  framework: "2022 revised Korean high school science curriculum",
  status: "draft",
  verification: "unverified",
  codes: [],
};

function sensorPack(id: SensorPackId): SensorPack {
  const pack = sensorPacks.find((candidate) => candidate.id === id);
  if (!pack) throw new Error(`missing sensor pack: ${id}`);
  return pack;
}

export const experimentPacks: readonly ExperimentPack[] = [
  {
    id: "humidity-weather",
    name: "온도·상대습도와 공기 탐구",
    sensorId: "dht11",
    sensorName: "DHT11",
    question: "우리 주변에서 온도와 상대습도는 어떻게 함께 변할까요?",
    description: "온도와 상대습도를 함께 관찰하되, 두 값이 같이 변한다는 사실만으로 원인과 결과를 단정하지 않습니다.",
    wiring: sensorPack("dht11").wiring,
    measurements: sensorPack("dht11").measurements,
    safety: sensorPack("dht11").safety,
    curriculum: curriculumDraft,
  },
  {
    id: "distance-motion",
    name: "거리와 운동 탐구",
    sensorId: "hc-sr04",
    sensorName: "HC-SR04",
    question: "물체가 센서에 가까워지거나 멀어질 때 측정 거리는 어떻게 변할까요?",
    description: "연속된 거리와 측정 시각의 차이로 센서 축 방향 속도를 추정합니다. 거리가 증가하면 양수(+), 감소하면 음수(-)입니다.",
    wiring: sensorPack("hc-sr04").wiring,
    measurements: sensorPack("hc-sr04").measurements,
    safety: sensorPack("hc-sr04").safety,
    curriculum: curriculumDraft,
  },
  {
    id: "light-transmittance",
    name: "상대광과 투과 탐구",
    sensorId: "ldr",
    sensorName: "LDR module",
    question: "물질을 통과한 빛의 상대 신호는 기준값과 비교해 어떻게 달라질까요?",
    description: "양수인 기준 신호와 시료의 원시 상대광 신호를 비교해 상대 투과율을 계산합니다. 이 값은 절대 조도(lux)가 아닙니다.",
    wiring: sensorPack("ldr").wiring,
    measurements: sensorPack("ldr").measurements,
    safety: sensorPack("ldr").safety,
    curriculum: curriculumDraft,
  },
] as const;
