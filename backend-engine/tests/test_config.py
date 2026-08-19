from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from config import load_settings

BASE_ENV = {
    "BYBIT_API_KEY": "key",
    "BYBIT_API_SECRET": "secret",
    "BYBIT_ENV": "testnet",
    "MIDDLEWARE_WEBHOOK_URL": "http://gateway/webhook",
    "MIDDLEWARE_AUTH_TOKEN": "token",
}


def test_valid_configuration() -> None:
    with patch.dict(os.environ, {**BASE_ENV, "BYQUANT_SYMBOLS": "btcusdt,ETHUSDT,btcusdt"}, clear=True):
        settings = load_settings()
    assert settings.symbols == ("BTCUSDT", "ETHUSDT")
    assert settings.bybit_spot_ws_url == "wss://stream-testnet.bybit.com/v5/public/spot"


def test_missing_credentials() -> None:
    with patch.dict(os.environ, {"BYBIT_ENV": "testnet"}, clear=True):
        with pytest.raises(ValueError, match="BYBIT_API_KEY"):
            load_settings()


def test_test_environment_handling() -> None:
    with patch.dict(os.environ, BASE_ENV, clear=True):
        settings = load_settings()
    assert settings.bybit_env == "testnet"
    assert settings.bybit_rest_base_url == "https://api-testnet.bybit.com"


def test_production_must_be_explicit() -> None:
    env = {k: v for k, v in BASE_ENV.items() if k != "BYBIT_ENV"}
    with patch.dict(os.environ, env, clear=True):
        with pytest.raises(ValueError, match="BYBIT_ENV"):
            load_settings()
