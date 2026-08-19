CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id TEXT UNIQUE,
    firebase_token TEXT,
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
    symbol TEXT NOT NULL,
    candle_start TIMESTAMPTZ NOT NULL,
    candle_close TIMESTAMPTZ NOT NULL,
    entry NUMERIC(20,8) NOT NULL,
    stop_loss NUMERIC(20,8) NOT NULL,
    tp1 NUMERIC(20,8) NOT NULL,
    tp2 NUMERIC(20,8) NOT NULL,
    tp3 NUMERIC(20,8) NOT NULL,
    atr NUMERIC(20,8) NOT NULL,
    strategy_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (symbol, candle_close)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_symbol ON user_favorites(symbol);
CREATE INDEX IF NOT EXISTS idx_market_signals_symbol_created_at ON market_signals(symbol, created_at DESC);
