# 웹앱 기반 통합 모듈형 과학탐구 워크벤치

Arduino UNO와 DHT11, HC-SR04, LDR를 연결해 고등학생이 `탐구 선택 → 센서 연결 → 바로 측정` 순서로 사용하는 로컬 MVP다. 기본 화면은 기술 용어를 숨기고, 실측·계산·데모 데이터의 출처를 분리해서 보여준다.

## 빠른 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5173`을 연다. Web Serial은 지원 브라우저의 보안 컨텍스트에서 사용해야 하며 포트 선택은 학생이 연결 버튼을 눌렀을 때만 요청한다. 앱은 COM 번호나 USB 제조사 ID를 고정하지 않으므로 브라우저가 표시하는 직렬 장치 중 Arduino UNO를 선택하면 된다. 검증 문서의 `COM7`은 당시 시험 PC의 기록일 뿐 실행 조건이 아니다. Android는 Web Serial을 지원하는 최신 Chrome과 USB OTG가 필요하며, API를 제공하지 않는 모바일 브라우저에서는 직접 USB 측정을 시작할 수 없다. 로컬 비식별 저장 API는 `http://127.0.0.1:8787`에서 함께 실행된다.

- 프런트엔드: `src/`
- 로컬 저장 API: `server/README.md`
- UNO 통합 펌웨어와 배선: `firmware/README.md`
- 테스트: `npm test`
- production build: `npm run build`

> 자동 테스트와 브라우저 검증은 실제 UNO·센서·학교 PC 검증을 대신하지 않는다. 실제 DHT11, HC-SR04, LDR를 연결한 수업 흐름은 V3 사용자 확인 전까지 미검증이다.

---

# AI Control Package v5.0.0

AI 코딩 에이전트를 많이 묶기 위한 하네스가 아니라, **실패 비용이 비가역인 영역만 정확히 통제하고 나머지에는 탐색 자유도를 예약하는** 경량 개발 제어 패키지.

> 과잉 하네스가 평균 이하 결과를 낳는 기전: 구현 세부까지 사전 지정하면 AI의 작업이 탐색에서 **전사(transcription)** 로 바뀌고, 산출물의 상한이 모델 성능이 아니라 **스펙 작성자의 상상력**으로 고정된다.

v5는 v4 독립 감사에서 **실행으로 재현된 3건**을 수리했다. 자유도 무력화 가능, 게이트 시각 우회, 상류 수리 후 하류 미폐기. 대응표는 `VERSION.md` 참조.

## 구성

```text
AI_Control_Package_v5/
├─ VERSION.md                  버전·개정 절차·변경 이력
├─ README.md
├─ AGENTS.md                   AI가 항상 읽는 라우터
├─ START_PROMPT.md             새 세션 시작 프롬프트
├─ core/
│  ├─ CONSTITUTION.md          핵심 원칙 (도메인 중립)
│  └─ GRAPH_CONTRACT.md        전이표·revision·상태 소유권
├─ profiles/
│  ├─ PROFILE_science_education.md
│  └─ PROFILE_generic_software.md
├─ templates/
│  ├─ PROJECT_SPEC_TEMPLATE.md
│  ├─ STATE_TEMPLATE.md
│  └─ NODE_RESULT_TEMPLATE.md
├─ tools/
│  ├─ check_package.py         검증 게이트 (표준 라이브러리만, C01~C26)
│  └─ selftest.py              검증기 자체 테스트
└─ docs/
   ├─ MIGRATION.md             v1·v3·v4 → v5 이관 (단일 문서)
   ├─ VALIDATION_REPORT.md     실행 검증 기록
   └─ AB_EXPERIMENT_PROTOCOL.md  대조 실험 설계
```

## 설치 (5분)

```powershell
copy templates\PROJECT_SPEC_TEMPLATE.md PROJECT_SPEC.md
copy templates\STATE_TEMPLATE.md STATE.md
# PROJECT_SPEC.md의 <...> 를 전부 채운다
python tools\check_package.py
```

`판정: PASS` 또는 `PASS_WITH_WARN`(경고 검토 완료)이 나올 때까지 작업을 시작하지 않는다.
macOS / Linux는 `copy`를 `cp`로 바꾼다.

## 핵심 설계 4가지

### 1. Freedom Floor — 자유도의 하한, 그리고 하드 하한

Freedom Zone은 3개 이상이어야 한다. **v5부터는 `freedom_floor: 0`으로 이 조항을 끌 수 없다**(하드 하한 1). 3 미만으로 낮추려면 20자 이상의 사유를 남겨야 한다.

통제 항목에는 상한을, 자유 항목에는 하한을 둔다. 자유도는 "남은 영역"이 아니라 명시적으로 예약된 자산이다. 자유도를 줄이는 것 자체는 금지가 아니고, **말없이 줄이는 것**이 금지다.

### 2. Control Budget — 규칙에 대한 규칙

| 유형 | 예 | 추가 조건 |
|---|---|---|
| 사전규칙 | 개인정보, 과학적 사실 오류, 데이터 손실 | 실패 경험 불필요 — 비가역성만 논증 |
| 사후규칙 | 코딩 스타일, 구조 취향 | 실제 실패 관측 + 3조건 |

사전규칙을 조건부로 완화하려면 그 조건이 **기계로 판정 가능해야 한다.** 판정되지 않는 예외는 예외가 아니라 규칙의 조용한 삭제다.

### 3. revision — 폐기의 단일 기준

상류 노드로 REPAIR할 때마다 `STATE.revision`을 +1 한다. 노드 결과가 "살아있다"는 것은 `revision == STATE.revision`이고 `superseded != true`라는 뜻이다.

이 정의로 게이트(비PASS 상태에서 하류 선행 금지)와 폐기(상류 수리 후 하류 무효화)가 동시에 판정된다. **시각 비교가 아니므로 `updated_at`을 미래로 밀어도 우회되지 않는다.**

### 4. 기계 검증 게이트

`check_package.py`는 표준 라이브러리만 쓴다(설치 불필요). 26개 검사 중 BLOCKER는 완료를 차단하고 WARN은 진단만 한다.

## 검증기 신뢰성

```powershell
python tools\selftest.py
```

self-test는 42개다. 프로젝트 케이스 40개(정상 경로 + 상태 계약을 일부러 깨뜨리는 adversarial case)와 **패키지 자기정합 검사 2개**로 이루어진다.

자기정합 검사는 동봉 문서의 버전 표기, 날짜 형식, self-test 개수 표기가 코드와 어긋나는지 본다. v4에서 마이그레이션 문서가 낡은 채 남아 "문서를 따르면 검증기가 실패하는" 상태가 생겼기 때문에, 같은 결함을 사람 눈이 아니라 기계로 막는다.

## 실증 상태 — 고지

이 패키지의 핵심 가설("선택적 통제가 전면 통제보다 좋은 결과를 낸다")은 **아직 실증되지 않았다.**

- 근거: 단일 프로젝트 관찰, 대조군 없음
- Freedom Floor(3), 하드 하한(1), Control Ratio(0.70/0.85)는 **임의 기본값**
- 검증 설계는 `docs/AB_EXPERIMENT_PROTOCOL.md`, 상태는 `not-yet-executed`

논문·발표에서 이 수치를 검증된 값으로 제시하지 않는다.

## 한 줄 요약

> 통제는 실패 비용이 비가역인 곳에 집중하고, 자유는 품질 상한을 결정하는 곳에 **하한을 두어 보장**하며, 모든 판정은 실제 사용자 가치와 등급이 표기된 증거를 기준으로 한다.
