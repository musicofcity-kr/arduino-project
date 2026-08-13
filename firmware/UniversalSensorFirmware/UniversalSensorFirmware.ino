/*
 * Universal Sensor Firmware for Arduino UNO R3
 *
 * Dependency: Adafruit "DHT sensor library" (DHT.h) and its
 * "Adafruit Unified Sensor" dependency must be installed before compiling.
 *
 * Wiring (disconnect USB/power before changing wires):
 * - DHT11: VCC -> 5V, GND -> GND, DATA -> D2 (10 kOhm pull-up to 5V)
 * - HC-SR04: VCC -> 5V, GND -> GND, TRIG -> D9, ECHO -> D10
 * - LDR divider: 5V -> LDR -> A0 -> 10 kOhm resistor -> GND
 *
 * Commands are newline terminated: PING, MODE:DHT11, MODE:HC_SR04, MODE:LDR,
 * SET_INTERVAL:<DHT11|HC_SR04|LDR>:<milliseconds>, and STOP.
 * A MODE ACK is emitted only after a fresh valid read. Failed or timed-out reads
 * emit ERROR and never resend a previous measurement.
 */

#include <DHT.h>
#include <math.h>
#include <string.h>

const uint8_t DHT_PIN = 2;
const uint8_t HC_TRIG_PIN = 9;
const uint8_t HC_ECHO_PIN = 10;
const uint8_t LDR_PIN = A0;
const uint8_t DHT_TYPE = DHT11;
const unsigned long HC_TIMEOUT_US = 30000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = 2000UL;

DHT dht(DHT_PIN, DHT_TYPE);

enum SensorMode { MODE_NONE, MODE_DHT11, MODE_HC_SR04, MODE_LDR };
SensorMode activeMode = MODE_NONE;
char commandBuffer[48];
uint8_t commandLength = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastMeasurementAt = 0;
unsigned long dht11IntervalMs = 2000UL;
unsigned long hcSr04IntervalMs = 500UL;
unsigned long ldrIntervalMs = 500UL;

const char *modeName() {
  switch (activeMode) {
    case MODE_DHT11: return "DHT11";
    case MODE_HC_SR04: return "HC_SR04";
    case MODE_LDR: return "LDR";
    default: return "NONE";
  }
}

void emitError(const char *code, const char *message) {
  Serial.print(F("ERROR:"));
  Serial.print(code);
  Serial.print(':');
  Serial.println(message);
}

void emitAck(const char *command) {
  Serial.print(F("ACK:"));
  Serial.println(command);
}

void emitIntervalAck(const char *sensor, unsigned long intervalMs) {
  Serial.print(F("ACK:INTERVAL:"));
  Serial.print(sensor);
  Serial.print(':');
  Serial.println(intervalMs);
}

bool parseIntervalMs(const char *text, unsigned long &intervalMs) {
  if (*text == '\0') return false;
  unsigned long value = 0;
  while (*text != '\0') {
    if (*text < '0' || *text > '9') return false;
    const unsigned long digit = static_cast<unsigned long>(*text - '0');
    if (value > (10000UL - digit) / 10UL) return false;
    value = value * 10UL + digit;
    text++;
  }
  intervalMs = value;
  return true;
}

void configureInterval(const char *command) {
  const char *valueText = nullptr;
  const char *sensor = nullptr;
  unsigned long minimumMs = 0;
  unsigned long *target = nullptr;

  const char dhtPrefix[] = "SET_INTERVAL:DHT11:";
  const char hcPrefix[] = "SET_INTERVAL:HC_SR04:";
  const char ldrPrefix[] = "SET_INTERVAL:LDR:";
  if (strncmp(command, dhtPrefix, strlen(dhtPrefix)) == 0) {
    valueText = command + strlen(dhtPrefix);
    sensor = "DHT11";
    minimumMs = 2000UL;
    target = &dht11IntervalMs;
  } else if (strncmp(command, hcPrefix, strlen(hcPrefix)) == 0) {
    valueText = command + strlen(hcPrefix);
    sensor = "HC_SR04";
    minimumMs = 500UL;
    target = &hcSr04IntervalMs;
  } else if (strncmp(command, ldrPrefix, strlen(ldrPrefix)) == 0) {
    valueText = command + strlen(ldrPrefix);
    sensor = "LDR";
    minimumMs = 500UL;
    target = &ldrIntervalMs;
  }

  unsigned long intervalMs = 0;
  if (target == nullptr || !parseIntervalMs(valueText, intervalMs) || intervalMs < minimumMs) {
    emitError("INVALID_INTERVAL", "Use_DHT11_2000-10000_or_HC_SR04|LDR_500-10000_ms");
    return;
  }
  *target = intervalMs;
  emitIntervalAck(sensor, intervalMs);
}

unsigned long activeMeasurementIntervalMs() {
  if (activeMode == MODE_DHT11) return dht11IntervalMs;
  if (activeMode == MODE_HC_SR04) return hcSr04IntervalMs;
  return ldrIntervalMs;
}

void emitHeartbeat() {
  Serial.print(F("{\"type\":\"heartbeat\",\"timestampMs\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

bool readDht11(float &temperatureC, float &humidityPercent) {
  humidityPercent = dht.readHumidity();
  temperatureC = dht.readTemperature();
  return !isnan(humidityPercent) && !isnan(temperatureC) &&
         humidityPercent >= 0.0f && humidityPercent <= 100.0f;
}

bool readHcSr04(unsigned long &echoDurationUs) {
  digitalWrite(HC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(HC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(HC_TRIG_PIN, LOW);
  echoDurationUs = pulseIn(HC_ECHO_PIN, HIGH, HC_TIMEOUT_US);
  return echoDurationUs > 0;
}

bool readLdr(int &adcCount) {
  adcCount = analogRead(LDR_PIN);
  return adcCount >= 0 && adcCount <= 1023;
}

bool activateDht11() {
  activeMode = MODE_NONE;
  dht.begin();
  delay(2000);  // DHT11 needs a fresh sampling interval before validation.
  float temperatureC;
  float humidityPercent;
  if (!readDht11(temperatureC, humidityPercent)) {
    emitError("DHT11_INVALID_READ", "Check power,data,pullup_and_wait");
    return false;
  }
  activeMode = MODE_DHT11;
  lastMeasurementAt = millis();
  emitAck("MODE:DHT11");
  return true;
}

bool activateHcSr04() {
  activeMode = MODE_NONE;
  pinMode(HC_TRIG_PIN, OUTPUT);
  pinMode(HC_ECHO_PIN, INPUT);
  unsigned long echoDurationUs;
  if (!readHcSr04(echoDurationUs)) {
    emitError("HC_SR04_TIMEOUT", "No_fresh_echo_within_30000us");
    return false;
  }
  activeMode = MODE_HC_SR04;
  lastMeasurementAt = millis();
  emitAck("MODE:HC_SR04");
  return true;
}

bool activateLdr() {
  activeMode = MODE_NONE;
  pinMode(LDR_PIN, INPUT);
  int adcCount;
  if (!readLdr(adcCount)) {
    emitError("LDR_INVALID_READ", "ADC_read_out_of_range");
    return false;
  }
  activeMode = MODE_LDR;
  lastMeasurementAt = millis();
  emitAck("MODE:LDR");
  return true;
}

void emitDht11Measurement() {
  float temperatureC;
  float humidityPercent;
  if (!readDht11(temperatureC, humidityPercent)) {
    emitError("DHT11_INVALID_READ", "Fresh_read_failed_no_stale_value_sent");
    return;
  }
  const unsigned long timestampMs = millis();
  Serial.print(F("{\"type\":\"measurement\",\"sensor\":\"dht11\",\"timestampMs\":"));
  Serial.print(timestampMs);
  Serial.print(F(",\"values\":[{\"metric\":\"temperature\",\"value\":"));
  Serial.print(temperatureC, 1);
  Serial.print(F(",\"unit\":\"C\"},{\"metric\":\"humidity\",\"value\":"));
  Serial.print(humidityPercent, 1);
  Serial.println(F(",\"unit\":\"%\"}]}"));
}

void emitHcSr04Measurement() {
  unsigned long echoDurationUs;
  if (!readHcSr04(echoDurationUs)) {
    emitError("HC_SR04_TIMEOUT", "Fresh_read_timed_out_no_stale_value_sent");
    return;
  }
  const float distanceCm = echoDurationUs * 0.0343f / 2.0f;
  const unsigned long timestampMs = millis();
  Serial.print(F("{\"type\":\"measurement\",\"sensor\":\"hc-sr04\",\"timestampMs\":"));
  Serial.print(timestampMs);
  Serial.print(F(",\"values\":[{\"metric\":\"distance\",\"value\":"));
  Serial.print(distanceCm, 2);
  Serial.println(F(",\"unit\":\"cm\"}]}"));
}

void emitLdrMeasurement() {
  int adcCount;
  if (!readLdr(adcCount)) {
    emitError("LDR_INVALID_READ", "Fresh_ADC_read_failed_no_stale_value_sent");
    return;
  }
  const unsigned long timestampMs = millis();
  Serial.print(F("{\"type\":\"measurement\",\"sensor\":\"ldr\",\"timestampMs\":"));
  Serial.print(timestampMs);
  Serial.print(F(",\"values\":[{\"metric\":\"relativeLight\",\"value\":"));
  Serial.print(adcCount);
  Serial.println(F(",\"unit\":\"count\"}]}"));
}

void handleCommand(const char *command) {
  if (strcmp(command, "PING") == 0) {
    emitAck("PING");
    emitHeartbeat();
  } else if (strcmp(command, "MODE:DHT11") == 0) {
    activateDht11();
  } else if (strcmp(command, "MODE:HC_SR04") == 0) {
    activateHcSr04();
  } else if (strcmp(command, "MODE:LDR") == 0) {
    activateLdr();
  } else if (strncmp(command, "SET_INTERVAL:", 13) == 0) {
    configureInterval(command);
  } else if (strcmp(command, "STOP") == 0) {
    activeMode = MODE_NONE;
    lastMeasurementAt = millis();
    emitAck("STOP");
  } else {
    emitError("UNKNOWN_COMMAND", "Use_PING,STOP,MODE_or_SET_INTERVAL");
  }
}

void readCommands() {
  while (Serial.available() > 0) {
    const char incoming = Serial.read();
    if (incoming == '\r') continue;
    if (incoming == '\n') {
      commandBuffer[commandLength] = '\0';
      if (commandLength > 0) handleCommand(commandBuffer);
      commandLength = 0;
    } else if (commandLength < sizeof(commandBuffer) - 1) {
      commandBuffer[commandLength++] = incoming;
    } else {
      commandLength = 0;
      emitError("COMMAND_TOO_LONG", "Maximum_47_bytes");
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(HC_TRIG_PIN, OUTPUT);
  digitalWrite(HC_TRIG_PIN, LOW);
  pinMode(HC_ECHO_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  dht.begin();
  emitHeartbeat();
}

void loop() {
  readCommands();
  const unsigned long now = millis();

  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    emitHeartbeat();
  }

  const unsigned long interval = activeMeasurementIntervalMs();
  if (activeMode != MODE_NONE && now - lastMeasurementAt >= interval) {
    lastMeasurementAt = now;
    if (activeMode == MODE_DHT11) emitDht11Measurement();
    else if (activeMode == MODE_HC_SR04) emitHcSr04Measurement();
    else if (activeMode == MODE_LDR) emitLdrMeasurement();
  }
}
