---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 9
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-15T14:10:28+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
open_question: revision 9 배포 후 Vercel 체크와 실제 HC-SR04·LDR Web Serial 연결·측정·CSV 흐름을 확인할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 9는 revision 8 센서 선택 수리의 Vercel 빌드에서 발견된 TypeScript 오류를 BUILD에서 수리한 결과다. ready 상태 센서 전환 순서를 검증하는 deferred `port.close` mock이 `Promise<void>`를 반환해 mock 계약의 `Promise<undefined>`와 맞지 않았다. 반환 타입만 정확히 맞췄으며 런타임 센서 선택, Web Serial, 측정값, 그래프, CSV와 펌웨어 코드는 변경하지 않았다.

자동 검증은 84/84, production build는 1,816 modules, package gate는 blocker 0/warn 0, package selftest는 42/42를 통과했다. local production browser에서 DHT11 초기 선택과 HC-SR04·LDR 버튼 선택 후 센서명·연결 CTA·기본 측정 간격 전환을 다시 확인했다. 데스크톱과 390px 설정에서 문서 가로 overflow는 0이었고 세 센서 버튼은 좁은 화면에서 각각 44px 높이를 유지했다. Vite 오류 overlay는 없었다.

revision 8에서 상단 센서 행은 세 개의 실제 버튼으로 바뀌었고 선택 상태를 `aria-pressed`와 텍스트로 표시한다. 연결 요청·연결 확인·측정 중에는 상단 센서 버튼과 하단 실험 카드가 모두 잠기며, ready 상태에서 센서를 바꾸면 기존 포트를 닫은 뒤 새 선택을 적용한다.

2026-08-13 실제 COM7 UNO에서 확인한 revision 6 DHT11 2초 interval/STOP 부분 V3 증거는 그대로 유효하다. 2026-08-15 사용자가 Vercel 배포 URL의 DHT11 5분 계측에서 그래프 무잘림, 관찰 구간 연결 유지, 예약 자동 종료 1회, 다운로드 CSV와 화면 값 일치를 보고했다. 이는 해당 세션의 부분 V3 사용자 관찰이며 모든 센서·환경의 V3나 측정 정확도·교정을 입증하지 않는다.

현재 상태는 `USER CHECK / ESCALATE`이며 COMPLETE가 아니다. revision 9 빌드는 로컬 V2까지 확인됐고, 게시 후 Vercel 체크와 HC-SR04·LDR의 실제 Web Serial 계측을 확인해야 한다.

## 사용자 확인이 필요한 범위

- revision 9 배포 후 Vercel 상단에서 HC-SR04와 LDR을 선택하고 실제 연결·측정·STOP·CSV 흐름 확인
- 실제 390px Android Chrome+USB OTG에서 센서 선택·그래프·측정 설정·CSV 사용성 확인
- DHT11 5초·10초 간격, HC-SR04 거리 변화·속도, LDR 정상 분압 반응, 학교 PC 및 초보 학생 사용 V3 확인
