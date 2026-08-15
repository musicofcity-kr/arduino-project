---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 10
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-15T15:37:00+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 91/91
evidence_e2e: local-production-edge-1280+390-demo-clear-confirm-no-overflow
evidence_build: 1816 modules
open_question: revision 10 배포 후 실제 Vercel Web Serial에서 측정 중 비우기·새 run·CSV 분리와 중지 후 비우기를 확인하고, LDR 정상 반응 및 남은 센서·학교·모바일 V3를 이어서 검증할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 10은 USER CHECK에서 요청된 현재 라이브 그래프·CSV 비우기와 안전 재측정 기능을 BUILD에서 수리한 결과다. 중지된 측정은 사용자 확인 후 현재 브라우저의 live run만 비우며 연결·센서·간격·측정시간 설정을 유지한다. 측정 중에는 exact `ACK:STOP`과 새 `SET_INTERVAL`·`MODE` ACK가 모두 성공한 뒤에만 이전 run을 새 run으로 교체한다. 실패하면 기존 그래프와 CSV를 유지한다.

삭제 대상은 현재 그래프와 다운로드 전 이번 측정 CSV다. 비식별 서버 저장 기록, 저장 기록 CSV 사용 상태와 이미 내려받은 파일은 보존한다. 순수 데모는 `데모 데이터 비우기`로 구분하며, 실측 CSV가 남은 상태에서 데모 그래프를 띄운 경우에는 실측 CSV까지 포함한 삭제 범위를 표시한다.

자동 검증은 91/91, production build는 1,816 modules, package gate는 blocker 0/warn 0, package selftest는 42/42를 통과했다. local production Edge에서 1280×800과 390×844 데모 삭제 흐름을 확인했고, 390px 비우기 버튼은 44px이며 root·측정 panel의 가로 overflow는 0이었다. 이는 UI V2 증거이며 실제 Web Serial 삭제·재측정 V3는 아니다.

2026-08-13 실제 COM7 UNO에서 확인한 revision 6 DHT11 2초 interval/STOP 부분 V3 증거와 2026-08-15 사용자의 Vercel DHT11 계측 부분 V3 관찰은 그대로 유효하다. HC-SR04 실제 CSV가 제공됐지만 이번 revision은 수명주기 UI 수리이며 센서 정확도·교정이나 전체 센서 V3를 완료로 확대하지 않는다.

현재 상태는 `USER CHECK / ESCALATE`이며 COMPLETE가 아니다.

## 사용자 확인이 필요한 범위

- revision 10 Vercel에서 실제 센서 측정 중 `비우고 새 측정 시작` 후 새 그래프·CSV에 이전 행이 없는지 확인
- 측정 중지 후 `이번 측정 데이터 비우기`가 그래프·live CSV만 지우고 저장 기록은 유지하는지 확인
- LDR 권장 분압 회로에서 주변광→차광→복광 반응과 포화 해소 확인
- HC-SR04 거리 변화·속도, 실제 390px Android Chrome+USB OTG, 학교 PC 및 초보 학생 사용 V3 확인
