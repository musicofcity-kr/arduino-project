---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 10
evidence_level: V2
evidence_unit: 91/91
evidence_e2e: local-production-edge-1280+390-demo-clear-confirm-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T15:36:00+09:00
---

# BUILD RESULT

## INPUT

USER CHECK에서 현재 라이브 계측의 그래프와 다운로드 전 CSV를 측정 중 또는 중지 후 명시적으로 비우고 새 측정을 시작할 수 있어야 한다는 요구가 확인됐다. 삭제 대상은 현재 브라우저 메모리의 라이브 run으로 한정하며 비식별 서버 저장 기록과 이미 내려받은 파일은 보존해야 한다.

## TASK

- 데이터가 있을 때만 비우기 동작을 제공하고 삭제 범위·행 수·보존 범위를 확인한다.
- 측정 중에는 exact `ACK:STOP`과 새 `SET_INTERVAL`·`MODE` ACK가 모두 성공한 뒤에만 이전 run을 새 run으로 교체한다.
- STOP 또는 새 측정 설정이 실패하면 기존 그래프와 라이브 CSV를 보존한다.
- 측정 중지 후에는 연결·센서·간격·측정시간 설정을 유지한 채 현재 run만 비운다.
- 데모 데이터와 실측 CSV를 텍스트·출처·삭제 범위에서 구분한다.

## OUTPUT

- `src/App.tsx`
- `src/components/DashboardMeasurement.tsx`
- `src/styles.css`
- `src/App.test.tsx`
- revision 10 상태·노드 결과 문서

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 측정 중 `STOP → SET_INTERVAL → MODE` 순서 및 새 ACK 뒤 원자적 run 교체 | PASS | V2 |
| STOP ACK 대기 중 기존 데이터 유지·추가 프레임 제외 | PASS | V2 |
| STOP timeout 또는 MODE 실패 시 기존 그래프·CSV 보존 | PASS | V2 |
| 중지 후 추가 STOP 없이 현재 live run만 비움 | PASS | V2 |
| 서버 저장 기록·이미 다운로드한 파일·센서 설정 보존 | PASS | V2 |
| 데모 전용 삭제와 실측 CSV 포함 삭제 문구 구분 | PASS | V2 |
| 중복 클릭·예약 종료 경합에서 STOP·재시작 각 1회 | PASS | V2 |

## Negative / Fail-closed 검증

STOP ACK가 오기 전에는 데이터와 그래프를 삭제하지 않는다. STOP ACK 뒤 새 MODE 확인이 실패해도 이전 run은 보존하며 새 run을 만들지 않는다. STOP을 기다리는 동안 도착한 측정 프레임은 이전·새 CSV 어느 쪽에도 추가하지 않는다. 라이브 비우기 경로는 session API의 생성·추가·목록·삭제 요청을 호출하지 않으며, 실제 저장을 만든 테스트에서 `hasSavedRecords`와 저장 기록 CSV 버튼이 유지됐다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | USER CHECK에서 라이브 그래프·CSV를 안전하게 비우고 재측정하는 런타임 기능이 필요해 revision 10 BUILD로 회귀 |

## 한계

프로덕션 브라우저 검증은 데모 데이터를 이용한 UI 삭제 흐름이다. 실제 Vercel Web Serial에서 측정 중 비우기와 장치 ACK·새 run CSV를 함께 확인하는 V3 검증은 게시 후 USER CHECK에 남는다.
