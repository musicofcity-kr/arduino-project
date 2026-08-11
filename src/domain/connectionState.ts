import type {
  DeviceErrorMessage,
  MeasurementMessage,
  ProtocolParseError,
  ProtocolMessage,
  SensorPackId,
} from "./protocol";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "awaiting-ping-ack"
  | "ready"
  | "awaiting-mode-ack"
  | "active"
  | "error";

export type ConnectionErrorCode =
  | "ACK_TIMEOUT"
  | "SENSOR_TIMEOUT"
  | "DEVICE_ERROR"
  | "PROTOCOL_ERROR"
  | "UNEXPECTED_ACK"
  | "MODE_MISMATCH"
  | "UNEXPECTED_MEASUREMENT";

export interface ConnectionError {
  code: ConnectionErrorCode;
  message: string;
  deviceCode?: string;
}

export interface ConnectionState {
  status: ConnectionStatus;
  requestedMode: SensorPackId | null;
  activeMode: SensorPackId | null;
  currentMeasurement: MeasurementMessage | null;
  lastMeasurementReceivedAtMs: number | null;
  lastHeartbeatReceivedAtMs: number | null;
  deadlineAtMs: number | null;
  error: ConnectionError | null;
}

export interface ConnectionTimeouts {
  ackTimeoutMs: number;
  measurementTimeoutMs: number;
}

export const DEFAULT_CONNECTION_TIMEOUTS: Readonly<ConnectionTimeouts> = {
  ackTimeoutMs: 2_000,
  measurementTimeoutMs: 3_000,
};

export type ConnectionEvent =
  | { type: "CONNECT_REQUESTED" }
  | { type: "PORT_OPENED"; nowMs: number }
  | { type: "MODE_REQUESTED"; mode: SensorPackId; nowMs: number }
  | { type: "MESSAGE_RECEIVED"; message: ProtocolMessage; receivedAtMs: number }
  | { type: "INVALID_MESSAGE"; error: ProtocolParseError }
  | { type: "TICK"; nowMs: number }
  | { type: "DISCONNECTED" };

export function createInitialConnectionState(): ConnectionState {
  return {
    status: "disconnected",
    requestedMode: null,
    activeMode: null,
    currentMeasurement: null,
    lastMeasurementReceivedAtMs: null,
    lastHeartbeatReceivedAtMs: null,
    deadlineAtMs: null,
    error: null,
  };
}

function safeNow(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function failState(state: ConnectionState, error: ConnectionError): ConnectionState {
  return {
    ...state,
    status: "error",
    activeMode: null,
    currentMeasurement: null,
    lastMeasurementReceivedAtMs: null,
    deadlineAtMs: null,
    error,
  };
}

function deviceError(state: ConnectionState, message: DeviceErrorMessage): ConnectionState {
  return failState(state, {
    code: "DEVICE_ERROR",
    deviceCode: message.code,
    message: message.message,
  });
}

function receiveMessage(
  state: ConnectionState,
  message: ProtocolMessage,
  receivedAtMs: number,
): ConnectionState {
  if (!safeNow(receivedAtMs)) {
    return failState(state, { code: "PROTOCOL_ERROR", message: "invalid receive timestamp" });
  }

  if (message.kind === "error") return deviceError(state, message);

  if (message.kind === "heartbeat" || message.kind === "ping") {
    return { ...state, lastHeartbeatReceivedAtMs: receivedAtMs };
  }

  if (message.kind === "ack") {
    if (state.status === "awaiting-ping-ack") {
      if (message.command !== "PING" && message.command !== "UNSPECIFIED") {
        return failState(state, {
          code: "UNEXPECTED_ACK",
          message: "expected PING acknowledgement",
        });
      }
      return {
        ...state,
        status: "ready",
        deadlineAtMs: null,
        error: null,
      };
    }

    if (state.status === "awaiting-mode-ack" && state.requestedMode) {
      if (message.command !== "MODE" && message.command !== "UNSPECIFIED") {
        return failState(state, {
          code: "UNEXPECTED_ACK",
          message: "expected MODE acknowledgement",
        });
      }
      if (message.mode && message.mode !== state.requestedMode) {
        return failState(state, {
          code: "MODE_MISMATCH",
          message: "acknowledged mode does not match the requested mode",
        });
      }
      return {
        ...state,
        status: "active",
        activeMode: state.requestedMode,
        requestedMode: null,
        currentMeasurement: null,
        lastMeasurementReceivedAtMs: null,
        deadlineAtMs: null,
        error: null,
      };
    }

    return failState(state, {
      code: "UNEXPECTED_ACK",
      message: "acknowledgement arrived without a pending command",
    });
  }

  if (message.kind === "measurement") {
    if (state.status !== "active" || message.sensor !== state.activeMode) {
      return failState(state, {
        code: "UNEXPECTED_MEASUREMENT",
        message: "measurement arrived before a matching mode acknowledgement",
      });
    }
    return {
      ...state,
      currentMeasurement: message,
      lastMeasurementReceivedAtMs: receivedAtMs,
      error: null,
    };
  }

  return state;
}

export function transitionConnection(
  state: ConnectionState,
  event: ConnectionEvent,
  timeouts: Readonly<ConnectionTimeouts> = DEFAULT_CONNECTION_TIMEOUTS,
): ConnectionState {
  if (event.type === "DISCONNECTED") return createInitialConnectionState();

  if (event.type === "CONNECT_REQUESTED") {
    return { ...createInitialConnectionState(), status: "connecting" };
  }

  if (event.type === "PORT_OPENED") {
    if (state.status !== "connecting" || !safeNow(event.nowMs)) return state;
    return {
      ...state,
      status: "awaiting-ping-ack",
      deadlineAtMs: event.nowMs + timeouts.ackTimeoutMs,
      error: null,
    };
  }

  if (event.type === "MODE_REQUESTED") {
    if ((state.status !== "ready" && state.status !== "active") || !safeNow(event.nowMs)) {
      return state;
    }
    return {
      ...state,
      status: "awaiting-mode-ack",
      requestedMode: event.mode,
      activeMode: null,
      currentMeasurement: null,
      lastMeasurementReceivedAtMs: null,
      deadlineAtMs: event.nowMs + timeouts.ackTimeoutMs,
      error: null,
    };
  }

  if (event.type === "INVALID_MESSAGE") {
    return failState(state, {
      code: "PROTOCOL_ERROR",
      message: `${event.error.code}: ${event.error.message}`,
    });
  }

  if (event.type === "MESSAGE_RECEIVED") {
    return receiveMessage(state, event.message, event.receivedAtMs);
  }

  if (event.type === "TICK") {
    if (!safeNow(event.nowMs)) return state;
    if (
      (state.status === "awaiting-ping-ack" || state.status === "awaiting-mode-ack") &&
      state.deadlineAtMs !== null &&
      event.nowMs >= state.deadlineAtMs
    ) {
      return failState(state, {
        code: "ACK_TIMEOUT",
        message: "the Arduino did not acknowledge the pending command in time",
      });
    }

    if (
      state.status === "active" &&
      state.lastMeasurementReceivedAtMs !== null &&
      event.nowMs - state.lastMeasurementReceivedAtMs >= timeouts.measurementTimeoutMs
    ) {
      return failState(state, {
        code: "SENSOR_TIMEOUT",
        message: "sensor data timed out; the previous value is no longer current",
      });
    }
  }

  return state;
}

