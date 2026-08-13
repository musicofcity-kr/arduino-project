---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 6
evidence_level: V2
evidence_unit: 79/79
evidence_e2e: local-production-browser-1280+390-pass+timing-boundary-regression-pass+uno-compile-pass
evidence_build: 1816 modules
recorded_at: 2026-08-13T15:57:00+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 6의 가변 센서 측정 간격, 예약 측정, 종료 경계, CSV provenance, 학생용 설정 UI.

## TASK

프로토콜 exact correlation, 펌웨어 bounds, run 초기화, 동적 stale, 수동/자동 STOP 경합, background timer 지연에 해당하는 wall-clock jump, 0행 비완료, 이전 기록 보존, CSV 타입·시각·출처와 반응형 UI를 전체 회귀했다.

## OUTPUT

- `npm test`: Vitest 69/69 + Node 서버·펌웨어 10/10 = 79/79 PASS
- `npm run build`: TypeScript + Vite PASS, 1,816 modules transformed
- Arduino CLI 1.5.1 / `arduino:avr` 1.8.8 UNO compile PASS: flash 8,340 bytes (25%), SRAM 814 bytes (39%)
- `PYTHONUTF8=1 python tools/check_package.py`: blocker 0 / warn 0 PASS
- `PYTHONUTF8=1 python tools/selftest.py`: 42/42 PASS
- 최신 local production preview: Vite overlay 없음, 본문·측정 설정·CSV UI 렌더링
- 1280px: root horizontal overflow 0, 측정 panel clientHeight=scrollHeight=468
- 390×844: horizontal overflow 0, panel clientHeight=scrollHeight=649, select 2개 44px/16px, action 3개 44px
- 브라우저 콘솔 기능 오류 0; 별도 favicon 미제공에 따른 404 한 건만 확인

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 기본 주기 호환과 센서별 preset/bounds | PASS | V2 |
| wrong sensor/ms ACK·invalid interval fail-closed | PASS | V2 |
| MODE ACK 뒤에만 새 run/CSV 초기화 | PASS | V2 |
| deadline 이후 frame 제외·auto/manual STOP 1회 | PASS | V2 |
| 0행 비완료·중단/완료 UI·이전 기록 보존 | PASS | V2 |
| CSV numeric/null duration과 actual end metadata | PASS | V2 |
| production build·responsive browser UI | PASS | V2 |

## Negative / Fail-closed 검증

설정 ACK 불일치나 실패는 MODE와 새 run을 시작하지 않는다. 종료 이후 frame은 화면·history·CSV 전에 차단한다. 완료 여부는 ACK:STOP뿐 아니라 유효 측정 행 존재까지 확인한다. CSV는 설정 주기와 실제 timestamp를 혼동하거나 `manual` 문자열을 ms 열에 넣지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | revision 6 상류 변경 뒤 VERIFY 전체를 새 증거로 재실행 |

## 한계

production preview는 Web Serial 실제 권한/UNO를 사용하지 않았다. 배포 URL의 실제 장시간 cadence, hidden-tab, STOP ACK와 다운로드 CSV는 V3 미실행이다.
