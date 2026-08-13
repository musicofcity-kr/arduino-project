---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 3
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-13T13:15:37+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 44/44
evidence_e2e: webserial-broad-picker-regression-pass+webserial-reset-regression-pass
evidence_build: 1812 modules
open_question: 무필터 Web Serial 포트 선택은 V2 PASS. 실제 각 PC·지원 모바일에서 UNO 선택·연결 확인과 기존 HC-SR04 속도·LDR·저장/CSV·학교 PC·학생 흐름 검증이 남음
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

React/Vite 기반 학생용 Easy Mode, Web Serial 센서 통신, 실험별 계산·출처 추적, 비식별 로컬 저장 API, CSV 내보내기, Arduino UNO 통합 펌웨어의 BUILD·VERIFY·EVALUATE 자동 검증을 통과했다. revision 2의 heartbeat 대기·PING 제한 재시도·MODE ACK 5초·pending read 단일화에 이어, revision 3에서는 `requestPort()`를 필터 없이 호출하는 광범위 포트 선택 계약을 회귀 테스트로 고정했다. 따라서 PC마다 달라지는 COM 번호와 공식·호환 UNO의 USB 브리지 ID를 런타임 조건으로 사용하지 않는다. Web Serial API가 없는 PC·모바일 환경은 연결을 시도하지 않고 지원 브라우저 안내를 표시한다. 단위·서버·펌웨어 계약 테스트는 44/44, production build는 1,812 modules이다. 이전 실제 COM7 검증의 DHT11 유효 온습도 측정 4건과 HC-SR04 거리 측정 21건 증거는 특정 포트 요구사항이 아니라 당시 시험 장비의 V3 기록으로 유지한다. HC-SR04 V3-04 전체 기준인 실제 거리 변화·속도 계산은 남았고, LDR는 예상과 반대인 반응과 ADC 포화 때문에 사용자 결정에 따라 추후 검증한다. 현재 산출물은 `verified-build`이며 실제 각 기기의 브라우저 포트 선택과 나머지 사용자 확인을 기다린다.

## 사용자 확인이 필요한 범위

- Arduino UNO와 HC-SR04의 실제 거리 변화·속도 계산 확인
- Arduino UNO와 LDR의 상대 밝기 측정 및 기준값 계산 확인(사용자 결정으로 추후 검증)
- 학교 PC의 Chrome 보안 정책, Web Serial 허용 여부, COM 포트 점유·복구 확인
- 초보 학생이 Easy Mode를 5분 안에 완주하는지 확인
- 실제 수업 전·후 학습 효과, 오개념 감소, 만족도 확인
- 다수 학생 동시 사용, 장기 데이터 보존, 운영 비용 확인
