---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 4
evidence_level: V2
evidence_unit: 56/56
evidence_e2e: local-browser-chart-layout-pass+live-session-csv-regression-pass
evidence_build: 1815 modules
recorded_at: 2026-08-13T13:55:32+09:00
---

# BUILD RESULT

## INPUT

Arduino UNO Web Serial의 연속 센서값을 학생 화면에서 그래프로 확인하고, 현재 측정 세션 전체를 CSV로 내려받는 요구.

## TASK

- DHT11 온도와 상대습도를 단위가 섞이지 않는 두 그래프로 표시했다.
- HC-SR04 거리와 LDR 원시 상대광 신호는 각각 원시값 그래프로 표시하고 파생값과 혼합하지 않았다.
- 그래프의 최신값·최저·최고·표본 수·경과 시간·첫 값 대비 변화·출처를 표시했다.
- 화면 그래프의 최근 24시점/64행 버퍼와 별도로, 실제 측정 세션 CSV를 최대 10,000행까지 보존했다.
- 실측과 파생 계산의 timestamp·unit·formula·inputs를 long-format CSV로 기록하고 demo/simulation은 제외했다.
- STOP 뒤 그래프와 CSV는 마지막 기록으로 유지하며, fresh MODE ACK 뒤 새 세션을 시작하도록 경계를 분리했다.

## OUTPUT

- `src/components/LiveSensorChart.tsx` — 센서별 실시간 SVG 그래프
- `src/services/liveSessionCsv.ts` — 세션 CSV 직렬화와 원자적 프레임 상한
- `src/services/csv.ts` — CRLF·인용·스프레드시트 수식 주입 방어 공용 처리
- `src/App.tsx` — live session buffer와 다운로드 흐름
- 반응형·접근성 스타일과 회귀 테스트

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| DHT 두 지표 및 HC/LDR raw-only 그래프 | PASS | V2 |
| 단위·출처·timestamp·계산 근거 CSV 보존 | PASS | V2 |
| demo 제외, 빈/비정상 provenance fail-closed | PASS | V2 |
| STOP·재시작·실패 재시작 세션 경계 | PASS | V2 |
| 10,000행 경계에서 프레임 원자성 | PASS | V2 |

## Negative / Fail-closed 검증

빈 세션, demo-only, 비유한 값, 누락된 provenance를 CSV로 만들지 않는다. 실패한 재시작은 이전 정상 CSV를 지우지 않고, HC-SR04의 raw/derived 한 프레임은 상한에서 반으로 자르지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 초기 구현의 패널 overflow, polyline fill, 세션 기준값 재사용, 실패 재시작 데이터 손실, 상한 프레임 분할을 독립 검토에서 발견해 수리 |

## 한계

로컬 브라우저에서 demo 그래프와 레이아웃을 검증했다. 실제 UNO 연속 수신값의 그래프·CSV 다운로드와 실제 390px 모바일 기기는 USER CHECK에 남긴다.
