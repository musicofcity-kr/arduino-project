---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 3
superseded: false
evidence_level: V2
evidence_unit: 44/44
evidence_e2e: webserial-broad-picker-regression-pass+webserial-reset-regression-pass
evidence_build: 1812 modules
recorded_at: 2026-08-13T13:09:46+09:00
---

# BUILD RESULT

## INPUT

Arduino UNO Web Serial, DHT11/HC-SR04/LDR Sensor Pack 3종, 대응 Experiment Pack 3종, Student Easy Mode와 최소 비식별 저장 범위.

## TASK

React/Vite 학생 화면, 엄격한 직렬 프로토콜·계산 계층, Node 로컬 저장 API, UNO 통합 펌웨어를 구현했다.

Revision 2에서는 Vercel Web Serial 연결 때 UNO 자동 리셋 직후 최초 PING이 유실되는 결함을 수리했다. 포트 개방 뒤 유효 heartbeat를 기다리고, PING만 같은 포트에서 최대 1회 재시도하며, DHT11 MODE ACK 제한을 5초로 분리하고 timeout 뒤 pending read를 재사용한다.

Revision 3에서는 PC마다 다른 COM 번호와 호환 UNO의 USB 브리지 ID를 연결 조건으로 사용하지 않도록 `navigator.serial.requestPort()`의 무필터 호출을 명시했다. 브라우저가 노출한 직렬 장치 전체에서 사용자가 UNO를 선택하며, 연결 뒤 heartbeat·PING·MODE ACK 검증으로 잘못 선택한 장치를 fail-closed 처리한다.

## OUTPUT

- `src/` — 학생 UI, Web Serial, protocol/calculation, 저장·CSV
- `server/` — 비식별 세션과 append-only 측정 저장·조회
- `firmware/` — UNO 통합 펌웨어와 배선 안내
- `dist/` — production build

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 부팅 heartbeat·PING 재시도·ACK·timeout·stale fail-closed | PASS | V2 |
| raw/derived/demo 출처 분리 | PASS | V2 |
| 3개 Pack 메타데이터와 안전 안내 | PASS | V2 |
| 비식별 저장·조회·CSV 추적성 | PASS | V2 |

## Negative / Fail-closed 검증

잘못된 ACK/JSON/센서/단위/계산 근거, 개인정보 필드, stale timeout, 과도한 line buffer와 demo 저장을 거부하는 회귀 테스트를 포함했다. 또한 heartbeat 전 PING 금지와 최초 PING 유실 뒤 같은 포트의 단일 재시도 성공을 검증한다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | ACK 우회, 펌웨어 JSON 불일치, stale 상태, 저장 provenance 손실을 독립 검토에서 발견해 같은 노드에서 수리 |

## 한계

이전 실제 UNO·DHT11 측정은 통과했다. Revision 2 수정의 Vercel 배포 후 실제 Web Serial 재연결은 게시 뒤 확인한다.
