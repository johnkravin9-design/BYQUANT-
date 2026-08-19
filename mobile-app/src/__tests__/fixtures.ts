import {Signal} from '../types/signal';

export const signalFixture: Signal = {
  signal_id: 'sig-1',
  symbol: 'BTCUSDT',
  direction: 'BUY',
  entry_price: 64000,
  stop_loss: 62000,
  take_profit_1: 65000,
  take_profit_2: 66000,
  take_profit_3: 68000,
  timeframe: '1H',
  candle_timestamp: '2026-08-19T10:00:00.000Z',
  is_active: true,
  created_at: '2026-08-19T10:05:00.000Z',
};
