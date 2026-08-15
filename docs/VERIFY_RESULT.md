---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 10
evidence_level: V2
evidence_unit: 91/91
evidence_e2e: local-production-edge-1280+390-demo-clear-confirm-no-overflow
evidence_build: 1816 modules
recorded_at: 2026-08-15T15:36:00+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 10의 현재 라이브 데이터 비우기·안전 재측정 흐름과 기존 Web Serial·그래프·CSV·저장 기록 계약.

## TASK

삭제 전 확인, STOP/ACK 순서, 실패 시 보존, 새 run 분리, 저장 기록 비삭제, 자동 종료 경합, 데모·실측 구분과 반응형 화면을 전체 회귀와 production browser에서 검증했다.

## OUTPUT

- `npm test`: Vitest 81/81 + Node 서버·펌웨어 10/10 = 91/91 PASS
- `npm run build`: TypeScript + Vite PASS, 1,816 modules transformed
- `PYTHONUTF8=1 python tools/check_package.py`: blocker 0 / warn 0 PASS
- `PYTHONUTF8=1 python tools/selftest.py`: 42/42 PASS
- App focused: 39/39 PASS
- local production Edge 1280×800: 데모 그래프 2개, `데모 데이터 비우기`, 확인 후 그래프 0개·상태 알림 PASS
- local production Edge 390×844: 비우기 버튼 44px, root 390=390, panel 370=370으로 가로 overflow 0
- 오류 overlay 0; desktop의 `/favicon.ico` 404 한 건은 기존 비기능 cosmetic 오류
- secret/API-key 패턴 검사: 추가 diff에서 검출 0

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 중지 후 확인 취소·확인 및 live CSV 0행 전환 | PASS | V2 |
| STOP ACK 전 graph/CSV 유지와 대기 프레임 제외 | PASS | V2 |
| STOP ACK 후 exact interval·mode ACK 성공 시 새 run 시작 | PASS | V2 |
| STOP timeout·MODE 실패에서 데이터 보존·재시작 차단 | PASS | V2 |
| double-click·manual/automatic deadline 경합에서 단일 STOP·restart | PASS | V2 |
| 실제 비식별 저장 뒤 live clear에도 저장 기록 상태 유지 | PASS | V2 |
| 순수 데모와 실측 CSV가 남은 데모 화면의 삭제 문구 구분 | PASS | V2 |
| 1280·390 화면에서 조작·상태·도움말·overflow | PASS | V2 |

## Negative / Fail-closed 검증

확인 취소 시 serial write와 run을 변경하지 않았다. STOP timeout은 포트를 닫고 기존 graph/CSV를 유지했으며 새 `SET_INTERVAL`을 보내지 않았다. STOP 대기 중 도착한 99.0 값은 현재 카드와 CSV에 들어가지 않았다. 실측 CSV가 남은 상태에서 데모를 표시해도 `데모만 비움`으로 오인시키지 않고 전체 live 삭제 범위를 표시한다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | revision 10 BUILD 수리 후 VERIFY를 최신 전체 증거로 재실행 |

## 한계

브라우저 검증은 local production preview와 데모 데이터이며 실제 Web Serial 포트를 열지 않았다. Vercel 배포에서 실제 센서 측정 중 비우기, 새 run ID·CSV 다운로드와 장치 ACK를 묶은 V3 확인이 필요하다.
