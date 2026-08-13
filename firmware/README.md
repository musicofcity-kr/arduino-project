# Universal UNO Firmware

`UniversalSensorFirmware/UniversalSensorFirmware.ino`는 Arduino UNO R3용 단일 스케치다. Arduino IDE에서 보드를 UNO로 선택하고 Adafruit의 **DHT sensor library**와 **Adafruit Unified Sensor** 의존성을 설치한 뒤 업로드한다. Serial 속도는 `115200 baud`다.

전원을 끄고 다음과 같이 배선한다.

- DHT11: DATA D2, 5V, GND, DATA-5V 사이 10 kΩ pull-up
- HC-SR04: TRIG D9, ECHO D10, 5V, GND
- LDR 전압 분배기: `5V → LDR → A0 → 10 kΩ → GND`

지원 명령은 `PING`, `MODE:DHT11`, `MODE:HC_SR04`, `MODE:LDR`, `STOP`이며 각 줄은 LF로 끝난다. 모드 명령은 해당 센서의 새 읽기가 유효할 때만 `ACK:MODE:...`를 반환한다. 실패나 HC-SR04 timeout은 `ERROR:<code>:<message>`를 반환하고 이전 값을 재전송하지 않는다. `STOP`은 먼저 활성 모드를 해제하여 측정 전송을 멈춘 다음 `ACK:STOP`을 반환한다.

JSON은 웹앱의 `src/domain/protocol.ts` 계약을 따른다.

```json
{"type":"heartbeat","timestampMs":1234}
{"type":"measurement","sensor":"dht11","timestampMs":1234,"values":[{"metric":"temperature","value":24.1,"unit":"C"},{"metric":"humidity","value":51,"unit":"%"}]}
{"type":"measurement","sensor":"hc-sr04","timestampMs":1234,"values":[{"metric":"distance","value":18.2,"unit":"cm"}]}
{"type":"measurement","sensor":"ldr","timestampMs":1234,"values":[{"metric":"relativeLight","value":612,"unit":"count"}]}
```

LDR의 `relativeLight(count)`는 0~1023 ADC 원시 계수이며 보정된 lux가 아니다. 기본 전압 분배기만으로 미연결 LDR과 극단적인 실제 입력을 확실히 구분할 수 없으므로 LDR 모드 ACK는 ADC 변환 성공만 확인하며 실제 배선 확인을 대체하지 않는다. 속도와 투과율 같은 계산형 값은 브라우저가 원시 측정과 분리해 생성한다.

2026-08-12 실제 Arduino UNO를 COM7에서 식별해 펌웨어 업로드와 `ACK:PING`을 확인했다. 2026-08-13 DHT11 모듈의 `S/+` 교차 배선을 수정한 뒤 유효 온습도 측정을 확인했다. 같은 날 HC-SR04의 `Echo/Trig` 신호선을 D10/D9로 수정한 뒤 `ACK:MODE:HC_SR04`, 증가하는 timestamp의 거리 측정 21건과 `ACK:STOP` 이후 측정 중단도 확인했다. HC-SR04 거리 변화·속도 계산은 아직 미확인이다. LDR에서는 주변광과 차광 원시값을 일부 수집했지만 반응 방향이 예상과 반대이고 ADC 포화가 있어, 사용자 결정에 따라 V3 완료를 추후 검증한다.

## 확인된 컴파일 환경

2026-08-11에 Arduino CLI 1.5.1, `arduino:avr` 1.8.8, DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15로 UNO 대상 컴파일을 확인했다.

```powershell
& 'C:\Program Files\Arduino CLI\arduino-cli.exe' `
  --config-dir 'C:\all\Aduino project\.arduino-cli' `
  compile --fqbn arduino:avr:uno `
  --build-path 'C:\all\Aduino project\.arduino-build' `
  'C:\all\Aduino project\firmware\UniversalSensorFirmware'
```

- 프로그램 저장 공간: 7,556 bytes / 32,256 bytes (23%)
- 동적 메모리: 668 bytes / 2,048 bytes (32%)

컴파일과 실제 UNO 업로드·`ACK:PING`, DHT11과 HC-SR04의 fresh read 및 연속 측정은 확인됐다. DHT11 확인값은 온도 28.7 C, 상대습도 42.6~42.7%였고 HC-SR04 확인값은 21건 모두 7.82 cm였다. 이는 통신·반복 측정 기능 증거이지 센서 정확도·교정 또는 HC-SR04 속도 계산 증거는 아니다. LDR V3 완료는 사용자 결정에 따라 추후 검증한다. Phase 1 LDR 검증은 UI·스케치와 같은 `5V → LDR → A0 → 10 kΩ → GND` 분압 회로를 사용한다.
