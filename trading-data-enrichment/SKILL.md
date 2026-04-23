---
name: trading-data-enrichment
description: Data enrichment techniques for adding context to raw trading data
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: data enrichment, data-enrichment, techniques, adding, context
---

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
