---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 8
evidence_level: V2
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T13:46:16+09:00
---

# BUILD RESULT

## INPUT

Vercel 사용자 확인에서 상단 센서 행의 HC-SR04와 LDR이 버튼처럼 보이지만 선택되지 않아 DHT11 이외의 작업을 시작할 수 없었다. 코드에서 해당 요소는 클릭 처리와 키보드 의미가 없는 정적 `span`이었다. 기존 센서 변경 함수도 포트 종료를 기다리지 않아 연결 상태 전환과 새 선택이 겹칠 수 있었다.

## TASK

- 상단 센서 행을 실제 탐구팩 데이터에 연결된 버튼으로 변경한다.
- DHT11·HC-SR04·LDR의 선택 상태를 텍스트와 `aria-pressed`로 제공한다.
- 연결 요청·확인·측정 중에는 상단 버튼과 하단 실험 카드를 동일하게 잠근다.
- 준비 상태에서 센서를 바꾸면 기존 포트 종료를 기다린 뒤 탐구팩·측정 설정·그래프·CSV 세션을 초기화한다.
- 펌웨어, 센서 명령, 수치·timestamp·CSV 계약은 변경하지 않는다.

## OUTPUT

- `src/App.tsx`
- `src/App.test.tsx`
- `src/components/ExperimentCard.tsx`
- `src/styles.css`
- revision 8 상태·노드 결과 문서

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 상단에 세 센서가 실제 버튼으로 노출되고 각각 선택됨 | PASS | V2 |
| 선택 시 센서명·연결 CTA·기본 간격·하단 탐구팩이 함께 갱신됨 | PASS | V2 |
| requesting/checking/measuring 중 상·하단 선택 경로 모두 잠김 | PASS | V2 |
| ready 상태 전환은 기존 포트를 닫은 뒤 새 선택을 적용 | PASS | V2 |
| 390px에서 44px 조작 영역 및 가로 overflow 0 | PASS | V2 |

## Negative / Fail-closed 검증

진행 중 센서 전환은 비활성화해 기존 센서의 MODE·STOP·측정 프레임과 새 센서 화면이 섞이지 않게 한다. 빠른 중복 클릭은 동기 ref guard로 한 번만 처리하며, 하단 탐구 카드로 잠금 정책을 우회할 수 없다. 선택 UI 수리는 기존 측정 데이터와 live CSV 직렬화 코드를 변경하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | USER CHECK에서 센서 선택 UI가 정적 표시였고 전환 경쟁 조건이 확인되어 revision 8 BUILD로 회귀 |

## 한계

수정본은 local production browser에서 검증했다. Vercel 배포본과 실제 HC-SR04·LDR Web Serial 계측은 USER CHECK에 남는다.
