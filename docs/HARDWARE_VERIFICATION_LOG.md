---
document: HARDWARE_VERIFICATION_LOG
project: Web App-based Integrated Modular Science Inquiry Workbench
recorded_at: 2026-08-11T13:49:04+09:00
overall_status: ESCALATE
completed_check: V3-01
remaining_checks: V3-02..V3-08
---

# Hardware Verification Log

## 현재 판정

UNO 대상 실제 툴체인 컴파일은 통과했다. 실제 보드, COM 포트, 센서 3종이 현재 PC에서 감지되지 않으므로 업로드와 실측은 수행하지 않았으며 `USER CHECK / ESCALATE`를 유지한다.

## V3-01 펌웨어 컴파일

| 항목 | 증거 |
|---|---|
| 판정 | PASS |
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
| V3-01 | UNO 대상 컴파일 | PASS | 위 버전·메모리 사용량 |
| V3-02 | 실제 UNO 업로드와 PING | 미확인 | 보드/포트, 업로드 로그, `ACK:PING` |
| V3-03 | DHT11 | 미확인 | MODE ACK, 연속 온도·습도, timeout 복구 |
| V3-04 | HC-SR04 | 미확인 | 거리 `cm`, 속도 `m/s`, STOP·재시작 |
| V3-05 | LDR | 미확인 | 분압 회로, `count`, 기준 대비 `%` |
| V3-06 | 저장·CSV | 미확인 | 화면/서버/CSV provenance 대응 |
| V3-07 | 학교 PC | 미확인 | Web Serial 권한, COM 점유·재연결 |
| V3-08 | 초보 학생 | 미확인 | 비식별 완주 관찰과 교사 확인 |

## 실제 장비 안전 체크

- USB 전원을 분리한 상태에서 배선하고, 교사가 5V/GND 단락 여부를 먼저 확인한다.
- 발열, 냄새, 비정상 LED가 보이면 즉시 USB를 분리한다.
- 업로드 후 브라우저 연결 전 Arduino Serial Monitor를 닫는다.
- HC-SR04를 얼굴이나 귀에 밀착하지 않는다.
- LDR 활동에서 강한 광원이나 레이저를 직접 보지 않는다.
- 이번 활동에는 시약과 폐액이 없으므로 화학 폐기물 처리는 해당하지 않는다.
- 학생 이름·학번 등 개인정보는 증거에 기록하지 않는다.

## 다음 실행 조건

실제 Arduino UNO R3, USB 데이터 케이블, DHT11, HC-SR04, LDR, 10 kΩ 저항과 점퍼선이 연결돼야 V3-02부터 진행할 수 있다. Phase 1 LDR는 `5V → LDR → A0 → 10 kΩ → GND` 회로를 기준으로 검증한다.

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
