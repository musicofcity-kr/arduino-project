---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 8
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-15T13:53:30+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 84/84
evidence_e2e: local-production-browser-desktop+390-three-sensor-selection-no-overflow
evidence_build: 1816 modules
open_question: 수정된 센서 선택 UI를 Vercel에 배포한 뒤 HC-SR04와 LDR의 실제 Web Serial 연결·측정·CSV 흐름을 반복 확인할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 8은 Vercel 화면의 센서 표시가 클릭 가능한 선택 버튼이 아니어서 HC-SR04와 LDR 작업을 시작할 수 없던 USER CHECK 결함을 BUILD에서 수리한 결과다. 상단 센서 행을 세 개의 실제 버튼으로 바꾸고 선택 상태를 `aria-pressed`와 텍스트로 표시했다. 센서를 선택하면 탐구팩, 센서명, 연결 버튼, 기본 측정 간격이 함께 바뀐다.

연결 요청·연결 확인·측정 중에는 상단 센서 버튼과 하단 실험 카드가 모두 잠긴다. 연결 준비 상태에서 센서를 바꾸면 기존 포트가 닫힌 뒤 새 선택을 적용하므로 진행 중 명령과 새 센서 화면이 섞이지 않는다. 센서 측정 프로토콜, raw timestamp/source/unit, 그래프·CSV 데이터 계약과 펌웨어는 변경하지 않았다.

자동 검증은 84/84, production build는 1,816 modules를 통과했다. local production browser에서 DHT11·HC-SR04·LDR 버튼을 각각 선택해 센서명·연결 CTA·기본 간격 변경을 확인했다. 390px viewport에서는 세 버튼이 각각 44px 높이를 유지했고 문서 가로 overflow와 콘솔 오류는 0이었다.

2026-08-13 실제 COM7 UNO에서 확인한 revision 6 DHT11 2초 interval/STOP 부분 V3 증거는 그대로 유효하다. 2026-08-15 사용자가 Vercel 배포 URL의 DHT11 5분 계측에서 그래프 무잘림, 관찰 구간 연결 유지, 예약 자동 종료 1회, 다운로드 CSV와 화면 값 일치를 보고했다. 이는 해당 세션의 부분 V3 사용자 관찰이며 모든 센서·환경의 V3나 측정 정확도·교정을 입증하지 않는다.

현재 상태는 `USER CHECK / ESCALATE`이며 COMPLETE가 아니다. 이번 센서 선택 수리는 로컬 production browser V2까지 확인됐고, Vercel 배포본에서 HC-SR04와 LDR의 실제 Web Serial 계측은 아직 확인해야 한다.

## 사용자 확인이 필요한 범위

- 수정본 배포 후 Vercel 상단에서 HC-SR04와 LDR을 선택하고 실제 연결·측정·STOP·CSV 흐름을 확인
- 실제 390px Android Chrome+USB OTG에서 센서 선택·그래프·측정 설정·CSV 사용성 확인
- DHT11 5초·10초 간격, HC-SR04 거리 변화·속도, LDR 정상 분압 반응, 학교 PC 및 초보 학생 사용 V3 확인
