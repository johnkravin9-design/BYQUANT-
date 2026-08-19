import type { Database, NormalizedSignalPayload, Notifier, ValidationError } from "../types.js";
import type { RequestHandler } from "../server.js";

const SYMBOL_PATTERN = /^[A-Z0-9]{2,20}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readPositiveNumber(record: Record<string, unknown>, field: string, errors: ValidationError[]): number {
  const raw = record[field];
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value) || value <= 0) errors.push({ field, message: "must be a finite positive number" });
  return value;
}

export function validateSignalPayload(body: unknown): { readonly ok: true; readonly signal: NormalizedSignalPayload } | { readonly ok: false; readonly errors: readonly ValidationError[] } {
  const record = asRecord(body);
  const errors: ValidationError[] = [];
  if (record === null) return { ok: false, errors: [{ field: "body", message: "must be a JSON object" }] };
  const signalId = typeof record.signal_id === "string" ? record.signal_id.trim() : "";
  const symbol = typeof record.symbol === "string" ? record.symbol.trim() : "";
  const direction = record.direction;
  const timeframe = record.timeframe;
  if (signalId === "") errors.push({ field: "signal_id", message: "is required" });
  if (!SYMBOL_PATTERN.test(symbol)) errors.push({ field: "symbol", message: "must be a non-empty uppercase spot symbol" });
  if (direction !== "BUY") errors.push({ field: "direction", message: "must be BUY" });
  if (timeframe !== "1h") errors.push({ field: "timeframe", message: "must be 1h" });
  const entry = readPositiveNumber(record, "entry", errors);
  const stopLoss = readPositiveNumber(record, "stop_loss", errors);
  const tp1 = readPositiveNumber(record, "tp1", errors);
  const tp2 = readPositiveNumber(record, "tp2", errors);
  const tp3 = readPositiveNumber(record, "tp3", errors);
  const timestampRaw = record.candle_timestamp;
  const date = typeof timestampRaw === "number" ? new Date(timestampRaw > 10_000_000_000 ? timestampRaw : timestampRaw * 1000) : new Date(String(timestampRaw));
  if (!Number.isFinite(date.getTime())) errors.push({ field: "candle_timestamp", message: "must be a valid timestamp" });
  if (Number.isFinite(entry) && Number.isFinite(stopLoss) && !(stopLoss < entry)) errors.push({ field: "stop_loss", message: "must be less than entry" });
  if (Number.isFinite(entry) && Number.isFinite(tp1) && !(tp1 > entry)) errors.push({ field: "tp1", message: "must be greater than entry" });
  if (Number.isFinite(tp1) && Number.isFinite(tp2) && !(tp2 > tp1)) errors.push({ field: "tp2", message: "must be greater than tp1" });
  if (Number.isFinite(tp2) && Number.isFinite(tp3) && !(tp3 > tp2)) errors.push({ field: "tp3", message: "must be greater than tp2" });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, signal: { signal_id: signalId, symbol, direction: "BUY", entry, stop_loss: stopLoss, tp1, tp2, tp3, timeframe: "1h", candle_timestamp: date.toISOString() } };
}

export function createSignalRoutes(database: Database, notifier: Notifier, authToken: string): RequestHandler {
  return async (request, response) => {
    if (request.method === "POST" && request.url.pathname === "/api/signals/webhook") {
      if (request.headers["x-byquant-auth"] !== authToken) {
        response.statusCode = 401;
        response.json({ error: "unauthorized" });
        return true;
      }
      const validation = validateSignalPayload(request.body);
      if (!validation.ok) {
        response.statusCode = 400;
        response.json({ error: "invalid_signal", details: validation.errors });
        return true;
      }
      const result = await database.insertSignal(validation.signal);
      if (result.inserted) void notifier.notifySignal(result.signal);
      response.statusCode = result.inserted ? 201 : 200;
      response.json({ data: result.signal, status: result.inserted ? "created" : "exists" });
      return true;
    }
    if (request.method === "GET" && request.url.pathname === "/api/signals") {
      const symbol = request.url.searchParams.get("symbol") ?? undefined;
      const limitRaw = request.url.searchParams.get("limit");
      const limit = limitRaw === null ? 30 : Number.parseInt(limitRaw, 10);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (symbol !== undefined && !SYMBOL_PATTERN.test(symbol))) {
        response.statusCode = 400;
        response.json({ error: "invalid_query" });
        return true;
      }
      const filters = symbol === undefined ? { limit } : { symbol, limit };
      response.json({ data: await database.getActiveSignals(filters) });
      return true;
    }
    return false;
  };
}
