---
document: NODE_RESULT
node: VERIFY
verdict: PASS
revision: 7
evidence_level: V2
evidence_unit: 82/82
evidence_e2e: local-production-browser-1848+1280+390-single+dual-series-no-overlap+root-overflow0
evidence_build: 1816 modules
recorded_at: 2026-08-14T07:52:19+09:00
---

# VERIFY RESULT

## INPUT

BUILD revision 7의 가변 그래프 수 레이아웃과 기존 센서·CSV·측정시간 계약.

## TASK

1·2·4 raw 시리즈 렌더링, derived 제외, SVG 좌표·ARIA, 전체 앱 회귀, production build와 실제 브라우저의 패널·그래프·다음 행 bounding box를 검증했다.

## OUTPUT

- `npm test`: Vitest 72/72 + Node 서버·펌웨어 10/10 = 82/82 PASS
- `npm run build`: TypeScript + Vite PASS, 1,816 modules transformed
- 1848×893 DHT 2개: panel `clientHeight=scrollHeight=571`, 모든 시리즈가 panel 내부, panel bottom 645.28 < next row top 657.28
- 1848×893 HC 1개: panel `clientHeight=scrollHeight=503`, 단일 시리즈가 panel 내부, panel bottom 577.28 < next row top 589.28
- 1280×800 DHT 2개: panel `clientHeight=scrollHeight=608`, panel bottom 694.28 < next row top 706.28
- 390×844 DHT 2개: panel `clientHeight=scrollHeight=897`, panel bottom 1697.91 < next row top 1709.91, 주요 버튼 3개 44px
- 세 viewport 모두 document `scrollWidth=clientWidth`; Vite 오류 overlay 없음
- 브라우저 콘솔 기능 오류 0; 별도 favicon 미제공에 따른 404 한 건만 확인

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| DHT 온도·습도 그래프 모두 패널 내부 표시 | PASS | V2 |
| HC/LDR형 단일 raw 그래프가 전체 폭 사용 | PASS | V2 |
| 1·2·4 시리즈 DOM·layout count·유한 SVG 좌표 | PASS | V2 |
| 데스크톱·모바일 패널 겹침과 가로 overflow 0 | PASS | V2 |
| 기존 통신·시간·CSV·서버·펌웨어 회귀 | PASS | V2 |
| production build와 오류 overlay 없음 | PASS | V2 |

## Negative / Fail-closed 검증

실험 정의에 derived나 데이터 없는 raw 지표가 있어도 실제 렌더 시리즈 수만 레이아웃에 반영한다. 그래프가 늘어도 패널을 고정 높이로 잘라내거나 데이터 포인트를 숨기지 않는다. SVG 좌표는 viewBox 범위 안의 유한 수이며 source·timestamp reset 계약은 기존 테스트로 유지한다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | revision 7 레이아웃 변경 뒤 전체 VERIFY를 새 증거로 재실행 |

## 한계

브라우저 검증은 local production preview와 demo 데이터였다. 실제 Vercel Web Serial 세션 중 그래프 개수가 변하는 장시간 관찰은 V3 미실행이다.
