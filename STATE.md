---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 5
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-13T14:43:05+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 61/61
evidence_e2e: local-browser-smoke-pass+transient-sensor-recovery-regression-pass
evidence_build: 1815 modules
open_question: 배포 환경의 실제 UNO 장시간 측정에서 일시적 센서 오류 후 자동 복구와 CSV 연속성을 확인할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 5에서 실제 USER CHECK 중 발견된 측정 중단을 BUILD REPAIR했다. 측정 중 `DHT11_INVALID_READ`, `HC_SR04_TIMEOUT`, `LDR_INVALID_READ` 한 건은 USB 단절로 오분류하지 않고 현재값만 숨긴 채 같은 포트와 세션에서 다음 fresh measurement를 기다린다. DHT11은 5초, HC-SR04/LDR는 3초 뒤 현재값을 stale 처리한다. transport 단절은 heartbeat를 포함한 유효 직렬 메시지까지 7초 동안 없거나 reader가 실제 종료된 경우로 분류한다. 비허용 device/protocol 오류는 별도 terminal fail-closed로 포트를 닫는다. stale은 새 유효값 수신 시 같은 run에서 자동 복구하고, terminal 오류는 마지막 그래프와 CSV를 보존한 채 재연결을 요구한다.

자동 테스트 61/61, package selftest 42/42, package gate blocker 0/warn 0과 TypeScript/Vite production build 1,815 modules를 통과했다. 로컬 production preview에서 본문·연결 버튼·CSV 버튼 렌더링, Vite 오류 오버레이 없음, 390px 가로 overflow 0을 확인했다. 실제 UNO 장시간 측정에서 복구 정책은 아직 재확인하지 않았으므로 `verified-build` 범위이며 COMPLETE가 아니다.

## 사용자 확인이 필요한 범위

- Vercel 배포 URL에서 실제 UNO를 장시간 측정해 일시적 센서 읽기 실패 뒤 같은 포트에서 자동 복구되는지 확인
- stale·복구·실제 USB 분리 전후에 그래프와 `현재 측정 CSV` 행이 보존되고 실제값과 일치하는지 확인
- 실제 390px 모바일/태블릿의 Web Serial 지원 여부와 버튼·스크롤 사용성 확인
- LDR는 사용자 결정에 따라 추후 검증
- 초보 학생의 Easy Mode 완주와 실제 수업 효과 확인
