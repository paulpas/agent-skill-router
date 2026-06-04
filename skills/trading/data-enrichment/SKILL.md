---
name: data-enrichment
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Provides Data enrichment techniques for adding context to raw trading
  data"'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data
  role: implementation
  scope: implementation
  triggers: adding, context, data enrichment, data-enrichment, techniques
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
**Role:** Add contextual information to raw data for better decision making

**Philosophy:** Raw data lacks context; enrichment transforms numbers into insights for smarter trading

## Key Principles

1. **Reference Data Integration**: Add symbol metadata, corporate actions, sector info
2. **Market Context**: Incorporate index data, volatility indexes, macro indicators
3. **Event-Driven Enrichment**: Add news, earnings, and corporate event data
4. **Derived Features**: Calculate ratios, correlations, and relative strength
5. **Data Quality Scoring**: Tag enriched data with confidence levels

## Implementation Guidelines

### Structure
- Core logic: enrichment/enricher.py
- Context providers: enrichment/context_providers.py
- Tests: tests/test_data_enrichment.py

### Patterns to Follow
- Use dependency injection for context providers
- Implement enrichment pipelines for complex transformations
- Support asynchronous enrichment for external sources
- Track enrichment quality metrics

## Adherence Checklist
Before completing your task, verify:
- [ ] Enrichment sources are configurable
- [ ] Data quality scores are calculated
- [ ] Enrichment latency is monitored
- [ ] Fallback values are provided when context unavailable
- [ ] Enrichment history is tracked


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging

class EnrichmentType(Enum):
    REFERENCE = "reference"  # Symbol metadata, sector, etc.
    MARKET = "market"        # Index data, volatility
    EVENT = "event"          # Earnings, news, splits
    DERIVED = "derived"      # Ratios, correlations

@dataclass
class EnrichmentSource:
    """Configuration for an enrichment source."""
    name: str
    source_type: EnrichmentType
    enabled: bool = True
    timeout_seconds: float = 5.0

@dataclass
class EnrichmentResult:
    """Result of data enrichment."""
    original_data: Dict[str, Any]
    enriched_data: Dict[str, Any]
    quality_score: float = 1.0  # 0-1
    enrichment_log: List[Dict] = field(default_factory=list)

class EnrichmentPipeline:
    """Pipeline for applying multiple enrichments to data."""
    
    def __init__(self):
        self.sources: Dict[str, EnrichmentSource] = {}
        self.providers: Dict[str, Callable] = {}
        self._initialize_default_sources()
    
    def _initialize_default_sources(self):
        """Initialize default enrichment sources."""
        self.register_source(EnrichmentSource(
            name="symbol_metadata",
            source_type=EnrichmentType.REFERENCE
        ))
        
        self.register_source(EnrichmentSource(
            name="market_indices",
            source_type=EnrichmentType.MARKET
        ))
        
        self.register_source(EnrichmentSource(
            name="news_events",
            source_type=EnrichmentType.EVENT
        ))
        
        self.register_source(EnrichmentSource(
            name="technical_ratios",
            source_type=EnrichmentType.DERIVED
        ))
    
    def register_source(self, source: EnrichmentSource):
        """Register an enrichment source."""
        self.sources[source.name] = source
    
    def register_provider(self, source_name: str, provider_func: Callable):
        """Register enrichment provider function."""
        self.providers[source_name] = provider_func
    
    def enrich(
        self,
        data: Dict[str, Any],
        sources: Optional[List[str]] = None
    ) -> EnrichmentResult:
        """Apply enrichments to data."""
        result = EnrichmentResult(
            original_data=data.copy(),
            enriched_data=data.copy()
        )
        
        sources_to_apply = sources or list(self.sources.keys())
        
        total_sources = len(sources_to_apply)
        successful = 0
        
        for source_name in sources_to_apply:
            if source_name not in self.sources:
                continue
            
            source = self.sources[source_name]
            if not source.enabled:
                result.enrichment_log.append({
                    "source": source_name,
                    "status": "skipped",
                    "reason": "disabled"
                })
                continue
            
            if source_name not in self.providers:
                result.enrichment_log.append({
                    "source": source_name,
                    "status": "failed",
                    "reason": "no provider registered"
                })
                continue
            
            try:
                enrichment_start = time.time()
                enrichment = self.providers[source_name](data, source_name)
                enrichment_duration = time.time() - enrichment_start
                
                if enrichment is not None:
                    result.enriched_data.update(enrichment)
                    result.enrichment_log.append({
                        "source": source_name,
                        "status": "success",
                        "duration_seconds": enrichment_duration,
                        "keys_added": len(enrichment)
                    })
                    successful += 1
                else:
                    result.enrichment_log.append({
                        "source": source_name,
                        "status": "skipped",
                        "reason": "provider returned None"
                    })
                    
            except Exception as e:
                result.enrichment_log.append({
                    "source": source_name,
                    "status": "failed",
                    "error": str(e)
                })
        
        # Calculate quality score
        if total_sources > 0:
            result.quality_score = successful / total_sources
        
        return result
    
    def enrich_batch(
        self,
        data_list: List[Dict[str, Any]],
        sources: Optional[List[str]] = None
    ) -> List[EnrichmentResult]:
        """Enrich a batch of data items."""
        return [self.enrich(data, sources) for data in data_list]

class SymbolEnricher:
    """Enriches data with symbol-specific information."""
    
    def __init__(self):
        self.symbols: Dict[str, Dict[str, Any]] = {}
        self._initialize_symbols()
    
    def _initialize_symbols(self):
        """Initialize default symbol metadata."""
        self.symbols.update({
            "AAPL": {
                "name": "Apple Inc.",
                "sector": "Technology",
                "industry": "Consumer Electronics",
                "currency": "USD",
                "market_cap": 2500000000000,
                "country": "USA",
                "is_etf": False,
                "leverage": 1.0
            },
            "SPY": {
                "name": "SPDR S&P 500 ETF",
                "sector": "ETF",
                "industry": "Equity ETF",
                "currency": "USD",
                "market_cap": 400000000000,
                "country": "USA",
                "is_etf": True,
                "leverage": 1.0
            }
        })
    
    def register_symbol(self, symbol: str, metadata: Dict[str, Any]):
        """Register metadata for a symbol."""
        self.symbols[symbol] = metadata
    
    def enrich_symbol(
        self,
        data: Dict[str, Any],
        source_name: str
    ) -> Optional[Dict[str, Any]]:
        """Enrich data with symbol metadata."""
        symbol = data.get("symbol") or data.get("symbol_name")
        if not symbol:
            return None
        
        if symbol not in self.symbols:
            return None
        
        metadata = self.symbols[symbol]
        enrichment = {}
        
        for key, value in metadata.items():
            enrichment[f"{source_name}.{key}"] = value
        
        # Add derived fields
        if "is_etf" in metadata:
            enrichment[f"{source_name}.is_equity"] = not metadata["is_etf"]
        
        if "sector" in metadata:
            enrichment[f"{source_name}.sector_group"] = self._get_sector_group(metadata["sector"])
        
        return enrichment
    
    def _get_sector_group(self, sector: str) -> str:
        """Get sector group from sector."""
        sector_groups = {
            "Technology": "Technology",
            "Communication": "Communication",
            "Consumer Discretionary": "Consumer",
            "Consumer Staples": "Consumer",
            "Healthcare": "Healthcare",
            "Financials": "Financial",
            "Industrials": "Industrials",
            "Utilities": "Utilities",
            "Energy": "Energy",
            "Materials": "Materials",
            "Real Estate": "Real Estate"
        }
        return sector_groups.get(sector, "Other")

class MarketContextEnricher:
    """Enriches data with market context."""
    
    def __init__(self):
        self.indices: Dict[str, Dict[str, float]] = {}
        self._initialize_indices()
    
    def _initialize_indices(self):
        """Initialize market indices."""
        self.indices.update({
            "SPY": {"price": 450.0, "volatility_20d": 0.015, "volume": 100000000},
            "QQQ": {"price": 350.0, "volatility_20d": 0.020, "volume": 80000000},
            "VIX": {"price": 15.0, "description": "Low volatility"}
        })
    
    def enrich_market_context(
        self,
        data: Dict[str, Any],
        source_name: str
    ) -> Optional[Dict[str, Any]]:
        """Enrich data with market context."""
        symbol = data.get("symbol")
        if not symbol:
            return None
        
        enrichment = {}
        
        # Calculate relative strength to market
        if "close" in data and "SPY" in self.indices:
            spy_close = self.indices["SPY"]["price"]
            market_return = (spy_close - 440) / 440 if spy_close > 0 else 0
            stock_return = (data["close"] - data.get("open", data["close"])) / data.get("open", data["close"])
            
            enrichment[f"{source_name}.relative_strength"] = stock_return - market_return
        
        # Add index correlation estimates
        for index_name, index_data in self.indices.items():
            enrichment[f"{source_name}.{index_name}_price"] = index_data["price"]
            enrichment[f"{source_name}.{index_name}_volatility"] = index_data["volatility_20d"]
        
        # Market state
        if "VIX" in self.indices:
            vix = self.indices["VIX"]["price"]
            enrichment[f"{source_name}.market_state"] = self._get_market_state(vix)
        
        return enrichment
    
    def _get_market_state(self, vix: float) -> str:
        """Determine market state based on VIX."""
        if vix > 30:
            return "high_volatility"
        elif vix > 20:
            return "moderate_volatility"
        else:
            return "low_volatility"

class EventEnricher:
    """Enriches data with event information."""
    
    def __init__(self):
        self.events: Dict[str, List[Dict]] = {}
    
    def register_event(self, symbol: str, event: Dict[str, Any]):
        """Register an event for a symbol."""
        if symbol not in self.events:
            self.events[symbol] = []
        self.events[symbol].append(event)
    
    def enrich_events(
        self,
        data: Dict[str, Any],
        source_name: str
    ) -> Optional[Dict[str, Any]]:
        """Enrich data with event context."""
        symbol = data.get("symbol")
        if not symbol or symbol not in self.events:
            return None
        
        events = self.events[symbol]
        
        # Find relevant events
        enrichment = {
            f"{source_name}.event_count": len(events),
            f"{source_name}.has_upcoming_events": len(events) > 0
        }
        
        # Add event details
        for i, event in enumerate(events):
            enrichment[f"{source_name}.event_{i}_type"] = event.get("type", "unknown")
            enrichment[f"{source_name}.event_{i}_date"] = event.get("date", "")
        
        return enrichment

class EnrichmentQualityMonitor:
    """Monitors enrichment quality."""
    
    def __init__(self):
        self.metrics: Dict[str, Dict] = {}
        self._lock = None
    
    def record_enrichment(self, result: EnrichmentResult):
        """Record enrichment result."""
        for log in result.enrichment_log:
            source = log["source"]
            status = log["status"]
            
            if source not in self.metrics:
                self.metrics[source] = {"success": 0, "failed": 0, "skipped": 0}
            
            if status == "success":
                self.metrics[source]["success"] += 1
            elif status == "failed":
                self.metrics[source]["failed"] += 1
            else:
                self.metrics[source]["skipped"] += 1
    
    def get_quality_report(self) -> Dict[str, Dict]:
        """Get enrichment quality report."""
        report = {}
        
        for source, counts in self.metrics.items():
            total = counts["success"] + counts["failed"] + counts["skipped"]
            report[source] = {
                "success_rate": counts["success"] / total if total > 0 else 0,
                "success_count": counts["success"],
                "failed_count": counts["failed"],
                "skipped_count": counts["skipped"],
                "total": total
            }
        
        return report
```

---

---


### Pattern 2: Feature Engineering Pipeline with Validation

```python
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EnrichedCandle:
    """A candle enriched with computed technical features."""
    timestamp: datetime
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float

    # Computed features
    sma_20: Optional[float] = None
    rsi_14: Optional[float] = None
    atr_14: Optional[float] = None
    macd_signal: Optional[str] = None
    vwap: Optional[float] = None

    @property
    def has_all_features(self) -> bool:
        return all([
            self.sma_20 is not None,
            self.rsi_14 is not None,
            self.atr_14 is not None,
            self.vwap is not None,
        ])


class FeatureEnricher:
    """Computes technical features and enriches raw candle data."""

    def __init__(self, window_sizes: dict[str, int] | None = None):
        self._windows = window_sizes or {"sma": 20, "rsi": 14, "atr": 14}

    def enrich_batch(
        self, candles: list[dict],
    ) -> list[EnrichedCandle]:
        """Apply feature engineering to a batch of raw candle dicts.

        Args:
            candles: List of raw OHLCV dicts with keys: timestamp, open, high, low, close, volume.

        Returns:
            List of EnrichedCandle objects with computed technical features.
        """
        if not candles:
            return []

        prices = [c["close"] for c in candles]
        highs = [c["high"] for c in candles]
        lows = [c["low"] for c in candles]
        volumes = [c["volume"] for c in candles]

        sma_values = self._compute_sma(prices, self._windows["sma"])
        rsi_values = self._compute_rsi(prices, self._windows["rsi"])
        atr_values = self._compute_atr(highs, lows, prices, self._windows["atr"])
        vwap_values = self._compute_vwap(prices, volumes)

        enriched: list[EnrichedCandle] = []
        for i, candle in enumerate(candles):
            ec = EnrichedCandle(
                timestamp=datetime.fromisoformat(candle["timestamp"]),
                open_price=candle["open"],
                high_price=candle["high"],
                low_price=candle["low"],
                close_price=candle["close"],
                volume=candle["volume"],
                sma_20=sma_values[i],
                rsi_14=rsi_values[i],
                atr_14=atr_values[i],
                vwap=vwap_values[i],
            )
            enriched.append(ec)

        logger.info("Enriched %d candles with %d features", len(enriched), 4)
        return enriched

    @staticmethod
    def _compute_sma(closes: list[float], window: int) -> list[Optional[float]]:
        result: list[Optional[float]] = [None] * window
        for i in range(window, len(closes)):
            avg = sum(closes[i - window:i]) / window
            result.append(round(avg, 6))
        return result

    @staticmethod
    def _compute_rsi(closes: list[float], period: int) -> list[Optional[float]]:
        result: list[Optional[float]] = [None] * period
        if len(closes) < period + 1:
            return result
        deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        if avg_loss == 0:
            result.append(100.0)
        else:
            rs = avg_gain / avg_loss
            result.append(round(100 - (100 / (1 + rs)), 4))
        for i in range(period, len(deltas)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            if avg_loss == 0:
                result.append(100.0)
            else:
                rs = avg_gain / avg_loss
                result.append(round(100 - (100 / (1 + rs)), 4))
        return result

    @staticmethod
    def _compute_atr(highs, lows, closes, period):
        result = [None] * period
        if len(highs) < period + 1:
            return result
        trs = []
        for i in range(1, len(highs)):
            tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
            trs.append(tr)
        avg_tr = sum(trs[:period]) / period
        result.append(round(avg_tr, 6))
        for i in range(period, len(trs)):
            avg_tr = (avg_tr * (period - 1) + trs[i]) / period
            result.append(round(avg_tr, 6))
        return result

    @staticmethod
    def _compute_vwap(prices, volumes):
        result: list[Optional[float]] = []
        cum_pv = 0.0
        cum_vol = 0.0
        for p, v in zip(prices, volumes):
            cum_pv += p * v
            cum_vol += v
            result.append(round(cum_pv / cum_vol, 6) if cum_vol > 0 else None)
        return result
```

## Constraints

### MUST DO
- Validate all incoming data against schema constraints (type, range, nullability) before processing or storage
- Implement idempotent operations: re-processing the same data must produce identical results
- Track data lineage and provenance with timestamps, source identifiers, and transformation history for every record
- Handle out-of-order data by implementing a watermark-based ordering mechanism with configurable tolerance window
- Log data quality metrics (completeness, freshness, accuracy) per source with automatic alerting on degradation

### MUST NOT DO
- Do not silently drop records that fail validation — log them to a quarantine table for review
- Avoid concatenating strings for timestamp comparison; use proper datetime/timedelta objects
- Never assume data arrives in chronological order from any external feed without explicit ordering guarantees
- Do not store raw and processed data in the same table without clear partitioning or separation strategy
- Avoid blocking on slow data sources — implement async prefetch with timeout-based fallback to cached data


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Enriching Data Tutorial](https://docs.quantconnect.com/tutorials/enriching-data)
- [Alternative Data Sources for Trading](https://www.investopedia.com/terms/a/alternative-data.asp)
- [Feature Enrichment in ML Pipelines](https://scikit-learn.org/stable/modules/compose.html#combining-estimators)
- [Cross-Referencing Market Data Feeds](https://docs.quantconnect.com/tutorials/data-sources-and-format)
- [Real-Time Data Enrichment Patterns](https://kafka.apache.org/documentation/)
