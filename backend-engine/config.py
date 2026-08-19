"""Configuration for the ByQuant backend signal engine."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Final

DEFAULT_SYMBOLS: Final[tuple[str, ...]] = (
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "DOGEUSDT",
    "ADAUSDT", "TRXUSDT", "LINKUSDT", "AVAXUSDT", "LTCUSDT", "BCHUSDT",
    "DOTUSDT", "MATICUSDT", "UNIUSDT", "ETCUSDT", "ATOMUSDT", "FILUSDT",
    "APTUSDT", "ARBUSDT", "OPUSDT", "NEARUSDT", "INJUSDT", "SUIUSDT",
    "SEIUSDT", "AAVEUSDT", "MKRUSDT", "RUNEUSDT", "ICPUSDT", "PEPEUSDT",
)


@dataclass(frozen=True)
class Settings:
    """Runtime settings loaded from environment variables."""

    bybit_rest_base_url: str
    bybit_spot_ws_url: str
    signal_webhook_url: str
    signal_webhook_shared_secret: str
    symbols: tuple[str, ...]
    candle_interval: str
    market_window_size: int
    log_level: str


def _read_symbols(raw_symbols: str | None) -> tuple[str, ...]:
    if raw_symbols is None or raw_symbols.strip() == "":
        return DEFAULT_SYMBOLS

    symbols = tuple(symbol.strip().upper() for symbol in raw_symbols.split(",") if symbol.strip())
    if not symbols:
        raise ValueError("SYMBOLS must contain at least one spot symbol")
    return symbols


def _read_positive_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None or raw_value.strip() == "":
        return default

    value = int(raw_value)
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


def load_settings() -> Settings:
    """Load settings without exposing secret values in logs or exceptions."""

    return Settings(
        bybit_rest_base_url=os.getenv("BYBIT_REST_BASE_URL", "https://api.bybit.com"),
        bybit_spot_ws_url=os.getenv("BYBIT_SPOT_WS_URL", "wss://stream.bybit.com/v5/public/spot"),
        signal_webhook_url=os.getenv("SIGNAL_WEBHOOK_URL", "http://localhost:3000/api/signals/webhook"),
        signal_webhook_shared_secret=os.getenv("SIGNAL_WEBHOOK_SHARED_SECRET", ""),
        symbols=_read_symbols(os.getenv("SYMBOLS")),
        candle_interval=os.getenv("CANDLE_INTERVAL", "60"),
        market_window_size=_read_positive_int("MARKET_WINDOW_SIZE", 300),
        log_level=os.getenv("LOG_LEVEL", "info"),
    )
