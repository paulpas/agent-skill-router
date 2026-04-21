---
name: coding-pydantic-models
description: Pydantic frozen data models for trading: enums, annotated constraints, field/model validators, and computed properties
---

# Skill: coding-pydantic-models

# Pydantic frozen data models for trading: enums, annotated constraints, field/model validators, and computed properties

## Role / Purpose

This skill covers how to define immutable, self-validating data models for a trading system using Pydantic v2. Every model enforces its own invariants at construction time. Once created, a model object is trusted — no downstream code needs to re-validate its fields.

---

## Key Patterns

### 1. `(str, Enum)` — JSON-Serializable Enums

All domain enums inherit from both `str` and `Enum`. This means enum members serialize directly to their string values in JSON, dicts, and Pydantic payloads — no extra serialization step needed.

```python
from enum import Enum

class SignalType(str, Enum):
    """Signal type - parse at boundary, trust internally."""
    LONG = "long"
    SHORT = "short"
    EXIT_LONG = "exit_long"
    EXIT_SHORT = "exit_short"

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"

class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"

class PositionSide(str, Enum):
    LONG = "long"
    SHORT = "short"
    FLAT = "flat"
```

---

### 2. `ConfigDict(frozen=True)` — Immutable After Creation

All trading models use `frozen=True`. Immutability prevents accidental mutation, makes objects safe to cache, and enables use as dict keys or set members.

```python
from pydantic import BaseModel, ConfigDict

class SignalEvent(BaseModel):
    model_config = ConfigDict(frozen=True)
    # fields...
```

---

### 3. `Annotated[float, Field(gt=0.0)]` — Constraint Patterns

Constraints are encoded at the type level. Pydantic enforces them automatically — no manual guards needed for valid objects.

```python
from typing import Annotated
from pydantic import Field

# Price must be strictly positive
price: Annotated[float, Field(gt=0.0)]

# Confidence must be in [0, 1]
confidence: Annotated[float, Field(ge=0.0, le=1.0)]

# Leverage between 1x and 100x
leverage: Annotated[int, Field(ge=1, le=100)] = Field(default=1)

# PnL percentage bounded to prevent data corruption
pnl_pct: Annotated[float, Field(ge=-1.0, le=10.0)] = Field(default=0.0)
```

---

### 4. `@field_validator` — Edge Value Detection and Format Validation

Field validators catch boundary values that pass range checks but still indicate data problems.

```python
from pydantic import field_validator

class SignalEvent(BaseModel):
    model_config = ConfigDict(frozen=True)

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    symbol: str = Field(..., pattern=r"^[A-Z/]+$")
    signal_type: SignalType
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    price: Annotated[float, Field(gt=0.0)]
    timeframe: str = Field(default="1h")
    metadata: dict[str, Any] = Field(default_factory=dict)
    source: str = Field(default="technical")

    @field_validator("confidence")
    @classmethod
    def confidence_not_edge(cls, v: float) -> float:
        """Fail fast - edge values (0 or 1) indicate parsing issues."""
        if v == 0 or v == 1:
            raise ValueError("Confidence should not be edge value (0 or 1)")
        return v
```

---

### 5. `@model_validator(mode="after")` — Cross-Field Validation

Model validators run after all fields are set and validated. Use them for invariants that span multiple fields (OHLC integrity, PnL consistency, component averages).

```python
from pydantic import model_validator

class Candle(BaseModel):
    model_config = ConfigDict(frozen=True)

    timestamp: datetime
    symbol: str = Field(..., pattern=r"^[A-Z/]+$")
    open: Annotated[float, Field(gt=0.0)]
    high: Annotated[float, Field(gt=0.0)]
    low: Annotated[float, Field(gt=0.0)]
    close: Annotated[float, Field(gt=0.0)]
    volume: Annotated[float, Field(ge=0.0)]

    @model_validator(mode="after")
    def candle_data_valid(self) -> "Candle":
        """Fail fast - verify OHLC data integrity."""
        if self.high < self.low:
            raise ValueError("High price cannot be lower than low price")
        if self.high < max(self.open, self.close):
            raise ValueError("High price must be >= max(open, close)")
        if self.low > min(self.open, self.close):
            raise ValueError("Low price must be <= min(open, close)")
        return self

class Trade(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(..., pattern=r"^[A-Z0-9_-]+$")
    position_id: str = Field(..., pattern=r"^[A-Z0-9_-]+$")
    symbol: str = Field(..., pattern=r"^[A-Z/]+$")
    side: OrderSide
    entry_price: Annotated[float, Field(gt=0.0)]
    exit_price: Annotated[float, Field(gt=0.0)]
    size: Annotated[float, Field(gt=0.0)]
    entry_time: datetime
    exit_time: datetime
    fees: float = Field(default=0.0)
    pnl: float = Field(default=0.0)
    pnl_pct: Annotated[float, Field(ge=-1.0, le=10.0)] = Field(default=0.0)
    conviction_at_entry: Annotated[float, Field(ge=0.0, le=1.0)]
    conviction_at_exit: Annotated[float, Field(ge=0.0, le=1.0)]
    exchange: str = Field(..., pattern=r"^[a-zA-Z0-9_-]+$")

    @property
    def gross_pnl(self) -> float:
        """Gross PnL before fees - pure function, no mutations."""
        if self.side == OrderSide.BUY:
            return (self.exit_price - self.entry_price) * self.size
        return (self.entry_price - self.exit_price) * self.size

    @model_validator(mode="after")
    def pnl_calculated_correctly(self) -> "Trade":
        """Fail fast - verify PnL matches calculation."""
        expected = self.gross_pnl - self.fees
        if abs(expected - self.pnl) > 0.01:
            raise ValueError(f"PnL mismatch: reported {self.pnl}, expected {expected}")
        return self
```

---

### 6. `@property` as Pure Functions

Properties on frozen models are pure: they compute derived values without mutations. They can safely be called multiple times with the same result.

```python
class Position(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(..., pattern=r"^[A-Z0-9_-]+$")
    symbol: str = Field(..., pattern=r"^[A-Z/]+$")
    side: PositionSide
    entry_price: Annotated[float, Field(gt=0.0)]
    size: Annotated[float, Field(gt=0.0)]
    leverage: Annotated[int, Field(ge=1, le=100)] = Field(default=1)
    entry_time: datetime = Field(default_factory=datetime.utcnow)
    pnl: float = Field(default=0.0)
    fees_paid: float = Field(default=0.0)

    @property
    def value(self) -> float:
        """Position value in quote currency - pure function, no mutations."""
        return self.entry_price * self.size * self.leverage

    @property
    def margin_used(self) -> float:
        """Margin used for position - pure function, no mutations."""
        return self.value / self.leverage

class OrderBookSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    symbol: str = Field(..., pattern=r"^[A-Z/]+$")
    exchange: str = Field(..., pattern=r"^[a-zA-Z0-9_-]+$")
    bids: list[tuple[float, float]] = Field(default_factory=list)
    asks: list[tuple[float, float]] = Field(default_factory=list)
    mid_price: float = Field(default=0.0)

    @property
    def spread(self) -> float:
        """Order book spread - pure function, no mutations."""
        if not self.asks or not self.bids:
            return 0.0
        return self.asks[0][0] - self.bids[0][0]
```

---

### 7. `ConvictionScore` — Component Average Validation

The overall `technical` score must equal the weighted average of its components, enforced by a model validator. Floating-point tolerance of 0.01 accommodates rounding.

```python
class ConvictionScore(BaseModel):
    model_config = ConfigDict(frozen=True)

    overall: Annotated[float, Field(ge=0.0, le=1.0)]
    technical: Annotated[float, Field(ge=0.0, le=1.0)]
    momentum: Annotated[float, Field(ge=0.0, le=1.0)]
    trend: Annotated[float, Field(ge=0.0, le=1.0)]
    volatility: Annotated[float, Field(ge=0.0, le=1.0)]
    volume: Annotated[float, Field(ge=0.0, le=1.0)]

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> "ConvictionScore":
        """Fail fast - internal weights must be consistent."""
        total = (self.momentum + self.trend + self.volatility + self.volume) / 4
        if abs(total - self.technical) > 0.01:
            raise ValueError(
                f"Technical score ({self.technical}) should be average of components"
            )
        return self
```

---

### 8. `RiskMetrics` — Performance Statistics Model

```python
class RiskMetrics(BaseModel):
    model_config = ConfigDict(frozen=True)

    max_drawdown: Annotated[float, Field(ge=0.0, le=1.0)]
    daily_var_95: float = Field(default=0.0)
    daily_var_99: float = Field(default=0.0)
    sharpe_ratio: float = Field(default=0.0)
    sortino_ratio: float = Field(default=0.0)
    win_rate: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.0)
    profit_factor: float = Field(default=1.0)
    expected_value: float = Field(default=0.0)
    max_consecutive_losses: int = Field(default=0)
    max_consecutive_wins: int = Field(default=0)

    @field_validator("profit_factor")
    @classmethod
    def profit_factor_valid(cls, v: float) -> float:
        """Fail fast - invalid profit factor."""
        if v < 0:
            raise ValueError("Profit factor cannot be negative")
        return v
```

---

### 9. `AccountBalance` — Balance Snapshot

```python
class AccountBalance(BaseModel):
    model_config = ConfigDict(frozen=True)

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    exchange: str = Field(..., pattern=r"^[a-zA-Z0-9_-]+$")
    total_balance: float = Field(default=0.0)
    free_balance: float = Field(default=0.0)
    used_balance: float = Field(default=0.0)
    equity: float = Field(default=0.0)
    margin_used: float = Field(default=0.0)
    margin_available: float = Field(default=0.0)
    positions_mkt_value: float = Field(default=0.0)
    unrealized_pnl: float = Field(default=0.0)
    realized_pnl: float = Field(default=0.0)
```

---

## Code Examples

### Creating a Signal and Publishing It

```python
from apex.core.models import SignalEvent, SignalType

# Parsed at the boundary — raises immediately if invalid
signal = SignalEvent(
    symbol="BTC/USDT",
    signal_type=SignalType.LONG,
    confidence=0.82,     # Must not be 0 or 1
    price=65_000.0,
    timeframe="1h",
    source="ma_crossover",
    metadata={"momentum_score": 0.75},
)

# Internally: trusted, typed, immutable
print(signal.signal_type)   # SignalType.LONG
print(signal.confidence)    # 0.82
```

### Building a Candle With OHLC Integrity

```python
from apex.core.models import Candle
from datetime import datetime

# Pydantic enforces OHLC invariants at construction
candle = Candle(
    timestamp=datetime.utcnow(),
    symbol="ETH/USDT",
    open=3500.0,
    high=3600.0,  # must be >= max(open, close)
    low=3450.0,   # must be <= min(open, close)
    close=3580.0,
    volume=12345.6,
)
```

---

## Philosophy Checklist

- **Early Exit**: `@field_validator` and `@model_validator` halt object construction on invalid data
- **Parse Don't Validate**: All validation happens at model instantiation; code receiving a model instance trusts it
- **Atomic Predictability**: Frozen models + pure `@property` methods; same inputs always give same outputs
- **Fail Fast**: Edge values, cross-field inconsistencies, and format violations all raise `ValueError` immediately
- **Intentional Naming**: `confidence_not_edge`, `candle_data_valid`, `pnl_calculated_correctly` — validators read like English assertions
