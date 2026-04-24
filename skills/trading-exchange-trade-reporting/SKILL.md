---
name: trading-exchange-trade-reporting
description: Real-time trade reporting and execution analytics for monitoring and
  optimization
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: analytics, exchange trade reporting, exchange-trade-reporting, execution,
    real-time
  related-skills: trading-exchange-order-book-sync, trading-exchange-order-execution-api
    trading-technical-cycle-analysis, trading-technical-false-signal-filtering
---

**Role:** Generate and analyze trade reports for performance monitoring and regulatory compliance

**Philosophy:** Execution quality directly impacts PnL; trade reporting provides the feedback loop for continuous improvement

## Key Principles

1. **Event Streaming**: Real-time trade events for immediate feedback
2. **Aggregated Metrics**: Volume-weighted, time-weighted, and volume-profile metrics
3. **Performance Attribution**: Break down PnL by source (alpha, slippage, fees)
4. **Anomaly Detection**: Flag unusual execution patterns for review
5. **Compliance Tracking**: Maintain audit trail for regulatory requirements

## Implementation Guidelines

### Structure
- Core logic: reporting/trade_reporter.py
- Metrics: reporting/metrics_calculator.py
- Tests: tests/test_trade_reporting.py

### Patterns to Follow
- Use event-driven architecture for real-time reporting
- Support batch and streaming report generation
- Implement customizable report templates
- Track reporting latency

## Adherence Checklist
Before completing your task, verify:
- [ ] Trade events are processed in real-time
- [ ] Slippage calculations use benchmark prices
- [ ] Reports are generated within SLA timeframes
- [ ] Anomaly detection triggers alerts
- [ ] Audit trail is immutable


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
import uuid
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging

class TradeSide(Enum):
    BUY = "buy"
    SELL = "sell"

class TradeType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    OTHER = "other"

@dataclass
class Trade:
    """Represents a single trade execution."""
    id: str
    order_id: str
    symbol: str
    side: TradeSide
    quantity: float
    price: float
    timestamp: float
    commission: float = 0.0
    fees: float = 0.0
    exchange: str = ""
    trade_type: TradeType = TradeType.MARKET
    tags: Dict[str, str] = field(default_factory=dict)
    
    @property
    def notional_value(self) -> float:
        return self.quantity * self.price
    
    @property
    def total_cost(self) -> float:
        return self.notional_value + self.commission + self.fees

@dataclass
class ExecutionReport:
    """Execution report for a single order."""
    order_id: str
    symbol: str
    total_quantity: float
    filled_quantity: float
    avg_price: float
    remaining_quantity: float
    filled_notional: float
    total_commission: float
    total_fees: float
    start_time: float
    end_time: float
    trades: List[Trade] = field(default_factory=list)
    
    @property
    def fill_percentage(self) -> float:
        if self.total_quantity == 0:
            return 0.0
        return (self.filled_quantity / self.total_quantity) * 100
    
    @property
    def slippage(self) -> Optional[float]:
        """Calculate slippage if benchmark price is available."""
        if self.benchmark_price and self.avg_price:
            if self.trades and self.trades[0].side == TradeSide.BUY:
                return self.avg_price - self.benchmark_price
            return self.benchmark_price - self.avg_price
        return None
    
    benchmark_price: Optional[float] = None

class TradeReporter:
    """Generates and manages trade reports."""
    
    def __init__(self, event_callback: Optional[Callable] = None):
        self.trades: List[Trade] = []
        self.reports: Dict[str, ExecutionReport] = {}
        self.order_executions: Dict[str, List[Trade]] = {}
        self.event_callback = event_callback
        self.alert_callbacks: List[Callable] = []
    
    def record_trade(self, trade: Trade):
        """Record a new trade execution."""
        self.trades.append(trade)
        
        # Group by order
        if trade.order_id not in self.order_executions:
            self.order_executions[trade.order_id] = []
        self.order_executions[trade.order_id].append(trade)
        
        # Update report
        self._update_report(trade)
        
        # Trigger event
        if self.event_callback:
            self.event_callback("trade_recorded", trade)
    
    def _update_report(self, trade: Trade):
        """Update execution report with new trade."""
        if trade.order_id not in self.reports:
            self.reports[trade.order_id] = ExecutionReport(
                order_id=trade.order_id,
                symbol=trade.symbol,
                total_quantity=trade.quantity,
                filled_quantity=0,
                avg_price=0,
                remaining_quantity=trade.quantity,
                filled_notional=0,
                total_commission=0,
                total_fees=0,
                start_time=trade.timestamp,
                end_time=trade.timestamp
            )
        
        report = self.reports[trade.order_id]
        report.trades.append(trade)
        
        # Update aggregates
        report.filled_quantity += trade.quantity
        report.filled_notional += trade.notional_value
        report.total_commission += trade.commission
        report.total_fees += trade.fees
        report.end_time = trade.timestamp
        
        # Recalculate average price
        if report.filled_quantity > 0:
            report.avg_price = report.filled_notional / report.filled_quantity
        
        report.remaining_quantity = report.total_quantity - report.filled_quantity
    
    def get_order_report(self, order_id: str) -> Optional[ExecutionReport]:
        """Get execution report for specific order."""
        return self.reports.get(order_id)
    
    def get_order_trades(self, order_id: str) -> List[Trade]:
        """Get all trades for specific order."""
        return self.order_executions.get(order_id, [])
    
    def get_execution_metrics(self, order_id: str) -> Dict:
        """Get detailed execution metrics for an order."""
        report = self.reports.get(order_id)
        if not report:
            return {}
        
        metrics = {
            "order_id": order_id,
            "symbol": report.symbol,
            "fill_rate": report.fill_percentage,
            "avg_price": report.avg_price,
            "total_cost": report.filled_notional + report.total_commission + report.total_fees,
            "duration_seconds": report.end_time - report.start_time,
            "trade_count": len(report.trades),
            "slippage": report.slippage
        }
        
        # Per-trade metrics
        if report.trades:
            metrics.update({
                "min_fill_size": min(t.quantity for t in report.trades),
                "max_fill_size": max(t.quantity for t in report.trades),
                "avg_fill_size": sum(t.quantity for t in report.trades) / len(report.trades)
            })
        
        return metrics
    
    def generate_summary_report(self, start_time: Optional[float] = None, 
                               end_time: Optional[float] = None) -> Dict:
        """Generate summary report for time period."""
        trades = self.trades
        
        if start_time:
            trades = [t for t in trades if t.timestamp >= start_time]
        if end_time:
            trades = [t for t in trades if t.timestamp <= end_time]
        
        if not trades:
            return {"error": "No trades in period"}
        
        total_volume = sum(t.quantity for t in trades)
        total_notional = sum(t.notional_value for t in trades)
        total_commission = sum(t.commission for t in trades)
        total_fees = sum(t.fees for t in trades)
        
        # Breakdown by side
        buys = [t for t in trades if t.side == TradeSide.BUY]
        sells = [t for t in trades if t.side == TradeSide.SELL]
        
        return {
            "period_start": start_time or trades[0].timestamp,
            "period_end": end_time or trades[-1].timestamp,
            "total_trades": len(trades),
            "total_volume": total_volume,
            "total_notional": total_notional,
            "total_cost": total_notional + total_commission + total_fees,
            "total_commission": total_commission,
            "total_fees": total_fees,
            "buy_volume": sum(t.quantity for t in buys),
            "sell_volume": sum(t.quantity for t in sells),
            "avg_fill_size": total_volume / len(trades),
            "trades_by_symbol": self._group_by_symbol(trades),
            "trades_by_exchange": self._group_by_exchange(trades)
        }
    
    def _group_by_symbol(self, trades: List[Trade]) -> Dict[str, Dict]:
        """Group trades by symbol."""
        groups: Dict[str, List[Trade]] = {}
        for trade in trades:
            if trade.symbol not in groups:
                groups[trade.symbol] = []
            groups[trade.symbol].append(trade)
        
        return {
            symbol: {
                "volume": sum(t.quantity for t in trades),
                "notional": sum(t.notional_value for t in trades),
                "count": len(trades)
            }
            for symbol, trades in groups.items()
        }
    
    def _group_by_exchange(self, trades: List[Trade]) -> Dict[str, Dict]:
        """Group trades by exchange."""
        groups: Dict[str, List[Trade]] = {}
        for trade in trades:
            ex = trade.exchange or "unknown"
            if ex not in groups:
                groups[ex] = []
            groups[ex].append(trade)
        
        return {
            ex: {
                "volume": sum(t.quantity for t in trades),
                "notional": sum(t.notional_value for t in trades),
                "count": len(trades)
            }
            for ex, trades in groups.items()
        }
    
    def register_alert_callback(self, callback: Callable):
        """Register callback for anomaly alerts."""
        self.alert_callbacks.append(callback)
    
    def check_anomalies(self, trade: Trade) -> List[str]:
        """Check trade for anomalies."""
        anomalies = []
        
        # Large fill check (2x average)
        if len(self.trades) > 10:
            avg_fill = sum(t.quantity for t in self.trades[-10:]) / 10
            if trade.quantity > avg_fill * 2:
                anomalies.append(f"Large fill: {trade.quantity} (avg: {avg_fill:.2f})")
        
        # Price deviation check (5% from mid)
        if trade.tags.get("expected_price") and trade.tags.get("mid_price"):
            expected = float(trade.tags["expected_price"])
            mid = float(trade.tags["mid_price"])
            deviation = abs(trade.price - mid) / mid
            
            if deviation > 0.05:
                anomalies.append(f"Large price deviation: {deviation:.2%}")
        
        # Timestamp anomaly (before start)
        if trade.timestamp < (time.time() - 3600):  # More than 1 hour old
            anomalies.append("Stale trade timestamp")
        
        return anomalies

class PerformanceTracker:
    """Tracks execution performance metrics."""
    
    def __init__(self):
        self.volume_by_time: Dict[str, float] = {}
        self.vwap_by_time: Dict[str, float] = {}
        self.slippage_by_time: Dict[str, float] = {}
        self.start_time = time.time()
    
    def record_execution(self, trade: Trade, benchmark_price: Optional[float] = None):
        """Record execution for tracking."""
        hour_key = datetime.fromtimestamp(trade.timestamp).strftime("%Y-%m-%d %H")
        
        if hour_key not in self.volume_by_time:
            self.volume_by_time[hour_key] = 0
            self.vwap_by_time[hour_key] = 0
            self.slippage_by_time[hour_key] = 0
        
        # Update volume-weighted average
        old_volume = self.volume_by_time[hour_key]
        new_volume = old_volume + trade.quantity
        self.volume_by_time[hour_key] = new_volume
        
        old_vwap = self.vwap_by_time[hour_key]
        self.vwap_by_time[hour_key] = (
            (old_vwap * old_volume + trade.price * trade.quantity) / new_volume
        )
        
        # Track slippage
        if benchmark_price:
            slippage = abs(trade.price - benchmark_price) / benchmark_price
            self.slippage_by_time[hour_key] += slippage * trade.quantity
    
    def get_performance_summary(self) -> Dict:
        """Get performance summary."""
        if not self.volume_by_time:
            return {"error": "No execution data"}
        
        total_volume = sum(self.volume_by_time.values())
        total_slippage = sum(self.slippage_by_time.values())
        
        return {
            "start_time": self.start_time,
            "total_executions": len(self.volume_by_time),
            "total_volume": total_volume,
            "avg_vwap": sum(self.vwap_by_time.values()) / len(self.vwap_by_time),
            "avg_slippage_bps": (total_slippage / total_volume * 10000) if total_volume > 0 else 0,
            "volume_by_hour": dict(sorted(self.volume_by_time.items())),
            "vwap_by_hour": dict(sorted(self.vwap_by_time.items()))
        }
```