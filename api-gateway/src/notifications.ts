import { readFileSync } from "node:fs";

import type { Database, MarketSignal, Notifier } from "./types.js";
import { TelegramBroadcaster } from "./bot.js";

interface FirebaseCredentials { readonly project_id?: string; readonly client_email?: string; readonly private_key?: string }

export class NotificationService implements Notifier {
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
      if (credentials.project_id === undefined) throw new Error("Firebase project_id missing");
      await Promise.all(tokens.map((token) => this.sendFirebaseMessage(credentials.project_id ?? "", token, signal)));
    } catch (error) {
      console.error("Firebase notification failed", { signal_id: signal.signal_id, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  private async sendFirebaseMessage(projectId: string, token: string, signal: MarketSignal): Promise<void> {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: { token, notification: { title: `${signal.symbol} ${signal.direction}`, body: `Entry ${signal.entry_price}` }, data: { symbol: signal.symbol, entry: signal.entry_price, signal_type: signal.direction } } }),
    });
    if (!response.ok) throw new Error(`FCM delivery failed with status ${response.status}`);
  }
}
