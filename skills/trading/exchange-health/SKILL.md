---




name: exchange-health
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Provides Exchange system health monitoring and connectivity status
  tracking"'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data
  role: implementation
  scope: implementation
  triggers: connectivity, exchange health, exchange-health, monitoring, system, cloudwatch,
    logging
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
version: "1.0.0"




---




**Role:** Monitor exchange API health and availability to ensure reliable trading operations

**Philosophy:** Exchange availability is critical; early detection of issues prevents trading failures and potential losses

## Key Principles

1. **Multi-Metric Health Check**: Combine latency, error rate, and heartbeat monitoring
2. **Health Score Calculation**: Aggregate metrics into single health score
3. **Alerting Thresholds**: Configurable thresholds with escalation paths
4. **Graceful Degradation**: Reduce functionality when exchanges are unhealthy
5. **Circuit State Tracking**: Maintain state for automatic recovery coordination

## Implementation Guidelines

### Structure
- Core logic: health_monitor/monitor.py
- Metrics collection: health_monitor/metrics.py
- Tests: tests/test_exchange_health.py

### Patterns to Follow
- Use async health checks for parallel monitoring
- Implement sliding window for rate calculations
- Support pluggable alert backends
- Track historical health data

## Adherence Checklist
Before completing your task, verify:
- [ ] Health checks run at configurable intervals
- [ ] Alerts are sent before service disruption
- [ ] Circuit breaker integration is active
- [ ] Historical health data is persisted
- [ ] Multiple alert channels are supported


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import asyncio
import time
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import logging

class HealthStatus(Enum):
    UNKNOWN = "unknown"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class HealthMetric:
    """Single health metric observation."""
    name: str
    value: float
    timestamp: float
    labels: Dict[str, str] = field(default_factory=dict)

@dataclass
class ExchangeHealth:
    """Health status for a single exchange."""
    exchange_id: str
    status: HealthStatus = HealthStatus.UNKNOWN
    last_check: float = 0
    metrics: Dict[str, float] = field(default_factory=dict)
    alerts: List[str] = field(default_factory=list)
    latency_p50: float = 0
    latency_p95: float = 0
    error_rate: float = 0
    heartbeat_lag: float = 0

class SlidingWindow:
    """Sliding window for time-series data."""
    
    def __init__(self, window_seconds: float, max_samples: int = 1000):
        self.window = window_seconds
        self.max_samples = max_samples
        self.samples: deque = deque()
        self.lock = asyncio.Lock()
    
    async def add(self, value: float, timestamp: float = None):
        """Add sample to window."""
        async with self.lock:
            timestamp = timestamp or time.time()
            self.samples.append((timestamp, value))
            
            # Trim old samples
            cutoff = timestamp - self.window
            while self.samples and self.samples[0][0] < cutoff:
                self.samples.popleft()
            
            # Trim to max size
            while len(self.samples) > self.max_samples:
                self.samples.popleft()
    
    async def get(self) -> List[float]:
        """Get all samples."""
        async with self.lock:
            return [v for _, v in self.samples]
    
    async def get_average(self) -> float:
        """Get average of samples."""
        samples = await self.get()
        return sum(samples) / len(samples) if samples else 0
    
    async def get_percentile(self, percentile: float) -> float:
        """Get percentile of samples."""
        samples = await self.get()
        if not samples:
            return 0
        
        sorted_samples = sorted(samples)
        index = int(len(sorted_samples) * percentile / 100)
        return sorted_samples[min(index, len(sorted_samples) - 1)]

class HealthMonitor:
    """Monitors health of multiple exchanges."""
    
    def __init__(
        self,
        check_interval: float = 10.0,
        alert_threshold: float = 0.7,  # 70% health triggers alert
        unhealthy_threshold: float = 0.5,  # 50% health = unhealthy
        alert_cooldown: float = 300.0  # 5 minutes between alerts
    ):
        self.check_interval = check_interval
        self.alert_threshold = alert_threshold
        self.unhealthy_threshold = unhealthy_threshold
        self.alert_cooldown = alert_cooldown
        
        self.exchanges: Dict[str, ExchangeHealth] = {}
        self.latency_windows: Dict[str, SlidingWindow] = {}
        self.error_windows: Dict[str, SlidingWindow] = {}
        self.heartbeat_windows: Dict[str, SlidingWindow] = {}
        
        self.alert_callbacks: List[Callable] = []
        self.last_alert_time: float = 0
        self.health_callbacks: List[Callable] = []
    
    def register_exchange(self, exchange_id: str):
        """Register exchange for health monitoring."""
        if exchange_id not in self.exchanges:
            self.exchanges[exchange_id] = ExchangeHealth(exchange_id=exchange_id)
            self.latency_windows[exchange_id] = SlidingWindow(60.0)
            self.error_windows[exchange_id] = SlidingWindow(60.0)
            self.heartbeat_windows[exchange_id] = SlidingWindow(60.0)
    
    async def record_latency(self, exchange_id: str, latency_ms: float):
        """Record latency measurement."""
        self.register_exchange(exchange_id)
        await self.latency_windows[exchange_id].add(latency_ms)
        
        health = self.exchanges[exchange_id]
        health.latency_p50 = await self.latency_windows[exchange_id].get_percentile(50)
        health.latency_p95 = await self.latency_windows[exchange_id].get_percentile(95)
    
    async def record_error(self, exchange_id: str):
        """Record error occurrence."""
        self.register_exchange(exchange_id)
        await self.error_windows[exchange_id].add(1.0)
        
        # Calculate error rate
        samples = await self.error_windows[exchange_id].get()
        if samples:
            error_rate = sum(samples) / len(samples)
            self.exchanges[exchange_id].error_rate = error_rate
    
    async def record_success(self, exchange_id: str):
        """Record successful request."""
        self.register_exchange(exchange_id)
        await self.error_windows[exchange_id].add(0.0)
    
    async def record_heartbeat(self, exchange_id: str, lag_ms: float):
        """Record WebSocket heartbeat lag."""
        self.register_exchange(exchange_id)
        await self.heartbeat_windows[exchange_id].add(lag_ms)
        
        health = self.exchanges[exchange_id]
        health.heartbeat_lag = await self.heartbeat_windows[exchange_id].get_average()
    
    async def check_health(self, exchange_id: str) -> ExchangeHealth:
        """Perform health check and update status."""
        health = self.exchanges.get(exchange_id)
        if not health:
            return health
        
        health.last_check = time.time()
        
        # Calculate health score (0-1, higher is better)
        score = 1.0
        
        # Latency penalty
        if health.latency_p95 > 1000:  # > 1 second
            score -= 0.3
        elif health.latency_p95 > 500:  # > 500ms
            score -= 0.1
        
        # Error rate penalty
        score -= health.error_rate * 2
        
        # Heartbeat lag penalty
        if health.heartbeat_lag > 5000:  # > 5 seconds
            score -= 0.2
        elif health.heartbeat_lag > 1000:  # > 1 second
            score -= 0.05
        
        score = max(0.0, min(1.0, score))
        health.metrics["health_score"] = score
        
        # Determine status
        if score >= self.alert_threshold:
            health.status = HealthStatus.HEALTHY
        elif score >= self.unhealthy_threshold:
            health.status = HealthStatus.DEGRADED
            health.alerts.append("Exchange performance degraded")
        else:
            health.status = HealthStatus.UNHEALTHY
            health.alerts.append("Exchange health critical")
        
        # Check for alerts
        await self._check_alerts(health)
        
        return health
    
    async def _check_alerts(self, health: ExchangeHealth):
        """Check if alerts should be sent."""
        if health.status == HealthStatus.UNHEALTHY:
            if time.time() - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = time.time()
                for callback in self.alert_callbacks:
                    try:
                        await callback(health)
                    except Exception as e:
                        logging.error(f"Alert callback error: {e}")
        
        # Trigger health change callbacks
        for callback in self.health_callbacks:
            try:
                callback(health)
            except Exception as e:
                logging.error(f"Health callback error: {e}")
    
    def register_alert_callback(self, callback: Callable):
        """Register alert callback."""
        self.alert_callbacks.append(callback)
    
    def register_health_callback(self, callback: Callable):
        """Register health status change callback."""
        self.health_callbacks.append(callback)
    
    def get_exchange_status(self, exchange_id: str) -> Optional[ExchangeHealth]:
        """Get current health status for exchange."""
        return self.exchanges.get(exchange_id)
    
    def get_all_statuses(self) -> Dict[str, ExchangeHealth]:
        """Get health status for all exchanges."""
        return self.exchanges.copy()
    
    async def run_periodic_checks(self):
        """Run periodic health checks."""
        while True:
            for exchange_id in self.exchanges:
                await self.check_health(exchange_id)
            await asyncio.sleep(self.check_interval)
    
    def is_exchange_healthy(self, exchange_id: str) -> bool:
        """Check if exchange is currently healthy."""
        health = self.exchanges.get(exchange_id)
        if not health:
            return False
        return health.status == HealthStatus.HEALTHY

class CircuitHealthIntegrator:
    """Integrates health monitoring with circuit breaker."""
    
    def __init__(self, health_monitor: HealthMonitor, circuit_breaker):
        self.health = health_monitor
        self.circuit = circuit_breaker
    
    async def on_health_change(self, health: ExchangeHealth):
        """Handle health status changes for circuit management."""
        if health.status == HealthStatus.UNHEALTHY:
            self.circuit.record_failure()
            logging.warning(f"Circuit breaker triggered for {health.exchange_id}")
        elif health.status == HealthStatus.HEALTHY:
            self.circuit.record_success()
```

---

---


### Pattern 2: Exchange Health Check with Multi-Metric Scoring

```python
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class ExchangeHealthReport:
    """Comprehensive health report for an exchange connection."""
    exchange_id: str
    status: HealthStatus = HealthStatus.UNKNOWN
    avg_latency_ms: float = 0.0
    error_rate_1m: float = 0.0  # Errors / total requests in last minute
    uptime_ratio: float = 1.0   # Fraction of time reachable in last 5 minutes
    ws_connected: bool = False
    order_submit_latency_ms: float = 0.0
    last_check_at: float = field(default_factory=time.monotonic)
    health_score: float = 100.0  # 0-100 composite score

    @property
    def is_tradable(self) -> bool:
        return self.status in (HealthStatus.HEALTHY, HealthStatus.DEGRADED)


class ExchangeHealthMonitor:
    """Monitors exchange health using multiple metrics with composite scoring."""

    def __init__(self, exchange_id: str, check_interval: float = 10.0):
        self.exchange_id = exchange_id
        self._interval = check_interval
        self._history: list[ExchangeHealthReport] = []
        self._latency_samples: list[float] = []

    async def run_health_check(self) -> ExchangeHealthReport:
        """Execute a comprehensive health check against the exchange."""
        start = time.monotonic()

        # Measure API latency via ping
        try:
            await self._ping_exchange()
            latency_ms = (time.monotonic() - start) * 1000
        except Exception as e:
            logger.error("Health check ping failed for %s: %s", self.exchange_id, e)
            return ExchangeHealthReport(
                exchange_id=self.exchange_id, status=HealthStatus.UNHEALTHY,
                last_check_at=time.monotonic(), health_score=0.0,
            )

        # Measure WebSocket connectivity
        ws_connected = await self._check_websocket()

        # Compute composite health score (0-100)
        latency_penalty = min(40, latency_ms / 5)  # Lose up to 40 points for high latency
        ws_penalty = 30 if not ws_connected else 0

        score = max(0, 100 - latency_penalty - ws_penalty)

        if score >= 80:
            status = HealthStatus.HEALTHY
        elif score >= 50:
            status = HealthStatus.DEGRADED
        else:
            status = HealthStatus.UNHEALTHY

        report = ExchangeHealthReport(
            exchange_id=self.exchange_id,
            status=status,
            avg_latency_ms=round(latency_ms, 2),
            ws_connected=ws_connected,
            health_score=round(score, 1),
            last_check_at=time.monotonic(),
        )

        self._history.append(report)
        self._latency_samples.append(latency_ms)
        if len(self._latency_samples) > 100:
            self._latency_samples.pop(0)

        logger.info("Health check %s: status=%s score=%.1f latency=%.0fms",
                     self.exchange_id, status.value, score, latency_ms)
        return report

    async def _ping_exchange(self) -> None:
        """Lightweight API call to measure response time."""
        pass  # Actual implementation varies by exchange

    async def _check_websocket(self) -> bool:
        """Verify WebSocket connection is alive and receiving updates."""
        return True  # Placeholder — actual WS health check
```

## Constraints

### MUST DO
- Implement a unified adapter interface across all exchange integrations to standardize order placement, cancellation, and querying
- Handle rate limiting proactively with token bucket or leaky bucket algorithms — never wait for 429 responses before slowing down
- Maintain local order state as the source of truth; reconcile with exchange state periodically via webhook events and polling
- Implement heartbeat monitoring per exchange connection with automatic failover to a secondary data feed on timeout
- Log all API interactions including request/response IDs, timing, and status codes for audit and debugging

### MUST NOT DO
- Do not trust exchange-reported order states without local confirmation — always reconcile after every state change
- Avoid sending multiple orders for the same position simultaneously across different adapters or sessions
- Never store API keys or secrets in code — use environment variables or a secrets manager with automatic rotation
- Do not assume all exchanges support the same order types — implement graceful degradation with clear capability negotiation
- Avoid polling-based price updates when WebSocket/streaming APIs are available — polling creates unnecessary load and latency


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Exchange Status Tutorial](https://docs.quantconnect.com/tutorials/exchange-status)
- [Exchange Uptime Monitoring](https://docs.binance.org/)
- [Trading System Health Checks](https://docs.quantconnect.com/tutorials/live-trading-overview)
- [Market Status Indicators](https://www.investopedia.com/terms/m/market-hours.asp)
- [Exchange API Latency Monitoring](https://docs.ccxt.org/en/latest/manual.html#rate-limit)
