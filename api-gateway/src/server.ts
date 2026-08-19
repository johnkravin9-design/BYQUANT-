import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { loadConfig, type ApiConfig } from "./config.js";
import { createPostgresDatabase } from "./db.js";
import { TelegramBroadcaster } from "./bot.js";
import { NotificationService } from "./notifications.js";
import { createHealthRoute } from "./routes/healthRoutes.js";
import { createSignalRoutes } from "./routes/signalRoutes.js";
import type { Database, Notifier } from "./types.js";

export interface AppRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: Record<string, string | undefined>;
  readonly body: unknown;
}

export interface AppResponse {
  statusCode: number;
  json(payload: unknown): void;
}

export type RequestHandler = (request: AppRequest, response: AppResponse) => Promise<boolean>;

class UnavailableDatabase implements Database {
  public async healthCheck(): Promise<boolean> { return false; }
  public async insertSignal(): Promise<never> { throw new Error("Database is not configured"); }
  public async getActiveSignals(): Promise<readonly []> { return []; }
  public async getFavoriteFirebaseTokens(): Promise<readonly []> { return []; }
}

class NoopNotifier implements Notifier {
  public async notifySignal(): Promise<void> { return; }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: string[] = [];
  for await (const chunk of request) chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  if (chunks.length === 0) return undefined;
  return JSON.parse(chunks.join(""));
}

function sendSafeError(response: ServerResponse, statusCode: number, error: string): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ error }));
}

function createAppResponse(response: ServerResponse): AppResponse {
  return { statusCode: 200, json(payload: unknown): void { response.statusCode = this.statusCode; response.setHeader("content-type", "application/json"); response.end(JSON.stringify(payload)); } };
}

export function createApp(options: { readonly config?: ApiConfig; readonly database?: Database; readonly notifier?: Notifier } = {}): Server {
  const config = options.config;
  const database = options.database ?? new UnavailableDatabase();
  const notifier = options.notifier ?? new NoopNotifier();
  const authToken = config?.middlewareAuthToken ?? "test-token";
  const handlers = [createHealthRoute(() => database.healthCheck()), createSignalRoutes(database, notifier, authToken)];
  return createServer(async (request, response) => {
    try {
      const origin = request.headers.origin;
      if (config?.corsOrigin !== undefined && origin === config.corsOrigin) response.setHeader("access-control-allow-origin", origin);
      if (request.method === "OPTIONS") { response.statusCode = 204; response.end(); return; }
      const appRequest: AppRequest = { method: request.method ?? "GET", url: new URL(request.url ?? "/", "http://localhost"), headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])), body: request.method === "POST" ? await readJson(request) : undefined };
      const appResponse = createAppResponse(response);
      for (const handler of handlers) if (await handler(appRequest, appResponse)) return;
      sendSafeError(response, 404, "not_found");
    } catch (error) {
      console.error("Unhandled API error", { error: error instanceof Error ? error.message : "unknown" });
      sendSafeError(response, 500, "internal_server_error");
    }
  });
}

const entrypoint = process.argv[1] ?? "";
if (entrypoint.endsWith("server.js")) {
  const config = loadConfig();
  createPostgresDatabase(config.databaseUrl)
    .then((database) => {
      const telegram = new TelegramBroadcaster(config.telegramBotToken, config.telegramChannelId);
      const notifier = new NotificationService(database, telegram, config.firebaseCredentialsPath);
      const app = createApp({ config, database, notifier });
      app.listen(config.port, () => console.log(`ByQuant API gateway listening on port ${config.port}`));
    })
    .catch((error: unknown) => {
      console.error("API gateway startup failed", { error: error instanceof Error ? error.message : "unknown" });
      process.exit(1);
    });
}
