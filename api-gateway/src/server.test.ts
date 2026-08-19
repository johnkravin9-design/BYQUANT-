import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApp } from "./server.js";
import type { Database, MarketSignal, NormalizedSignalPayload, Notifier, SignalInsertResult } from "./types.js";

class MemoryDatabase implements Database {
  public readonly signals: MarketSignal[] = [];
  public available = true;
  public async healthCheck(): Promise<boolean> { return this.available; }
  public async insertSignal(signal: NormalizedSignalPayload): Promise<SignalInsertResult> {
    const existing = this.signals.find((item) => item.signal_id === signal.signal_id);
    if (existing !== undefined) return { inserted: false, signal: existing };
    const row: MarketSignal = { id: `id-${signal.signal_id}`, signal_id: signal.signal_id, symbol: signal.symbol, direction: signal.direction, entry_price: signal.entry.toFixed(8), stop_loss: signal.stop_loss.toFixed(8), take_profit_1: signal.tp1.toFixed(8), take_profit_2: signal.tp2.toFixed(8), take_profit_3: signal.tp3.toFixed(8), timeframe: signal.timeframe, candle_timestamp: signal.candle_timestamp, is_active: true, created_at: new Date().toISOString() };
    this.signals.unshift(row);
    return { inserted: true, signal: row };
  }
  public async getActiveSignals(filters: { readonly symbol?: string; readonly limit: number }): Promise<readonly MarketSignal[]> {
    return this.signals.filter((signal) => signal.is_active && (filters.symbol === undefined || signal.symbol === filters.symbol)).slice(0, filters.limit);
  }
  public async getFavoriteFirebaseTokens(): Promise<readonly string[]> { return []; }
}

class MockNotifier implements Notifier { public calls = 0; public async notifySignal(): Promise<void> { this.calls += 1; } }

async function withApp<T>(database: MemoryDatabase, notifier: MockNotifier, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = createApp({ config: { nodeEnv: "test", port: 0, databaseUrl: "postgresql://example", middlewareAuthToken: "secret", telegramBotToken: "telegram", telegramChannelId: "channel", firebaseCredentialsPath: "firebase.json", corsOrigin: undefined }, database, notifier });
  await new Promise<void>((resolve) => { app.listen(0, resolve); });
  const address = app.address();
  if (address === null || typeof address === "string") throw new Error("Expected an ephemeral TCP server address");
  try { return await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => app.close((error?: Error) => error === undefined ? resolve() : reject(error))); }
}

const validSignal = { signal_id: "123e4567-e89b-12d3-a456-426614174000", symbol: "BTCUSDT", direction: "BUY", entry: 123.4567, stop_loss: 120, tp1: 128, tp2: 136, tp3: 144, timeframe: "1h", candle_timestamp: "2026-08-19T00:00:00.000Z" };

async function post(baseUrl: string, body: unknown, token = "secret"): Promise<{ readonly status: number; readonly json: unknown }> {
  const response = await fetch(`${baseUrl}/api/signals/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-byquant-auth": token }, body: JSON.stringify(body) });
  return { status: response.status, json: await response.json() };
}

describe("api gateway", () => {
  it("returns health endpoint status", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok", database: "ok" });
    });
  });

  it("accepts a valid webhook and sends one notification", async () => {
    const notifier = new MockNotifier();
    await withApp(new MemoryDatabase(), notifier, async (baseUrl) => {
      const response = await post(baseUrl, validSignal);
      assert.equal(response.status, 201);
      assert.equal(notifier.calls, 1);
    });
  });

  it("rejects missing authentication", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/signals/webhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validSignal) });
      assert.equal(response.status, 401);
    });
  });

  it("rejects invalid authentication", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => assert.equal((await post(baseUrl, validSignal, "bad")).status, 401));
  });

  it("rejects malformed signal", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => assert.equal((await post(baseUrl, { symbol: "BTCUSDT" })).status, 400));
  });

  it("rejects invalid price relationships", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => assert.equal((await post(baseUrl, { ...validSignal, stop_loss: 130 })).status, 400));
  });

  it("rejects invalid direction", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => assert.equal((await post(baseUrl, { ...validSignal, direction: "SELL" })).status, 400));
  });

  it("rejects invalid timeframe", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => assert.equal((await post(baseUrl, { ...validSignal, timeframe: "60" })).status, 400));
  });

  it("handles duplicate signal_id idempotently", async () => {
    const notifier = new MockNotifier();
    await withApp(new MemoryDatabase(), notifier, async (baseUrl) => {
      assert.equal((await post(baseUrl, validSignal)).status, 201);
      assert.equal((await post(baseUrl, validSignal)).status, 200);
      assert.equal(notifier.calls, 1);
    });
  });

  it("runs a synthetic engine-to-mobile-compatible signal flow", async () => {
    const database = new MemoryDatabase();
    const notifier = new MockNotifier();
    await withApp(database, notifier, async (baseUrl) => {
      const created = await post(baseUrl, validSignal);
      assert.equal(created.status, 201);
      assert.equal(database.signals.length, 1);
      assert.equal(notifier.calls, 1);

      const duplicate = await post(baseUrl, validSignal);
      assert.equal(duplicate.status, 200);
      assert.equal(database.signals.length, 1);
      assert.equal(notifier.calls, 1);

      const response = await fetch(`${baseUrl}/api/signals?symbol=BTCUSDT&limit=10`);
      assert.equal(response.status, 200);
      const body = await response.json() as { readonly data: readonly MarketSignal[] };
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0]?.signal_id, validSignal.signal_id);
      assert.equal(body.data[0]?.symbol, "BTCUSDT");
      assert.equal(body.data[0]?.direction, "BUY");
      assert.equal(body.data[0]?.timeframe, "1h");
      assert.equal(typeof body.data[0]?.entry_price, "string");
      assert.equal(Number(body.data[0]?.entry_price), validSignal.entry);
    });
  });

  it("rejects oversized JSON request bodies", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/signals/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-byquant-auth": "secret" }, body: JSON.stringify({ padding: "x".repeat(70_000) }) });
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), { error: "request_body_too_large" });
    });
  });

  it("rejects invalid JSON request bodies", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/signals/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-byquant-auth": "secret" }, body: "{" });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "invalid_json" });
    });
  });

  it("retrieves signals and filters by symbol", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => {
      await post(baseUrl, validSignal);
      await post(baseUrl, { ...validSignal, signal_id: "sig-2", symbol: "ETHUSDT" });
      const all = await fetch(`${baseUrl}/api/signals`);
      const filtered = await fetch(`${baseUrl}/api/signals?symbol=BTCUSDT&limit=1`);
      assert.equal(all.status, 200);
      assert.equal(filtered.status, 200);
      const body = await filtered.json() as { readonly data: readonly MarketSignal[] };
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0]?.symbol, "BTCUSDT");
      assert.equal(typeof body.data[0]?.entry_price, "string");
    });
  });

  it("validates retrieval limit", async () => {
    await withApp(new MemoryDatabase(), new MockNotifier(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/signals?limit=101`);
      assert.equal(response.status, 400);
    });
  });
});
