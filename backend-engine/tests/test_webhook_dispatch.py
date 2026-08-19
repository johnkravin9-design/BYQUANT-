from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from main import dispatch_signal
from strategy import Signal


@dataclass
class FakeResponse:
    status: int

    async def __aenter__(self) -> "FakeResponse":
        return self

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None


class FakeSession:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def post(self, url: str, json: object, headers: dict[str, str], timeout: object) -> FakeResponse:
        self.calls.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        return FakeResponse(201)


def test_dispatch_signal_sends_gateway_contract_with_auth_header() -> None:
    async def run() -> None:
        session = FakeSession()
        signal = Signal(
            signal_id="sig-python-1",
            symbol="BTCUSDT",
            direction="BUY",
            entry=64000.12345,
            stop_loss=62000.0,
            tp1=65000.0,
            tp2=66000.0,
            tp3=68000.0,
            timeframe="1h",
            candle_timestamp=1787097600000,
        )

        await dispatch_signal(session, "http://gateway/api/signals/webhook", "secret-token", signal)  # type: ignore[arg-type]

        assert len(session.calls) == 1
        call = session.calls[0]
        assert call["url"] == "http://gateway/api/signals/webhook"
        assert call["headers"]["x-byquant-auth"] == "secret-token"
        assert call["json"] == {
            "signal_id": "sig-python-1",
            "symbol": "BTCUSDT",
            "direction": "BUY",
            "entry": 64000.1234,
            "stop_loss": 62000.0,
            "tp1": 65000.0,
            "tp2": 66000.0,
            "tp3": 68000.0,
            "timeframe": "1h",
            "candle_timestamp": 1787097600000,
        }

    asyncio.run(run())
