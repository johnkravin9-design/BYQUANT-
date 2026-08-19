from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from unittest.mock import patch

from config import DEFAULT_SYMBOLS, load_settings


class SettingsTests(unittest.TestCase):
    def test_load_settings_uses_default_spot_symbols(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            settings = load_settings()

        self.assertEqual(settings.symbols, DEFAULT_SYMBOLS)
        self.assertEqual(len(settings.symbols), 30)
        self.assertEqual(settings.market_window_size, 300)

    def test_load_settings_parses_configurable_symbols(self) -> None:
        with patch.dict(os.environ, {"SYMBOLS": "btcusdt, ethusdt"}, clear=True):
            settings = load_settings()

        self.assertEqual(settings.symbols, ("BTCUSDT", "ETHUSDT"))

    def test_market_window_size_must_be_positive(self) -> None:
        with patch.dict(os.environ, {"MARKET_WINDOW_SIZE": "0"}, clear=True):
            with self.assertRaisesRegex(ValueError, "MARKET_WINDOW_SIZE"):
                load_settings()


if __name__ == "__main__":
    unittest.main()
