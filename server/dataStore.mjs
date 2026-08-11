import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_DATA_FILE = path.resolve(serverDirectory, "..", "runtime-data", "store.json");

function freshState() {
  return { version: 1, sessions: {} };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertValidState(state) {
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    state.version !== 1 ||
    !state.sessions ||
    typeof state.sessions !== "object" ||
    Array.isArray(state.sessions)
  ) {
    throw new Error("Stored data does not match schema version 1.");
  }
}

export class JsonDataStore {
  constructor(filePath = DEFAULT_DATA_FILE) {
    this.filePath = path.resolve(filePath);
    this.pendingWrite = Promise.resolve();
  }

  async readState() {
    try {
      const state = JSON.parse(await readFile(this.filePath, "utf8"));
      assertValidState(state);
      return state;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return freshState();
      }
      throw error;
    }
  }

  async writeState(state) {
    assertValidState(state);
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }

  runExclusive(operation) {
    const run = this.pendingWrite.then(operation, operation);
    this.pendingWrite = run.catch(() => {});
    return run;
  }

  async createSession() {
    return this.runExclusive(async () => {
      const state = await this.readState();
      const session = {
        id: `sess_${randomUUID()}`,
        createdAt: new Date().toISOString(),
        measurements: [],
      };
      state.sessions[session.id] = session;
      await this.writeState(state);
      return { id: session.id, createdAt: session.createdAt };
    });
  }

  async appendMeasurement(sessionId, measurement) {
    return this.runExclusive(async () => {
      const state = await this.readState();
      const session = state.sessions[sessionId];
      if (!session) {
        return null;
      }

      const record = {
        id: `measurement_${randomUUID()}`,
        experimentPackId: measurement.experimentPackId,
        source: clone(measurement.source),
        raw: clone(measurement.raw),
        derived: clone(measurement.derived),
        timestamp: measurement.timestamp,
        receivedAt: new Date().toISOString(),
      };
      session.measurements.push(record);
      await this.writeState(state);
      return clone(record);
    });
  }

  async listMeasurements(sessionId) {
    await this.pendingWrite;
    const state = await this.readState();
    const session = state.sessions[sessionId];
    return session ? clone(session.measurements) : null;
  }
}
