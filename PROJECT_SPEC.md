---
document: PROJECT_SPEC
package_version: 5.0.0
project: Web App-based Integrated Modular Science Inquiry Workbench
profile: science-education
control_ratio_cap: 0.70
freedom_floor: 3
freedom_floor_justification: none
personal_data: none
auto_grading: none
---

# PROJECT SPEC

## 1. Domain Goal

Arduino UNO를 첫 번째 Hardware Adapter로 사용하여 교체 가능한 Sensor Pack, 교육과정 기반 Experiment Pack, 실시간 데이터 시각화와 시뮬레이션을 하나의 웹앱으로 연결하고, 고등학생이 코딩 지식 없이도 실제 과학현상을 측정·분석·설명할 수 있는 통합 모듈형 과학탐구 워크벤치를 구축한다.

## 2. Primary User

- 1차 사용자: 고등학생 — Easy Mode에서 실험 선택, 배선 확인, 센서 연결, 측정, 분석, 결과 저장을 수행한다.
- 2차 사용자: 과학교사 — 수업카드 선택, 실험 흐름 구성, 안전·오개념 점검, 학생 결과 확인을 수행한다.
- 3차 사용자: 제작자/교사 — Sensor Pack과 Experiment Pack을 추가하되 기존 공통 흐름을 깨지 않는다.

## 3. Primary Tasks

- 학생이 수업카드를 선택하고 필요한 센서 배선을 확인한 뒤 Arduino UNO를 연결하여 실제 측정값을 얻는다.
- 웹앱이 UNO 통합 펌웨어를 확인하고 기능팩 명령을 전송한 뒤 ACK를 수신한 경우에만 해당 Sensor Pack을 활성화한다.
- 실측값, 계산값, 시뮬레이션값을 구분하여 실시간 수치·그래프·모델로 제시한다.
- 학생이 이론 예측과 실제 측정 결과를 비교하고 오차 원인을 기록할 수 있게 한다.
- 교사가 2022 개정 교육과정에 맞는 Experiment Pack/Lesson Card를 선택하여 실제 수업 흐름으로 사용할 수 있게 한다.
- MVP에서는 DHT11, HC-SR04, LDR 3개 Sensor Pack과 이에 대응하는 3개 Experiment Pack을 실제 기기에서 끝까지 완주한다.

## 4. Success Evidence

- 처음 사용하는 학생이 교사의 짧은 안내 후 5분 이내에 `수업카드 선택 → 배선 확인 → UNO 연결 → 펌웨어 확인 → 기능팩 적용 → 첫 실측값 확인` 흐름을 완주한다.
- UNO의 ACK가 없거나 센서 읽기가 실패하면 성공 상태를 표시하지 않고 오류 원인과 다음 행동을 보여준다.
- 데모·시뮬레이션 값은 실제 센서값으로 표시되지 않으며, UI와 저장 데이터에서 출처가 구분된다.
- DHT11 온습도, HC-SR04 거리, LDR 상대광도에 대해 실제 UNO에서 연속 측정값이 그래프와 CSV에 동일하게 기록된다.
- 계산형 파생값은 단위 테스트로 검증되며 입력 단위와 출력 단위가 UI에 명시된다.
- 학생 Easy Mode에서 COM, JSON, ADC, baud 같은 기술용어는 기본 화면에 노출하지 않고 필요할 때만 고급정보에서 확인한다.
- 최소 Chrome 계열 데스크톱 환경에서 실제 UNO 1대와 각 MVP 센서를 이용한 V3 사용자 흐름 증거를 확보하기 전에는 `classroom-tested`를 주장하지 않는다.

## 5. P0 — Non-Negotiables

- 과학적 사실, 단위, 계산식에 오류를 허용하지 않으며 실측값·계산값·시뮬레이션값·AI 추정값의 출처를 UI와 데이터에서 명확히 구분한다.
- UNO 펌웨어 ACK 또는 실제 센서 유효 응답이 없으면 연결·활성화·측정을 성공으로 표시하지 않으며 stale/fake/demo 데이터를 현재 실측값처럼 재사용하지 않는다.
- 2022 개정 교육과정 수업카드는 공식 교육과정 원문으로 대상 과목·성취기준 코드를 확인한 뒤 배포하며, 미확정 코드는 임의 생성하지 않는다. 실험 절차에는 필수 안전 유의사항을 포함한다.
- 학생 개인정보는 기본적으로 수집·저장·외부 전송하지 않는다. MVP의 실험 세션은 비식별 로컬/임시 식별자로 처리한다.
- LLM·이미지 인식·자동분석 결과를 근거 없이 정답이나 사실로 확정하지 않고, 탐구 서술 활동을 자동 총괄평가하지 않는다.
- 원시 센서 데이터에는 timestamp와 source를 유지하고, 계산·보정 데이터가 원시값을 덮어쓰지 않으며 내보낸 CSV와 화면 데이터가 추적 가능해야 한다.
- 컴파일·mock·fixture 통과만으로 완료를 선언하지 않는다. 실제 UNO·센서·브라우저 사용자 흐름 검증 전에는 실환경 완료 주장을 금지한다.

## 6. P1 — Important Quality

- 학생용 기본 UX는 `무엇을 탐구할까요? → 센서 연결 → 바로 측정`의 3단계 흐름을 유지하고 고급 설정은 숨긴다.
- 데스크톱 1280px 및 모바일 390px에서 핵심 흐름에 가로 스크롤이 없고 주요 버튼·수치·오류 안내가 명확해야 한다.
- Sensor Pack, Experiment Pack, Lesson Card를 분리하여 동일 센서가 여러 수업카드에서 재사용되고 공통 연결/그래프 코드를 중복 구현하지 않는다.
- 연결 실패, COM 점유, 펌웨어 미확인, 센서 timeout, 잘못된 배선 상황에 대해 초보자가 수행할 수 있는 복구 안내를 제공한다.

## 7. Freedom Zone

- 학생 Easy Mode의 세부 레이아웃, 카드 배치, 시각 계층과 디자인 시스템.
- 실시간 그래프, 디지털트윈, 애니메이션의 구체적인 시각 표현 방식.
- React 컴포넌트 분할, 상태관리, 내부 훅/유틸 구조 등 프론트엔드 내부 구현 방식.
- 백엔드 저장소의 세부 테이블/인덱스 구성과 API 내부 구현 방식. 단 P0 데이터 원칙은 유지한다.
- 오류 안내 문구, 빈 상태, 로딩·전환 인터랙션의 세부 UX. 단 오류를 성공으로 오인시키면 안 된다.

## 8. Main Risks

- Web Serial의 브라우저·보안 컨텍스트·학교 PC 정책 제약과 COM 포트 독점으로 인한 연결 실패.
- Arduino UNO 리셋/부트로더 시점과 브라우저 handshake 타이밍 차이로 인한 펌웨어 미확인.
- 저가 센서의 정확도·반응시간·노이즈·보정 한계를 절대 물리량으로 과대해석할 위험.
- 모든 교과·센서·백엔드·AI를 한 번에 넣으려다 학생 UX와 실제 수업 완성도가 떨어지는 스코프 팽창.
- 교육과정 성취기준을 비공식 2차 자료나 기억으로 매핑해 잘못된 수업카드를 만드는 위험.
- 센서값 수집과 시뮬레이션이 화려하지만 학생의 예측·관찰·개념 연결·오개념 수정으로 이어지지 않는 위험.

## 9. Graph

```text
default
```

| Node | INPUT | TASK | OUTPUT | PASS 조건 | FAIL ROUTE |
|---|---|---|---|---|---|

## 10. Commands

```bash
# package gate
python tools/check_package.py

# install (BUILD에서 프론트엔드/백엔드 scaffold 후 package.json 기준 확정)
npm install

# run
npm run dev

# test
npm test

# build
npm run build
```

## 11. MVP Scope

### 11.1 Hardware Adapter

- Arduino UNO R3 / 호환 UNO 1차 지원.
- USB Serial 기반 연결.
- Universal Firmware가 `PING`, `MODE:*`, `ACK`, measurement JSON을 처리한다.
- UNO는 실시간 센싱/기초 제어를 담당하고 무거운 계산·시각화·저장은 웹앱이 담당한다.

### 11.2 Sensor Packs — Phase 1

1. `DHT11 Pack` — 온도·상대습도.
2. `HC-SR04 Pack` — 거리, 거리 변화 기반 속도 추정.
3. `LDR Pack` — 상대광신호, 기준값 기반 상대 투과율.

### 11.3 Experiment Packs — Phase 1

1. 온습도·기상 탐구 — DHT11.
2. 거리·운동 탐구 — HC-SR04.
3. 상대광도·투과 탐구 — LDR.

### 11.4 Curriculum Alignment

- 적용 교육과정: 2022 개정 고등학교 과학과.
- MVP 우선 과목: 과학탐구실험2, 통합과학1·2.
- 확장 우선순위: 물리학, 화학, 기후변화와 환경생태, 융합과학 탐구, 역학과 에너지, 물질과 에너지, 화학 반응의 세계.
- 성취기준 코드는 공식 교육부 고시 원문을 근거로 `curriculum/2022_science_curriculum_map.md`에 별도 확정한다.
- 성취기준 코드가 공식 원문으로 검증되지 않은 Lesson Card는 `draft` 상태를 유지하고 수업 배포를 금지한다.

### 11.5 User Modes

- Student Easy Mode: 실험 선택, 배선 안내, 연결, 측정, 그래프, 이론 비교, 결과 저장.
- Teacher Mode: 수업카드 선택, 단계 ON/OFF, 수업 세션 관리, 학생 결과 확인.
- Creator Mode: Sensor Pack/Experiment Pack 제작 및 검증. MVP 이후 단계적으로 개방한다.

### 11.6 Frontend / Backend Responsibility

- Frontend: Web Serial 연결, 하드웨어 상태, 센서 데이터 수신, 실시간 그래프, 시뮬레이션, Easy Mode UX.
- Backend: Experiment Pack 메타데이터, 비식별 실험 세션, 데이터 저장/조회, 수업카드 관리. 실제 USB 센서를 직접 읽지 않는다.
- Hardware/Edge: 센서 읽기, 간단한 필터링, actuator 제어, heartbeat/ACK/error 응답.

## 12. Data Handling

MVP는 `personal_data: none`, `auto_grading: none`을 유지한다.

- 학생 이름·학번·이메일 등 직접 식별정보는 MVP에서 수집하지 않는다.
- 실험 데이터에는 sensor source, raw value, unit, timestamp, session-local id를 기록할 수 있다.
- AI 분석 또는 자동평가가 추가될 경우 본 PROJECT_SPEC의 front matter와 Data Handling을 먼저 변경하고 `check_package.py`를 다시 통과시킨다.

## 13. Release / Evidence Rules

- `prototype`: 로컬 UI와 mock 데이터 확인만 가능.
- `verified-build`: 자동 테스트와 build 통과. 실제 하드웨어 수업 완료를 의미하지 않는다.
- `controlled-pilot`: 교사 1인이 실제 UNO+센서로 전체 흐름을 완주하고 V3 증거 일부 확보.
- `classroom-tested`: 실제 학생 사용 관찰과 수업 전후 기록 확보 후에만 사용.
- 실제 학교망·브라우저 정책·다수 동시사용·학습효과는 각각 검증 전까지 미검증으로 명시한다.

## 14. Control Budget Log

| 일자 | 규칙 | 유형 | 근거 | 판정 방법 |
|---|---|---|---|---|
| 2026-08-11 | 실측/계산/시뮬레이션 출처 분리 | a priori | 과학적 오개념 및 데이터 왜곡 방지 | machine + human |
| 2026-08-11 | ACK 없이 기능팩 성공 표시 금지 | a posteriori | 실제 UNO 연결에서 handshake 실패 관찰 | machine + V3 human |
| 2026-08-11 | 공식 성취기준 코드 미검증 카드 배포 금지 | a priori | 교육과정 정합성 | human + source check |
| 2026-08-11 | Easy Mode 3단계 기본 흐름 | a posteriori | 복잡한 인터페이스가 초보 사용성을 저해함 | V3 human |
