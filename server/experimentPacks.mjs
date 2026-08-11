function metric(unit, options = {}) {
  return Object.freeze({ unit, ...options });
}

function schema(raw, derived) {
  return Object.freeze({ raw: Object.freeze(raw), derived: Object.freeze(derived) });
}

export const EXPERIMENT_PACKS = Object.freeze([
  Object.freeze({
    id: "humidity-weather",
    sensorPackId: "dht11",
    title: "온도·상대습도와 공기 탐구",
    summary: "DHT11에서 읽은 온도와 상대습도의 시간 변화를 관찰합니다.",
    measurementSchema: schema(
      {
        temperature: metric("°C"),
        humidity: metric("%RH", { minimum: 0, maximum: 100 }),
      },
      {},
    ),
    quantities: Object.freeze([
      Object.freeze({ key: "temperature", label: "온도", unit: "°C", provenance: "raw" }),
      Object.freeze({ key: "humidity", label: "상대습도", unit: "%RH", provenance: "raw" }),
    ]),
    safety: Object.freeze([
      "전원이 연결된 상태에서 배선을 바꾸지 않습니다.",
      "DHT11을 물이나 고온의 물체에 직접 닿게 하지 않습니다.",
    ]),
    curriculum: Object.freeze({
      status: "draft-unverified",
      note: "공식 2022 개정 교육과정 성취기준 코드를 확인하기 전에는 수업 배포용 확정 자료가 아닙니다.",
    }),
  }),
  Object.freeze({
    id: "distance-motion",
    sensorPackId: "hc-sr04",
    title: "거리와 이동 탐구",
    summary: "HC-SR04의 거리 측정값과 연속 측정 사이의 부호 있는 속도 계산값을 구분합니다.",
    measurementSchema: schema(
      { distance: metric("cm", { minimum: 0 }) },
      { velocity: metric("m/s", { formula: "delta-distance/delta-time" }) },
    ),
    quantities: Object.freeze([
      Object.freeze({ key: "distance", label: "거리", unit: "cm", provenance: "raw" }),
      Object.freeze({ key: "velocity", label: "부호 있는 속도 추정값", unit: "m/s", provenance: "derived" }),
    ]),
    safety: Object.freeze([
      "전원이 연결된 상태에서 배선을 바꾸지 않습니다.",
      "센서를 얼굴이나 귀에 밀착하지 않습니다.",
    ]),
    curriculum: Object.freeze({
      status: "draft-unverified",
      note: "공식 2022 개정 교육과정 성취기준 코드를 확인하기 전에는 수업 배포용 확정 자료가 아닙니다.",
    }),
  }),
  Object.freeze({
    id: "light-transmittance",
    sensorPackId: "ldr",
    title: "상대광과 투과 탐구",
    summary: "LDR ADC 계수와 기준값 대비 상대 투과율을 구분합니다. 보정된 조도(lux)가 아닙니다.",
    measurementSchema: schema(
      { relativeLight: metric("count", { minimum: 0, maximum: 1023, integer: true }) },
      { relativeTransmittance: metric("%", { minimum: 0, formula: "sample/reference*100" }) },
    ),
    quantities: Object.freeze([
      Object.freeze({ key: "relativeLight", label: "원시 상대광 신호", unit: "count", provenance: "raw" }),
      Object.freeze({ key: "relativeTransmittance", label: "기준값 대비 상대 투과율", unit: "%", provenance: "derived" }),
    ]),
    safety: Object.freeze([
      "전원이 연결된 상태에서 배선을 바꾸지 않습니다.",
      "강한 광원이나 레이저를 눈으로 직접 보지 않습니다.",
    ]),
    curriculum: Object.freeze({
      status: "draft-unverified",
      note: "공식 2022 개정 교육과정 성취기준 코드를 확인하기 전에는 수업 배포용 확정 자료가 아닙니다.",
    }),
  }),
]);

export function findExperimentPack(id) {
  return EXPERIMENT_PACKS.find((pack) => pack.id === id) ?? null;
}
