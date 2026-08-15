---
document: NODE_RESULT
node: EVALUATE
verdict: PASS
revision: 10
evidence_level: V2
evidence_unit: 91/91
evidence_e2e: local-production-edge-1280+390-demo-clear-confirm-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T15:36:00+09:00
---

# EVALUATE RESULT

## INPUT

revision 10 BUILD·VERIFY 결과와 파괴적 라이브 데이터 비우기 계약.

## TASK

학생이 삭제 범위를 이해할 수 있는지, Web Serial STOP과 새 run 전환이 fail-closed인지, raw·derived provenance와 서버 저장 기록이 섞이거나 삭제되지 않는지, 반응형·접근성 회귀가 없는지 독립 평가했다.

## OUTPUT

- 측정 중 버튼은 `비우고 새 측정 시작 (N행)`, 중지 후에는 `이번 측정 데이터 비우기 (N행)`, 순수 데모는 `데모 데이터 비우기`로 구분한다.
- 도움말과 native 확인창은 현재 그래프·다운로드 전 live CSV만 삭제하며 저장 기록·기존 파일을 유지한다고 명시한다.
- 처리 중 버튼 잠금과 ref guard가 중복 STOP·중복 run을 막는다.
- 새 run은 새 ACK 성공 뒤 새 ID·시작시각·동일 선택 설정으로 생성되고 HC 속도·LDR 기준선은 초기화된다.
- CSV serializer, server API, 펌웨어는 변경하지 않아 데이터 스키마·출처 계약을 보존했다.

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 파괴적 동작 범위·행 수·보존 대상의 사전 고지 | PASS | V2 |
| ACK 전 삭제 금지와 실패 시 이전 run 보존 | PASS | V2 |
| 새 run의 raw/derived·timestamp·CSV provenance 분리 | PASS | V2 |
| 저장 기록과 live CSV의 수명주기 분리 | PASS | V2 |
| 데모·실측 출처 및 삭제 의미 구분 | PASS | V2 |
| 키보드 버튼·상태 알림·390px 44px 조작 영역 | PASS | V2 |
| 독립 reviewer blocker/major | 0건 | V1 |

## Negative / Fail-closed 검증

삭제 확인을 취소하면 측정이 계속되고 serial 명령이 추가되지 않는다. STOP 또는 새 센서 설정 실패는 성공 문구나 새 run을 만들지 않는다. 실측 CSV가 남아 있는 동안 데모 그래프를 표시해도 데모만 삭제된다는 잘못된 설명을 하지 않는다. 센서 측정값·단위·정확도는 이번 UI 기능의 성공 증거로 확대하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | USER CHECK에서 확인된 live 데이터 수명주기 요구를 BUILD에서 구현하고 하류를 다시 평가 |

## 한계

독립 평가는 자동화와 local production browser V2다. 실제 Vercel+UNO에서 STOP ACK, 새 MODE ACK, 새 CSV의 run 분리와 장시간 안정성은 USER CHECK 대상이다.
