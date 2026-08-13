---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 2
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-13T12:57:15+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 42/42
evidence_e2e: browser-flow-pass+webserial-reset-regression-pass+responsive-390-pass+design-qa-pass
evidence_build: 1812 modules
open_question: Web Serial 자동 리셋 복구는 V2 PASS. 배포 후 실제 UNO·DHT11 연결 재확인과 기존 HC-SR04 속도·LDR·저장/CSV·학교 PC·학생 흐름 검증이 남음
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

React/Vite 기반 학생용 Easy Mode, Web Serial 센서 통신, 실험별 계산·출처 추적, 비식별 로컬 저장 API, CSV 내보내기, Arduino UNO 통합 펌웨어의 BUILD·VERIFY·EVALUATE 자동 검증을 통과했다. 2026-08-13 Vercel 배포 화면에서 실제 UNO 포트는 열렸지만 자동 리셋 직후 보낸 최초 PING이 유실되어 `ACK_TIMEOUT`이 발생하는 결함을 확인했다. revision 2에서 포트 개방 뒤 유효 heartbeat 대기, 같은 포트의 PING 1회 제한 재시도, DHT11 초기화를 고려한 MODE ACK 5초 제한, pending read 단일화를 구현했다. 단위·서버·펌웨어 계약 테스트는 41/41, production build는 1,812 modules이며 로컬 production 화면에서 핵심 UI, 오류 오버레이 없음, 콘솔 warning/error 0건을 확인했다. 이전 실제 COM7 검증의 DHT11 유효 온습도 측정 4건과 HC-SR04 거리 측정 21건 증거는 유지한다. HC-SR04 V3-04 전체 기준인 실제 거리 변화·속도 계산은 남았고, LDR는 예상과 반대인 반응과 ADC 포화 때문에 사용자 결정에 따라 추후 검증한다. 현재 산출물은 여전히 `verified-build`이며 배포 후 실제 Web Serial 재연결과 나머지 사용자 확인을 기다린다.

## 사용자 확인이 필요한 범위

- Arduino UNO와 HC-SR04의 실제 거리 변화·속도 계산 확인
- Arduino UNO와 LDR의 상대 밝기 측정 및 기준값 계산 확인(사용자 결정으로 추후 검증)
- 학교 PC의 Chrome 보안 정책, Web Serial 허용 여부, COM 포트 점유·복구 확인
- 초보 학생이 Easy Mode를 5분 안에 완주하는지 확인
- 실제 수업 전·후 학습 효과, 오개념 감소, 만족도 확인
- 다수 학생 동시 사용, 장기 데이터 보존, 운영 비용 확인
