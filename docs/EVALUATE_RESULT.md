---
document: NODE_RESULT
node: EVALUATE
verdict: PASS
revision: 5
evidence_level: V2
evidence_unit: 61/61
evidence_e2e: local-browser-smoke-pass+transient-sensor-recovery-regression-pass
evidence_build: 1815 modules
recorded_at: 2026-08-13T14:43:05+09:00
---

# EVALUATE RESULT

## INPUT

revision 5 BUILD·VERIFY 결과와 Web Serial 복구 정책의 독립 검토.

## TASK

일시적 센서 fault, sensor stale, transport fault를 학생에게 구분하면서 stale 값을 현재값으로 재사용하지 않는지 PROJECT_SPEC P0에 대조했다.

## OUTPUT

- recoverable sensor error는 현재값을 즉시 숨기되 port/run/history/CSV를 유지한다.
- heartbeat는 transport 생존 증거로만 사용하고 센서값·CSV·measurement freshness로 취급하지 않는다.
- 새 fresh measurement가 오면 학생의 추가 포트 선택 없이 같은 세션에서 자동 복구한다.
- transport silence와 실제 reader 종료는 연결 오류로 분류하고 이전 그래프·CSV를 기록으로 보존한다.
- 숨김 탭의 timer jump에 즉시 포트를 닫지 않도록 복귀 grace를 제공한다.
- React 변경은 기존 컴포넌트·ref·bounded timer 구조 안에서 최소화했다.

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| stale 값을 현재 실측으로 재사용하지 않음 | PASS | V2 |
| sensor fault와 transport fault 분리 | PASS | V2 |
| 그래프·CSV 증거 보존과 자동 복구 | PASS | V2 |
| 독립 Reviewer blocker/major | 0건 | V1 |

## Negative / Fail-closed 검증

복구 오류 자체와 heartbeat는 측정값이나 CSV 행이 되지 않는다. 비허용 device error와 실제 직렬 종료를 연결 성공으로 감추지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 실제 USER CHECK의 연결 중단 오분류를 수리하고 4개 회귀 테스트를 추가 |

## 한계

실제 UNO 장시간 수신에서 간헐 read error 후 자동 복구, 실제 USB 분리 분류, 다운로드 CSV의 연속성을 확인해야 한다.
