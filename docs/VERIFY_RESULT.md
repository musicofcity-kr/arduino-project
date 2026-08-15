---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 9
evidence_level: V2
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T14:09:37+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 9의 deferred close mock 반환 타입 수리와 revision 8 센서 선택 흐름 전체.

## TASK

Vercel에서 실패한 TypeScript 경계를 production build로 다시 확인하고, 전체 자동화와 실제 local production browser에서 세 센서 선택 및 반응형 화면을 재검증했다.

## OUTPUT

- `npm test`: Vitest 74/74 + Node 서버·펌웨어 10/10 = 84/84 PASS
- `npm run build`: TypeScript + Vite PASS, 1,816 modules transformed
- `PYTHONUTF8=1 python tools/check_package.py`: blocker 0 / warn 0 PASS
- `PYTHONUTF8=1 python tools/selftest.py`: 42/42 PASS
- App 회귀 테스트: deferred close resolve 전 DHT11 선택·상하단 잠금 유지, resolve 후 HC-SR04 선택 적용 PASS
- local production browser: DHT11 초기 pressed, HC-SR04·LDR 선택 후 연결 CTA와 0.5초 기본 간격 변경 PASS
- 데스크톱 및 390px 설정: 문서 가로 overflow 0; 좁은 화면 센서 버튼 높이 44px
- Vite 오류 overlay 0

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| Vercel에서 보고된 TS2322 빌드 오류 해소 | PASS | V2 |
| 전체 자동 테스트와 production build 회귀 없음 | PASS | V2 |
| package gate 0/0 및 package selftest 42/42 | PASS | V2 |
| DHT11·HC-SR04·LDR 선택과 pressed 상태 | PASS | V2 |
| HC-SR04·LDR 연결 CTA와 0.5초 기본 간격 갱신 | PASS | V2 |
| ready 센서 전환에서 포트 종료 완료 후 새 선택 적용 | PASS | V2 |
| 데스크톱·390px 설정에서 가로 overflow 0 | PASS | V2 |

## Negative / Fail-closed 검증

타입 수리는 비동기 종료 순서 테스트를 삭제하거나 즉시 resolve하도록 약화하지 않았다. 센서 전환 중 선택 잠금, 측정 데이터 생성, 그래프 series, CSV buffer와 펌웨어 계약은 기존 회귀 테스트에서 계속 통과했다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | revision 9 테스트 타입 수리 뒤 BUILD 하류 VERIFY를 새 증거로 재실행 |

## 한계

브라우저 검증은 local production preview이며 실제 Web Serial 포트를 열지 않았다. Vercel 배포 체크와 실제 HC-SR04·LDR 연결·계측은 USER CHECK 대상이다.
