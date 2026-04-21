---
name: coding-strategy-base
description: Abstract base strategy pattern with initialization guards, typed abstract methods, and conviction scoring integration
---

# Skill: coding-strategy-base

# Abstract base strategy pattern with initialization guards, typed abstract methods, and conviction scoring integration

## Role / Purpose

This skill covers the canonical pattern for a base trading strategy class in Python. `BaseStrategy(ABC)` enforces a contract that every concrete strategy must fulfill: validate its own identity at construction, initialize exactly once, generate signals from candle data, respond to signal events, and score signals with a multi-factor conviction engine.

---

## Key Patterns

### 1. Class-Level `name` and `timeframe` as Contract Fields

`name` and `timeframe` are class-level attributes set to empty strings. The `__init__` guard clauses verify they were overridden by the concrete subclass — making it impossible to instantiate a nameless or timeframe-less strategy.

```python
from abc import ABC, abstractmethod
from typing import Any

class BaseStrategy(ABC):
    """Abstract Base Strategy - contract all strategies must fulfill."""

    name: str = ""
    timeframe: str = ""
```

---

### 2. `__init__` Guard Clauses — Fail Fast on Invalid Parameters

All four guard clauses run before any state is stored. Each failure is a distinct, descriptive error. No strategy can exist in a half-constructed state.

```python
    def __init__(
        self,
        exchange: ExchangeAdapter,
        symbols: list[str],
        config: dict[str, Any] | None = None,
    ):
        """Initialize strategy - fail fast on invalid parameters."""
        # Guard clause - early exit for invalid inputs
        if not self.name:
            raise ValueError("Strategy name cannot be empty")
        if not symbols:
            raise ValueError("Strategy must have at least one symbol")
        if not self.timeframe:
            raise ValueError("Strategy timeframe cannot be empty")
        if not exchange:
            raise ValueError("Exchange adapter cannot be None")

        self.symbols = symbols
        self.exchange = exchange
        self.config = config or {}
        self._initialized = False
```

---

### 3. `_initialized` Flag — `initialize()` Raises if Already Called

The `initialize()` method is abstract to force subclass implementation, but the base class still validates the guard clause. Calling `initialize()` a second time raises immediately.

```python
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize strategy - fail fast if initialization fails."""
        # Guard clause - early exit for invalid state
        if self._initialized:
            raise RuntimeError(f"Strategy '{self.name}' already initialized")

        self._initialized = True
```

---

### 4. Three Typed Abstract Methods

Every concrete strategy must implement these three methods with the exact signatures. The return types enforce the architecture: signals are produced by `on_tick`, handled by `on_signal`, and scored by `get_conviction`.

```python
    @abstractmethod
    async def on_tick(self, candles: dict[str, list[Candle]]) -> list[SignalEvent]:
        """Process tick data and generate signals - pure function.

        Args:
            candles: Dictionary mapping symbol to list of candles

        Returns:
            List of signal events for actionable signals
        """
        raise NotImplementedError

    @abstractmethod
    async def on_signal(self, signal: SignalEvent) -> None:
        """Handle signal event - process trading signals.

        Args:
            signal: Signal event to process
        """
        raise NotImplementedError

    @abstractmethod
    async def get_conviction(self, signal: SignalEvent) -> ConvictionScore:
        """Calculate conviction score for signal - pure function.

        Args:
            signal: Signal event to score

        Returns:
            ConvictionScore with component scores
        """
        raise NotImplementedError
```

---

### 5. `is_initialized()` — Pure State Query

A simple boolean getter. No side effects, no mutations. Callers can check initialization state without any risk.

```python
    def is_initialized(self) -> bool:
        """Check if strategy is initialized - pure function."""
        return self._initialized
```

---

## Full Source

```python
"""Base Strategy class for APEX trading platform."""

from abc import ABC, abstractmethod
from typing import Any

from apex.core.models import Candle, ConvictionScore, SignalEvent
from apex.exchange.base import ExchangeAdapter


class BaseStrategy(ABC):
    """Abstract Base Strategy for paper trading."""

    name: str = ""
    timeframe: str = ""

    def __init__(
        self,
        exchange: ExchangeAdapter,
        symbols: list[str],
        config: dict[str, Any] | None = None,
    ):
        """Initialize strategy - fail fast on invalid parameters."""
        if not self.name:
            raise ValueError("Strategy name cannot be empty")
        if not symbols:
            raise ValueError("Strategy must have at least one symbol")
        if not self.timeframe:
            raise ValueError("Strategy timeframe cannot be empty")
        if not exchange:
            raise ValueError("Exchange adapter cannot be None")

        self.symbols = symbols
        self.exchange = exchange
        self.config = config or {}
        self._initialized = False

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize strategy - fail fast if initialization fails."""
        if self._initialized:
            raise RuntimeError(f"Strategy '{self.name}' already initialized")
        self._initialized = True

    @abstractmethod
    async def on_tick(self, candles: dict[str, list[Candle]]) -> list[SignalEvent]:
        raise NotImplementedError

    @abstractmethod
    async def on_signal(self, signal: SignalEvent) -> None:
        raise NotImplementedError

    @abstractmethod
    async def get_conviction(self, signal: SignalEvent) -> ConvictionScore:
        raise NotImplementedError

    def is_initialized(self) -> bool:
        """Check if strategy is initialized - pure function."""
        return self._initialized
```

---

## Code Examples

### Concrete Implementation

```python
from apex.core.models import Candle, ConvictionScore, SignalEvent, SignalType
from apex.signals.conviction import ConvictionEngine
from apex.strategies.base import BaseStrategy


class MovingAverageCrossover(BaseStrategy):
    """MA crossover strategy - concrete implementation of BaseStrategy."""

    name = "ma_crossover"
    timeframe = "1h"

    def __init__(self, exchange, symbols, config=None):
        super().__init__(exchange, symbols, config)
        self.fast_period = (config or {}).get("fast_period", 20)
        self.slow_period = (config or {}).get("slow_period", 50)
        self._conviction_engine = ConvictionEngine()
        self._price_history: dict[str, list[float]] = {}

    async def initialize(self) -> None:
        await super().initialize()  # Runs the guard clause
        for symbol in self.symbols:
            self._price_history[symbol] = []

    async def on_tick(self, candles: dict[str, list[Candle]]) -> list[SignalEvent]:
        signals = []
        for symbol, bars in candles.items():
            if not bars:
                continue
            close = bars[-1].close
            self._price_history.setdefault(symbol, []).append(close)
            history = self._price_history[symbol]

            if len(history) < self.slow_period + 1:
                continue

            fast_ma = sum(history[-self.fast_period:]) / self.fast_period
            slow_ma = sum(history[-self.slow_period:]) / self.slow_period
            prev_fast = sum(history[-(self.fast_period + 1):-1]) / self.fast_period
            prev_slow = sum(history[-(self.slow_period + 1):-1]) / self.slow_period

            if prev_fast <= prev_slow and fast_ma > slow_ma:
                signals.append(SignalEvent(
                    symbol=symbol,
                    signal_type=SignalType.LONG,
                    confidence=0.75,
                    price=close,
                    timeframe=self.timeframe,
                    source=self.name,
                ))
            elif prev_fast >= prev_slow and fast_ma < slow_ma:
                signals.append(SignalEvent(
                    symbol=symbol,
                    signal_type=SignalType.SHORT,
                    confidence=0.75,
                    price=close,
                    timeframe=self.timeframe,
                    source=self.name,
                ))

        return signals

    async def on_signal(self, signal: SignalEvent) -> None:
        # Downstream processing — place orders, update state
        pass

    async def get_conviction(self, signal: SignalEvent) -> ConvictionScore:
        return self._conviction_engine.score_signal_event(signal)
```

### Lifecycle Usage

```python
from apex.exchange.paper import PaperExchangeAdapter

exchange = PaperExchangeAdapter()
strategy = MovingAverageCrossover(
    exchange=exchange,
    symbols=["BTC/USDT", "ETH/USDT"],
    config={"fast_period": 10, "slow_period": 30},
)

# Guard: initialize() must be called before on_tick
await strategy.initialize()
assert strategy.is_initialized()

# Calling initialize() again raises immediately
try:
    await strategy.initialize()
except RuntimeError as e:
    print(e)  # "Strategy 'ma_crossover' already initialized"
```

---

## Philosophy Checklist

- **Early Exit**: Four guard clauses in `__init__` exit immediately on invalid inputs; `initialize` exits if already initialized
- **Parse Don't Validate**: `Candle` and `SignalEvent` types come pre-validated; the strategy trusts them internally
- **Atomic Predictability**: `on_tick` is a pure function (same candles → same signals); `is_initialized` has no side effects
- **Fail Fast**: Missing `name`, empty `symbols`, missing `exchange`, or double-init all raise `ValueError`/`RuntimeError` immediately
- **Intentional Naming**: `on_tick`, `on_signal`, `get_conviction`, `is_initialized` — the interface reads like a conversation
