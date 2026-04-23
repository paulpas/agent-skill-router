---
name: coding-pydantic-config
description: Pydantic-based configuration management with frozen models, nested hierarchy, TOML/env parsing, and module-level singleton
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: pydantic config, pydantic-config, pydantic-based, configuration, management
---

# Skill: coding-pydantic-config

# Pydantic-based configuration management with frozen models, nested hierarchy, TOML/env parsing, and module-level singleton

## Role / Purpose

This skill covers the canonical pattern for application configuration in a trading system using Pydantic v2. Configuration is parsed once at the application boundary (from TOML or environment), validated, and frozen into an immutable singleton. All downstream code reads trusted, typed config values — never raw strings or unchecked dicts.

---

## Key Patterns

### 1. `model_config = ConfigDict(frozen=True)` — Immutable After Creation

Every config class carries `frozen=True`. Once instantiated, no field can be mutated. This eliminates entire categories of bugs where config bleeds across contexts.

```python
from pydantic import BaseModel, ConfigDict

class ExchangeConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    api_key: str = ""
    api_secret: str = ""
    testnet: bool = False
```

---

### 2. `Annotated[float, Field(ge=0.0, le=1.0)]` — Constraints at the Type Level

Numeric constraints are expressed directly in the type annotation so they're enforced automatically by Pydantic. No manual range checks in application code.

```python
from typing import Annotated
from pydantic import Field

class RiskConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    max_position_size: Annotated[float, Field(ge=0.0, le=1.0)] = Field(
        default=0.1, description="Max position as % of portfolio (0.0-1.0)"
    )
    max_daily_loss: Annotated[float, Field(ge=0.0)] = Field(
        default=0.05, description="Max daily loss as % (0.0-1.0)"
    )
    max_drawdown: Annotated[float, Field(ge=0.0, le=1.0)] = Field(
        default=0.15, description="Max drawdown as % (0.0-1.0)"
    )
    max_open_positions: Annotated[int, Field(ge=1, le=50)] = Field(
        default=5, description="Max concurrent open positions"
    )
    stop_loss_pct: Annotated[float, Field(ge=0.0, le=1.0)] = Field(
        default=0.02, description="Stop loss as % of entry price"
    )
    take_profit_pct: Annotated[float, Field(ge=0.0, le=10.0)] = Field(
        default=0.05, description="Take profit as % of entry price"
    )
    risk_reward_ratio: Annotated[float, Field(ge=1.0)] = Field(
        default=2.0, description="Min R:R ratio for trades"
    )
```

---

### 3. `@field_validator` with `@classmethod` — Fail-Fast Boundary Validation

Field validators run at parse time. Invalid values halt construction with a descriptive `ValueError` before the object can exist in a bad state.

```python
from pydantic import field_validator

class ExchangeConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(..., pattern=r"^[a-zA-Z0-9_-]+$")

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        """Fail fast - empty exchange names are invalid."""
        if not v or v.strip() == "":
            raise ValueError("Exchange name cannot be empty")
        return v.strip()

class RiskConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    take_profit_pct: Annotated[float, Field(ge=0.0, le=10.0)] = Field(default=0.05)

    @field_validator("take_profit_pct")
    @classmethod
    def tp_not_zero(cls, v: float) -> float:
        """Fail fast - zero take profit is invalid."""
        if v == 0:
            raise ValueError("Take profit cannot be zero")
        return v
```

---

### 4. Nested Config Hierarchy → `ApexConfig`

All sub-configs compose into a single root config. The root's validator ensures minimum viability (e.g., at least one exchange must be configured).

```python
class Mode(str, Enum):
    PAPER = "paper"
    LIVE = "live"

class ConvictionConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    minimum_entry: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.7)
    minimum_exit: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.5)
    momentum_weight: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.3)
    trend_weight: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.3)
    volatility_weight: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.2)
    volume_weight: Annotated[float, Field(ge=0.0, le=1.0)] = Field(default=0.2)

    @field_validator("momentum_weight", "trend_weight", "volatility_weight", "volume_weight")
    @classmethod
    def weights_non_negative(cls, v: float) -> float:
        """Fail fast - negative weights are invalid."""
        if v < 0:
            raise ValueError("Signal weights cannot be negative")
        return v

class LoggingConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    level: str = Field(default="INFO")
    format: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file_path: FilePath | None = Field(default=None)

    @field_validator("level")
    @classmethod
    def level_valid(cls, v: str) -> str:
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {valid_levels}")
        return v.upper()

class AlertingConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    enabled: bool = Field(default=True)
    email_recipients: list[str] = Field(default_factory=list)
    slack_webhook: str = Field(default="")
    discord_webhook: str = Field(default="")

    @field_validator("slack_webhook", "discord_webhook")
    @classmethod
    def webhook_format(cls, v: str) -> str:
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        return v

class ApexConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    mode: Mode = Field(default=Mode.PAPER)
    log_level: str = Field(default="INFO")
    environment: str = Field(default="development")

    exchanges: dict[str, ExchangeConfig] = Field(default_factory=dict)
    risk: RiskConfig = Field(default_factory=RiskConfig)
    conviction: ConvictionConfig = Field(default_factory=ConvictionConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    metrics: MetricsConfig = Field(default_factory=MetricsConfig)
    alerting: AlertingConfig = Field(default_factory=AlertingConfig)

    @field_validator("exchanges")
    @classmethod
    def at_least_one_exchange(cls, v: dict) -> dict:
        """Fail fast - must have at least one exchange configured."""
        if not v:
            raise ValueError("At least one exchange must be configured")
        return v
```

---

### 5. `ApexConfig.from_toml(path)` — Parse at Boundary

TOML is loaded and immediately passed to `model_validate`. Any validation error is re-raised as a descriptive `ValueError`. `tomllib` (Python 3.11+) with `tomli` fallback.

```python
from pathlib import Path
from pydantic import ValidationError

@classmethod
def from_toml(cls, path: Path) -> "ApexConfig":
    """Parse TOML config file - parse at boundary, fail fast on errors."""
    try:
        import tomllib  # Python 3.11+
    except ImportError:
        try:
            import tomli as tomllib  # type: ignore[import-not-found]
        except ImportError as e:
            raise ImportError(
                "tomli required for TOML parsing. Install with: pip install tomli"
            ) from e

    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    with open(path, "rb") as f:
        raw_data = tomllib.load(f)

    try:
        return cls.model_validate(raw_data)
    except ValidationError as e:
        raise ValueError(f"Configuration validation failed: {e}") from e
```

---

### 6. `ApexConfig.from_env()` — Environment Variable Parsing

Loads `.env` file via `python-dotenv` (optional), then calls `model_validate({})` to let `pydantic-settings` resolve values from the environment.

```python
@classmethod
def from_env(cls) -> "ApexConfig":
    """Parse environment variables - parse at boundary."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv optional

    try:
        return cls.model_validate({})
    except ValidationError as e:
        raise ValueError(f"Environment configuration failed: {e}") from e
```

---

### 7. Module-Level Singleton

`_config` starts as `None`. `init_config()` raises if called twice. `get_config()` raises if not yet initialized. Neither silently returns `None`.

```python
_config: ApexConfig | None = None


def get_config() -> ApexConfig:
    """Get current config - fail loud if not initialized."""
    if _config is None:
        raise RuntimeError("Configuration not initialized. Call init_config() first.")
    return _config


def init_config(config: ApexConfig) -> None:
    """Initialize global config - single entry point, fail fast on duplicates."""
    global _config
    if _config is not None:
        raise RuntimeError("Configuration already initialized")
    _config = config
```

---

## Code Examples

### Typical Startup Sequence

```python
from pathlib import Path
from apex.core.config import ApexConfig, init_config, get_config

# Load from TOML at application startup
config = ApexConfig.from_toml(Path("config/apex.toml"))
init_config(config)

# Anywhere in the codebase
cfg = get_config()
print(cfg.risk.max_position_size)   # 0.1 (trusted float, no re-validation)
print(cfg.mode)                     # Mode.PAPER
```

### Sample TOML Config

```toml
mode = "paper"
log_level = "INFO"
environment = "development"

[exchanges.binance]
name = "binance"
api_key = "your_key"
api_secret = "your_secret"
testnet = true

[risk]
max_position_size = 0.05
max_daily_loss = 0.02
stop_loss_pct = 0.01

[conviction]
minimum_entry = 0.75
momentum_weight = 0.3
trend_weight = 0.3
volatility_weight = 0.2
volume_weight = 0.2
```

---

## Philosophy Checklist

- **Early Exit**: `from_toml` exits immediately if file doesn't exist; `get_config` exits immediately if not initialized
- **Parse Don't Validate**: Raw TOML/env data parsed once at boundary; internal code receives trusted `ApexConfig`
- **Atomic Predictability**: `frozen=True` on every model; no mutations after construction
- **Fail Fast**: `init_config` raises on double-init; `@field_validator` raises on bad values at construction
- **Intentional Naming**: `from_toml`, `from_env`, `init_config`, `get_config` — every function name describes exactly what it does
