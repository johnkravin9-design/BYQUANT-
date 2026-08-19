from market_cache import Candle, MarketCache


def c(ts: int, close: float = 1.0) -> Candle:
    return Candle(ts, close, close + 1, close - 0.5, close, 10)


def test_initial_candle_insertion() -> None:
    cache = MarketCache(3); cache.upsert("BTCUSDT", c(2))
    assert cache.get("BTCUSDT") == [c(2)]


def test_chronological_ordering() -> None:
    cache = MarketCache(5); cache.upsert("BTCUSDT", c(3)); cache.upsert("BTCUSDT", c(1)); cache.upsert("BTCUSDT", c(2))
    assert [x.timestamp for x in cache.get("BTCUSDT")] == [1, 2, 3]


def test_candle_replacement_and_duplicate_prevention() -> None:
    cache = MarketCache(5); cache.upsert("BTCUSDT", c(1, 1)); cache.upsert("BTCUSDT", c(1, 2))
    assert len(cache.get("BTCUSDT")) == 1
    assert cache.get("BTCUSDT")[0].close == 2


def test_rolling_window_eviction() -> None:
    cache = MarketCache(2); [cache.upsert("BTCUSDT", c(i)) for i in range(4)]
    assert [x.timestamp for x in cache.get("BTCUSDT")] == [2, 3]


def test_multiple_symbols() -> None:
    cache = MarketCache(2); cache.upsert("BTCUSDT", c(1)); cache.upsert("ETHUSDT", c(2))
    assert cache.get("BTCUSDT")[0].timestamp == 1
    assert cache.get("ETHUSDT")[0].timestamp == 2
