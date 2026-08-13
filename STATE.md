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
updated_at: 2026-08-13T12:16:39+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 39/39
evidence_e2e: browser-flow-pass+responsive-390-pass+design-qa-pass
evidence_build: 1812 modules
open_question: DHT11 V3는 PASS. HC-SR04 실제 거리·timeout 복구는 확인했지만 거리 변화·속도 계산이 남았고, LDR는 사용자 결정으로 추후 검증함
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

React/Vite 기반 학생용 Easy Mode, Web Serial 센서 통신, 실험별 계산·출처 추적, 비식별 로컬 저장 API, CSV 내보내기, Arduino UNO 통합 펌웨어의 BUILD·VERIFY·EVALUATE 자동 검증을 통과했다. 단위·서버·펌웨어 계약 테스트는 39/39, production build는 1,812 modules, 실제 브라우저 흐름과 로컬 API 스모크 검증은 통과했다. CSS 390px 브라우저 점검에서도 가로 넘침·오류 오버레이·콘솔 경고/오류가 없었고, LDR `count` 표시와 demo 저장 차단을 재확인했다. 2026-08-13 실제 UNO를 COM7에서 재식별하고 사진으로 확인한 DHT11의 잘못된 `S/+` 배선을 수정한 뒤 유효 온습도 측정 4건을 확인해 V3-03을 통과했다. 이어서 HC-SR04 사진에서 `Echo→D11`, `Trig→D10` 오배선을 확인해 각각 D10과 D9로 수정한 뒤 거리 측정 21건과 앞선 timeout 복구를 확인했다. 이는 통신·반복 거리측정 기능 증거이며, V3-04 전체 기준인 실제 거리 변화와 속도 계산은 남았다. LDR는 현재 주변광과 차광 원시값을 수집했으나 예상 방향과 반대이고 ADC 포화가 있어 사용자 결정에 따라 V3-05를 추후 검증으로 남긴다. 이 값을 상대 투과율로 해석하거나 완료 증거로 사용하지 않는다. 현재 산출물은 여전히 `verified-build`이며 HC-SR04 속도·저장/CSV·학교 PC·초보 학생 흐름의 사용자 확인을 기다린다.

## 사용자 확인이 필요한 범위

- Arduino UNO와 HC-SR04의 실제 거리 변화·속도 계산 확인
- Arduino UNO와 LDR의 상대 밝기 측정 및 기준값 계산 확인(사용자 결정으로 추후 검증)
- 학교 PC의 Chrome 보안 정책, Web Serial 허용 여부, COM 포트 점유·복구 확인
- 초보 학생이 Easy Mode를 5분 안에 완주하는지 확인
- 실제 수업 전·후 학습 효과, 오개념 감소, 만족도 확인
- 다수 학생 동시 사용, 장기 데이터 보존, 운영 비용 확인
