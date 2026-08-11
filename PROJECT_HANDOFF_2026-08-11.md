---
document: PROJECT_HANDOFF
project: Web App-based Integrated Modular Science Inquiry Workbench
recorded_at: 2026-08-11T11:48:36+09:00
workspace: C:\all\Aduino project
state: USER CHECK
status: ESCALATE
release_label: verified-build
evidence_level: V2
---

# 프로젝트 작업 기록 및 다음 작업 인계

이 문서는 2026-08-11까지 구현한 내용을 보존하고, 다음 작업일에 같은 상태에서 바로 이어가기 위한 기준 문서다. 현재 프로젝트는 자동 검증을 통과한 `verified-build`이며, 실제 Arduino UNO·센서·학교 PC를 이용한 V3 검증 전에는 `classroom-tested` 또는 완료 상태로 선언하지 않는다.

## 1. 현재 상태 한눈에 보기

| 항목 | 현재 상태 |
|---|---|
| 작업 폴더 | `C:\all\Aduino project` |
| 제어 그래프 | `USER CHECK / ESCALATE` |
| 상태 revision | `1`, `terminal_reached: false` |
| 앱 상태 | React/Vite 학생용 MVP 구현 완료 |
| 센서 범위 | DHT11, HC-SR04, LDR 3종 |
| 로컬 API | 구현 및 자동 검증 완료 |
| Arduino 펌웨어 | UNO R3용 통합 스케치 구현 완료 |
| 자동 테스트 | 39/39 PASS |
| production build | PASS, 28 modules transformed |
| 브라우저 검증 | 핵심 흐름 PASS, 콘솔 warning/error 0건 |
| 패키지 검사 | C01~C26 전부 PASS, BLOCKER 0 / WARN 0 |
| 독립 검토 | blocker/major 0건, BUILD PASS |
| 실제 장비 검증 | 미실시 |
| Git 증거 | `evidence_committed: true`, `main`이 `origin/main`을 추적 |

`ESCALATE`는 빌드 실패가 아니라 실제 사람·장비 V3 확인을 기다린다는 뜻이다. 정식 상태 원본은 `STATE.md`, 요구사항 원본은 `PROJECT_SPEC.md`, 노드별 증거는 `docs/BUILD_RESULT.md`, `docs/VERIFY_RESULT.md`, `docs/EVALUATE_RESULT.md`를 따른다.

## 2. 오늘까지 구현한 내용

### 학생용 웹앱

- `탐구 선택 → 센서 연결 → 바로 측정`의 3단계 Easy Mode를 구현했다.
- 온습도·기상, 거리·운동, 상대광도·투과의 Experiment Pack 3종을 구현했다.
- 실제 측정값, 계산값, 데모 데이터를 텍스트 배지와 저장 구조에서 분리했다.
- 센서별 배선, 안전 주의, 오류 복구 안내를 학생 눈높이의 한국어로 제공한다.
- 현재값, 측정 이력, 계산식과 계산 입력값의 provenance를 표시한다.
- 실제 최신 센서 데이터가 모두 준비된 경우에만 저장할 수 있다.
- 비식별 세션 저장, 기록 조회, CSV 내보내기를 구현했다.
- 반응형 레이아웃을 구현했고 브라우저 자동 확인에서 가로 넘침이 없었다.

### Web Serial 및 프로토콜

- `PING`, `MODE:DHT11`, `MODE:HC_SR04`, `MODE:LDR`, `STOP` 명령을 사용한다.
- 정확한 `ACK:PING`, 센서별 MODE ACK, `ACK:STOP`만 성공으로 인정한다.
- 첫 측정과 재시작 모두 새 MODE ACK를 받은 뒤 측정을 시작한다.
- 3초 동안 새 측정값이 없으면 현재값과 이력을 지우고 연결을 닫는 fail-closed 동작을 구현했다.
- 직렬 line buffer가 4096자를 넘거나 JSON·센서·단위 계약이 어긋나면 성공 상태로 통과시키지 않는다.
- 오래된 센서 값을 새 값처럼 재사용하지 않는다.

### 측정 및 계산 계약

| Pack | raw 값 | derived 값 | 주의 |
|---|---|---|---|
| DHT11 | temperature `C`, humidity `%` | 없음 | 저장 시 UI 단위는 `°C`, `%RH`로 정규화 |
| HC-SR04 | distance `cm` | velocity `cm/s` | 계산식과 두 시점의 거리 입력을 함께 보존 |
| LDR | relativeLight `count` | relativeTransmittance `%` | `count`는 0~1023 ADC 상대 신호이며 lux가 아님 |

- raw 저장값은 `value`, `unit`, `source`, 장치 `timestampMs`를 보존한다.
- derived 저장값은 `value`, `unit`, `timestampMs`, `formula`, 전체 `inputs`를 보존한다.
- 허용되지 않은 metric, unit, source, 공식 또는 입력 계보는 서버가 거부한다.

### 로컬 저장 API

- Node.js 기본 HTTP 모듈 기반으로 `127.0.0.1:8787`에만 바인딩한다.
- 개인정보 없는 임의 세션 ID를 서버가 생성한다.
- 측정 레코드는 append-only이며 수정 API가 없다.
- 이름·학번·이메일 등 명백한 개인정보 키, 알 수 없는 필드, 64 KiB 초과 본문을 거부한다.
- 기본 저장 경로는 `runtime-data/store.json`이며 첫 실제 저장 전에는 폴더가 없을 수 있다.
- 실제 측정은 `measured + web-serial`, 데모는 `demo/simulated + generated` 조합만 허용한다.

### Arduino UNO 펌웨어

- 단일 스케치: `firmware/UniversalSensorFirmware/UniversalSensorFirmware.ino`
- Serial: `115200 baud`, 명령과 응답은 LF 단위다.
- DHT11: DATA D2, 5V, GND, DATA-5V 사이 10 kΩ pull-up
- HC-SR04: TRIG D9, ECHO D10, 5V, GND
- LDR: `5V → LDR → A0 → 10 kΩ → GND`
- 센서의 새 읽기가 유효할 때만 MODE ACK를 반환한다.
- HC-SR04 timeout과 센서 오류는 `ERROR:<code>:<message>`로 반환하며 stale 값을 재전송하지 않는다.
- STOP은 활성 모드를 먼저 해제한 뒤 `ACK:STOP`을 반환한다.

## 3. 중요하게 수정한 P0 결함

독립 검토 과정에서 발견한 아래 결함은 모두 수정하고 회귀 테스트를 추가했다.

1. 임의 ACK가 연결 성공으로 처리되던 문제
2. 웹앱과 펌웨어 measurement JSON 구조 불일치
3. STOP 후 재시작 시 MODE를 다시 활성화하지 않던 문제
4. 첫 측정값이 없는 상태와 stale 값을 정상처럼 표시하던 문제
5. demo 데이터를 실측으로 저장할 수 있던 문제
6. LDR 값을 lux처럼 오인할 수 있던 표현
7. 서버와 프런트엔드의 Pack ID, metric, unit 불일치
8. 저장·조회·CSV 과정에서 장치 timestamp, 공식, 계산 입력값이 소실되던 문제

현재 독립 판정은 blocker/major 0건이다.

## 4. 검증 기록

### 자동 검증

```powershell
npm test
npm run build
$env:PYTHONUTF8='1'
python tools/check_package.py
```

최근 결과:

- Vitest: 3 files, 30 tests PASS
- Node server/firmware contract: 9 tests PASS
- 합계: 39/39 PASS
- TypeScript 및 Vite production build: PASS, 28 modules
- 패키지 검사: PASS, BLOCKER 0 / WARN 0
- 저장 통합 테스트는 실제 임시 JsonDataStore를 띄워 session 생성 → POST → GET → CSV 변환까지 확인한다.

### 브라우저 검증

- Experiment Pack 3종 렌더링과 전환 확인
- 배선, 안전, 측정, 저장, CSV UI 확인
- demo 배지 표시 및 demo 저장 버튼 차단 확인
- LDR `count`와 상대 투과율 표현 확인
- 콘솔 warning/error 0건
- 데스크톱 및 실제 CSS 폭 585px에서 가로 넘침 없음

### 검증하지 못한 항목

- Arduino CLI/IDE를 이용한 실제 펌웨어 컴파일과 업로드
- 실제 UNO와 DHT11, HC-SR04, LDR 측정
- USB 포트 선택 대화상자를 포함한 Web Serial end-to-end
- 정확한 390px 실제 기기 화면
- 학교 PC Chrome 정책과 COM 포트 점유·복구
- 초보 학생의 5분 이내 Easy Mode 완주
- 실제 수업에서의 학습 효과, 만족도, 다수 학생 동시 운영

## 5. 다음 작업일 실행 방법

현재 확인된 환경:

- Node.js `v24.15.0`
- npm `11.12.1`
- `node_modules`: 존재
- `dist`: 존재
- Arduino CLI: 설치되어 있지 않음
- Git 저장소: `main`, 원격 `https://github.com/musicofcity-kr/arduino-project.git`

웹앱과 API를 함께 실행한다.

```powershell
Set-Location 'C:\all\Aduino project'
npm run dev
```

- 웹앱: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`
- Web Serial은 지원되는 Chrome/Edge에서 연결 버튼을 눌러 포트를 선택해야 한다.

의존성이 없거나 손상된 경우에만 먼저 실행한다.

```powershell
npm install
```

API만 따로 확인하려면 다음을 실행한다.

```powershell
node server/index.mjs
```

## 6. 내일 권장 작업 순서

- [ ] 새 기능을 추가하기 전에 실제 UNO·센서 V3 증거 확보를 최우선으로 한다.
- [ ] 이 문서와 `STATE.md`를 먼저 읽는다.
- [ ] Arduino IDE 또는 Arduino CLI를 준비한다.
- [ ] Adafruit `DHT sensor library`와 `Adafruit Unified Sensor`를 설치한다.
- [ ] UNO 보드 대상으로 통합 펌웨어를 컴파일하고 업로드한다.
- [ ] Serial Monitor를 닫아 COM 포트를 해제한다.
- [ ] Chrome에서 앱을 열고 DHT11을 연결해 연속 온도·습도를 확인한다.
- [ ] HC-SR04로 거리 변화와 속도 계산을 확인한다.
- [ ] LDR로 기준값과 상대 투과율을 확인하고 lux로 표시되지 않는지 확인한다.
- [ ] 각 Pack에서 저장 후 CSV의 raw 값, 단위, source, timestamp, formula, inputs를 화면과 비교한다.
- [ ] 센서 분리, 잘못된 포트, timeout, STOP 후 재시작의 오류 복구를 실제 장비에서 확인한다.
- [ ] 가능하면 학교 PC와 초보 학생으로 5분 Easy Mode 완주를 확인한다.
- [ ] 결과를 이 문서의 마지막 로그와 `STATE.md`에 반영한다.
- [ ] 모든 V3 확인 전에는 `COMPLETE` 또는 `classroom-tested`로 변경하지 않는다.

## 7. 실제 장비 체크 기준

| ID | 확인 항목 | 합격 기준 | 현재 |
|---|---|---|---|
| V3-01 | 펌웨어 컴파일 | UNO 대상 오류 없이 컴파일 | 미확인 |
| V3-02 | 펌웨어 업로드 | 실제 UNO 업로드 및 PING ACK | 미확인 |
| V3-03 | DHT11 | 새 온도·습도 값, 단위, timeout 복구 | 미확인 |
| V3-04 | HC-SR04 | 거리와 속도 계산, sensor timeout 처리 | 미확인 |
| V3-05 | LDR | count와 상대 투과율, 기준값 처리 | 미확인 |
| V3-06 | 저장·CSV | 화면/저장/CSV 값과 provenance 일치 | 미확인 |
| V3-07 | 학교 PC | 포트 선택, 권한, 재연결, COM 복구 | 미확인 |
| V3-08 | 학생 흐름 | 초보 학생이 도움 없이 핵심 흐름 완주 | 미확인 |

## 8. 유지해야 하는 안전장치

- ACK 검증, 3초 fresh-data timeout, 4096자 buffer 제한을 완화하지 않는다.
- demo/simulation 데이터를 실제 측정으로 저장하지 않는다.
- LDR `count`를 lux로 바꾸지 않는다. lux는 별도의 보정 근거가 있을 때만 추가한다.
- raw와 derived의 source, timestamp, formula, inputs를 제거하지 않는다.
- 학교 LAN에 API를 공개하기 전 별도 개인정보·접근 제어·배포 보안 검토를 한다.
- 학생 이름, 학번, 이메일 등 개인정보 필드를 추가하지 않는다.
- 교육과정 코드는 공식 확인 전까지 draft 표기를 유지한다.
- Teacher/Creator 기능과 장기·다중 사용자 운영은 현재 검증 범위 밖이다.

## 9. 주요 파일 안내

| 목적 | 파일 |
|---|---|
| 빠른 실행과 프로젝트 개요 | `README.md` |
| 요구사항과 P0 기준 | `PROJECT_SPEC.md` |
| 현재 그래프 상태 | `STATE.md` |
| 학생 앱 및 직렬 흐름 | `src/App.tsx` |
| Sensor/Experiment Pack | `src/domain/packs.ts` |
| 직렬 프로토콜 파서 | `src/domain/protocol.ts` |
| 계산식 | `src/domain/calculations.ts` |
| 저장·조회·CSV 클라이언트 | `src/services/sessionApi.ts` |
| 로컬 API | `server/app.mjs` |
| 서버 데이터 저장 | `server/dataStore.mjs` |
| 서버 사용법 | `server/README.md` |
| UNO 펌웨어 | `firmware/UniversalSensorFirmware/UniversalSensorFirmware.ino` |
| 배선과 펌웨어 계약 | `firmware/README.md` |
| BUILD 증거 | `docs/BUILD_RESULT.md` |
| VERIFY 증거 | `docs/VERIFY_RESULT.md` |
| EVALUATE 증거 | `docs/EVALUATE_RESULT.md` |

## 10. 알려진 운영상 주의

- Chrome/Edge의 Web Serial 지원과 보안 컨텍스트가 필요하다. 배포 시 HTTPS 여부를 확인한다.
- Arduino IDE Serial Monitor가 열려 있으면 브라우저가 같은 COM 포트를 열지 못할 수 있다.
- 실제 저장을 수행하면 `runtime-data/store.json`이 생성된다. 테스트는 별도 임시 경로를 사용한다.
- 비공개 GitHub 저장소 `musicofcity-kr/arduino-project`의 `main`에 최초 커밋을 게시했다.
- `package.json`이 `latest` 범위를 사용하지만 현재 `package-lock.json`이 설치 버전을 고정한다. 재현성이 필요하면 lockfile을 유지한다.
- `docs/VALIDATION_REPORT.md`는 AI Control Package 자체 검증 기록이다. 현재 앱의 39/39 근거에는 2026-08-11의 `BUILD_RESULT.md`, `VERIFY_RESULT.md`, `EVALUATE_RESULT.md`를 사용한다.

## 11. 다음 작업 로그

다음 작업일에 아래 표를 이어서 작성한다.

| 날짜/시각 | 작업 | 결과 | 증거 또는 파일 | 남은 문제 |
|---|---|---|---|---|
| 2026-08-11 | 웹앱·API·펌웨어 구현, P0 보수, V2 검증 | PASS | `docs/*_RESULT.md`, 39/39 tests | 실제 장비 V3 |
| 2026-08-11 | Git 저장소 초기화 및 비공개 GitHub 게시 | PASS | initial commit `d20b0f9`, `origin/main` | 실제 장비 V3 |
|  |  |  |  |  |
