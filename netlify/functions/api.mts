import { randomUUID } from "node:crypto";

import { getDatabase } from "@netlify/database";
import type { Config } from "@netlify/functions";

import { PostgresDatabase } from "../../api-gateway/src/db.js";
import { TelegramBroadcaster } from "../../api-gateway/src/bot.js";
import { NotificationService } from "../../api-gateway/src/notifications.js";
import { createHealthRoute } from "../../api-gateway/src/routes/healthRoutes.js";
import { createSignalRoutes } from "../../api-gateway/src/routes/signalRoutes.js";
import type { AppRequest, AppResponse, RequestHandler } from "../../api-gateway/src/server.js";
import type { Database, Notifier } from "../../api-gateway/src/types.js";

class NoopNotifier implements Notifier {
  public async notifySignal(): Promise<void> { return; }
}

function buildNotifier(database: Database): Notifier {
  const botToken = Netlify.env.get("TELEGRAM_BOT_TOKEN");
  const channelId = Netlify.env.get("TELEGRAM_CHANNEL_ID");
  const firebaseCredentialsPath = Netlify.env.get("FIREBASE_CREDENTIALS_PATH");
  if (botToken === undefined || channelId === undefined || firebaseCredentialsPath === undefined) return new NoopNotifier();
  return new NotificationService(database, new TelegramBroadcaster(botToken, channelId), firebaseCredentialsPath);
}

let handlersPromise: Promise<readonly RequestHandler[]> | undefined;

function getHandlers(): Promise<readonly RequestHandler[]> {
  if (handlersPromise === undefined) {
    handlersPromise = (async () => {
      const database: Database = new PostgresDatabase(getDatabase().pool);
      const notifier = buildNotifier(database);
      // An unconfigured shared secret must reject every webhook rather than trust a guessable default.
      const authToken = Netlify.env.get("MIDDLEWARE_AUTH_TOKEN") ?? randomUUID();
      return [createHealthRoute(() => database.healthCheck()), createSignalRoutes(database, notifier, authToken)];
    })().catch((error: unknown) => {
      handlersPromise = undefined;
      throw error;
    });
  }
  return handlersPromise;
}

export default async (req: Request): Promise<Response> => {
  try {
    const handlers = await getHandlers();
    const url = new URL(req.url);
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of req.headers) headers[key] = value;
    const body = req.method === "POST" ? await req.json() : undefined;
    const appRequest: AppRequest = { method: req.method, url, headers, body };
    const appResponse: AppResponse & { payload?: unknown } = {
      statusCode: 200,
      json(payload: unknown): void { this.payload = payload; },
    };
    for (const handler of handlers) {
      if (await handler(appRequest, appResponse)) return Response.json(appResponse.payload, { status: appResponse.statusCode });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "invalid_json" }, { status: 400 });
    console.error("Unhandled API error", { error: error instanceof Error ? error.message : "unknown" });
    return Response.json({ error: "internal_server_error" }, { status: 500 });
  }
};

export const config: Config = {
  path: ["/health", "/api/signals", "/api/signals/webhook"],
};
