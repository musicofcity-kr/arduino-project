---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 1
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-11T11:48:36+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 39/39
evidence_e2e: browser-flow-pass
evidence_build: 28 modules
open_question: 실제 UNO와 DHT11/HC-SR04/LDR, 학교 PC Chrome, 초보 학생 Easy Mode 완주 V3 확인이 필요함
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

React/Vite 기반 학생용 Easy Mode, Web Serial 센서 통신, 실험별 계산·출처 추적, 비식별 로컬 저장 API, CSV 내보내기, Arduino UNO 통합 펌웨어의 BUILD·VERIFY·EVALUATE 자동 검증을 통과했다. 단위·서버·펌웨어 계약 테스트는 39/39, production build는 28 modules, 실제 브라우저 흐름과 로컬 API 스모크 검증은 통과했다. 현재 산출물은 `verified-build`이며 실제 수업 환경의 사용자 확인을 기다린다.

## 사용자 확인이 필요한 범위

- Arduino UNO에 Universal Firmware를 컴파일·업로드하고 DHT11 실측 확인
- Arduino UNO와 HC-SR04의 실제 배선·거리 측정·오류 복구 확인
- Arduino UNO와 LDR의 상대 밝기 측정 및 기준값 계산 확인
- 학교 PC의 Chrome 보안 정책, Web Serial 허용 여부, COM 포트 점유·복구 확인
- 초보 학생이 Easy Mode를 5분 안에 완주하는지 확인
- 실제 수업 전·후 학습 효과, 오개념 감소, 만족도 확인
- 다수 학생 동시 사용, 장기 데이터 보존, 운영 비용 확인
