---
document: STATE
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
graph: default
revision: 6
active_node: USER CHECK
status: ESCALATE
retry_count: 0
repair_target: none
fallback_target: none
terminal_node: COMPLETE
terminal_reached: false
updated_at: 2026-08-13T17:57:10+09:00
evidence_level: V2
evidence_committed: true
evidence_unit: 79/79
evidence_e2e: local-production-browser-1280+390-pass+timing-boundary-regression-pass+uno-compile-pass
evidence_build: 1816 modules
open_question: Vercel 배포 환경에서 DHT11 5/10초 및 다른 센서 간격, 예약 종료·CSV 시각 경계를 장시간 검증할 것
stop_reason: none
fallback_reason: none
---

# STATE

## 현재 판정 요약

revision 6에서 학생이 웹앱의 `측정 설정`에서 센서 측정 간격과 총 측정시간을 선택하도록 BUILD REPAIR했다. DHT11은 2/5/10초, HC-SR04와 LDR은 0.5/1/2/5/10초를 지원하며, 무기한 또는 30초/1/3/5/10분 예약 측정을 제공한다. 웹앱은 정확한 `ACK:INTERVAL:<sensor>:<ms>` 뒤에만 MODE와 새 run을 시작하고, 펌웨어는 센서별 안전 하한과 10초 상한을 검사한다.

예약 종료는 절대 wall-clock 경계 이후 프레임을 화면·그래프·CSV에 넣지 않고 기존 STOP ACK 흐름을 한 번만 실행한다. CSV는 요청 간격·요청 시간·duration mode·시작/실제 종료시각·종료 사유와 각 행의 device timestamp/receivedAt을 분리해 보존한다. HC-SR04 속도는 설정 간격이 아니라 실제 device timestamp 차로 계속 계산한다. 유효 측정 0행은 성공 완료로 표시하지 않는다.

자동 테스트 79/79, package selftest 42/42, package gate blocker 0/warn 0, UNO 대상 펌웨어 compile 8,340 bytes/814 bytes, TypeScript/Vite production build 1,816 modules를 통과했다. 최신 production preview에서 1280px와 390×844 모두 가로 overflow 0, 측정 패널 내부 overflow 0, 모바일 select와 주요 버튼 44px를 확인했다. 2026-08-13 실제 COM7 UNO에 revision 6 펌웨어를 업로드하고 DHT11 2초 간격의 exact INTERVAL ACK, 유효 측정 6건, 평균 device timestamp 간격 2000.2 ms, STOP ACK 이후 5.5초간 측정 0건을 확인했다. 다만 Vercel 웹 흐름·다른 간격·예약 종료·CSV와 장시간 안정성은 미확인이라 전체 판정은 `verified-build`/`USER CHECK`이며 COMPLETE가 아니다.

## 사용자 확인이 필요한 범위

- DHT11 5/10초 및 HC-SR04 0.5/1/2/5/10초에서 device timestamp 간격 확인(DHT11 2초는 실제 UNO V3 PASS)
- Vercel 배포 URL에서 30초·1분 예약 측정이 STOP ACK 뒤 정확히 한 번 종료되고 CSV에 종료시각 이후 프레임이 없는지 확인
- 탭 숨김·복귀, 수동 STOP과 예약 마감 경합, USB 분리에서 `stopReason`과 보존 CSV가 실제 사건과 일치하는지 확인
- 실제 390px Android Chrome+USB OTG와 데스크톱 Chrome/Edge의 Web Serial 사용성 확인
- LDR V3 완료, 초보 학생 Easy Mode 완주와 실제 수업 효과 확인
