import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

import type { Database, MarketSignal, Notifier } from "./types.js";
import { TelegramBroadcaster } from "./bot.js";

interface FirebaseCredentials { readonly project_id?: string; readonly client_email?: string; readonly private_key?: string }

interface CachedAccessToken { readonly token: string; readonly expiresAtMs: number }

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_EXPIRY_SKEW_MS = 60_000;

function base64Url(input: string | Uint8Array): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Builds the RS256 service-account assertion Google exchanges for an access token. */
export function buildServiceAccountAssertion(clientEmail: string, privateKey: string, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({ iss: clientEmail, scope: FCM_SCOPE, aud: GOOGLE_TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  // Credential files store the PEM with escaped newlines; restore them before signing.
  const pem = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
  return `${header}.${claims}.${base64Url(signer.sign(pem))}`;
}

export class NotificationService implements Notifier {
  private accessToken: CachedAccessToken | null = null;

  public constructor(
    private readonly database: Database,
    private readonly telegram: TelegramBroadcaster,
    private readonly firebaseCredentialsPath: string,
  ) {}

  public async notifySignal(signal: MarketSignal): Promise<void> {
    const tasks = [this.safeTelegram(signal), this.safeFirebase(signal)];
    await Promise.all(tasks);
  }

  private async safeTelegram(signal: MarketSignal): Promise<void> {
    try {
      await this.telegram.sendSignal(signal);
    } catch (error) {
      console.error("Telegram notification failed", { signal_id: signal.signal_id, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  private async safeFirebase(signal: MarketSignal): Promise<void> {
    try {
      const tokens = await this.database.getFavoriteFirebaseTokens(signal.symbol);
      if (tokens.length === 0) return;
      const credentials = JSON.parse(readFileSync(this.firebaseCredentialsPath, "utf8")) as FirebaseCredentials;
      const projectId = credentials.project_id;
      const clientEmail = credentials.client_email;
      const privateKey = credentials.private_key;
      if (projectId === undefined || clientEmail === undefined || privateKey === undefined) {
        throw new Error("Firebase credentials must contain project_id, client_email and private_key");
      }
      const accessToken = await this.getAccessToken(clientEmail, privateKey);
      // One rejected device token must not cancel delivery to the remaining ones.
      const results = await Promise.allSettled(tokens.map((token) => this.sendFirebaseMessage(projectId, accessToken, token, signal)));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) console.error("Some Firebase deliveries failed", { signal_id: signal.signal_id, failed, total: tokens.length });
    } catch (error) {
      console.error("Firebase notification failed", { signal_id: signal.signal_id, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  private async getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    const cached = this.accessToken;
    if (cached !== null && cached.expiresAtMs - TOKEN_EXPIRY_SKEW_MS > Date.now()) return cached.token;
    const assertion = buildServiceAccountAssertion(clientEmail, privateKey, Math.floor(Date.now() / 1000));
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(assertion)}`,
    });
    if (!response.ok) throw new Error(`Google token exchange failed with status ${response.status}`);
    const payload = (await response.json()) as { access_token?: string; expires_in?: number };
    if (typeof payload.access_token !== "string") throw new Error("Google token exchange returned no access_token");
    const expiresInSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
    this.accessToken = { token: payload.access_token, expiresAtMs: Date.now() + expiresInSeconds * 1000 };
    return payload.access_token;
  }

  private async sendFirebaseMessage(projectId: string, accessToken: string, token: string, signal: MarketSignal): Promise<void> {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message: { token, notification: { title: `${signal.symbol} ${signal.direction}`, body: `Entry ${signal.entry_price}` }, data: { symbol: signal.symbol, entry: signal.entry_price, signal_type: signal.direction } } }),
    });
    if (!response.ok) throw new Error(`FCM delivery failed with status ${response.status}`);
  }
}
