import type { MarketSignal } from "./types.js";

function escapeMarkdownV2(value: string): string {
  return value.replace(/([_\\*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

export function formatTelegramSignal(signal: MarketSignal): string {
  const lines = [
    "*BYQUANT QUANTITATIVE ALERT*",
    `Asset: ${escapeMarkdownV2(signal.symbol)}`,
    `Action: ${escapeMarkdownV2(signal.direction)}`,
    `Timeframe: ${escapeMarkdownV2(signal.timeframe)}`,
    `Entry: ${escapeMarkdownV2(signal.entry_price)}`,
    `Stop Loss: ${escapeMarkdownV2(signal.stop_loss)}`,
    `TP1: ${escapeMarkdownV2(signal.take_profit_1)}`,
    `TP2: ${escapeMarkdownV2(signal.take_profit_2)}`,
    `TP3: ${escapeMarkdownV2(signal.take_profit_3)}`,
    `Signal ID: ${escapeMarkdownV2(signal.signal_id)}`,
  ];
  return lines.join("\n");
}

export class TelegramBroadcaster {
  public constructor(private readonly botToken: string, private readonly channelId: string) {}

  public async sendSignal(signal: MarketSignal): Promise<void> {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: this.channelId, text: formatTelegramSignal(signal), parse_mode: "MarkdownV2" }),
    });
    if (!response.ok) throw new Error(`Telegram delivery failed with status ${response.status}`);
  }
}
