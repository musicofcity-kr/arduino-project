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

현재 Arduino CLI와 실제 UNO/센서가 없는 환경이므로 컴파일·업로드·실측은 미검증(V1)이다.
