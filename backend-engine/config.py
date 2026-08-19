"""Configuration for the ByQuant backend signal engine."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Final

DEFAULT_SYMBOLS: Final[tuple[str, ...]] = (
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "AVAXUSDT", "NEARUSDT",
    "DOTUSDT", "ADAUSDT", "XRPUSDT", "LTCUSDT", "UNIUSDT", "ATOMUSDT",
    "ICPUSDT", "FILUSDT", "APTUSDT", "SUIUSDT", "OPUSDT", "ARBUSDT",
    "TIAUSDT", "INJUSDT", "LDOUSDT", "STXUSDT", "GRTUSDT", "IMXUSDT",
    "RENDERUSDT", "FETUSDT",
)


@dataclass(frozen=True)
class Settings:
    bybit_api_key: str
    bybit_api_secret: str
    bybit_env: str
    bybit_rest_base_url: str
    bybit_spot_ws_url: str
    middleware_webhook_url: str
    middleware_auth_token: str
    symbols: tuple[str, ...]
    candle_interval: str = "60"
    market_window_size: int = 250
    backfill_limit: int = 250
    dedupe_max_size: int = 1000
    log_level: str = "info"


def _repo_env_path() -> Path:
    return Path(__file__).resolve().parents[1] / ".env"


def _read_symbols(raw_symbols: str | None) -> tuple[str, ...]:
    raw = raw_symbols or ",".join(DEFAULT_SYMBOLS)
    seen: set[str] = set()
    symbols: list[str] = []
    for value in raw.split(","):
        symbol = value.strip().upper()
        if symbol and symbol not in seen:
            seen.add(symbol)
            symbols.append(symbol)
    if not symbols:
        raise ValueError("BYQUANT_SYMBOLS must contain at least one spot symbol")
    return tuple(symbols)


def _positive_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    value = int(raw)
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


def _required(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise ValueError(f"Missing required configuration: {name}")
    return value


def load_settings(env_path: Path | None = None) -> Settings:
    """Load and validate settings from the repository root .env and process env."""
    dotenv_path = env_path or _repo_env_path()
    if dotenv_path.exists():
        for line in dotenv_path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    bybit_env = _required("BYBIT_ENV").lower()
    if bybit_env not in {"production", "testnet"}:
        raise ValueError("BYBIT_ENV must be either production or testnet")

    default_rest = "https://api-testnet.bybit.com" if bybit_env == "testnet" else "https://api.bybit.com"
    default_ws = "wss://stream-testnet.bybit.com/v5/public/spot" if bybit_env == "testnet" else "wss://stream.bybit.com/v5/public/spot"

    return Settings(
        bybit_api_key=_required("BYBIT_API_KEY"),
        bybit_api_secret=_required("BYBIT_API_SECRET"),
        bybit_env=bybit_env,
        bybit_rest_base_url=os.getenv("BYBIT_REST_BASE_URL", default_rest),
        bybit_spot_ws_url=os.getenv("BYBIT_SPOT_WS_URL", default_ws),
        middleware_webhook_url=_required("MIDDLEWARE_WEBHOOK_URL"),
        middleware_auth_token=_required("MIDDLEWARE_AUTH_TOKEN"),
        symbols=_read_symbols(os.getenv("BYQUANT_SYMBOLS") or os.getenv("SYMBOLS")),
        candle_interval=os.getenv("CANDLE_INTERVAL", "60"),
        market_window_size=_positive_int("MARKET_WINDOW_SIZE", 250),
        backfill_limit=_positive_int("BACKFILL_LIMIT", 250),
        dedupe_max_size=_positive_int("SIGNAL_DEDUPE_MAX_SIZE", 1000),
        log_level=os.getenv("LOG_LEVEL", "info"),
    )
