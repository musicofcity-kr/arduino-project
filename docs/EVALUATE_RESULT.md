---
document: NODE_RESULT
node: EVALUATE
verdict: PASS
revision: 9
evidence_level: V2
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T14:09:37+09:00
---

# EVALUATE RESULT

## INPUT

revision 9 BUILD·VERIFY 결과와 revision 8에서 추가된 세 센서 선택 흐름.

## TASK

Vercel 빌드 실패 원인과 수리 범위가 정확한지, deferred 테스트가 ready 센서 전환의 순서를 계속 보장하는지, 런타임·데이터·접근성 계약에 의도하지 않은 변화가 없는지 평가했다.

## OUTPUT

- 실패 원인은 Vercel 프로젝트나 센서 런타임이 아니라 테스트 mock의 `Promise<void>`/`Promise<undefined>` TypeScript 불일치로 확인됐다.
- mock은 정확한 반환 타입으로 수정됐고 close resolve 전후의 UI 상태 검증은 유지됐다.
- 런타임 `App.tsx`, 센서 프로토콜, 펌웨어, 측정값, 그래프, CSV 직렬화는 변경되지 않았다.
- 세 센서 버튼의 이름·`aria-pressed`, 44px 모바일 조작 영역과 가로 overflow 0이 유지됐다.

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| Vercel 빌드 실패 원인과 최소 수리의 일치 | PASS | V2 |
| deferred close 테스트 의미 보존 | PASS | V2 |
| 런타임 센서 선택·Web Serial·데이터 계약 불변 | PASS | V1 |
| 세 센서 선택 접근성과 반응형 UI 유지 | PASS | V2 |
| 독립 reviewer blocker/major | 0건 | V1 |

## Negative / Fail-closed 검증

빌드를 통과시키기 위해 테스트를 제거하거나 타입을 강제 캐스팅하지 않았다. 수정은 실제 반환값 `undefined`를 명시해 계약을 만족시키며, 센서 연결 성공이나 측정 정확도 증거로 확대하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | Vercel TypeScript 실패를 BUILD에서 수리하고 하류 노드를 다시 평가 |

## 한계

revision 9의 Vercel preview·production 배포와 실제 HC-SR04·LDR Web Serial 계측은 게시 뒤 USER CHECK에서 확인해야 한다.
