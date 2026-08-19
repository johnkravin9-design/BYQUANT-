import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTelegramSignal } from "./bot.js";
import type { MarketSignal } from "./types.js";

const signal: MarketSignal = {
  id: "id-1",
  signal_id: "123e4567-e89b-12d3-a456-426614174000_(phase.6)",
  symbol: "BTCUSDT",
  direction: "BUY",
  entry_price: "123.45670000",
  stop_loss: "120.00000000",
  take_profit_1: "128.00000000",
  take_profit_2: "136.00000000",
  take_profit_3: "144.00000000",
  timeframe: "1h",
  candle_timestamp: "2026-08-19T00:00:00.000Z",
  is_active: true,
  created_at: "2026-08-19T00:01:00.000Z",
};

describe("formatTelegramSignal", () => {
  it("escapes MarkdownV2-sensitive price and identifier characters", () => {
    const message = formatTelegramSignal(signal);
    assert.ok(/Entry: 123\\\.45670000/.test(message));
    assert.ok(/Signal ID: 123e4567\\-e89b\\-12d3\\-a456\\-426614174000\\_\\\(phase\\\.6\\\)/.test(message));
  });
});
