---
document: NODE_RESULT
node: EVALUATE
verdict: PASS
revision: 6
evidence_level: V2
evidence_unit: 79/79
evidence_e2e: local-production-browser-1280+390-pass+timing-boundary-regression-pass+uno-compile-pass
evidence_build: 1816 modules
recorded_at: 2026-08-13T15:57:00+09:00
---

# EVALUATE RESULT

## INPUT

revision 6 BUILD·VERIFY 결과와 측정 시간 기능의 프로토콜·데이터·학생 UI 독립 리뷰.

## TASK

웹 설정이 단순 표시 필터가 아니라 펌웨어 cadence 설정 경로를 변경하는지, 요청 시간과 실제 수집 경계가 구분되는지, 원시 timestamp/source와 파생 계산이 P0를 지키는지, 학생에게 0행·중단·완료를 오인시키지 않는지 평가했다.

## OUTPUT

- exact INTERVAL ACK 뒤에만 센서 MODE와 새 run을 시작한다.
- preset은 센서 안전 하한을 지키며 설정 중 잠겨 run 중 provenance 혼합을 막는다.
- deadline 이후 frame은 수신되더라도 current/history/CSV에 포함하지 않는다.
- CSV는 요청 간격·요청시간과 실제 시작/종료시각·종료사유를 별도 열로 보존한다.
- HC 속도는 nominal interval이 아닌 device timestamps로 계산한다.
- 유효 측정 0행, STOP 실패, interval 실패를 성공 완료로 표시하지 않는다.
- configuring/stopping 상태를 시각적으로 표시하고 demo 조작을 잠그며 CSV를 완료/직접 멈춤/중단으로 구분한다.

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 펌웨어 sampling cadence 계약과 UI 문구 일치 | PASS | V2 |
| raw/derived source·unit·timestamp 추적 | PASS | V2 |
| requested/actual duration과 stop reason 분리 | PASS | V2 |
| 실패·0행·중단을 완료로 오인시키지 않음 | PASS | V2 |
| 독립 Reviewer blocker/major | 0건 | V1 |

## Negative / Fail-closed 검증

브라우저가 느리거나 탭이 background였다는 이유로 종료 경계 밖 프레임을 요청 구간의 데이터로 편입하지 않는다. 무기한 측정은 duration ms 열을 비우고 `durationMode=continuous`로 구분한다. 실제 센서 cadence/정확도는 mock·compile만으로 확정하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 예약 종료·CSV 타입·checking UI 리뷰 결함을 BUILD에서 수리하고 하류를 재검증 |

## 한계

실제 UNO revision 6 펌웨어의 주기 오차, Vercel Web Serial, 모바일 OTG, 실제 다운로드 CSV와 학생 사용성은 USER CHECK에 남긴다.
