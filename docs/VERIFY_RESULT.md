---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 5
evidence_level: V2
evidence_unit: 61/61
evidence_e2e: local-browser-smoke-pass+transient-sensor-recovery-regression-pass
evidence_build: 1815 modules
recorded_at: 2026-08-13T14:43:05+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 5의 측정 중 일시 오류 복구와 transport 분리 산출물.

## TASK

Web Serial의 recoverable device error, sensor stale, heartbeat-only, transport silence, reader 종료, 그래프·CSV 보존과 기존 전체 회귀를 검증했다.

## OUTPUT

- `npm test`: Vitest 52/52 + Node 서버·펌웨어 9/9 = 61/61 PASS
- `npm run build`: TypeScript + Vite PASS, 1,815 modules transformed
- `python tools/check_package.py`: blocker 0 / warn 0 PASS
- `python tools/selftest.py`: 42/42 PASS (sandbox Temp 권한 오류 뒤 허용 경로에서 동일 명령 성공)
- 로컬 production preview: 본문과 핵심 버튼 렌더링, Vite 오류 오버레이 없음
- 390×844 브라우저: 가로 overflow 0, 현재 측정/CSV 핵심 버튼 44px
- 브라우저 콘솔: 기능 오류 0, 누락 favicon 404 한 건

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| DHT read error 뒤 동일 port/run 자동 복구 | PASS | V2 |
| DHT 5초 stale와 heartbeat-only 연결 유지 | PASS | V2 |
| transport silence/reader 종료와 비허용 오류 분리 | PASS | V2 |
| stale·fatal 오류 뒤 그래프/CSV 보존 | PASS | V2 |
| 전체 회귀·production build·브라우저 화면 | PASS | V2 |

## Negative / Fail-closed 검증

recoverable allowlist 밖의 device error, MODE 오류, 실제 reader 종료, 잘못된 protocol/값/출처는 성공 경로로 통과하지 않는다. heartbeat는 sensor freshness나 CSV 측정 행을 갱신하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | USER CHECK에서 확인된 중간 단절 오분류를 BUILD에서 수리한 뒤 VERIFY 전체를 재실행 |

## 한계

브라우저 자동 검증은 실제 USB 권한 선택과 UNO를 사용하지 않았다. 배포 URL의 실제 장시간 복구와 CSV 연속성은 미실행이다.
