# Local API

외부 패키지 없이 Node.js HTTP로 실행하는 로컬 MVP API다. 기본 바인딩은 `127.0.0.1:8787`이고 기본 저장 파일은 프로젝트 루트의 `runtime-data/store.json`이다. 학생 이름, 학번, 이메일 등 개인정보를 입력받지 않으며 세션 ID는 서버가 임의로 만든 로컬 식별자다.

```powershell
node server/index.mjs
```

환경 변수:

- `PORT`: 기본값 `8787`
- `HOST`: 기본값 `127.0.0.1`; 교실 LAN 공개는 별도 보안 검토 후에만 변경
- `ARDUINO_DATA_FILE`: 테스트나 별도 실행용 JSON 경로
- `ARDUINO_ALLOWED_ORIGINS`: 쉼표로 구분한 허용 Origin. 기본값은 localhost/127.0.0.1의 Vite `5173`, `4173` 포트

## API

- `GET /api/health`
- `GET /api/experiment-packs`
- `GET /api/experiment-packs/:id`
- `POST /api/sessions` — 빈 본문 또는 `{}`만 허용
- `POST /api/sessions/:sessionId/measurements`
- `GET /api/sessions/:sessionId/measurements`

측정 저장 요청 예시:

```json
{
  "experimentPackId": "humidity-weather",
  "source": {
    "kind": "measured",
    "sensorPackId": "dht11",
    "transport": "web-serial"
  },
  "raw": {
    "temperature": { "value": 24.1, "unit": "°C", "source": "dht11", "timestampMs": 1000 },
    "humidity": { "value": 51, "unit": "%RH", "source": "dht11", "timestampMs": 1000 }
  },
  "derived": {},
  "timestamp": "2026-08-11T10:00:00+09:00"
}
```

저장 레코드는 append-only다. 수정 API를 제공하지 않으며 `raw`와 `derived`를 별도 필드로 보존하고 서버 수신 시각인 `receivedAt`도 기록한다. raw에는 센서 출처와 장치 timestamp가 필수다. derived에는 허용된 공식과 계산에 사용한 raw 입력 배열까지 저장한다. 명백한 개인정보 키, 알 수 없는 필드, 비유한 수, 잘못된 단위·시각·출처·공식·입력 계보는 거부한다.

테스트는 운영 기본 경로를 사용하지 않고 매번 OS 임시 폴더를 명시적으로 주입한다.

```powershell
node --test server/api.test.mjs
```
