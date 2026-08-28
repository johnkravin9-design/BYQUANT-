CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id TEXT UNIQUE,
    firebase_token TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS market_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    entry_price NUMERIC(20,8) NOT NULL,
    stop_loss NUMERIC(20,8) NOT NULL,
    take_profit_1 NUMERIC(20,8) NOT NULL,
    take_profit_2 NUMERIC(20,8) NOT NULL,
    take_profit_3 NUMERIC(20,8) NOT NULL,
    timeframe TEXT NOT NULL,
    candle_timestamp TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_market_signals_direction CHECK (direction = 'BUY'),
    CONSTRAINT chk_market_signals_timeframe CHECK (timeframe = '1h'),
    CONSTRAINT chk_market_signals_prices CHECK (
        entry_price > 0
        AND stop_loss > 0
        AND take_profit_1 > 0
        AND take_profit_2 > 0
        AND take_profit_3 > 0
        AND stop_loss < entry_price
        AND take_profit_1 > entry_price
        AND take_profit_2 > take_profit_1
        AND take_profit_3 > take_profit_2
    )
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_symbol ON user_favorites(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_user_favorites_symbol_user ON user_favorites(symbol, user_id);
CREATE INDEX IF NOT EXISTS idx_market_signals_symbol_active_created_at ON market_signals(symbol, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_signals_active_created_at ON market_signals(is_active, created_at DESC);
