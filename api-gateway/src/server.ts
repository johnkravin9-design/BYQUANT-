import { randomUUID } from "node:crypto";
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

const MAX_JSON_BODY_BYTES = 64 * 1024;

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: string[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const value = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    bytes += new TextEncoder().encode(value).byteLength;
    if (bytes > MAX_JSON_BODY_BYTES) {
      const error = new Error("request_body_too_large");
      error.name = "PayloadTooLargeError";
      throw error;
    }
    chunks.push(value);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(chunks.join(""));
}

function sendSafeError(response: ServerResponse, statusCode: number, error: string): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ error }));
}

function applySecurityHeaders(response: ServerResponse): void {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
}

function createAppResponse(response: ServerResponse): AppResponse {
  return { statusCode: 200, json(payload: unknown): void { response.statusCode = this.statusCode; response.setHeader("content-type", "application/json"); response.end(JSON.stringify(payload)); } };
}

export function createApp(options: { readonly config?: ApiConfig; readonly database?: Database; readonly notifier?: Notifier } = {}): Server {
  const config = options.config;
  const database = options.database ?? new UnavailableDatabase();
  const notifier = options.notifier ?? new NoopNotifier();
  // Never fall back to a guessable shared secret: an unconfigured gateway must
  // reject every webhook instead of trusting a well-known default token.
  const authToken = config?.middlewareAuthToken ?? randomUUID();
  const handlers = [createHealthRoute(() => database.healthCheck()), createSignalRoutes(database, notifier, authToken)];
  return createServer(async (request, response) => {
    try {
      const origin = request.headers.origin;
      applySecurityHeaders(response);
      const corsAllowed = config?.corsOrigin !== undefined && typeof origin === "string" && origin === config.corsOrigin;
      if (corsAllowed && typeof origin === "string") {
        response.setHeader("access-control-allow-origin", origin);
        response.setHeader("vary", "origin");
      }
      if (request.method === "OPTIONS") {
        // A preflight must advertise the allowed methods and the custom auth
        // header, otherwise browsers block every cross-origin webhook POST.
        if (corsAllowed) {
          response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
          response.setHeader("access-control-allow-headers", "content-type, x-byquant-auth");
          response.setHeader("access-control-max-age", "600");
        }
        response.statusCode = 204;
        response.end();
        return;
      }
      const appRequest: AppRequest = { method: request.method ?? "GET", url: new URL(request.url ?? "/", "http://localhost"), headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])), body: request.method === "POST" ? await readJson(request) : undefined };
      const appResponse = createAppResponse(response);
      for (const handler of handlers) if (await handler(appRequest, appResponse)) return;
      sendSafeError(response, 404, "not_found");
    } catch (error) {
      const isSyntax = error instanceof SyntaxError;
      const isTooLarge = error instanceof Error && error.name === "PayloadTooLargeError";
      if (!isSyntax && !isTooLarge) console.error("Unhandled API error", { error: error instanceof Error ? error.message : "unknown" });
      sendSafeError(response, isTooLarge ? 413 : isSyntax ? 400 : 500, isTooLarge ? "request_body_too_large" : isSyntax ? "invalid_json" : "internal_server_error");
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
