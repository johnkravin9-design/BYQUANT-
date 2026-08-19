import pytest

from market_cache import Candle
from strategy import SignalDeduplicator, atr, evaluate_buy_signal, obv, rsi


def c(i: int, close: float, volume: float = 100) -> Candle:
    return Candle(i * 3600000, close, close + 1, max(close - 1, 0), close, volume)


def signal_series() -> list[Candle]:
    closes = [100,99,98,97,96,95,94,93,92,91,100,105,110,100,95,90,88,86,84,82,80,78,150]
    return [c(i, close, 100 + i) for i, close in enumerate(closes)]


def test_insufficient_data() -> None:
    assert evaluate_buy_signal("BTCUSDT", signal_series()[:10]) is None


def test_bullish_ema_alignment() -> None:
    signal = evaluate_buy_signal("BTCUSDT", signal_series())
    assert signal is not None


def test_rsi_crossing_50() -> None:
    values = [x.close for x in signal_series()]
    r = rsi(values)
    assert r[-2] <= 50 < r[-1]
    assert evaluate_buy_signal("BTCUSDT", signal_series()) is not None


def test_rsi_recovery_from_below_35() -> None:
    candles = [c(i, close) for i, close in enumerate([100,99,98,97,96,95,94,93,92,91,100,105,110,100,95,90,88,86,84,82,80,78,150])]
    r = rsi([x.close for x in candles])
    assert r[-2] < 35 <= r[-1]


def test_failure_when_rsi_condition_is_false() -> None:
    candles = signal_series() + [c(23, 98)]
    assert evaluate_buy_signal("BTCUSDT", candles) is None


def test_obv_confirmation() -> None:
    candles = signal_series()
    values = obv(candles)
    assert values[-1] > values[-3]


def test_failure_when_obv_confirmation_is_false() -> None:
    candles = signal_series()
    candles[-1] = c(22, candles[-1].close, 0)
    candles[-2] = c(21, candles[-2].close, 10000)
    assert evaluate_buy_signal("BTCUSDT", candles) is None


def test_atr_calculation() -> None:
    values = atr(signal_series())
    assert values[-1] is not None
    assert values[-1] > 0


def test_stop_loss_and_take_profits_and_valid_buy_signal() -> None:
    signal = evaluate_buy_signal("BTCUSDT", signal_series())
    assert signal is not None
    risk_offset = (signal.entry - signal.stop_loss)
    assert signal.direction == "BUY"
    assert signal.stop_loss == pytest.approx(signal.entry - risk_offset)
    assert signal.tp1 == pytest.approx(signal.entry + risk_offset * 1.5)
    assert signal.tp2 == pytest.approx(signal.entry + risk_offset * 3.0)
    assert signal.tp3 == pytest.approx(signal.entry + risk_offset * 4.5)
    assert signal.to_payload()["entry"] == round(signal.entry, 4)


def test_invalid_buy_setup() -> None:
    candles = [c(i, 100 - i) for i in range(30)]
    assert evaluate_buy_signal("BTCUSDT", candles) is None


def test_deduplicator_bounds_and_prevents_duplicates() -> None:
    dedupe = SignalDeduplicator(2)
    assert dedupe.mark_if_new("BTCUSDT", 1, "BUY") is True
    assert dedupe.mark_if_new("BTCUSDT", 1, "BUY") is False
    assert dedupe.mark_if_new("ETHUSDT", 2, "BUY") is True
    assert dedupe.mark_if_new("SOLUSDT", 3, "BUY") is True
    assert dedupe.mark_if_new("BTCUSDT", 1, "BUY") is True
