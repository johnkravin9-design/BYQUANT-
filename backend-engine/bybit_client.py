"""Async Bybit V5 Spot REST and WebSocket client."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import aiohttp

from market_cache import Candle

LOGGER = logging.getLogger(__name__)


class BybitError(RuntimeError):
    pass


@dataclass(frozen=True)
class BybitClient:
    rest_base_url: str
    spot_ws_url: str
    api_key: str
    api_secret: str
    session: aiohttp.ClientSession

    async def _request(self, path: str, params: dict[str, str | int]) -> dict[str, Any]:
        url = f"{self.rest_base_url.rstrip('/')}{path}"
        delay = 1.0
        for attempt in range(5):
            try:
                timeout = aiohttp.ClientTimeout(total=15, connect=5)
                async with self.session.get(url, params=params, timeout=timeout) as response:
                    if response.status == 429 or response.status >= 500:
                        raise BybitError(f"transient Bybit REST status {response.status}")
                    data = await response.json()
                    if data.get("retCode") != 0:
                        raise BybitError(f"Bybit API error retCode={data.get('retCode')} retMsg={data.get('retMsg')}")
                    return data
            except (aiohttp.ClientError, asyncio.TimeoutError, BybitError):
                if attempt == 4:
                    raise
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
        raise BybitError("unreachable retry state")

    async def active_spot_symbols(self) -> set[str]:
        data = await self._request("/v5/market/instruments-info", {"category": "spot"})
        rows = data.get("result", {}).get("list", [])
        return {row["symbol"] for row in rows if row.get("status") == "Trading" and row.get("symbol")}

    async def validate_symbols(self, requested: tuple[str, ...]) -> tuple[str, ...]:
        active = await self.active_spot_symbols()
        valid = tuple(symbol for symbol in requested if symbol in active)
        missing = sorted(set(requested) - set(valid))
        if missing:
            LOGGER.warning("Ignoring unsupported or inactive spot symbols", extra={"symbols": missing})
        if not valid:
            raise BybitError("No configured symbols are active Bybit Spot instruments")
        return valid

    async def historical_candles(self, symbol: str, interval: str = "60", limit: int = 250) -> list[Candle]:
        data = await self._request(
            "/v5/market/kline",
            {"category": "spot", "symbol": symbol, "interval": interval, "limit": limit},
        )
        rows = data.get("result", {}).get("list", [])
        candles = [parse_rest_candle(row) for row in rows]
        return sorted(candles, key=lambda candle: candle.timestamp)

    async def stream_klines(self, symbols: tuple[str, ...], interval: str = "60") -> AsyncIterator[tuple[str, Candle]]:
        args = [f"kline.{interval}.{symbol}" for symbol in symbols]
        delay = 1.0
        while True:
            try:
                async with self.session.ws_connect(self.spot_ws_url, heartbeat=20) as ws:
                    await ws.send_json({"op": "subscribe", "args": args})
                    delay = 1.0
                    async for message in ws:
                        if message.type != aiohttp.WSMsgType.TEXT:
                            continue
                        parsed = parse_ws_message(message.data)
                        if parsed is not None:
                            yield parsed
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                LOGGER.warning("Bybit WebSocket disconnected; reconnecting", extra={"error": str(exc)})
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)


def parse_rest_candle(row: list[str]) -> Candle:
    if len(row) < 6:
        raise BybitError("Malformed REST candle")
    return Candle(
        timestamp=int(row[0]),
        open=float(row[1]),
        high=float(row[2]),
        low=float(row[3]),
        close=float(row[4]),
        volume=float(row[5]),
    )


def parse_ws_message(raw: str) -> tuple[str, Candle] | None:
    try:
        data = json.loads(raw)
        topic = data.get("topic", "")
        if not topic.startswith("kline."):
            return None
        symbol = topic.split(".")[-1]
        rows = data.get("data") or []
        row = rows[0] if rows else None
        if not row or not row.get("confirm"):
            return None
        return symbol, Candle(
            timestamp=int(row["start"]),
            open=float(row["open"]),
            high=float(row["high"]),
            low=float(row["low"]),
            close=float(row["close"]),
            volume=float(row["volume"]),
        )
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        LOGGER.warning("Ignoring malformed Bybit WebSocket message", extra={"error": str(exc)})
        return None
