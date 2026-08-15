---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 8
evidence_level: V2
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T13:46:16+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 8의 세 센서 선택 버튼, 전환 잠금, 비동기 포트 종료 순서와 기존 측정·그래프·CSV 회귀 범위.

## TASK

세 센서의 선택 상태와 연결 CTA, 측정 기본 간격, 상·하단 전환 잠금, ready 상태 포트 종료 순서, 전체 자동화, production build와 실제 브라우저 반응형 화면을 검증했다.

## OUTPUT

- `npm test`: Vitest 74/74 + Node 서버·펌웨어 10/10 = 84/84 PASS
- `npm run build`: TypeScript + Vite PASS, 1,816 modules transformed
- App 회귀 테스트: DHT11 초기 선택, HC-SR04·LDR 상단 버튼 선택, checking/measuring 잠금, ready 전환 시 포트 종료 순서 PASS
- local production browser: 세 센서 버튼 모두 노출, DHT11 초기 pressed, HC-SR04·LDR 선택 후 센서명·CTA·간격 변경 PASS
- 390px viewport: 세 센서 버튼 높이 44px, 문서 가로 overflow 0
- Vite 오류 overlay 0, 브라우저 console error/warn 0

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| DHT11·HC-SR04·LDR 버튼 선택과 pressed 상태 | PASS | V2 |
| HC-SR04는 `HC-SR04 연결하기`와 0.5초, LDR은 해당 연결 CTA와 0.5초로 갱신 | PASS | V2 |
| checking/measuring 중 상단 버튼과 하단 카드 모두 비활성화 | PASS | V2 |
| ready 센서 전환에서 disconnect 1회 후 새 선택 적용 | PASS | V2 |
| 전체 자동 테스트 및 production build 회귀 없음 | PASS | V2 |
| 데스크톱·390px에서 가로 overflow와 브라우저 기능 오류 0 | PASS | V2 |

## Negative / Fail-closed 검증

선택 버튼은 연결 준비 중 또는 측정 중 명령을 시작하지 않는다. 하단 탐구 카드도 같은 잠금 조건을 사용한다. 실제 측정 데이터 생성, 그래프 series 계산, CSV buffer와 펌웨어 계약은 기존 테스트로 회귀 확인했다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | revision 8 선택 UI 변경 뒤 전체 VERIFY를 새 증거로 재실행 |

## 한계

브라우저 검증은 local production preview이며 실제 Vercel Web Serial 포트를 열지 않았다. 실제 HC-SR04·LDR 연결과 계측은 USER CHECK 대상이다.
