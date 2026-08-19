"""ByQuant spot BUY signal strategy."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import asdict, dataclass
from uuid import uuid4

from market_cache import Candle


@dataclass(frozen=True)
class Signal:
    signal_id: str
    symbol: str
    direction: str
    entry: float
    stop_loss: float
    tp1: float
    tp2: float
    tp3: float
    timeframe: str
    candle_timestamp: int

    def to_payload(self) -> dict[str, str | int]:
        payload = asdict(self)
        for key in ("entry", "stop_loss", "tp1", "tp2", "tp3"):
            payload[key] = f"{getattr(self, key):.4f}"
        return payload


class SignalDeduplicator:
    def __init__(self, max_size: int = 1000) -> None:
        self.max_size = max_size
        self._seen: OrderedDict[tuple[str, int, str], None] = OrderedDict()

    def mark_if_new(self, symbol: str, candle_timestamp: int, direction: str) -> bool:
        key = (symbol.upper(), candle_timestamp, direction.upper())
        if key in self._seen:
            return False
        self._seen[key] = None
        while len(self._seen) > self.max_size:
            self._seen.popitem(last=False)
        return True


def ema(values: list[float], period: int) -> list[float | None]:
    result: list[float | None] = [None] * len(values)
    if len(values) < period:
        return result
    average = sum(values[:period]) / period
    result[period - 1] = average
    multiplier = 2 / (period + 1)
    for index in range(period, len(values)):
        average = (values[index] - average) * multiplier + average
        result[index] = average
    return result


def rsi(values: list[float], period: int = 14) -> list[float | None]:
    result: list[float | None] = [None] * len(values)
    if len(values) <= period:
        return result
    gains = [max(values[i] - values[i - 1], 0) for i in range(1, period + 1)]
    losses = [max(values[i - 1] - values[i], 0) for i in range(1, period + 1)]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    result[period] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + (avg_gain / avg_loss)))
    for index in range(period + 1, len(values)):
        change = values[index] - values[index - 1]
        avg_gain = ((avg_gain * (period - 1)) + max(change, 0)) / period
        avg_loss = ((avg_loss * (period - 1)) + max(-change, 0)) / period
        result[index] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + (avg_gain / avg_loss)))
    return result


def obv(candles: list[Candle]) -> list[float]:
    result = [0.0]
    for index in range(1, len(candles)):
        previous = result[-1]
        if candles[index].close > candles[index - 1].close:
            result.append(previous + candles[index].volume)
        elif candles[index].close < candles[index - 1].close:
            result.append(previous - candles[index].volume)
        else:
            result.append(previous)
    return result


def atr(candles: list[Candle], period: int = 14) -> list[float | None]:
    result: list[float | None] = [None] * len(candles)
    if len(candles) <= period:
        return result
    trs: list[float] = []
    for index, candle in enumerate(candles):
        if index == 0:
            trs.append(candle.high - candle.low)
        else:
            prev_close = candles[index - 1].close
            trs.append(max(candle.high - candle.low, abs(candle.high - prev_close), abs(candle.low - prev_close)))
    current = sum(trs[1 : period + 1]) / period
    result[period] = current
    for index in range(period + 1, len(candles)):
        current = ((current * (period - 1)) + trs[index]) / period
        result[index] = current
    return result


def evaluate_buy_signal(symbol: str, candles: list[Candle], timeframe: str = "60") -> Signal | None:
    if len(candles) < 22:
        return None
    closes = [candle.close for candle in candles]
    ema9 = ema(closes, 9)
    ema21 = ema(closes, 21)
    rsi14 = rsi(closes, 14)
    obv_values = obv(candles)
    atr14 = atr(candles, 14)
    idx = len(candles) - 1
    if any(value is None for value in (ema9[idx], ema21[idx], rsi14[idx], rsi14[idx - 1], atr14[idx])):
        return None
    momentum = (rsi14[idx - 1] <= 50 < rsi14[idx]) or (rsi14[idx - 1] < 35 <= rsi14[idx])  # type: ignore[operator]
    volume_ok = idx >= 2 and obv_values[idx] > obv_values[idx - 2]
    if not (closes[idx] > ema9[idx] and ema9[idx] > ema21[idx] and momentum and volume_ok):  # type: ignore[operator]
        return None
    entry = closes[idx]
    risk_offset = atr14[idx] * 2.0  # type: ignore[operator]
    return Signal(
        signal_id=str(uuid4()),
        symbol=symbol.upper(),
        direction="BUY",
        entry=entry,
        stop_loss=entry - risk_offset,
        tp1=entry + risk_offset * 1.5,
        tp2=entry + risk_offset * 3.0,
        tp3=entry + risk_offset * 4.5,
        timeframe=timeframe,
        candle_timestamp=candles[idx].timestamp,
    )
