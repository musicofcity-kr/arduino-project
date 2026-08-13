---
document: NODE_RESULT
node: BUILD
verdict: PASS
revision: 7
evidence_level: V2
evidence_unit: 82/82
evidence_e2e: local-production-browser-1848+1280+390-single+dual-series-no-overlap+root-overflow0
evidence_build: 1816 modules
recorded_at: 2026-08-14T07:52:19+09:00
---

# BUILD RESULT

## INPUT

DHT11 측정 중 온도 그래프 아래의 상대습도 그래프가 측정 패널 높이를 넘어 다음 대시보드 행에 가려지는 USER CHECK 결함. 센서팩에 따라 실제 그래프가 1개 또는 여러 개일 수 있으므로 개수별 고정 높이가 아닌 유연한 레이아웃이 필요했다.

## TASK

- 대시보드 첫 행을 화면 높이에 맞춘 고정 축소가 아니라 측정 콘텐츠의 최대 높이에 맞춰 확장하도록 변경했다.
- 측정 패널과 그래프 컨테이너가 flex 축소로 눌리지 않게 하고, 다음 행은 확장된 측정 패널 아래로 이동하도록 했다.
- 실제 렌더된 raw 시리즈 수를 `single`/`multiple`과 개수로 표시하고, 그래프 카드는 `auto-fit` 반응형 grid로 배치했다.
- 모바일에서는 그래프를 한 열로 유지하고 기존 44px 조작 영역을 보존했다.
- raw timestamp, source, unit, 24점 제한, derived 제외, CSV와 센서 통신 계약은 변경하지 않았다.

## OUTPUT

- `src/components/LiveSensorChart.tsx`
- `src/components/LiveSensorChart.test.tsx`
- `src/styles.css`
- revision 7 상태·노드 결과 문서

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 실제 raw 시리즈 1·2·4개를 빠짐없이 렌더링 | PASS | V2 |
| 복수 그래프가 측정 패널 내부에서 자연 높이 유지 | PASS | V2 |
| 다음 대시보드 행과 그래프 겹침 0 | PASS | V2 |
| 1848px·1280px·390px에서 문서 가로 overflow 0 | PASS | V2 |
| 단위·통계·ARIA title/description 유지 | PASS | V2 |

## Negative / Fail-closed 검증

그래프 개수는 실험 정의 총수 대신 실제 raw 데이터가 존재하는 시리즈 수를 사용한다. derived 값은 별도 raw 그래프로 추가하지 않으며, 데이터 계산·CSV 행·측정 timestamp는 레이아웃 변경으로 수정하지 않는다. 그래프별 고정 패널 높이와 내부 이중 스크롤을 추가하지 않았다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | USER CHECK에서 복수 그래프 clipping이 재현되어 revision 7 BUILD로 회귀 |

## 한계

production preview는 demo 데이터로 레이아웃을 검증했다. 배포 Vercel URL과 실제 Web Serial 장시간 측정 중 동적 그래프 누적은 USER CHECK에 남긴다.
