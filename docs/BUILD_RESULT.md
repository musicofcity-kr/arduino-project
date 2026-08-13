---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 5
evidence_level: V2
evidence_unit: 61/61
evidence_e2e: local-browser-smoke-pass+transient-sensor-recovery-regression-pass
evidence_build: 1815 modules
recorded_at: 2026-08-13T14:43:05+09:00
---

# BUILD RESULT

## INPUT

배포 환경의 실제 DHT11 측정 중 간헐적인 센서 읽기 실패 또는 짧은 수신 공백 뒤 앱이 USB 연결을 종료한 USER CHECK 결함.

## TASK

- 측정 중 센서별로 허용한 일시적 read error만 stale로 처리하고 MODE 단계 또는 알 수 없는 device error는 기존처럼 fail-closed한다.
- measurement freshness와 heartbeat를 포함한 transport liveness를 분리했다.
- DHT11 5초, HC-SR04/LDR 3초 공백에는 현재값만 숨기고 포트·STOP·그래프·CSV를 유지한다.
- transport 단절은 유효 직렬 메시지까지 7초 동안 없거나 reader가 실제 종료된 경우로 분류한다. 비허용 device/protocol 오류는 별도 terminal fail-closed로 닫는다.
- 숨김 탭에서는 timeout 판정을 멈추고 복귀 뒤 5초 grace를 둔다.
- ACK timeout 뒤 pending read를 재사용하고 실제 read reject 뒤에는 제거해 중복 reader 경쟁을 막았다.

## OUTPUT

- `src/App.tsx` — recoverable sensor error, stale measurement, transport timeout, reader 경쟁조건 분리
- `src/App.test.tsx` — 일시 오류·stale 복구·heartbeat-only·transport silence·실제 reader 종료 회귀
- `src/components/DashboardMeasurement.tsx` — 현재값 대기 상태 표시
- `src/components/LiveSensorChart.tsx` — stale 중 마지막 기록과 첫 값 대기 상태 구분

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 일시적 DHT11 read error 뒤 같은 포트 자동 복구 | PASS | V2 |
| 센서 stale에서 현재값 숨김·그래프/CSV 보존 | PASS | V2 |
| heartbeat-only를 transport 생존으로만 사용 | PASS | V2 |
| transport silence/reader 종료 분류와 비허용 오류 fail-closed | PASS | V2 |
| MODE/비허용 device error fail-closed 유지 | PASS | V2 |

## Negative / Fail-closed 검증

heartbeat와 device error를 센서 현재값이나 CSV 행으로 저장하지 않는다. stale 값을 현재값으로 재사용하지 않고, fatal transport 오류에서도 마지막 그래프와 CSV만 기록으로 보존한다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 실제 USER CHECK에서 단일 센서 read error와 짧은 공백을 USB 단절로 오분류하는 결함을 발견해 revision 5에서 수리 |

## 한계

자동 회귀와 로컬 production preview는 통과했다. 실제 UNO 장시간 측정에서 간헐 오류 뒤 자동 복구와 CSV 연속성은 USER CHECK에 남긴다.
