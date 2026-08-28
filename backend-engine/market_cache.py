"""Bounded rolling OHLCV market cache."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import DefaultDict


@dataclass(frozen=True)
class Candle:
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

    def __post_init__(self) -> None:
        if self.timestamp < 0:
            raise ValueError("timestamp must be non-negative")
        for field in ("open", "high", "low", "close", "volume"):
            value = getattr(self, field)
            # bool is a subclass of int, so it has to be rejected explicitly.
            if isinstance(value, bool) or not isinstance(value, int | float):
                raise ValueError(f"{field} must be a valid non-negative number")
            if value != value or value in (float("inf"), float("-inf")) or value < 0:
                raise ValueError(f"{field} must be a valid non-negative number")
        if self.high < self.low:
            raise ValueError("high must be greater than or equal to low")
        if not self.low <= self.open <= self.high:
            raise ValueError("open must fall within the low-high range")
        if not self.low <= self.close <= self.high:
            raise ValueError("close must fall within the low-high range")


class MarketCache:
    def __init__(self, max_candles: int = 250) -> None:
        if max_candles <= 0:
            raise ValueError("max_candles must be positive")
        self.max_candles = max_candles
        self._candles: DefaultDict[str, deque[Candle]] = defaultdict(deque)

    def upsert(self, symbol: str, candle: Candle) -> None:
        key = symbol.upper()
        rows = list(self._candles[key])
        replaced = False
        for index, existing in enumerate(rows):
            if existing.timestamp == candle.timestamp:
                rows[index] = candle
                replaced = True
                break
        if not replaced:
            rows.append(candle)
        rows.sort(key=lambda item: item.timestamp)
        self._candles[key] = deque(rows[-self.max_candles :], maxlen=self.max_candles)

    def extend(self, symbol: str, candles: list[Candle]) -> None:
        for candle in candles:
            self.upsert(symbol, candle)

    def get(self, symbol: str) -> list[Candle]:
        return list(self._candles[symbol.upper()])
