import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ApiConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly middlewareAuthToken: string;
  readonly telegramBotToken: string;
  readonly telegramChannelId: string;
  readonly firebaseCredentialsPath: string;
  readonly corsOrigin: string | undefined;
}

export type Environment = Record<string, string | undefined>;

function loadRootEnv(): void {
  const envPath = resolve(process.cwd(), "..", ".env");
  const fallback = resolve(process.cwd(), ".env");
  const path = existsSync(envPath) ? envPath : fallback;
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function readPort(env: Environment): number {
  const value = env.PORT ?? env.API_GATEWAY_PORT;
  if (value === undefined || value.trim() === "") return 3000;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }
  return parsed;
}

function required(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return value;
}

export function loadConfig(env: Environment = process.env): ApiConfig {
  loadRootEnv();
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: readPort(env),
    databaseUrl: required(env, "DATABASE_URL"),
    middlewareAuthToken: required(env, "MIDDLEWARE_AUTH_TOKEN"),
    telegramBotToken: required(env, "TELEGRAM_BOT_TOKEN"),
    telegramChannelId: required(env, "TELEGRAM_CHANNEL_ID"),
    firebaseCredentialsPath: required(env, "FIREBASE_CREDENTIALS_PATH"),
    corsOrigin: env.CORS_ORIGIN,
  };
}
