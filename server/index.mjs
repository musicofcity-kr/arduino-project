import path from "node:path";
import { pathToFileURL } from "node:url";
import { createAppServer } from "./app.mjs";
import { DEFAULT_DATA_FILE, JsonDataStore } from "./dataStore.mjs";

function parsePort(value) {
  const port = Number(value ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535.");
  }
  return port;
}

function configuredOrigins() {
  const value = process.env.ARDUINO_ALLOWED_ORIGINS;
  return value ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : undefined;
}

export function startServer() {
  const host = process.env.HOST ?? "127.0.0.1";
  const port = parsePort(process.env.PORT);
  const dataFile = process.env.ARDUINO_DATA_FILE
    ? path.resolve(process.env.ARDUINO_DATA_FILE)
    : DEFAULT_DATA_FILE;
  const server = createAppServer({
    store: new JsonDataStore(dataFile),
    allowedOrigins: configuredOrigins(),
  });

  server.listen(port, host, () => {
    console.log(`Arduino inquiry API listening on http://${host}:${port}`);
    console.log(`Measurement storage: ${dataFile}`);
  });
  return server;
}

const invokedFile = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedFile === import.meta.url) {
  startServer();
}
