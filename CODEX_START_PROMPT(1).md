# Codex Start Prompt — Science Modular Workbench

아래 내용을 **새 Codex 프로젝트 세션의 첫 프롬프트로 그대로 사용**한다.

```text
프로젝트명: 웹앱 기반 통합 모듈형 과학탐구 워크벤치

이 프로젝트는 Arduino UNO를 첫 번째 Hardware Adapter로 사용하고,
교체 가능한 Sensor Pack, 교육과정 기반 Experiment Pack, 실시간 데이터 측정,
시뮬레이션/디지털트윈, 분석·저장을 하나의 웹앱으로 연결하는 고등학교 과학교육 플랫폼이다.

가장 중요한 성공기준은 기술적 화려함이 아니라 실제 교육 품질이다.
우선순위는 다음과 같다.
1. 학생이 처음 사용해도 이해하기 쉬운 UI/UX
2. 과학적 정확성과 오개념 방지
3. 실제 수업 흐름 적합성
4. 실측값·이론값·시뮬레이션값의 명확한 구분
5. 실제 Arduino UNO + 센서에서의 신뢰성
6. 사전-사후 학습 성장 측정 가능성

먼저 AGENTS.md를 읽고, 이어서 PROJECT_SPEC.md, core/CONSTITUTION.md,
core/GRAPH_CONTRACT.md, STATE.md를 읽어라.
PROJECT_SPEC.md의 profile 값에 해당하는 profiles/PROFILE_science_education.md도 읽어라.
필요한 경우에만 docs/를 읽어라.

작업 전에 반드시:
1. `python tools/check_package.py` 실행
2. 판정이 PASS 또는 PASS_WITH_WARN인지 확인
3. FAIL이면 구현하지 말고 실패 항목과 원인을 먼저 보고
4. PASS_WITH_WARN이면 WARN을 요약하고 진행 가능 여부를 판단

구현 전에 별도 장문의 기획 문서를 만들지 말고 다음 6가지만 간결하게 보고하라.
1. Mission
2. P0
3. Freedom Zone
4. 성공 기준
5. 주요 위험
6. 최소 구현 경로

[이번 첫 BUILD의 범위]
MVP는 아래만 구현한다. 임의로 범위를 늘리지 마라.

Hardware Adapter
- Arduino UNO R3 / 호환 UNO
- USB Serial / Web Serial
- Universal Firmware protocol: PING, heartbeat, MODE, ACK, error, measurement JSON

Sensor Pack 3개
- DHT11: temperature, humidity
- HC-SR04: distance, 파생 velocity
- LDR: raw relative light, 기준값 기반 relative transmittance

Experiment Pack 3개
- 온습도·기상 탐구
- 거리·운동 탐구
- 상대광도·투과 탐구

Frontend
- Student Easy Mode 우선
- 기본 사용자 흐름은 `무엇을 탐구할까요? → 센서 연결 → 바로 측정`
- COM, JSON, baud, ADC, raw protocol은 기본 화면에 노출하지 않는다.
- 기술정보는 Advanced/진단 영역에서만 노출한다.

Backend
- 실제 USB 센서를 직접 읽지 않는다.
- 비식별 실험 세션과 Experiment Pack 메타데이터, 측정데이터 저장/조회만 최소 구현한다.
- 로그인/학생 개인정보/자동채점/AI 분석은 이번 MVP에 넣지 않는다.

[중요 P0 구현 규칙]
- 실측값, 계산값, 시뮬레이션값, demo/mock 값을 반드시 구분한다.
- UNO ACK 없이 기능팩 활성화 성공을 표시하지 않는다.
- 센서 timeout/분리/잘못된 배선 시 stale 값을 현재값처럼 유지하지 않는다.
- 센서 특성상 상대값인 LDR 등은 교정 없이 절대 단위로 위장하지 않는다.
- 수업카드는 공식 2022 개정 교육과정 원문으로 성취기준 코드를 검증하기 전까지 draft로 둔다.
- 학생 개인정보는 수집하지 않는다.
- 실험 안전 유의사항을 누락하지 않는다.
- fixture/mock 통과를 실제 하드웨어 검증으로 주장하지 않는다.

[Freedom Zone]
PROJECT_SPEC.md에 적힌 Freedom Zone은 허가다.
그 범위에서는 더 좋은 UI/UX, 컴포넌트 구조, 시각화, 상태관리 방식을 스스로 제안하고 구현해도 된다.
다만 Freedom Zone 밖의 P0, 데이터 의미, 교육과정 의미를 임의 변경하지 마라.

[Anti-overengineering]
- 처음부터 멀티에이전트, 복잡한 DAG, 과도한 추상화, 플러그인 시스템을 만들지 마라.
- Sensor Pack 3개에서 실제 중복/결함이 확인된 후에만 추상화를 추가한다.
- 새 계층을 추가할 때마다 그것이 해결하는 구체적 사용자 문제를 한 문장으로 설명할 수 있어야 한다.

[검증 전략]
VERIFY에서는 최소 다음을 확인한다.
- protocol parser unit test
- ACK/timeout/error state test
- derived calculation test: velocity/transmittance
- demo/mock가 real로 오인되지 않는 UI test
- build 성공
- 핵심 사용자 흐름 e2e 또는 브라우저 수준 테스트

USER CHECK에서는 자동 테스트로 대체하지 말고 다음 V3 항목을 사람에게 요청한다.
- 실제 UNO + DHT11
- 실제 UNO + HC-SR04
- 실제 UNO + LDR
- 실제 Chrome/학교 PC 환경
- 초보 사용자가 Easy Mode 완주

STATE.md의 active_node만 작업하라.
노드 판정은 PASS RETRY REPAIR FALLBACK ESCALATE STOP만 사용한다.
노드 판정이 확정되거나 테스트가 재실행되면 STATE.md를 즉시 갱신한다.
상류 노드로 REPAIR하면 revision을 +1하고 하류 결과를 전부 재검증하거나 superseded 처리한다.
판단할 수 없거나 스코프 변경이 필요하면 ESCALATE하고 나에게 물어라.

완료 선언 전에 반드시:
1. `python tools/check_package.py` PASS 또는 PASS_WITH_WARN
2. build/test/e2e 증거
3. 각 증거의 V0~V3 등급
4. 실제 실행 화면·사용자 흐름 확인
5. 미검증 범위를 릴리스 주장과 분리

컴파일 성공이나 정적 검토만으로 COMPLETE를 선언하지 마라.
첫 목표는 '많이 만드는 것'이 아니라 3개 Sensor Pack이 실제 수업 수준으로 안정적으로 완주되는 것이다.
```

## 첫 세션에서 Codex가 보여줘야 할 답변 형태

```markdown
## Mission

## P0

## Freedom Zone

## Success Criteria

## Main Risks

## Minimal Build Path

## Package Check
- command:
- result:
- warnings:

## Proposed First Action
```
