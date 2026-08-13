---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 4
evidence_level: V2
evidence_unit: 56/56
evidence_e2e: local-browser-chart-layout-pass+live-session-csv-regression-pass
evidence_build: 1815 modules
recorded_at: 2026-08-13T13:55:32+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 4의 실시간 그래프와 현재 측정 CSV 산출물.

## TASK

순수 그래프 모델, CSV serializer, Web Serial 연속 수신·STOP·재시작, 다운로드 DOM 흐름, 기존 저장 API/CSV 회귀, production build와 로컬 브라우저 레이아웃을 검증했다.

## OUTPUT

- `npm test`: Vitest 47/47 + Node 서버·펌웨어 9/9 = 56/56 PASS
- `npm run build`: TypeScript + Vite PASS, 1,815 modules transformed
- package gate: blocker 0 / warn 0
- package selftest: 42/42 PASS
- HTML smoke: fail 0, 외부 리소스 없음
- 로컬 브라우저: DHT 그래프 2개, HC/LDR raw-only 그래프, demo CSV 차단, 가로 overflow 0
- 데스크톱 측정 패널: clientHeight=scrollHeight=398, 다음 행 overlap=false

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 그래프 timestamp 간격·상수값·reset/source 분리 | PASS | V2 |
| CSV BOM·CRLF·escaping·provenance | PASS | V2 |
| 다운로드가 저장 API를 호출하지 않음 | PASS | V2 |
| 실패 재시작 보존·HC 재시작 계산 초기화 | PASS | V2 |
| production build와 로컬 브라우저 화면 | PASS | V2 |

## Negative / Fail-closed 검증

잘못된 값·단위·출처, demo 저장/내보내기, stale 데이터, ACK 불일치, line overflow, incomplete CSV frame이 성공 경로로 통과하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 독립 Reviewer가 발견한 데이터·UI major를 BUILD에서 수리한 뒤 전체 검증을 재실행 |

## 한계

브라우저 자동 검증은 실제 USB 권한 선택과 UNO를 사용하지 않았다. 실제 센서 연속값 그래프/CSV와 실제 390px 기기 검증은 미실행이다.
