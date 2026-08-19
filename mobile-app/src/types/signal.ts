export type SignalDirection = 'BUY';

export interface Signal {
  signal_id: string;
  symbol: string;
  direction: SignalDirection;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  timeframe: string;
  candle_timestamp: string;
  is_active: boolean;
  created_at: string;
}
