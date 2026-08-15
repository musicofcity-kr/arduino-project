---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 9
evidence_level: V2
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T14:09:37+09:00
---

# BUILD RESULT

## INPUT

revision 8 센서 선택 수리 PR의 Vercel 빌드가 `src/App.test.tsx(359,52): error TS2322: Type 'Promise<void>' is not assignable to type 'Promise<undefined>'`로 실패했다. 로컬 단위 테스트는 통과했지만 production 빌드의 TypeScript 검사에서 deferred `port.close` mock 반환 타입 불일치가 드러났다.

## TASK

- Vercel 로그의 정확한 TypeScript 오류를 로컬 production build로 재현·확인한다.
- ready 센서 전환의 비동기 종료 순서를 검증하는 의미는 유지한다.
- mock 구현의 반환 타입만 실제 mock 계약에 맞춘다.
- 런타임 Web Serial, 센서 선택, 측정·그래프·CSV, 펌웨어 계약은 변경하지 않는다.

## OUTPUT

- `src/App.test.tsx`
- revision 9 상태·노드 결과 문서

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| deferred close mock이 `Promise<undefined>` 계약과 일치 | PASS | V2 |
| close resolve 전 기존 센서 선택 유지·양쪽 선택 경로 잠금 회귀 유지 | PASS | V2 |
| close resolve 후 새 센서 선택 적용 회귀 유지 | PASS | V2 |
| TypeScript + Vite production build 통과 | PASS | V2 |
| 런타임 코드·펌웨어·데이터 계약 변경 없음 | PASS | V1 |

## Negative / Fail-closed 검증

테스트를 즉시 resolve하는 mock으로 약화하지 않고 deferred promise를 유지했다. 따라서 `await disconnect()`가 제거되면 resolve 전 새 센서가 선택되는 회귀를 계속 탐지한다. 수정은 테스트 타입에만 한정되어 실제 측정값과 live CSV를 바꾸지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | Vercel production build가 테스트 mock의 Promise 반환 타입 불일치로 실패하여 revision 9 BUILD로 회귀 |

## 한계

로컬 production build와 브라우저 흐름은 재검증했지만 revision 9의 Vercel 재배포 성공 여부는 게시 후 외부 체크로 확인해야 한다.
