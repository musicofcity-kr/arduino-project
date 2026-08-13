---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 6
evidence_level: V2
evidence_unit: 79/79
evidence_e2e: local-production-browser-1280+390-pass+timing-boundary-regression-pass+uno-compile-pass
evidence_build: 1816 modules
recorded_at: 2026-08-13T15:57:00+09:00
---

# BUILD RESULT

## INPUT

고정 센서 주기 대신 학생이 웹앱에서 실제 측정 간격과 총 측정시간을 안전하게 선택하고, 그래프·CSV·STOP 경계까지 같은 설정으로 추적하려는 USER CHECK 요청.

## TASK

- 펌웨어에 `SET_INTERVAL:<sensor>:<ms>`와 정확한 `ACK:INTERVAL:<sensor>:<ms>` 계약을 추가했다.
- DHT11 2,000~10,000ms, HC-SR04/LDR 500~10,000ms를 펌웨어에서 강제하고 UI는 검증된 preset만 제공한다.
- interval ACK 성공 뒤에만 MODE와 새 run을 시작하며 설정 실패 시 기존 그래프·CSV를 보존한다.
- 절대 deadline 뒤 프레임은 기록 전 제외하고, 수동/자동 STOP 경합에도 run STOP을 한 번만 전송한다.
- 요청 간격에 맞춰 sensor freshness를 동적으로 조정하되 7초 transport heartbeat 계약은 분리 유지했다.
- CSV에 requested interval/duration, duration mode, startedAt/endedAt, stopReason과 원시 device timestamp를 함께 기록했다.
- 학생 UI에 44px native select, visible configuring/stopping 상태, countdown, 완료/직접 멈춤/중단 CSV 문구를 추가했다.

## OUTPUT

- `firmware/UniversalSensorFirmware/UniversalSensorFirmware.ino`, `firmware/README.md`, firmware contract test
- `src/domain/measurementTiming.ts`, protocol parser와 domain tests
- `src/App.tsx`, `src/App.test.tsx`, `DashboardMeasurement.tsx`, `styles.css`
- `src/services/liveSessionCsv.ts`와 serializer tests

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 센서별 간격 범위와 exact ACK 뒤에만 run 시작 | PASS | V2 |
| 예약 deadline 이후 데이터 배제·STOP 1회 | PASS | V2 |
| 0행 비완료, 실패 시 이전 그래프·CSV 보존 | PASS | V2 |
| 요청/실제 시각·출처·종료사유 CSV 추적 | PASS | V2 |
| 1280px·390px 학생 UI와 접근 가능한 상태 표현 | PASS | V2 |
| UNO target compile 8,340 bytes / SRAM 814 bytes | PASS | V2 |

## Negative / Fail-closed 검증

다른 센서나 다른 ms의 INTERVAL ACK, 범위 밖 값, MODE/STOP 실패, 유효값 0행을 성공으로 통과시키지 않는다. 예약 종료시각 이후 프레임, heartbeat, device error는 측정 CSV 행이 아니다. HC 속도는 요청 주기가 아니라 두 원시 device timestamp의 실제 차를 사용한다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | USER CHECK에서 승인된 측정 주기·총 시간 UI가 펌웨어·CSV 계약까지 변경하므로 revision 6 BUILD로 회귀 |

## 한계

새 펌웨어는 UNO target compile까지만 확인했다. 실제 UNO 업로드 후 선택한 주기와 예약 종료의 장시간 V3 실측은 USER CHECK에 남긴다.
