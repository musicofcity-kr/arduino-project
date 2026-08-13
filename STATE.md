---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 7
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-14T08:01:23+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 82/82
evidence_e2e: local-production-browser-1848+1280+390-single+dual-series-no-overlap+root-overflow0
evidence_build: 1816 modules
open_question: Vercel 실제 Web Serial 장시간 측정에서 한 센서의 1개·2개 원시 시리즈 동적 누적과 CSV 조작을 확인할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 7에서 USER CHECK로 확인된 한 센서의 복수 원시 측정 시리즈 그래프 잘림을 BUILD REPAIR했다. 실제 렌더된 raw 시리즈 수가 1개 또는 여러 개여도 측정 패널과 대시보드 행이 콘텐츠 높이에 맞춰 늘어나며, 단일 그래프는 전체 폭, 복수 그래프는 가용 폭에 따른 반응형 카드로 표시된다.

자동 테스트 82/82, package selftest 42/42, package gate blocker 0/warn 0, TypeScript/Vite production build 1,816 modules를 통과했다. local production preview에서 1848×893 DHT 2개·HC 1개, 1280×800 DHT 2개, 390×844 DHT 2개 그래프의 마지막 시리즈가 패널 내부에 있고 다음 행과 12px 간격을 유지함을 확인했다. 세 화면의 문서 가로 overflow는 0이고 모바일 주요 버튼은 44px다. 그래프 수리는 raw timestamp/source/unit, derived 제외, 24점 화면 버퍼와 CSV·센서 통신 계약을 변경하지 않았다.

2026-08-13 실제 COM7 UNO에서 확인한 revision 6 DHT11 2초 interval/STOP V3 증거는 그대로 유효하지만, revision 7 UI는 local demo 기반 V2다. 실제 Vercel Web Serial 장시간 계측은 미확인이라 전체 상태는 `USER CHECK / ESCALATE`이며 COMPLETE가 아니다.

## 사용자 확인이 필요한 범위

- 실제 Vercel Web Serial에서 DHT 2개·HC/LDR 1개 그래프의 장시간 동적 누적과 CSV 조작 확인
- 실제 390px Android Chrome+USB OTG에서 그래프·측정 설정·CSV 사용성 확인
- revision 6에서 남긴 다른 간격·예약 종료·LDR·수업 사용성 V3 확인
