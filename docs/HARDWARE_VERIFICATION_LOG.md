---
document: HARDWARE_VERIFICATION_LOG
project: Web App-based Integrated Modular Science Inquiry Workbench
recorded_at: 2026-08-13T12:16:39+09:00
overall_status: ESCALATE
completed_check: V3-03
remaining_checks: V3-04,V3-06..V3-08
deferred_check: V3-05
---

# Hardware Verification Log

## 현재 판정

UNO 대상 툴체인 컴파일과 실제 COM7 업로드·`ACK:PING`, DHT11 V3-03은 통과했다. 사진으로 확인한 HC-SR04 신호선을 수정한 뒤 실제 거리 연속 측정과 timeout 복구도 확인했지만 거리 변화·속도 계산은 남았다. LDR V3-05는 사용자 결정에 따라 추후 검증으로 남기며, 저장·학교 PC·학생 흐름도 미완료이므로 `USER CHECK / ESCALATE`를 유지한다.

## 2026-08-12 작업 재개 시도

- Arduino CLI `board list`를 5초 간격으로 3회 실행했으나 모두 `No boards found.`였다.
- Windows `Win32_SerialPort`에서도 `NO_SERIAL_PORTS`로 확인됐다.
- 보드와 포트가 특정되지 않아 잘못된 대상 업로드를 방지하기 위해 V3-02 업로드를 실행하지 않았다.
- 시약·가열·폐액은 없으며, 실제 배선은 USB 전원을 분리하고 5V/GND 단락 여부를 교사가 확인한 뒤 진행한다.

## V3-02 실제 UNO 업로드와 PING

| 항목 | 결과 |
|---|---|
| 보드 식별 | `COM7`, Arduino UNO, `arduino:avr:uno` |
| 펌웨어 업로드 | PASS, `New upload port: COM7 (serial)` |
| 전송 | ASCII `PING\n` = `80,73,78,71,10` |
| 응답 | `ACK:PING` |
| 판정 | PASS (V3 실제 보드) |

첫 PING에는 업로드 후 장치 명령 버퍼의 잔여 입력으로 추정되는 `UNKNOWN_COMMAND`가 반환됐다. 이를 성공으로 간주하지 않았으며 빈 LF로 명령 버퍼를 종료한 뒤 정확한 ASCII 바이트를 다시 보내 `ACK:PING`을 확인했다.

## V3-03 DHT11 시도

- 총 3회 모두 `ERROR:DHT11_INVALID_READ:Check power,data,pullup_and_wait`였다.
- MODE ACK와 온도·습도 측정값은 한 건도 반환되지 않았다.
- 각 시도 뒤 측정을 성공으로 표시하지 않았고 마지막 `ACK:STOP`을 확인했다.
- 판정: `ESCALATE` — USB 전원을 분리하고 DHT11 DATA D2, 5V, GND 및 DATA-5V 10 kΩ pull-up을 확인해야 한다. 모듈마다 핀 순서가 다를 수 있으므로 인쇄 라벨이나 제조사 자료를 우선한다.

### DHT11 재배선 후 재검증

- COM7은 Arduino UNO로 계속 식별됐다.
- `MODE:DHT11` 재검증에서 heartbeat, MODE ACK, measurement, 오류 메시지, STOP ACK가 모두 수신되지 않았다.
- 센서 문제와 보드 실행 문제를 분리하기 위해 정확한 ASCII `PING\n`을 한 번 보냈으나 `ACK:PING`도 수신되지 않았다.
- 재배선 전에는 같은 보드·포트에서 업로드와 `ACK:PING`이 통과했으므로, 현재 상태에서는 DHT11 실측을 재시도하지 않는다.
- 판정: `ESCALATE` — USB 전원을 분리하고 DHT11을 제거한 뒤 UNO만 다시 연결하여 heartbeat와 PING부터 복구해야 한다. 발열·냄새·비정상 LED가 있으면 재연결하지 않는다.

### 2026-08-13 UNO 복구 후 DHT11 재검증

- COM7에서 Arduino UNO `arduino:avr:uno`를 다시 식별했다.
- DTR 리셋 뒤 유효 heartbeat를 수신하고 ASCII `PING\n` (`80,73,78,71,10`)에 `ACK:PING`을 받아 UNO 실행·직렬 통신 복구를 확인했다.
- `MODE:DHT11` 요청에는 `ERROR:DHT11_INVALID_READ:Check power,data,pullup_and_wait`가 반환됐다.
- `ACK:MODE:DHT11` 0건, 유효 DHT11 measurement 0건이었다. 오류 뒤에도 heartbeat는 계속 증가했다.
- `STOP`에는 `ACK:STOP`이 반환됐고 이후 3초 관찰에서 DHT11 measurement는 0건이었다.
- 판정: `ESCALATE` 유지 — UNO와 펌웨어는 응답하나 DHT11 fresh read가 실패한다. USB 전원을 분리한 뒤 센서 실물 핀 라벨, 3핀 모듈/4핀 단품 여부, DATA D2, VCC 5V, GND, DATA-5V 10 kΩ pull-up을 확인해야 한다.

### 2026-08-13 사람 승인 추가 재검증

- COM7 Arduino UNO 식별, 유효 heartbeat 3건과 `ACK:PING`을 재확인했다. 직렬 리셋 경계에서 손상된 첫 프레임 1건은 증거에서 폐기했다.
- DHT11은 다시 `ERROR:DHT11_INVALID_READ:Check power,data,pullup_and_wait`를 반환했다.
- `ACK:MODE:DHT11` 0건, 유효 measurement 0건, 오류 1건이었다.
- `ACK:STOP`을 수신했고 이후 3초 동안 heartbeat만 수신되며 DHT11 measurement는 0건이었다.
- 판정: `ESCALATE` 유지. 동일 자동 재시도는 중단하고 센서 실물 핀 라벨 사진 확인 또는 정상 DHT11로 교차검증한다.

### 2026-08-13 사진 기반 배선 수정 후 재검증

- 사용자 사진에서 3핀 모듈의 `S`가 노란선/UNO 5V, `+`가 보라선/UNO D2로 교차 연결된 것을 확인했다. USB 전원을 분리한 상태에서 센서 쪽 노란선과 보라선을 교체하도록 안내했다.
- 수정 후 COM7에서 Arduino UNO `arduino:avr:uno`를 다시 식별하고 115200 baud의 동일 세션에서 검사했다.
- DTR 리셋 경계의 손상 heartbeat 1건과 리셋 전 버퍼 프레임은 증거에서 제외했다.
- ASCII `PING\n` (`80,73,78,71,10`)에 `ACK:PING`, `MODE:DHT11\n` (`77,79,68,69,58,68,72,84,49,49,10`)에 `ACK:MODE:DHT11`을 수신했다.
- MODE ACK 뒤 유효 측정 4건을 수신했다: timestamp `9342`, `11343`, `13343`, `15343`; 온도 `28.7 C`; 습도 `42.7`, `42.7`, `42.7`, `42.6 %`.
- `STOP\n` (`83,84,79,80,10`) 전송 뒤 명령 처리 직전 진행 중이던 측정 1건이 먼저 도착하고 1 ms 뒤 `ACK:STOP`을 수신했다. 이후 4초 관찰에서 heartbeat 2건만 수신되고 measurement는 0건이었다.
- 독립 검토 판정: `V3-03 DHT11 = PASS`. 이는 통신과 fresh-read 기능 검증이며 측정 정확도나 교정을 입증하지 않는다.

## V3-04 HC-SR04 사전 시도

- `ERROR:HC_SR04_TIMEOUT:No_fresh_echo_within_30000us`가 반환됐다.
- MODE ACK와 거리 측정값은 반환되지 않았고 `ACK:STOP`을 확인했다.
- 판정: 미완료 — USB 전원을 분리하고 TRIG D9, ECHO D10, 5V, GND 배선을 확인한 뒤 재시도한다.

### 2026-08-13 사용자 요청 계측

- COM7에서 Arduino UNO `arduino:avr:uno`를 식별했다.
- 이전 세션의 부분 명령은 빈 LF로 종료하고 `ACK:STOP`으로 비활성 상태를 확인한 뒤 같은 115200 baud 세션에서 측정했다.
- 정확한 ASCII `PING\n`에 `ACK:PING`을 수신했다.
- `MODE:HC_SR04\n`에는 27 ms 뒤 `ERROR:HC_SR04_TIMEOUT:No_fresh_echo_within_30000us`가 반환됐다.
- `ACK:MODE:HC_SR04` 0건, 유효 거리 measurement 0건이었다.
- `STOP\n`에는 `ACK:STOP`이 반환됐고 이후 4초 관찰에서 measurement는 0건이었다.
- 판정: `ESCALATE` — UNO와 직렬 명령 경로는 정상이지만 echo가 검출되지 않는다. USB 전원을 분리한 뒤 HC-SR04 `VCC→5V`, `GND→GND`, `TRIG→D9`, `ECHO→D10`을 센서 인쇄 라벨 기준으로 확인하고 정면 장애물을 둔 상태에서 재검증해야 한다.

### 2026-08-13 사진 기반 신호선 수정 후 재계측

- 사용자 사진에서 센서 쪽은 `GND=회색`, `Echo=검정`, `Trig=보라`, `VCC=노랑`이고, UNO 쪽은 검정선이 D11, 보라선이 D10에 꽂혀 D9가 비어 있음을 확인했다.
- USB 전원을 분리한 뒤 `Echo(검정)→D10`, `Trig(보라)→D9`로 옮기도록 안내했다.
- 수정 후 COM7의 Arduino UNO를 확인하고 같은 115200 baud 세션에서 정확한 `PING\n`에 `ACK:PING`, `MODE:HC_SR04\n`에 `ACK:MODE:HC_SR04`을 수신했다.
- 약 10.5초 동안 증가하는 timestamp의 유효 거리 measurement 21건을 수신했다. 모든 값은 `7.82 cm`였고 최소·최대·평균도 각각 `7.82 cm`였다.
- `STOP\n`에 `ACK:STOP`을 수신했고 이후 3.5초 관찰에서 distance measurement는 0건이었다.
- 판정: 통신·반복 거리측정·timeout 복구 하위 게이트는 PASS다. 다만 V3-04 전체 기준의 실제 거리 변화와 속도 계산은 확인하지 않아 `ESCALATE`를 유지한다. 기준자로 확인한 절대 정확도나 교정도 입증하지 않는다.

## V3 진입 전 펌웨어 컴파일 (V2)

| 항목 | 증거 |
|---|---|
| 판정 | PASS (V2, 실제 보드 검증 아님) |
| Arduino CLI | 1.5.1 |
| Board core | `arduino:avr` 1.8.8 |
| FQBN | `arduino:avr:uno` |
| DHT library | DHT sensor library 1.4.7 |
| DHT dependency | Adafruit Unified Sensor 1.1.15 |
| Flash | 7,556 / 32,256 bytes (23%) |
| SRAM | 668 / 2,048 bytes (32%) |
| 보드 검색 | `No boards found.` |

재현 명령:

```powershell
& 'C:\Program Files\Arduino CLI\arduino-cli.exe' `
  --config-dir 'C:\all\Aduino project\.arduino-cli' `
  compile --fqbn arduino:avr:uno `
  --build-path 'C:\all\Aduino project\.arduino-build' `
  'C:\all\Aduino project\firmware\UniversalSensorFirmware'
```

## 전체 V3 체크 상태

| ID | 항목 | 상태 | 다음 증거 |
|---|---|---|---|
| V3-01 | UNO 대상 컴파일 준비 | PASS (V2) | 위 버전·메모리 사용량 |
| V3-02 | 실제 UNO 업로드와 PING | PASS | COM7, 업로드 로그, `ACK:PING` |
| V3-03 | DHT11 | PASS | COM7 동일 세션, MODE ACK, 증가 timestamp의 유효 측정 4건, STOP ACK 이후 측정 0건 |
| V3-04 | HC-SR04 | ESCALATE | 거리 통신·timeout 복구 PASS; 실제 거리 변화와 속도 계산 미확인 |
| V3-05 | LDR | ESCALATE (추후 검증) | 사용자 결정으로 보류; 차광 반응 방향·1023 포화·분압 방향 확인 필요 |
| V3-06 | 저장·CSV | 미확인 | 화면/서버/CSV provenance 대응 |
| V3-07 | 학교 PC | 미확인 | Web Serial 권한, COM 점유·재연결 |
| V3-08 | 초보 학생 | 미확인 | 비식별 완주 관찰과 교사 확인 |

## V3-05 LDR 현재 주변광 계측

- COM7의 Arduino UNO를 확인하고 같은 115200 baud 세션에서 정확한 `PING\n`에 `ACK:PING`, `MODE:LDR\n`에 `ACK:MODE:LDR`을 수신했다.
- 약 10.5초 동안 증가하는 timestamp의 `sensor=ldr`, `metric=relativeLight`, `unit=count` 측정 21건을 수신했다.
- 원시값은 `853, 858, 859, 860, 858, 858, 858, 862, 864, 864, 865, 865, 865, 865, 866, 865, 863, 863, 863, 859, 852` count였다. 독립 재계산 결과 최소 852, 최대 866, 평균 861.19 count다.
- 최초 자동 요약의 min/max/avg `21`은 PowerShell 컬렉션 `Count` 속성명 충돌로 발생한 잘못된 통계이므로 폐기하고 원시 JSON과 독립 재계산만 증거로 사용한다.
- `STOP\n`에 `ACK:STOP`을 수신했고 이후 3.5초 관찰에서 LDR measurement는 0건이었다.
- 판정: 통신·A0 연속 취득·정지 동작은 실제 장비에서 확인했다. 그러나 단일 주변광의 작은 변동만으로 LDR 광반응이나 올바른 분압 배선을 입증할 수 없으므로 V3-05 전체는 `ESCALATE`를 유지한다. 차광/조사 두 조건의 재현 가능한 변화와 기준 대비 비율 확인이 필요하다.

### 2026-08-13 차광 계측

- 사용자가 LDR 차광 완료를 확인한 뒤 COM7/115200 baud의 같은 세션에서 `ACK:PING`, `ACK:MODE:LDR`을 수신했다.
- 증가하는 timestamp의 유효 차광 측정 16건을 수신했다. 원시값은 `1023, 1023, 1023, 1023, 1023, 1023, 1023, 1023, 1016, 1021, 1004, 1007, 988, 965, 959, 958` count였다.
- 독립 재계산 결과 합계 16102, 최소 958, 최대 1023, 평균 1006.38 count다. 16건 중 8건은 ADC 상한 1023에 포화됐다.
- 이전 주변광 평균 861.19 count 대비 차광 원시비는 116.86%, 변화율은 +16.86%였다.
- `STOP\n`에 `ACK:STOP`을 수신했고 이후 3.2초 관찰에서 LDR measurement는 0건이었다.
- 실제 광 변화 반응은 확인됐지만 권장 회로 `5V → LDR → A0 → 10 kΩ → GND`라면 차광 시 count가 낮아져야 하므로 현재 변화 방향은 반대다. 116.86%를 상대 투과율로 해석하거나 저장하지 않는다.
- 판정: `ESCALATE` 유지. 배선을 건드리지 않고 덮개를 제거한 복광 계측으로 기준 회복을 먼저 확인한 뒤, USB 전원을 분리하고 2핀 분압 회로인지 아날로그 출력 모듈인지 확인해야 한다.

## 실제 장비 안전 체크

- USB 전원을 분리한 상태에서 배선하고, 교사가 5V/GND 단락 여부를 먼저 확인한다.
- 발열, 냄새, 비정상 LED가 보이면 즉시 USB를 분리한다.
- 업로드 후 브라우저 연결 전 Arduino Serial Monitor를 닫는다.
- HC-SR04를 얼굴이나 귀에 밀착하지 않는다.
- LDR 활동에서 강한 광원이나 레이저를 직접 보지 않는다.
- 이번 활동에는 시약과 폐액이 없으므로 화학 폐기물 처리는 해당하지 않는다.
- 학생 이름·학번 등 개인정보는 증거에 기록하지 않는다.

## 다음 실행 조건

남은 HC-SR04 검증에서는 표적을 두 거리로 이동해 거리 변화와 속도 계산을 확인한다. 추후 LDR 검증을 재개할 때는 `5V → LDR → A0 → 10 kΩ → GND` 회로를 기준으로 새 주변광 기준부터 다시 측정한다.

보드를 연결한 뒤 `<COM_PORT>`를 실제 값으로 바꾸어 실행한다.

```powershell
& 'C:\Program Files\Arduino CLI\arduino-cli.exe' `
  --config-dir 'C:\all\Aduino project\.arduino-cli' board list

& 'C:\Program Files\Arduino CLI\arduino-cli.exe' `
  --config-dir 'C:\all\Aduino project\.arduino-cli' `
  upload --port '<COM_PORT>' --fqbn arduino:avr:uno `
  --build-path 'C:\all\Aduino project\.arduino-build' `
  'C:\all\Aduino project\firmware\UniversalSensorFirmware'
```
