export interface SignalPayload {
  readonly signal_id: string;
  readonly symbol: string;
  readonly direction: "BUY";
  readonly entry: number | string;
  readonly stop_loss: number | string;
  readonly tp1: number | string;
  readonly tp2: number | string;
  readonly tp3: number | string;
  readonly timeframe: "1h";
  readonly candle_timestamp: string | number;
}

export interface NormalizedSignalPayload {
  readonly signal_id: string;
  readonly symbol: string;
  readonly direction: "BUY";
  readonly entry: number;
  readonly stop_loss: number;
  readonly tp1: number;
  readonly tp2: number;
  readonly tp3: number;
  readonly timeframe: "1h";
  readonly candle_timestamp: string;
}

export interface MarketSignal {
  readonly id: string;
  readonly signal_id: string;
  readonly symbol: string;
  readonly direction: "BUY";
  readonly entry_price: string;
  readonly stop_loss: string;
  readonly take_profit_1: string;
  readonly take_profit_2: string;
  readonly take_profit_3: string;
  readonly timeframe: "1h";
  readonly candle_timestamp: string;
  readonly is_active: boolean;
  readonly created_at: string;
}

export interface User {
  readonly id: string;
  readonly telegram_chat_id: string | null;
  readonly firebase_token: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Favorite {
  readonly id: string;
  readonly user_id: string;
  readonly symbol: string;
  readonly created_at: string;
}

export interface ApiResponse<T> {
  readonly data: T;
}

export interface ErrorResponse {
  readonly error: string;
  readonly details?: readonly ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

export interface SignalInsertResult {
  readonly inserted: boolean;
  readonly signal: MarketSignal;
}

export interface Database {
  healthCheck(): Promise<boolean>;
  insertSignal(signal: NormalizedSignalPayload): Promise<SignalInsertResult>;
  getActiveSignals(filters: { readonly symbol?: string; readonly limit: number }): Promise<readonly MarketSignal[]>;
  getFavoriteFirebaseTokens(symbol: string): Promise<readonly string[]>;
}

export interface Notifier {
  notifySignal(signal: MarketSignal): Promise<void>;
}
