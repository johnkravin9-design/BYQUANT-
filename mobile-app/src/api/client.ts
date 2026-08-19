import {Signal} from '../types/signal';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_API_URL = 'http://localhost:3000';

export class ApiClientError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type SignalEnvelope = Signal[] | {signals: unknown} | {data: unknown};

export const getApiBaseUrl = (): string => {
  const env = typeof process !== 'undefined' ? process.env?.BYQUANT_API_URL : undefined;
  return (env && env.trim().replace(/\/$/, '')) || DEFAULT_API_URL;
};

const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSignal = (value: unknown): Signal | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const entryPrice = toNumber(item.entry_price);
  const stopLoss = toNumber(item.stop_loss);
  const takeProfit1 = toNumber(item.take_profit_1);
  const takeProfit2 = toNumber(item.take_profit_2);
  const takeProfit3 = toNumber(item.take_profit_3);
  if (
    typeof item.signal_id !== 'string' ||
    typeof item.symbol !== 'string' ||
    item.direction !== 'BUY' ||
    entryPrice === null ||
    stopLoss === null ||
    takeProfit1 === null ||
    takeProfit2 === null ||
    takeProfit3 === null ||
    typeof item.timeframe !== 'string' ||
    typeof item.candle_timestamp !== 'string' ||
    typeof item.is_active !== 'boolean' ||
    typeof item.created_at !== 'string'
  ) return null;
  return {
    signal_id: item.signal_id,
    symbol: item.symbol,
    direction: 'BUY',
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit_1: takeProfit1,
    take_profit_2: takeProfit2,
    take_profit_3: takeProfit3,
    timeframe: item.timeframe,
    candle_timestamp: item.candle_timestamp,
    is_active: item.is_active,
    created_at: item.created_at,
  };
};

export const parseSignalsResponse = (payload: unknown): Signal[] => {
  const response = payload as SignalEnvelope;
  const signals = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && 'data' in response
      ? response.data
      : response && typeof response === 'object' && 'signals' in response
        ? response.signals
        : undefined;
  if (!Array.isArray(signals)) throw new ApiClientError('Malformed signal response from API');
  const normalized = signals.map(normalizeSignal);
  if (normalized.some(signal => signal === null)) throw new ApiClientError('Malformed signal response from API');
  return (normalized as Signal[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};

export interface GetActiveSignalsParams {
  symbol?: string;
  limit?: number;
  timeoutMs?: number;
}

export const getActiveSignals = async ({symbol, limit, timeoutMs = DEFAULT_TIMEOUT_MS}: GetActiveSignalsParams = {}): Promise<Signal[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const query = new URLSearchParams();
  if (symbol) query.set('symbol', symbol);
  if (typeof limit === 'number') query.set('limit', String(limit));

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/signals${query.toString() ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiClientError(`Signal API request failed with status ${response.status}`, response.status);
    }
    return parseSignalsResponse(await response.json());
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Signal API request timed out');
    }
    throw new ApiClientError(error instanceof Error ? error.message : 'Network request failed');
  } finally {
    clearTimeout(timeout);
  }
};
