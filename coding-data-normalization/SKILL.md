---
name: coding-data-normalization
description: Exchange data normalization layer: typed dataclasses for ticker/trade/orderbook, exchange-specific parsing, and symbol format standardization
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: data normalization, data-normalization, exchange, layer, typed
---

# Skill: coding-data-normalization

# Exchange data normalization layer: typed dataclasses for ticker/trade/orderbook, exchange-specific parsing, and symbol format standardization

## Role / Purpose

This skill covers how to normalize raw exchange data — arriving in wildly different shapes from Binance, Coinbase, Kraken, etc. — into a single canonical format. Normalization happens at the I/O boundary. Once inside the system, all code works with `NormalizedTicker`, `NormalizedTrade`, or `NormalizedOrderBook` and never reads exchange-specific field names.

---

## Key Patterns

### 1. Normalized Dataclasses — Canonical Format

Three dataclasses define the internal representation for every type of market data. All optional fields are `Optional` — missing data is `None`, not a sentinel string.

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class NormalizedTicker:
    """Normalized ticker data — exchange-agnostic."""
    symbol: str
    exchange: str
    timestamp: datetime
    last: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    base_volume: Optional[float] = None
    quote_volume: Optional[float] = None


@dataclass
class NormalizedTrade:
    """Normalized trade data — exchange-agnostic."""
    symbol: str
    exchange: str
    timestamp: datetime
    price: float
    amount: float
    side: str            # 'buy' or 'sell'
    trade_id: Optional[str] = None


@dataclass
class NormalizedOrderBook:
    """Normalized order book data — exchange-agnostic."""
    symbol: str
    exchange: str
    timestamp: datetime
    bids: list[tuple[float, float]]   # (price, amount), best bid first
    asks: list[tuple[float, float]]   # (price, amount), best ask first
    sequence: Optional[int] = None
```

---

### 2. `DataNormalizer` — Exchange-Specific Field Mapping

The normalizer class knows how to parse each exchange's raw payload. All mapping is isolated inside `DataNormalizer` — nothing outside it needs to know Binance uses `'s'` for symbol or `'T'` for timestamp.

```python
from typing import Dict, Any

class DataNormalizer:
    """Normalizes exchange data to common format."""

    def __init__(self):
        self.sequence_numbers: Dict[str, int] = {}
```

---

### 3. `normalize_ticker()` — Exchange-Specific Mapping (Binance vs Coinbase)

```python
    def normalize_ticker(self, exchange: str, raw: Dict[str, Any]) -> NormalizedTicker:
        """Normalize ticker data."""
        if exchange == 'binance':
            return NormalizedTicker(
                symbol=self._parse_symbol(raw.get('s', '')),
                exchange=exchange,
                timestamp=datetime.fromtimestamp(raw.get('T', 0) / 1000),
                last=float(raw.get('c', 0)),
                bid=float(raw.get('b', 0)),
                ask=float(raw.get('a', 0)),
                base_volume=float(raw.get('v', 0)),
                quote_volume=float(raw.get('q', 0)),
            )
        elif exchange == 'coinbase':
            return NormalizedTicker(
                symbol=self._parse_symbol(raw.get('product_id', '')),
                exchange=exchange,
                timestamp=datetime.fromisoformat(raw.get('time', '2000-01-01')),
                last=float(raw.get('price', 0)),
                bid=float(raw.get('best_bid', 0)),
                ask=float(raw.get('best_ask', 0)),
                base_volume=float(raw.get('volume_24h', 0)),
            )
        # Raise for unknown exchanges rather than returning partial data
        raise ValueError(f"Unknown exchange: {exchange}")
```

---

### 4. `normalize_trade()` — Side Inference from `tick_direction`

When the raw payload omits `'side'`, it's inferred from `tick_direction` rather than returning an empty string or crashing. This keeps the `NormalizedTrade.side` field always populated.

```python
    def normalize_trade(self, exchange: str, raw: Dict[str, Any]) -> NormalizedTrade:
        """Normalize trade data."""
        side = raw.get('side', '').lower()

        if not side:
            # Infer side from tick direction when missing
            side = 'buy' if raw.get('tick_direction', 0) == 0 else 'sell'

        return NormalizedTrade(
            symbol=self._parse_symbol(
                raw.get('symbol', raw.get('product_id', ''))
            ),
            exchange=exchange,
            timestamp=datetime.fromtimestamp(
                raw.get('time', raw.get('timestamp', 0)) / 1000
            ),
            price=float(raw.get('price', 0)),
            amount=float(raw.get('size', raw.get('amount', 0))),
            side=side,
            trade_id=raw.get('trade_id', raw.get('id', '')),
        )
```

---

### 5. `normalize_orderbook()` — Depth Limiting with `[:depth]`

Order books are trimmed to `depth` levels at parse time. Both list-style (`[price, amount]`) and dict-style (`{'price': ..., 'size': ...}`) level formats are handled in the inner `parse_book` function.

```python
    def normalize_orderbook(
        self,
        exchange: str,
        raw: Dict[str, Any],
        depth: int = 20,
    ) -> NormalizedOrderBook:
        """Normalize order book data."""
        def parse_book(data: list, is_bids: bool) -> list:
            """Parse order book levels — handle both list and dict formats."""
            result = []
            for level in data[:depth]:
                if isinstance(level, list):
                    price, amount = float(level[0]), float(level[1])
                else:
                    price, amount = float(level['price']), float(level['size'])
                result.append((price, amount))
            return result

        bids = parse_book(raw.get('bids', []), True)
        asks = parse_book(raw.get('asks', []), False)

        return NormalizedOrderBook(
            symbol=self._parse_symbol(raw.get('symbol', '')),
            exchange=exchange,
            timestamp=datetime.now(),
            bids=bids,
            asks=asks,
            sequence=raw.get('sequence', raw.get('seqNum')),
        )
```

---

### 6. `_parse_symbol()` — Symbol Format Standardization

Handles three input formats and always returns `BASE/QUOTE` format:
- Already has `/` → passthrough
- Has `-` (Coinbase style: `BTC-USD`) → replace with `/`
- No separator (Binance style: `BTCUSDT`) → insert `/` before known suffixes

```python
    def _parse_symbol(self, symbol: str) -> str:
        """Standardize symbol format to BASE/QUOTE."""
        # Passthrough — already normalized
        if '/' in symbol:
            return symbol

        # Coinbase: BTC-USD → BTC/USD
        if '-' in symbol:
            return symbol.replace('-', '/')

        # Binance: BTCUSDT → BTC/USDT
        for suffix in ['USDT', 'USD', 'BTC', 'ETH']:
            if symbol.endswith(suffix):
                return f"{symbol[:-len(suffix)]}/{suffix}"

        # Unknown format — return as-is rather than crash
        return symbol
```

---

## Code Examples

### Normalizing Binance WebSocket Ticker

```python
normalizer = DataNormalizer()

# Raw Binance 24hr ticker WebSocket message
raw_binance = {
    's': 'BTCUSDT',
    'T': 1713600000000,
    'c': '65000.00',
    'b': '64999.50',
    'a': '65000.50',
    'v': '12345.67',
    'q': '802345678.90',
}

ticker = normalizer.normalize_ticker('binance', raw_binance)
print(ticker.symbol)          # BTC/USDT
print(ticker.last)            # 65000.0
print(ticker.base_volume)     # 12345.67
```

### Normalizing Coinbase Trade

```python
raw_coinbase = {
    'product_id': 'BTC-USD',
    'timestamp': 1713600000000,
    'price': '65000.00',
    'size': '0.05',
    'side': 'buy',
    'trade_id': '987654321',
}

trade = normalizer.normalize_trade('coinbase', raw_coinbase)
print(trade.symbol)     # BTC/USD
print(trade.side)       # buy
print(trade.trade_id)   # 987654321
```

### Symbol Parsing Examples

```python
normalizer = DataNormalizer()

normalizer._parse_symbol('BTCUSDT')    # → BTC/USDT
normalizer._parse_symbol('ETHBTC')     # → ETH/BTC
normalizer._parse_symbol('BTC-USD')    # → BTC/USD
normalizer._parse_symbol('BTC/USDT')   # → BTC/USDT (passthrough)
normalizer._parse_symbol('SOLUSDT')    # → SOL/USDT
```

### Order Book Normalization with Depth Limiting

```python
raw_book = {
    'symbol': 'BTCUSDT',
    'bids': [
        ['65000.00', '1.5'],
        ['64999.00', '2.3'],
        # ... potentially hundreds of levels
    ],
    'asks': [
        ['65001.00', '0.8'],
        ['65002.00', '1.2'],
    ],
    'sequence': 12345678,
}

# Only top 5 levels
book = normalizer.normalize_orderbook('binance', raw_book, depth=5)
print(book.symbol)      # BTC/USDT
print(len(book.bids))   # max 5
print(book.sequence)    # 12345678
```

---

## Exchange Field Mapping Reference

| Field | Binance | Coinbase | Normalized |
|---|---|---|---|
| Symbol | `s` | `product_id` | `symbol` |
| Timestamp | `T` (ms) | `time` (ISO) | `timestamp` |
| Last price | `c` | `price` | `last` |
| Best bid | `b` | `best_bid` | `bid` |
| Best ask | `a` | `best_ask` | `ask` |
| Base volume | `v` | `volume_24h` | `base_volume` |
| Quote volume | `q` | — | `quote_volume` |

---

## Philosophy Checklist

- **Early Exit**: `normalize_ticker` raises `ValueError` for unknown exchanges rather than returning partial data
- **Parse Don't Validate**: All parsing happens inside `DataNormalizer`; handlers receive fully-typed normalized objects
- **Atomic Predictability**: All `normalize_*` methods are pure functions — same raw input always produces the same normalized output
- **Fail Fast**: Unknown exchange names raise immediately; missing fields default to `0` or `None` with explicit fallback keys
- **Intentional Naming**: `normalize_ticker`, `normalize_trade`, `normalize_orderbook`, `_parse_symbol` — every method name describes what it normalizes
