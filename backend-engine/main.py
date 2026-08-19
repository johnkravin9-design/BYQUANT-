"""ByQuant backend-engine entrypoint."""

from __future__ import annotations

import asyncio
import logging
import aiohttp

from bybit_client import BybitClient
from config import load_settings
from market_cache import MarketCache
from strategy import Signal, SignalDeduplicator, evaluate_buy_signal

LOGGER = logging.getLogger(__name__)


async def dispatch_signal(session: aiohttp.ClientSession, url: str, auth_token: str, signal: Signal) -> None:
    headers = {"x-byquant-auth": auth_token, "Content-Type": "application/json"}
    timeout = aiohttp.ClientTimeout(total=15, connect=5, sock_read=10)
    delay = 1.0
    for attempt in range(4):
        try:
            async with session.post(url, json=signal.to_payload(), headers=headers, timeout=timeout) as response:
                if 400 <= response.status < 500:
                    LOGGER.error("Permanent webhook rejection", extra={"status": response.status, "signal_id": signal.signal_id})
                    return
                if response.status >= 500:
                    raise RuntimeError(f"gateway status {response.status}")
                LOGGER.info("Signal dispatched", extra={"signal_id": signal.signal_id, "symbol": signal.symbol})
                return
        except (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError) as exc:
            if attempt == 3:
                LOGGER.error("Webhook dispatch failed", extra={"error": str(exc), "signal_id": signal.signal_id})
                return
            await asyncio.sleep(delay)
            delay = min(delay * 2, 30)


async def run() -> None:
    settings = load_settings()
    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s %(message)s")
    cache = MarketCache(settings.market_window_size)
    dedupe = SignalDeduplicator(settings.dedupe_max_size)
    async with aiohttp.ClientSession() as session:
        client = BybitClient(settings.bybit_rest_base_url, settings.bybit_spot_ws_url, settings.bybit_api_key, settings.bybit_api_secret, session)
        symbols = await client.validate_symbols(settings.symbols)
        for symbol in symbols:
            try:
                cache.extend(symbol, await client.historical_candles(symbol, settings.candle_interval, settings.backfill_limit))
            except Exception as exc:  # keep other symbols alive
                LOGGER.error("Historical backfill failed", extra={"symbol": symbol, "error": str(exc)})
        async for symbol, candle in client.stream_klines(symbols, settings.candle_interval):
            try:
                cache.upsert(symbol, candle)
                signal = evaluate_buy_signal(symbol, cache.get(symbol), settings.candle_interval)
                if signal and dedupe.mark_if_new(signal.symbol, signal.candle_timestamp, signal.direction):
                    await dispatch_signal(session, settings.middleware_webhook_url, settings.middleware_auth_token, signal)
            except Exception as exc:
                LOGGER.exception("Symbol processing failed", extra={"symbol": symbol, "error": str(exc)})


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
