---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 1
superseded: false
evidence_level: V2
evidence_unit: 39/39
evidence_e2e: browser-flow-pass+responsive-390-pass
evidence_build: 1812 modules
recorded_at: 2026-08-12T10:00:51+09:00
---

# BUILD RESULT

## INPUT

Arduino UNO Web Serial, DHT11/HC-SR04/LDR Sensor Pack 3종, 대응 Experiment Pack 3종, Student Easy Mode와 최소 비식별 저장 범위.

## TASK

React/Vite 학생 화면, 엄격한 직렬 프로토콜·계산 계층, Node 로컬 저장 API, UNO 통합 펌웨어를 구현했다.

## OUTPUT

- `src/` — 학생 UI, Web Serial, protocol/calculation, 저장·CSV
- `server/` — 비식별 세션과 append-only 측정 저장·조회
- `firmware/` — UNO 통합 펌웨어와 배선 안내
- `dist/` — production build

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| ACK·timeout·stale fail-closed | PASS | V2 |
| raw/derived/demo 출처 분리 | PASS | V2 |
| 3개 Pack 메타데이터와 안전 안내 | PASS | V2 |
| 비식별 저장·조회·CSV 추적성 | PASS | V2 |

## Negative / Fail-closed 검증

잘못된 ACK/JSON/센서/단위/계산 근거, 개인정보 필드, stale timeout, 과도한 line buffer와 demo 저장을 거부하는 회귀 테스트를 포함했다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | ACK 우회, 펌웨어 JSON 불일치, stale 상태, 저장 provenance 손실을 독립 검토에서 발견해 같은 노드에서 수리 |

## 한계

UNO 대상 펌웨어 컴파일은 통과했지만, 실제 UNO 업로드와 센서 실측은 수행하지 않았다.
