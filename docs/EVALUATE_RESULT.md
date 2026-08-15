---
document: NODE_RESULT
node: EVALUATE
verdict: PASS
revision: 8
evidence_level: V2
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T13:46:16+09:00
---

# EVALUATE RESULT

## INPUT

revision 8 BUILD·VERIFY 결과와 학생이 상단 센서 행에서 DHT11·HC-SR04·LDR을 직접 고르는 흐름.

## TASK

선택 가능성이 시각·키보드·스크린리더에 명확한지, 진행 중 전환이 데이터 손실이나 명령 경쟁을 만들지 않는지, 모바일 조작과 기존 측정 데이터 계약이 유지되는지 평가했다.

## OUTPUT

- 세 센서는 실제 `button`이며 각 이름과 `aria-pressed` 상태를 제공한다.
- 선택 센서는 색뿐 아니라 pressed 상태, 센서명, 연결 CTA, 하단 탐구팩 선택 문구로 구분된다.
- 연결 확인·측정 중에는 상단과 하단 선택 경로가 함께 잠기고 안내 title을 제공한다.
- ready 상태 센서 전환은 포트 종료 뒤 적용되어 화면과 직렬 명령의 센서가 엇갈리지 않는다.
- 모바일에서는 세 버튼이 44px 높이를 유지하고 문서 가로 overflow가 없다.

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 세 센서의 직접 선택 가능성과 현재 선택 표시 | PASS | V2 |
| 센서명·연결 CTA·간격·탐구팩의 일관된 갱신 | PASS | V2 |
| 진행 중 전환 잠금과 ready 전환의 직렬화 | PASS | V2 |
| 키보드 focus·disabled·pressed 의미 제공 | PASS | V2 |
| 390px 44px 조작 영역과 가로 overflow 0 | PASS | V2 |
| 독립 reviewer blocker/major | 0건 | V1 |

## Negative / Fail-closed 검증

정적 텍스트를 버튼처럼 보이게 두지 않으며, 연결·측정 중 다른 선택 경로로 상태를 바꿀 수 없다. 이번 UI 수리를 HC-SR04·LDR의 실제 측정 성공이나 센서 정확도·교정 증거로 확대하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 센서 선택 불가와 비동기 전환 경쟁을 BUILD에서 수리하고 하류 노드를 재평가 |

## 한계

실제 Vercel 배포본, Web Serial 권한 선택, HC-SR04·LDR 배선과 장시간 계측은 USER CHECK에 남아 있다.
