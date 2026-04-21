---
name: trading-data-order-book
description: Order book data handling, spread calculation, liquidity measurement, and cross-exchange normalization
---

# Order Book Data Pipeline: The 5 Laws of Liquidity Analysis

**Role:** Market Microstructure Engineer — applies to order book data processing, spread analysis, liquidity measurement, and exchange normalization for algorithmic trading.

**Philosophy:** Order is Law — the order book represents the true state of market liquidity. Preserve all levels, validate每一 level's integrity, and make illegal states unrepresentable.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** An order book with misaligned levels or invalid prices is not just "bad data" — it's a corrupted state.
- **Rule:** Validate order book structure at the boundary. Reject books with mismatched bid/ask levels or invalid price/size pairs.
- **Practice:** `if not self._is_valid_order_book(): raise InvalidOrderBookError`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A bid price > ask price indicates an arbitrage opportunity that cannot persist in a valid market.
- **Rule:** Parse order book data into structures that cannot represent invalid states. Use dataclasses/Pydantic with validation.
- **Why:** Prevents entire classes of bugs where crossed/locked markets propagate through calculations.

### 3. The Law of Atomic Predictability
- **Concept:** Order book snapshots must be deterministic. Same market state = same book, always.
- **Rule:** Order book processing functions should be pure. No shared state, no side effects.
- **Defense:** Avoid in-place modifications. Return new book structures from any transformations.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** Trading against a crossed/locked market can cause catastrophic losses.
- **Rule:** If order book cannot be validated, halt immediately with a descriptive error. Do not attempt to "fix" invalid orders.
- **Result:** Trading systems only act on validated, consistent order book state.

### 5. The Law of Intentional Naming
- **Concept:** Level 2 vs Level 3 order book terminology is confusing.
- **Rule:** Use clear, consistent terminology. `OrderBookLevel` with explicit `price`, `size`, `order_count` not `bids[0]`, `asks[0]`.
- **Defense:** `order_book_depth` instead of `book_size` to avoid confusion with exchange depth metrics.

---

## Implementation Guidelines

### Structure and Patterns to Follow

1. **Level Definition**: Define strict schema for order book levels
2. **Order Book Structure**: Immutable order book with bid/ask arrays
3. **Cross/locked Market Detection**: Validate bid < ask at all times
4. **Liquidity Metrics**: Calculate spread, depth, weight, imbalance
5. **Normalization Layer**: Handle exchange-specific formats

### Common Data Structures

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Tuple
from enum import Enum


class Side(Enum):
    BID = "bid"   # Buy orders
    ASK = "ask"   # Sell orders


@dataclass(frozen=True)
class OrderBookLevel:
    """
    Single level in the order book.
    frozen=True ensures immutability = atomic predictability
    """
    price: float
    size: float
    order_count: int = 1
    
    def __post_init__(self):
        """Validate level data immediately upon creation"""
        if self.price < 0:
            raise ValueError(f"Invalid price: {self.price}")
        if self.size <= 0:
            raise ValueError(f"Invalid size: {self.size}")
        if self.order_count <= 0:
            raise ValueError(f"Invalid order count: {self.order_count}")
    
    @property
    def value(self) -> float:
        """Get total value at this level"""
        return self.price * self.size


@dataclass(frozen=True)
class OrderBook:
    """
    Complete order book with bids (buy) and asks (sell).
    Bids are sorted descending (highest first), asks ascending (lowest first).
    frozen=True ensures immutability = atomic predictability
    """
    timestamp: datetime
    symbol: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    sequence_number: Optional[int] = None
    
    def __post_init__(self):
        """Validate order book structure immediately upon creation"""
        # Check for empty book
        if not self.bids:
            raise ValueError("Order book must have at least one bid level")
        if not self.asks:
            raise ValueError("Order book must have at least one ask level")
        
        # Check bid/ask ordering
        for i in range(len(self.bids) - 1):
            if self.bids[i].price < self.bids[i + 1].price:
                raise ValueError("Bids must be sorted descending")
        
        for i in range(len(self.asks) - 1):
            if self.asks[i].price > self.asks[i + 1].price:
                raise ValueError("Asks must be sorted ascending")
        
        # Check for crossed/locked market (bid >= ask)
        best_bid = self.bids[0].price
        best_ask = self.asks[0].price
        if best_bid >= best_ask:
            raise ValueError(f"Crossed/locked market: bid ({best_bid}) >= ask ({best_ask})")
    
    @property
    def best_bid(self) -> OrderBookLevel:
        """Get best (highest) bid"""
        return self.bids[0]
    
    @property
    def best_ask(self) -> OrderBookLevel:
        """Get best (lowest) ask"""
        return self.asks[0]
    
    @property
    def bid_price(self) -> float:
        """Get best bid price"""
        return self.bids[0].price
    
    @property
    def ask_price(self) -> float:
        """Get best ask price"""
        return self.asks[0].price
    
    @property
    def spread(self) -> float:
        """Get spread in price units"""
        return self.ask_price - self.bid_price
    
    @property
    def spread_pct(self) -> float:
        """Get spread as percentage of mid price"""
        mid = (self.bid_price + self.ask_price) / 2
        return (self.ask_price - self.bid_price) / mid
    
    @property
    def mid_price(self) -> float:
        """Get mid price"""
        return (self.bid_price + self.ask_price) / 2
    
    @property
    def total_bid_size(self) -> float:
        """Get total bid size"""
        return sum(level.size for level in self.bids)
    
    @property
    def total_ask_size(self) -> float:
        """Get total ask size"""
        return sum(level.size for level in self.asks)
```

---

## Code Examples

### Example 1: Order Book Normalization Across Exchanges

```python
"""
Order Book Normalization: Convert exchange-specific formats to canonical structure
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
import aiohttp


class Exchange(Enum):
    """Supported exchanges"""
    BINANCE = "binance"
    COINBASE = "coinbase"
    KRAKEN = "kraken"
    BYBIT = "bybit"
    OKX = "okx"
    BITFINEX = "bitfinex"


@dataclass(frozen=True)
class OrderBookLevel:
    """Canonical order book level"""
    price: float
    size: float
    order_count: int = 1
    
    def __post_init__(self):
        if self.price < 0 or self.size <= 0:
            raise ValueError("Invalid order book level")


@dataclass(frozen=True)
class OrderBook:
    """Canonical order book structure"""
    timestamp: datetime
    symbol: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    sequence_number: Optional[int] = None
    
    def __post_init__(self):
        if not self.bids or not self.asks:
            raise ValueError("Order book must have bids and asks")
        
        # Validate ordering
        for i in range(len(self.bids) - 1):
            if self.bids[i].price < self.bids[i + 1].price:
                raise ValueError("Bids must be sorted descending")
        for i in range(len(self.asks) - 1):
            if self.asks[i].price > self.asks[i + 1].price:
                raise ValueError("Asks must be sorted ascending")
        
        # Validate no crossing
        if self.bids[0].price >= self.asks[0].price:
            raise ValueError(f"Crossed market: bid={self.bids[0].price}, ask={self.asks[0].price}")


class OrderBookNormalizer:
    """Normalizes order book data from various exchanges"""
    
    def __init__(self):
        self.exchange_configs = {
            Exchange.BINANCE: {
                "bids_index": 0,
                "asks_index": 1,
                "price_field": 0,
                "size_field": 1,
            },
            Exchange.COINBASE: {
                "bids_index": "bids",
                "asks_index": "asks",
            },
            Exchange.KRAKEN: {
                "bids_index": 0,
                "asks_index": 1,
            },
            Exchange.BYBIT: {
                "bids_index": "b",
                "asks_index": "a",
            },
            Exchange.OKX: {
                "bids_index": "bids",
                "asks_index": "asks",
            },
        }
    
    async def fetch_and_normalize(
        self,
        exchange: Exchange,
        symbol: str,
        depth: int = 20
    ) -> OrderBook:
        """Fetch order book from exchange and normalize to canonical structure"""
        raw_book = await self._fetch_order_book(exchange, symbol, depth)
        return self.normalize(exchange, raw_book, symbol)
    
    def normalize(
        self,
        exchange: Exchange,
        raw_book: Dict[str, Any],
        symbol: str
    ) -> OrderBook:
        """Normalize raw exchange data to canonical structure"""
        config = self.exchange_configs.get(exchange, {})
        
        # Normalize bids
        raw_bids = self._extract_levels(raw_book, exchange, "bids")
        bids = [
            OrderBookLevel(
                price=float(level[config.get("price_field", 0)]),
                size=float(level[config.get("size_field", 1)]),
                order_count=int(level[2]) if len(level) > 2 else 1
            )
            for level in raw_bids
        ]
        
        # Normalize asks
        raw_asks = self._extract_levels(raw_book, exchange, "asks")
        asks = [
            OrderBookLevel(
                price=float(level[config.get("price_field", 0)]),
                size=float(level[config.get("size_field", 1)]),
                order_count=int(level[2]) if len(level) > 2 else 1
            )
            for level in raw_asks
        ]
        
        # Sort bids descending, asks ascending
        bids.sort(key=lambda x: x.price, reverse=True)
        asks.sort(key=lambda x: x.price)
        
        # Create order book with normalized timestamp
        timestamp = self._extract_timestamp(raw_book, exchange)
        
        return OrderBook(
            timestamp=timestamp,
            symbol=symbol,
            bids=bids,
            asks=asks,
            sequence_number=self._extract_sequence(raw_book, exchange)
        )
    
    def _extract_levels(
        self,
        raw_book: Dict[str, Any],
        exchange: Exchange,
        side: str
    ) -> List:
        """Extract levels array from raw book based on exchange format"""
        config = self.exchange_configs.get(exchange, {})
        
        if exchange == Exchange.BINANCE:
            # Binance format: [timestamp, [levels], ...]
            return raw_book[config.get("bids_index" if side == "bids" else "asks_index")]
        
        elif exchange == Exchange.COINBASE:
            # Coinbase format: {"bids": [[price, size, count], ...], ...}
            return raw_book.get(config.get("bids_index" if side == "bids" else "asks_index"), [])
        
        elif exchange == Exchange.KRAKEN:
            # Kraken format: {"result": {"XBTUSD": {"bids": [[price, size, timestamp], ...]}}}
            pair = raw_book.get("pair", "XBTUSD")
            return raw_book["result"][pair][config.get("bids_index" if side == "bids" else "asks_index")]
        
        elif exchange == Exchange.BYBIT:
            # Bybit format: {"retCode": 0, "retData": {"b": [["price", size], ...], "a": [...]}}
            return raw_book["retData"].get(config.get("bids_index" if side == "bids" else "asks_index"), [])
        
        elif exchange == Exchange.OKX:
            # OKX format: {"code": 0, "data": [{"bids": [[price, size], ...], ...}]}
            return raw_book["data"][0].get(config.get("bids_index" if side == "bids" else "asks_index"), [])
        
        else:
            raise NotImplementedError(f"Exchange {exchange} not supported")
    
    def _extract_timestamp(
        self,
        raw_book: Dict[str, Any],
        exchange: Exchange
    ) -> datetime:
        """Extract timestamp from raw book"""
        if exchange == Exchange.BINANCE:
            # Binance timestamp is in milliseconds
            ts = raw_book.get("lastUpdateId", 0)
            return datetime.fromtimestamp(ts / 1000)
        elif exchange == Exchange.COINBASE:
            # Coinbase timestamp is ISO format string
            ts_str = raw_book.get("time", "")
            if ts_str:
                return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        elif exchange == Exchange.KRAKEN:
            # Kraken timestamp is Unix seconds
            ts = raw_book.get("result", {}).get("last", 0)
            return datetime.fromtimestamp(ts)
        elif exchange == Exchange.BYBIT:
            # Bybit timestamp is milliseconds
            ts = raw_book.get("retData", {}).get("ts", 0)
            return datetime.fromtimestamp(ts / 1000)
        elif exchange == Exchange.OKX:
            # OKX timestamp is milliseconds
            ts = raw_book.get("data", [{}])[0].get("timestamp", 0)
            return datetime.fromtimestamp(ts / 1000)
        return datetime.utcnow()
    
    def _extract_sequence(
        self,
        raw_book: Dict[str, Any],
        exchange: Exchange
    ) -> Optional[int]:
        """Extract sequence number from raw book"""
        if exchange == Exchange.BINANCE:
            return raw_book.get("lastUpdateId")
        elif exchange == Exchange.COINBASE:
            return raw_book.get("sequence")
        elif exchange == Exchange.BYBIT:
            return raw_book.get("retData", {}).get("seqNum")
        return None
    
    async def _fetch_order_book(
        self,
        exchange: Exchange,
        symbol: str,
        depth: int
    ) -> Dict[str, Any]:
        """Fetch order book from exchange API"""
        urls = {
            Exchange.BINANCE: f"https://api.binance.com/api/v3/depth?symbol={symbol}&limit={depth}",
            Exchange.COINBASE: f"https://api.exchange.coinbase.com/products/{symbol}/book?level=2",
            Exchange.KRAKEN: f"https://api.kraken.com/0/public/Depth?pair={symbol}&count={depth}",
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(urls[exchange]) as response:
                return await response.json()


class OrderBookAggregator:
    """Aggregates order books from multiple exchanges"""
    
    def __init__(self):
        self.normalizer = OrderBookNormalizer()
    
    async def get_aggregated_book(
        self,
        exchanges: List[Exchange],
        symbol: str
    ) -> Dict[Exchange, OrderBook]:
        """Fetch order books from multiple exchanges"""
        tasks = [
            self.normalizer.fetch_and_normalize(exchange, symbol)
            for exchange in exchanges
        ]
        results = await asyncio.gather(*tasks)
        
        return dict(zip(exchanges, results))
    
    def calculate_spread_arbitrage(
        self,
        books: Dict[Exchange, OrderBook]
    ) -> List[Dict[str, Any]]:
        """
        Calculate potential arbitrage opportunities between exchanges
        
        Returns list of profitable spread opportunities
        """
        opportunities = []
        
        exchange_list = list(books.keys())
        
        for i, buy_exc in enumerate(exchange_list):
            for sell_exc in exchange_list[i + 1:]:
                buy_book = books[buy_exc]
                sell_book = books[sell_exc]
                
                # Buy on exchange with lower ask, sell on exchange with higher bid
                if buy_book.ask_price < sell_book.bid_price:
                    spread = sell_book.bid_price - buy_book.ask_price
                    spread_pct = spread / buy_book.ask_price * 100
                    
                    # Check if spread is large enough to cover typical fees (0.1% each side)
                    if spread_pct > 0.3:  # 0.3% gross spread
                        opportunities.append({
                            "buy_exchange": buy_exc,
                            "sell_exchange": sell_exc,
                            "buy_price": buy_book.ask_price,
                            "sell_price": sell_book.bid_price,
                            "spread": spread,
                            "spread_pct": spread_pct,
                            "buy_depth": buy_book.best_ask.size,
                            "sell_depth": sell_book.best_bid.size,
                        })
        
        return opportunities


# Example usage
async def main():
    normalizer = OrderBookNormalizer()
    
    # Fetch and normalize from Binance
    book = await normalizer.fetch_and_normalize(Exchange.BINANCE, "BTCUSDT", depth=20)
    print(f"Best bid: {book.best_bid.price}, Best ask: {book.best_ask.price}")
    print(f"Spread: {book.spread} ({book.spread_pct*100:.4f}%)")
    print(f"Bids depth: {book.total_bid_size:.4f}, Asks depth: {book.total_ask_size:.4f}")
    
    # Aggregate across exchanges
    aggregator = OrderBookAggregator()
    books = await aggregator.get_aggregated_book(
        [Exchange.BINANCE, Exchange.COINBASE, Exchange.KRAKEN],
        "BTCUSDT"
    )
    
    # Find arbitrage opportunities
    opportunities = aggregator.calculate_spread_arbitrage(books)
    for opp in opportunities:
        print(f"Arbitrage: Buy on {opp['buy_exchange']}, Sell on {opp['sell_exchange']}: {opp['spread_pct']:.2f}% spread")

```

### Example 2: Order Book Spread and Liquidity Calculations

```python
"""
Order Book Analysis: Spread calculation, liquidity measurement, and imbalance analysis
"""

from datetime import datetime
from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass, field
from enum import Enum
import statistics
import numpy as np


class OrderBookLevel:
    """Canonical order book level"""
    def __init__(self, price: float, size: float, order_count: int = 1):
        if price < 0 or size <= 0:
            raise ValueError("Invalid order book level")
        self.price = price
        self.size = size
        self.order_count = order_count
    
    @property
    def value(self) -> float:
        """Get total value at this level"""
        return self.price * self.size


class OrderBook:
    """Canonical order book structure"""
    def __init__(
        self,
        timestamp: datetime,
        symbol: str,
        bids: List[OrderBookLevel],
        asks: List[OrderBookLevel],
        sequence_number: Optional[int] = None
    ):
        if not bids or not asks:
            raise ValueError("Order book must have bids and asks")
        
        # Sort bids descending, asks ascending
        self.bids = sorted(bids, key=lambda x: x.price, reverse=True)
        self.asks = sorted(asks, key=lambda x: x.price)
        
        # Validate no crossing
        if self.bids[0].price >= self.asks[0].price:
            raise ValueError(f"Crossed market: bid={self.bids[0].price}, ask={self.asks[0].price}")
        
        self.timestamp = timestamp
        self.symbol = symbol
        self.sequence_number = sequence_number
    
    @property
    def best_bid(self) -> OrderBookLevel:
        return self.bids[0]
    
    @property
    def best_ask(self) -> OrderBookLevel:
        return self.asks[0]
    
    @property
    def bid_price(self) -> float:
        return self.bids[0].price
    
    @property
    def ask_price(self) -> float:
        return self.asks[0].price
    
    @property
    def spread(self) -> float:
        return self.ask_price - self.bid_price
    
    @property
    def spread_pct(self) -> float:
        mid = (self.bid_price + self.ask_price) / 2
        return (self.ask_price - self.bid_price) / mid
    
    @property
    def mid_price(self) -> float:
        return (self.bid_price + self.ask_price) / 2
    
    @property
    def total_bid_size(self) -> float:
        return sum(level.size for level in self.bids)
    
    @property
    def total_ask_size(self) -> float:
        return sum(level.size for level in self.asks)
    
    @property
    def imbalance(self) -> float:
        """Calculate order book imbalance: bid_size / (bid_size + ask_size)"""
        total = self.total_bid_size + self.total_ask_size
        if total == 0:
            return 0.5
        return self.total_bid_size / total


class OrderBookAnalyzer:
    """Analyzes order book for trading signals"""
    
    def calculate_spread_metrics(self, book: OrderBook) -> Dict[str, float]:
        """Calculate various spread metrics"""
        return {
            "spread": book.spread,
            "spread_pct": book.spread_pct,
            "relative_spread": book.spread / book.mid_price,
            "effective_spread": book.spread_pct * 2,  # Round-trip cost
            "bid_ask_size_ratio": book.best_bid.size / book.best_ask.size,
        }
    
    def calculate_liquidity_metrics(
        self,
        book: OrderBook,
        depth_levels: int = 5
    ) -> Dict[str, float]:
        """Calculate liquidity metrics at specified depth"""
        # Get top N levels
        top_bids = book.bids[:depth_levels]
        top_asks = book.asks[:depth_levels]
        
        # Weighted depth (more weight to closer levels)
        bid_weights = np.array([1 / (i + 1) for i in range(len(top_bids))])
        ask_weights = np.array([1 / (i + 1) for i in range(len(top_asks))])
        
        bid_weights = bid_weights / bid_weights.sum()
        ask_weights = ask_weights / ask_weights.sum()
        
        bid_depth = sum(level.size * weight for level, weight in zip(top_bids, bid_weights))
        ask_depth = sum(level.size * weight for level, weight in zip(top_asks, ask_weights))
        
        return {
            "best_bid_size": book.best_bid.size,
            "best_ask_size": book.best_ask.size,
            "total_bid_depth": book.total_bid_size,
            "total_ask_depth": book.total_ask_size,
            "weighted_bid_depth": bid_depth,
            "weighted_ask_depth": ask_depth,
            "depth_imbalance": bid_depth / (bid_depth + ask_depth) if (bid_depth + ask_depth) > 0 else 0.5,
            "levels": len(book.bids),  # Book depth (number of levels)
        }
    
    def calculate_imbalance_metrics(self, book: OrderBook) -> Dict[str, float]:
        """Calculate order book imbalance metrics"""
        # Calculate imbalance at various depths
        depths = [3, 5, 10, 20]
        imbalances = {}
        
        for depth in depths:
            top_bids = book.bids[:depth]
            top_asks = book.asks[:depth]
            
            bid_size = sum(level.size for level in top_bids)
            ask_size = sum(level.size for level in top_asks)
            
            total = bid_size + ask_size
            if total > 0:
                imbalances[f"imbalance_{depth}"] = bid_size / total
            else:
                imbalances[f"imbalance_{depth}"] = 0.5
        
        return {
            "total_imbalance": book.imbalance,
            **imbalances,
            "bid_ask_ratio": book.total_bid_size / book.total_ask_size if book.total_ask_size > 0 else 1.0,
        }
    
    def calculate_pressure_metrics(self, book: OrderBook) -> Dict[str, float]:
        """Calculate order book pressure metrics"""
        # Calculate pressure based on price distribution
        bid_pressure = 0
        ask_pressure = 0
        
        for level in book.bids:
            # Bids below mid increase bid pressure
            if level.price < book.mid_price:
                bid_pressure += level.size * (book.mid_price - level.price) / book.mid_price
        
        for level in book.asks:
            # Asks above mid increase ask pressure
            if level.price > book.mid_price:
                ask_pressure += level.size * (level.price - book.mid_price) / book.mid_price
        
        total_pressure = bid_pressure + ask_pressure
        if total_pressure == 0:
            return {
                "bid_pressure": 0,
                "ask_pressure": 0,
                "pressure_imbalance": 0.5,
            }
        
        return {
            "bid_pressure": bid_pressure,
            "ask_pressure": ask_pressure,
            "pressure_imbalance": bid_pressure / total_pressure,
            "pressure_ratio": bid_pressure / ask_pressure if ask_pressure > 0 else float('inf'),
        }
    
    def detect_support_resistance(
        self,
        book: OrderBook,
        min_level_size: float = 0.0
    ) -> Tuple[List[OrderBookLevel], List[OrderBookLevel]]:
        """
        Detect support and resistance levels in order book
        
        Returns (support_levels, resistance_levels)
        """
        support_levels = []
        resistance_levels = []
        
        # Find clusters of orders (potential support/resistance)
        price_clusters = {}
        
        for level in book.bids:
            price_key = round(level.price, -1)  # Round to nearest 10
            if price_key not in price_clusters:
                price_clusters[price_key] = []
            price_clusters[price_key].append(level)
        
        for level in book.asks:
            price_key = round(level.price, -1)
            if price_key not in price_clusters:
                price_clusters[price_key] = []
            price_clusters[price_key].append(level)
        
        # Find clusters with significant size
        for price, levels in price_clusters.items():
            total_size = sum(level.size for level in levels)
            if total_size >= min_level_size:
                avg_price = sum(level.price for level in levels) / len(levels)
                if avg_price < book.mid_price:
                    support_levels.append(OrderBookLevel(avg_price, total_size))
                else:
                    resistance_levels.append(OrderBookLevel(avg_price, total_size))
        
        return support_levels, resistance_levels
    
    def analyze_order_book_state(
        self,
        book: OrderBook
    ) -> Dict[str, Any]:
        """Comprehensive order book state analysis"""
        return {
            "spread": self.calculate_spread_metrics(book),
            "liquidity": self.calculate_liquidity_metrics(book),
            "imbalance": self.calculate_imbalance_metrics(book),
            "pressure": self.calculate_pressure_metrics(book),
            "mid_price": book.mid_price,
            "timestamp": book.timestamp.isoformat(),
        }


class OrderBookStateTracker:
    """Tracks order book state over time"""
    
    def __init__(self, max_history: int = 100):
        self.history: List[Tuple[datetime, OrderBook]] = []
        self.max_history = max_history
    
    def add_book(self, book: OrderBook):
        """Add order book snapshot to history"""
        self.history.append((book.timestamp, book))
        
        # Trim old entries
        while len(self.history) > self.max_history:
            self.history.pop(0)
    
    def get_recent_books(self, n: int = 10) -> List[OrderBook]:
        """Get last N order book snapshots"""
        return [book for _, book in self.history[-n:]]
    
    def calculate_volatility_metrics(self, n: int = 50) -> Dict[str, float]:
        """Calculate volatility metrics from order book history"""
        if len(self.history) < n:
            return {}
        
        books = [book for _, book in self.history[-n:]]
        
        # Calculate price changes
        prices = [book.mid_price for book in books]
        returns = [(prices[i] - prices[i-1]) / prices[i-1] if i > 0 else 0 
                   for i in range(len(prices))]
        
        # Calculate spread changes
        spreads = [book.spread_pct for book in books]
        
        return {
            "price_volatility": statistics.stdev(returns) if len(returns) > 1 else 0,
            "spread_volatility": statistics.stdev(spreads) if len(spreads) > 1 else 0,
            "avg_spread": statistics.mean(spreads) if spreads else 0,
            "max_spread": max(spreads) if spreads else 0,
            "min_spread": min(spreads) if spreads else 0,
            "imbalance_mean": statistics.mean([book.imbalance for book in books]),
            "imbalance_std": statistics.stdev([book.imbalance for book in books]) if len(books) > 1 else 0,
        }


# Example usage
if __name__ == "__main__":
    analyzer = OrderBookAnalyzer()
    
    # Create sample order book
    bids = [
        OrderBookLevel(100.00, 10.5),
        OrderBookLevel(99.99, 5.2),
        OrderBookLevel(99.98, 8.1),
        OrderBookLevel(99.97, 3.0),
        OrderBookLevel(99.96, 12.3),
    ]
    
    asks = [
        OrderBookLevel(100.01, 8.0),
        OrderBookLevel(100.02, 6.5),
        OrderBookLevel(100.03, 4.2),
        OrderBookLevel(100.04, 9.1),
        OrderBookLevel(100.05, 7.8),
    ]
    
    book = OrderBook(datetime.utcnow(), "BTCUSDT", bids, asks)
    
    # Analyze book
    metrics = analyzer.analyze_order_book_state(book)
    
    print("Spread Metrics:", metrics["spread"])
    print("Liquidity Metrics:", metrics["liquidity"])
    print("Imbalance Metrics:", metrics["imbalance"])
    print("Pressure Metrics:", metrics["pressure"])
    
    # Track state over time
    tracker = OrderBookStateTracker(max_history=100)
    for _ in range(10):
        tracker.add_book(book)
    
    volatility = tracker.calculate_volatility_metrics()
    print("Volatility Metrics:", volatility)

```

### Example 3: Level 2 vs Level 3 Order Book Processing

```python
"""
Level 2 vs Level 3 Order Book: Processing detailed exchange order book data
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import heapq
import numpy as np


class LevelType(Enum):
    """Order book level type"""
    LEVEL_2 = "L2"  # Aggregated by price
    LEVEL_3 = "L3"  # Individual orders


@dataclass(frozen=True)
class IndividualOrder:
    """Individual order in Level 3 book"""
    order_id: str
    price: float
    size: float
    side: str  # "buy" or "sell"
    timestamp: datetime
    exchange: str
    
    def __post_init__(self):
        if self.price < 0 or self.size <= 0:
            raise ValueError("Invalid order")


@dataclass(frozen=True)
class OrderBookLevel:
    """Aggregated order book level (Level 2)"""
    price: float
    size: float
    order_count: int  # Number of individual orders at this level
    level_type: LevelType = LevelType.LEVEL_2
    
    def __post_init__(self):
        if self.price < 0 or self.size <= 0 or self.order_count <= 0:
            raise ValueError("Invalid order book level")


@dataclass(frozen=True)
class OrderBook:
    """Order book structure supporting both Level 2 and Level 3 data"""
    timestamp: datetime
    symbol: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    level_type: LevelType = LevelType.LEVEL_2
    individual_orders: Optional[List[IndividualOrder]] = None
    sequence_number: Optional[int] = None
    
    def __post_init__(self):
        if not self.bids or not self.asks:
            raise ValueError("Order book must have bids and asks")
        
        self.bids = sorted(self.bids, key=lambda x: x.price, reverse=True)
        self.asks = sorted(self.asks, key=lambda x: x.price)
        
        if self.bids[0].price >= self.asks[0].price:
            raise ValueError(f"Crossed market: bid={self.bids[0].price}, ask={self.asks[0].price}")
        
        # Validate individual orders exist only for Level 3
        if self.level_type == LevelType.LEVEL_2 and self.individual_orders:
            raise ValueError("Individual orders only valid for Level 3 book")
    
    @property
    def best_bid(self) -> OrderBookLevel:
        return self.bids[0]
    
    @property
    def best_ask(self) -> OrderBookLevel:
        return self.asks[0]
    
    @property
    def spread(self) -> float:
        return self.best_ask.price - self.best_bid.price
    
    @property
    def spread_pct(self) -> float:
        mid = self.mid_price
        return self.spread / mid if mid > 0 else 0
    
    @property
    def mid_price(self) -> float:
        return (self.best_bid.price + self.best_ask.price) / 2
    
    @property
    def total_bid_size(self) -> float:
        return sum(level.size for level in self.bids)
    
    @property
    def total_ask_size(self) -> float:
        return sum(level.size for level in self.asks)


class OrderBookProcessor:
    """Processes Level 3 order book to generate Level 2"""
    
    def __init__(self, exchange: str = "binance"):
        self.exchange = exchange
        self._order_heap = {}  # order_id -> Order
    
    def process_level_3_update(
        self,
        timestamp: datetime,
        symbol: str,
        updates: List[Dict[str, Any]],
        current_book: Optional[OrderBook] = None
    ) -> OrderBook:
        """
        Process Level 3 order book updates and generate Level 2 book
        
        Args:
            timestamp: Update timestamp
            symbol: Trading pair symbol
            updates: List of order updates (insert, modify, delete)
            current_book: Current Level 2 book (if existing)
        
        Returns:
            New Level 2 order book
        """
        # Initialize from current book if provided
        if current_book:
            bids = {level.price: level for level in current_book.bids}
            asks = {level.price: level for level in current_book.asks}
        else:
            bids = {}
            asks = {}
        
        # Process each update
        for update in updates:
            order_id = update["order_id"]
            price = update["price"]
            size = update["size"]
            side = update["side"]
            action = update["action"]
            
            if action == "insert":
                self._order_heap[order_id] = IndividualOrder(
                    order_id=order_id,
                    price=price,
                    size=size,
                    side=side,
                    timestamp=timestamp,
                    exchange=self.exchange
                )
                self._update_level(bids, asks, price, size, side, "insert")
            
            elif action == "modify":
                if order_id in self._order_heap:
                    old_order = self._order_heap[order_id]
                    old_size = old_order.size
                    self._order_heap[order_id] = IndividualOrder(
                        order_id=order_id,
                        price=price,
                        size=size,
                        side=side,
                        timestamp=timestamp,
                        exchange=self.exchange
                    )
                    self._update_level(bids, asks, old_order.price, old_size, side, "delete")
                    self._update_level(bids, asks, price, size, side, "insert")
            
            elif action == "delete":
                if order_id in self._order_heap:
                    old_order = self._order_heap.pop(order_id)
                    self._update_level(bids, asks, old_order.price, old_order.size, side, "delete")
        
        # Build Level 2 book from aggregated levels
        return self._build_level_2_book(timestamp, symbol, bids, asks)
    
    def _update_level(
        self,
        bids: Dict[float, OrderBookLevel],
        asks: Dict[float, OrderBookLevel],
        price: float,
        size: float,
        side: str,
        action: str
    ):
        """Update aggregated level for price/size changes"""
        if action == "insert":
            book = bids if side == "buy" else asks
            if price in book:
                level = book[price]
                book[price] = OrderBookLevel(
                    price=level.price,
                    size=level.size + size,
                    order_count=level.order_count + 1
                )
            else:
                book[price] = OrderBookLevel(
                    price=price,
                    size=size,
                    order_count=1
                )
        
        elif action == "delete":
            book = bids if side == "buy" else asks
            if price in book:
                level = book[price]
                if level.order_count > 1:
                    book[price] = OrderBookLevel(
                        price=level.price,
                        size=max(0, level.size - size),
                        order_count=level.order_count - 1
                    )
                else:
                    del book[price]
    
    def _build_level_2_book(
        self,
        timestamp: datetime,
        symbol: str,
        bids: Dict[float, OrderBookLevel],
        asks: Dict[float, OrderBookLevel]
    ) -> OrderBook:
        """Build Level 2 order book from aggregated levels"""
        bids_list = sorted(bids.values(), key=lambda x: x.price, reverse=True)
        asks_list = sorted(asks.values(), key=lambda x: x.price)
        
        return OrderBook(
            timestamp=timestamp,
            symbol=symbol,
            bids=bids_list,
            asks=asks_list,
            level_type=LevelType.LEVEL_2
        )
    
    def calculate_vwap_at_level(
        self,
        book: OrderBook,
        depth: int = 5
    ) -> Tuple[float, float]:
        """
        Calculate Volume Weighted Average Price (VWAP) at specified depth
        
        Returns (bid_vwap, ask_vwap)
        """
        top_bids = book.bids[:depth]
        top_asks = book.asks[:depth]
        
        bid_vwap = sum(level.price * level.size for level in top_bids) / book.total_bid_size
        ask_vwap = sum(level.price * level.size for level in top_asks) / book.total_ask_size
        
        return bid_vwap, ask_vwap
    
    def calculate_weighted_imbalance(
        self,
        book: OrderBook,
        depth: int = 10,
        decay_factor: float = 0.9
    ) -> float:
        """
        Calculate weighted order book imbalance
        
        Closer levels have higher weight (exponential decay)
        """
        top_bids = book.bids[:depth]
        top_asks = book.asks[:depth]
        
        bid_weight = sum(
            level.size * (decay_factor ** i)
            for i, level in enumerate(top_bids)
        )
        
        ask_weight = sum(
            level.size * (decay_factor ** i)
            for i, level in enumerate(top_asks)
        )
        
        total = bid_weight + ask_weight
        if total == 0:
            return 0.5
        
        return bid_weight / total
    
    def detect_liquidity_sandwich(
        self,
        book: OrderBook,
        target_size: float = 10.0
    ) -> Optional[Dict[str, Any]]:
        """
        Detect potential liquidity sandwich opportunities
        
        A sandwich occurs when:
        1. Large hidden liquidity exists at a price level
        2. Price is likely to move through that level
        3. Order book shows increasing depth
        """
        for level in book.bids:
            if level.size >= target_size:
                # Check if this is a "wall" (concentrated liquidity)
                if self._is_liquidity_wall(book, level.price, side="buy"):
                    return {
                        "type": "buy_wall",
                        "price": level.price,
                        "size": level.size,
                        "position_from_mid": book.mid_price - level.price,
                    }
        
        for level in book.asks:
            if level.size >= target_size:
                if self._is_liquidity_wall(book, level.price, side="sell"):
                    return {
                        "type": "sell_wall",
                        "price": level.price,
                        "size": level.size,
                        "position_from_mid": level.price - book.mid_price,
                    }
        
        return None
    
    def _is_liquidity_wall(
        self,
        book: OrderBook,
        price: float,
        side: str,
        threshold: float = 2.0
    ) -> bool:
        """Check if price level shows liquidity wall"""
        if side == "buy":
            levels = book.bids
        else:
            levels = book.asks
        
        # Find level and check surrounding
        for i, level in enumerate(levels):
            if level.price == price:
                # Check if this level has significantly more size than neighbors
                if i > 0 and i < len(levels) - 1:
                    neighbor_avg = (levels[i-1].size + levels[i+1].size) / 2
                    return level.size > neighbor_avg * threshold
                break
        
        return False


class OrderBookStatePredictor:
    """Predicts future order book state based on current state"""
    
    def __init__(self, lookback: int = 50):
        self.lookback = lookback
        self.history: List[OrderBook] = []
    
    def update(self, book: OrderBook):
        """Add order book snapshot to history"""
        self.history.append(book)
        while len(self.history) > self.lookback:
            self.history.pop(0)
    
    def predict_price_movement(
        self,
        book: OrderBook,
        lookahead: int = 5
    ) -> Dict[str, Any]:
        """
        Predict short-term price movement based on order book state
        
        Returns prediction with confidence score
        """
        if len(self.history) < 10:
            return {
                "direction": "unknown",
                "confidence": 0.5,
                "implied_move": 0,
            }
        
        # Calculate current state
        current_imbalance = book.imbalance
        current_pressure = self._calculate_pressure(book)
        
        # Calculate historical patterns
        imbalances = [b.imbalance for b in self.history[-10:]]
        pressure_changes = [
            self._calculate_pressure(self.history[i]) - self._calculate_pressure(self.history[i-1])
            for i in range(len(self.history) - 10, len(self.history))
        ]
        
        # Predict based on imbalance and pressure
        if current_imbalance > 0.6 and current_pressure > 0:
            direction = "up"
        elif current_imbalance < 0.4 and current_pressure < 0:
            direction = "down"
        else:
            direction = "neutral"
        
        # Calculate confidence
        imbalance_consistency = sum(1 for imb in imbalances if 
                                   (imb > 0.5) == (current_imbalance > 0.5)) / len(imbalances)
        confidence = (imbalance_consistency + (1 - abs(current_imbalance - 0.5))) / 2
        
        # Calculate implied move
        spread = book.spread_pct
        depth_imbalance = abs(current_imbalance - 0.5)
        implied_move = spread * depth_imbalance * lookahead
        
        return {
            "direction": direction,
            "confidence": round(confidence, 3),
            "implied_move": round(implied_move, 6),
            "implied_direction": direction if confidence > 0.6 else "neutral",
        }
    
    def _calculate_pressure(self, book: OrderBook) -> float:
        """Calculate order book pressure"""
        if not book.bids or not book.asks:
            return 0
        
        bid_pressure = sum(
            (book.mid_price - level.price) * level.size
            for level in book.bids[:10]
        )
        
        ask_pressure = sum(
            (level.price - book.mid_price) * level.size
            for level in book.asks[:10]
        )
        
        total_pressure = bid_pressure + ask_pressure
        if total_pressure == 0:
            return 0
        
        return (bid_pressure - ask_pressure) / total_pressure
    
    def predict_liquidity_changes(
        self,
        book: OrderBook,
        time Horizon: timedelta = timedelta(seconds=30)
    ) -> Dict[str, float]:
        """
        Predict liquidity changes over time horizon
        """
        if len(self.history) < 10:
            return {
                "bid_liquidity_trend": "flat",
                "ask_liquidity_trend": "flat",
            }
        
        # Calculate trend
        bid_sizes = [b.total_bid_size for b in self.history[-10:]]
        ask_sizes = [b.total_ask_size for b in self.history[-10:]]
        
        bid_trend = np.polyfit(range(len(bid_sizes)), bid_sizes, 1)[0]
        ask_trend = np.polyfit(range(len(ask_sizes)), ask_sizes, 1)[0]
        
        return {
            "bid_liquidity_trend": "increasing" if bid_trend > 0 else "decreasing" if bid_trend < 0 else "flat",
            "ask_liquidity_trend": "increasing" if ask_trend > 0 else "decreasing" if ask_trend < 0 else "flat",
            "bid_trend_slope": round(bid_trend, 4),
            "ask_trend_slope": round(ask_trend, 4),
        }


# Example usage
if __name__ == "__main__":
    processor = OrderBookProcessor(exchange="binance")
    
    # Simulate Level 3 updates
    updates = [
        {"order_id": "1", "price": 100.00, "size": 5.0, "side": "buy", "action": "insert"},
        {"order_id": "2", "price": 100.00, "size": 3.0, "side": "buy", "action": "insert"},
        {"order_id": "3", "price": 100.01, "size": 4.0, "side": "sell", "action": "insert"},
        {"order_id": "1", "size": 6.0, "action": "modify"},  # Modify order 1
        {"order_id": "3", "action": "delete"},  # Delete order 3
    ]
    
    book = processor.process_level_3_update(
        timestamp=datetime.utcnow(),
        symbol="BTCUSDT",
        updates=updates
    )
    
    print(f"Best bid: {book.best_bid.price}, Best ask: {book.best_ask.price}")
    print(f"Spread: {book.spread_pct*100:.4f}%")
    
    # Calculate VWAP
    bid_vwap, ask_vwap = processor.calculate_vwap_at_level(book, depth=5)
    print(f"Bid VWAP: {bid_vwap:.2f}, Ask VWAP: {ask_vwap:.2f}")
    
    # Detect liquidity sandwiches
    sandwich = processor.detect_liquidity_sandwich(book, target_size=5.0)
    if sandwich:
        print(f"Liquidity sandwich detected: {sandwich}")
    
    # Predict price movement
    predictor = OrderBookStatePredictor(lookback=50)
    for _ in range(10):
        predictor.update(book)
    
    prediction = predictor.predict_price_movement(book)
    print(f"Prediction: {prediction}")

```

---

## Adherence Checklist

Before completing your order book pipeline, verify:
- [ ] **Guard Clauses**: Are all validation checks at top of `__post_init__`?
- [ ] **Parsed State**: Is all order book data parsed into `OrderBook` type at boundary?
- [ ] **Purity**: Do transformations return new books without mutation?
- [ ] **Fail Loud**: Do crossed markets throw `ValueError` immediately?
- [ ] **Readability**: Are bid/ask arrays sorted descending/ascending with clear properties?

---

## Common Mistakes to Avoid

### ❌ Mistake 1: No Order Book Validation
```python
# BAD: Allows crossed markets
class OrderBook:
    def __init__(self, bids, asks):
        self.bids = bids
        self.asks = asks
        # Missing: no validation of bid < ask

# GOOD: Validates immediately
class OrderBook:
    def __init__(self, bids, asks):
        self.bids = sorted(bids, key=lambda x: x.price, reverse=True)
        self.asks = sorted(asks, key=lambda x: x.price)
        
        if self.bids[0].price >= self.asks[0].price:
            raise ValueError(f"Crossed market: bid={self.bids[0].price}, ask={self.asks[0].price}")
```

### ❌ Mistake 2: Mutating Order Book In Place
```python
# BAD: Mutates order book
def add_order(book: OrderBook, order: Order):
    if order.side == "buy":
        book.bids.append(order)  # Mutation!
    # Recalculate...

# GOOD: Returns new book
def add_order(book: OrderBook, order: Order) -> OrderBook:
    new_bids = book.bids + [order] if order.side == "buy" else book.bids
    new_asks = book.asks + [order] if order.side == "sell" else book.asks
    return OrderBook(
        timestamp=book.timestamp,
        symbol=book.symbol,
        bids=new_bids,
        asks=new_asks
    )
```

### ❌ Mistake 3: Silent Failure on Invalid Orders
```python
# BAD: Ignores invalid orders silently
def parse_orders(raw_orders):
    orders = []
    for r in raw_orders:
        try:
            orders.append(Order(price=r[0], size=r[1]))
        except:
            pass  # Silent failure!
    return orders

# GOOD: Logs and reports
def parse_orders(raw_orders):
    orders = []
    errors = []
    for r in raw_orders:
        try:
            orders.append(Order(price=r[0], size=r[1]))
        except ValueError as e:
            logger.error(f"Invalid order: {r}, error: {e}")
            errors.append((r, str(e)))
    return orders, errors
```

### ❌ Mistake 4: No Spread Monitoring
```python
# BAD: Only stores best bid/ask
class OrderBook:
    def __init__(self, best_bid, best_ask):
        self.best_bid = best_bid
        self.best_ask = best_ask
        # Missing: spread, depth, imbalance metrics

# GOOD: Calculates all metrics
class OrderBook:
    def __init__(self, bids, asks):
        self.bids = bids
        self.asks = asks
    
    @property
    def spread(self):
        return self.asks[0].price - self.bids[0].price
    
    @property
    def spread_pct(self):
        mid = self.mid_price
        return (self.asks[0].price - self.bids[0].price) / mid
    
    @property
    def imbalance(self):
        total = self.total_bid_size + self.total_ask_size
        return self.total_bid_size / total if total > 0 else 0.5
```

### ❌ Mistake 5: No Exchange Normalization
```python
# BAD: Assumes all exchanges use same format
def process_order_book(exchange_name, data):
    if exchange_name == "binance":
        return binance_format(data)
    elif exchange_name == "coinbase":
        return coinbase_format(data)
    # Hardcoded formats are fragile

# GOOD: Uses normalizer pattern
class ExchangeNormalizer:
    def __init__(self):
        self.normalizers = {
            Exchange.BINANCE: BinanceNormalizer(),
            Exchange.COINBASE: CoinbaseNormalizer(),
        }
    
    def normalize(self, exchange: Exchange, data: dict) -> OrderBook:
        return self.normalizers[exchange].normalize(data)
```

---

## References

1. **Order Book Microstructure** - https://en.wikipedia.org/wiki/Order_book_(trading) - Order book mechanics
2. **Level 2 vs Level 3** - https://www.investopedia.com/terms/l/level2.asp - Market data levels
3. **Spread Calculation** - https://www.investopedia.com/terms/s/spread.asp - Bid-ask spread metrics
4. **Order Book Depth** - https://www.investopedia.com/terms/o/order-book-depth.asp - Liquidity measurement
5. **Volume Weighted Average Price** - https://en.wikipedia.org/wiki/Volume_weighted_average_price - VWAP calculation
