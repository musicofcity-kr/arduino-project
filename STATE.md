---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 4
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-13T14:03:00+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 56/56
evidence_e2e: local-browser-chart-layout-pass+live-session-csv-regression-pass
evidence_build: 1815 modules
open_question: 실제 UNO 연속 센서값 그래프와 현재 측정 CSV 다운로드를 배포 환경에서 확인할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 4에서 실시간 센서 그래프와 현재 측정 세션 CSV를 구현했다. DHT11 온도·상대습도는 별도 그래프, HC-SR04와 LDR는 원시값 그래프로 표시하며 단위·실측/예시 출처·최신/최저/최고·표본 수·첫 값 대비 변화를 제공한다. 첫 값과 최신값의 차이는 전체 추세로 확대 해석하지 않는다. CSV는 화면 그래프 버퍼와 분리해 최대 10,000행을 보존하고 raw/derived provenance, 장치 timestamp, 브라우저 수신시각, 공식과 입력 근거를 기록한다. demo는 제외한다.

자동 테스트 56/56, package selftest 42/42, package gate, TypeScript/Vite production build 1,815 modules를 통과했다. 로컬 브라우저에서 DHT 그래프 2개, HC/LDR raw-only 그래프, demo CSV 차단, 데스크톱 패널 비겹침과 가로 overflow 0을 확인했다. 실제 UNO·배포 URL·실제 모바일 기기의 새 기능은 아직 확인하지 않았으므로 `verified-build` 범위이며 COMPLETE가 아니다.

## 사용자 확인이 필요한 범위

- Vercel 배포 URL에서 UNO 연결 후 DHT11/HC-SR04 연속값이 실제 그래프에 누적되는지 확인
- 측정 중/STOP 후 `현재 측정 CSV`를 내려받아 timestamp·단위·행 수가 실제값과 일치하는지 확인
- 실제 390px 모바일/태블릿의 Web Serial 지원 여부와 버튼·스크롤 사용성 확인
- LDR는 사용자 결정에 따라 추후 검증
- 초보 학생의 Easy Mode 완주와 실제 수업 효과 확인
