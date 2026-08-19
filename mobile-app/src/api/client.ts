import {Signal} from '../types/signal';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_API_URL = 'http://localhost:3000';

export class ApiClientError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type SignalResponse = Signal[] | {signals: Signal[]};

export const getApiBaseUrl = (): string => {
  const env = typeof process !== 'undefined' ? process.env?.BYQUANT_API_URL : undefined;
  return (env && env.trim().replace(/\/$/, '')) || DEFAULT_API_URL;
};

const isSignal = (value: unknown): value is Signal => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.signal_id === 'string' &&
    typeof item.symbol === 'string' &&
    item.direction === 'BUY' &&
    typeof item.entry_price === 'number' &&
    typeof item.stop_loss === 'number' &&
    typeof item.take_profit_1 === 'number' &&
    typeof item.take_profit_2 === 'number' &&
    typeof item.take_profit_3 === 'number' &&
    typeof item.timeframe === 'string' &&
    typeof item.candle_timestamp === 'string' &&
    typeof item.is_active === 'boolean' &&
    typeof item.created_at === 'string'
  );
};

export const parseSignalsResponse = (payload: unknown): Signal[] => {
  const response = payload as SignalResponse;
  const signals = Array.isArray(response) ? response : response?.signals;
  if (!Array.isArray(signals) || !signals.every(isSignal)) {
    throw new ApiClientError('Malformed signal response from API');
  }
  return [...signals].sort(
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
