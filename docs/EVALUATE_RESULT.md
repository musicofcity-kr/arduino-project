---
document: NODE_RESULT
node: EVALUATE
verdict: PASS
revision: 7
evidence_level: V2
evidence_unit: 82/82
evidence_e2e: local-production-browser-1848+1280+390-single+dual-series-no-overlap+root-overflow0
evidence_build: 1816 modules
recorded_at: 2026-08-14T07:52:19+09:00
---

# EVALUATE RESULT

## INPUT

revision 7 BUILD·VERIFY 결과와 1개·복수 개 센서 그래프의 학생 UI 독립 검토.

## TASK

마지막 그래프와 단위·통계·출처가 가려지지 않는지, 시리즈 수가 늘 때 패널과 다음 행의 관계가 안전한지, 그래프 레이아웃 수리가 원시 데이터·CSV 의미를 바꾸지 않는지 평가했다.

## OUTPUT

- 단일 그래프는 한 열 전체 폭을 사용하고 복수 그래프는 가용 폭에 따라 자동 배치된다.
- 좁은 측정 열과 390px 화면에서는 각 그래프가 한 열로 쌓이고 측정 패널이 콘텐츠 높이만큼 늘어난다.
- 온도·습도는 독립 단위·최저·최고·최신·표본 수와 서로 다른 선 스타일을 유지한다.
- stale/중지/demo의 현재·마지막·예시 상태와 SVG title/description은 유지된다.
- raw timestamp/source/unit, derived 제외, 24점 화면 버퍼, live CSV 계약은 변경되지 않았다.

## PASS 조건과 판정

| 조건 | 결과 | 증거 등급 |
|---|---|---|
| 1개·복수 그래프의 마지막 시리즈까지 가시성 유지 | PASS | V2 |
| 단위·통계·출처·현재/마지막 상태 의미 보존 | PASS | V2 |
| 색상 외 제목·단위·선 스타일·ARIA로 시리즈 구분 | PASS | V2 |
| 실제 viewport에서 겹침·잘림·문서 가로 overflow 0 | PASS | V2 |
| 독립 Reviewer blocker/major | 0건 | V1 |

## Negative / Fail-closed 검증

패널을 임의 고정 높이로 키우거나 내부 스크롤에 숨기지 않는다. raw와 derived를 한 시리즈로 섞지 않고, 그래프 표시 개선을 측정 정확도·센서 교정 또는 Vercel 실제 장치 검증으로 확대하지 않는다.

## FAIL ROUTE 발화 기록

| 판정 | 목적지 | 사유 |
|---|---|---|
| REPAIR | BUILD | 복수 그래프 clipping 원인을 대시보드 높이·flex 축소 계약에서 수리하고 하류를 재평가 |

## 한계

학생 실사용과 실제 배포 Web Serial 장시간 측정은 USER CHECK에 남긴다.
