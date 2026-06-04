---
name: exchange-failover-handling
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Provides Automated failover and redundancy management for exchange
  connectivity"'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data
  role: implementation
  scope: implementation
  triggers: automated, exchange failover handling, exchange-failover-handling, management,
    redundancy
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
**Role:** Manage multiple exchange connections with automatic failover for uninterrupted trading

**Philosophy:** Redundancy is essential for production trading; failover must be transparent to trading logic

## Key Principles

1. **Active-Passive Configuration**: Primary with redundant backups
2. **Health-Driven Failover**: Fail based on health score, not just connection status
3. **State Synchronization**: Maintain sync state across failover nodes
4. **Graceful Degradation**: Reduce functionality during failover
5. **Automatic Recovery**: Return to primary when available

## Implementation Guidelines

### Structure
- Core logic: failover/failover_manager.py
- State manager: failover/state_sync.py
- Tests: tests/test_failover.py

### Patterns to Follow
- Use priority-based failover (primary, secondary, tertiary)
- Implement connection pooling for redundancy
- Track failover history for analysis
- Support manual override

## Adherence Checklist
Before completing your task, verify:
- [ ] Failover is automatic and fast (< 10 seconds)
- [ ] State is synchronized during failover
- [ ] Failover events are logged and alertable
- [ ] Automatic reconnection to primary is enabled
- [ ] Manual override has proper authentication


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import asyncio
import time
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging

class ConnectionState(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DEGRADED = "degraded"

@dataclass
class NodeConfig:
    """Configuration for a failover node."""
    node_id: str
    priority: int  # Lower = higher priority
    url: str
    enabled: bool = True
    is_primary: bool = False

@dataclass
class NodeStatus:
    """Current status of a failover node."""
    node_id: str
    state: ConnectionState = ConnectionState.DISCONNECTED
    last_connect: float = 0
    last_disconnect: float = 0
    health_score: float = 0.0
    latency_ms: float = 0.0
    error_count: int = 0

@dataclass
class FailoverEvent:
    """Represents a failover event."""
    timestamp: float
    from_node: str
    to_node: str
    reason: str

class FailoverManager:
    """Manages failover between multiple exchange connections."""
    
    def __init__(
        self,
        nodes: List[NodeConfig],
        health_check_interval: float = 5.0,
        failover_threshold: float = 0.5,
        failback_threshold: float = 0.8,
        failover_cooldown: float = 300.0
    ):
        self.nodes = {n.node_id: n for n in nodes}
        self.node_status: Dict[str, NodeStatus] = {}
        self.health_check_interval = health_check_interval
        self.failover_threshold = failover_threshold
        self.failback_threshold = failback_threshold
        self.failover_cooldown = failover_cooldown
        
        self.current_node: Optional[str] = None
        self.health_callbacks: List[Callable] = []
        self.failover_callbacks: List[Callable] = []
        self.event_history: List[FailoverEvent] = []
        self._last_failover_time: float = 0
        self._lock = asyncio.Lock()
        
        self._initialize_status()
    
    def _initialize_status(self):
        """Initialize node status."""
        for node_id, config in self.nodes.items():
            if config.enabled:
                self.node_status[node_id] = NodeStatus(node_id=node_id)
                if config.is_primary:
                    self.current_node = node_id
    
    def get_active_node(self) -> Optional[str]:
        """Get currently active node."""
        return self.current_node
    
    def get_all_statuses(self) -> Dict[str, NodeStatus]:
        """Get status of all nodes."""
        return self.node_status.copy()
    
    def set_connected(self, node_id: str):
        """Mark node as successfully connected."""
        if node_id in self.node_status:
            self.node_status[node_id].state = ConnectionState.CONNECTED
            self.node_status[node_id].last_connect = time.time()
    
    def set_disconnected(self, node_id: str):
        """Mark node as disconnected."""
        if node_id in self.node_status:
            self.node_status[node_id].state = ConnectionState.DISCONNECTED
            self.node_status[node_id].last_disconnect = time.time()
            self.node_status[node_id].error_count += 1
    
    def set_degraded(self, node_id: str):
        """Mark node as degraded."""
        if node_id in self.node_status:
            self.node_status[node_id].state = ConnectionState.DEGRADED
    
    def update_health(self, node_id: str, health_score: float, latency_ms: float):
        """Update node health metrics."""
        if node_id in self.node_status:
            self.node_status[node_id].health_score = health_score
            self.node_status[node_id].latency_ms = latency_ms
    
    async def trigger_failover(self, reason: str = "manual"):
        """Manually trigger failover to next best node."""
        async with self._lock:
            if time.time() - self._last_failover_time < self.failover_cooldown:
                logging.warning("Failover cooldown active")
                return False
            
            if not self.current_node:
                return await self._select_node(reason)
            
            return await self._switch_to_best_alternative(self.current_node, reason)
    
    async def _select_node(self, reason: str) -> bool:
        """Select the best available node."""
        sorted_nodes = sorted(
            self.nodes.values(),
            key=lambda n: n.priority
        )
        
        for node in sorted_nodes:
            if node.enabled:
                self.current_node = node.node_id
                status = self.node_status[node.node_id]
                status.state = ConnectionState.CONNECTING
                status.last_connect = time.time()
                
                await self._record_failover(None, node.node_id, reason)
                await self._trigger_failover_callbacks(None, node.node_id)
                return True
        
        return False
    
    async def _switch_to_best_alternative(
        self,
        from_node: str,
        reason: str
    ) -> bool:
        """Switch to next best node."""
        current_priority = self.nodes[from_node].priority
        
        # Find best alternative with higher priority
        best_node = None
        best_priority = float('inf')
        
        for node_id, config in self.nodes.items():
            if node_id == from_node:
                continue
            if not config.enabled:
                continue
            
            status = self.node_status.get(node_id)
            if not status or status.state == ConnectionState.DISCONNECTED:
                continue
            
            # Prefer lower priority number (higher priority)
            if config.priority < best_priority:
                best_priority = config.priority
                best_node = node_id
        
        if best_node:
            await self._record_failover(from_node, best_node, reason)
            await self._trigger_failover_callbacks(from_node, best_node)
            return True
        
        return False
    
    async def _record_failover(self, from_node: Optional[str], to_node: str, reason: str):
        """Record failover event."""
        event = FailoverEvent(
            timestamp=time.time(),
            from_node=from_node or "none",
            to_node=to_node,
            reason=reason
        )
        self.event_history.append(event)
        self._last_failover_time = time.time()
    
    async def _trigger_failover_callbacks(
        self,
        from_node: Optional[str],
        to_node: str
    ):
        """Trigger failover callbacks."""
        for callback in self.failover_callbacks:
            try:
                await callback(from_node, to_node)
            except Exception as e:
                logging.error(f"Failover callback error: {e}")
    
    async def _trigger_health_callbacks(self):
        """Trigger health change callbacks."""
        for callback in self.health_callbacks:
            try:
                await callback(self.node_status)
            except Exception as e:
                logging.error(f"Health callback error: {e}")
    
    def register_health_callback(self, callback: Callable):
        """Register health status change callback."""
        self.health_callbacks.append(callback)
    
    def register_failover_callback(self, callback: Callable):
        """Register failover event callback."""
        self.failover_callbacks.append(callback)
    
    async def check_and_maintain_health(self):
        """Periodic health check and failover decision."""
        for node_id, status in self.node_status.items():
            # Determine health status based on metrics
            if status.error_count > 10:
                status.state = ConnectionState.DISCONNECTED
            elif status.health_score < self.failover_threshold:
                status.state = ConnectionState.DEGRADED
        
        await self._trigger_health_callbacks()
        
        # Check if failover needed
        if self.current_node:
            status = self.node_status[self.current_node]
            if status.health_score < self.failover_threshold:
                await self.trigger_failover(f"Health below threshold: {status.health_score}")
    
    def get_failover_history(self, limit: int = 100) -> List[FailoverEvent]:
        """Get recent failover events."""
        return self.event_history[-limit:]
    
    def get_node_priority_order(self) -> List[str]:
        """Get nodes sorted by priority."""
        return [n.node_id for n in sorted(self.nodes.values(), key=lambda x: x.priority)]

class StateSynchronizer:
    """Synchronizes state across failover nodes."""
    
    def __init__(self, sync_interval: float = 1.0):
        self.sync_interval = sync_interval
        self.sync_callbacks: List[Callable] = []
        self._last_sync_time: float = 0
        self._state: Dict = {}
    
    def set_state(self, key: str, value):
        """Set state to be synchronized."""
        self._state[key] = value
    
    def get_state(self, key: str, default=None):
        """Get synchronized state."""
        return self._state.get(key, default)
    
    def register_sync_callback(self, callback: Callable):
        """Register callback for state sync."""
        self.sync_callbacks.append(callback)
    
    async def trigger_sync(self, target_nodes: List[str]):
        """Trigger state synchronization."""
        self._last_sync_time = time.time()
        for callback in self.sync_callbacks:
            try:
                await callback(self._state.copy(), target_nodes)
            except Exception as e:
                logging.error(f"Sync callback error: {e}")
    
    async def run_periodic_sync(self, target_nodes: List[str]):
        """Run periodic state synchronization."""
        while True:
            await self.trigger_sync(target_nodes)
            await asyncio.sleep(self.sync_interval)
```

---

---


### Pattern 2: Circuit Breaker with Graceful Degradation

```python
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    CLOSED = "closed"        # Normal operation — requests pass through
    OPEN = "open"            # Failures exceeded threshold — block requests
    HALF_OPEN = "half_open"  # Testing if service recovered — allow probe request


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker behavior."""
    failure_threshold: int = 5          # C trip after N consecutive failures
    recovery_timeout: float = 30.0      # Seconds before transitioning to HALF_OPEN
    success_threshold: int = 2          # Half-open successes needed to close
    monitoring_interval: float = 1.0    # How often to check circuit state


class CircuitBreaker:
    """Circuit breaker that protects against cascading failures across exchanges."""

    def __init__(self, exchange_id: str, config: CircuitBreakerConfig | None = None):
        self.exchange_id = exchange_id
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float = 0
        self._opened_at: float = 0

    @property
    def state(self) -> CircuitState:
        """Get current circuit state, auto-transitions if recovery timeout elapsed."""
        if self._state == CircuitState.OPEN and time.monotonic() - self._opened_at >= self.config.recovery_timeout:
            logger.info("Circuit for %s transitioning to HALF_OPEN", self.exchange_id)
            self._state = CircuitState.HALF_OPEN
            self._success_count = 0
        return self._state

    async def call(self, func: Callable, *args, **kwargs):
        """Execute a function through the circuit breaker.

        Raises:
            CircuitOpenError: If circuit is OPEN and no probe request allowed.
        """
        if self.state == CircuitState.OPEN:
            raise CircuitOpenError(self.exchange_id)

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            logger.warning("Circuit call failed for %s: %s", self.exchange_id, e)
            raise

    def _on_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.config.success_threshold:
                self._close()
        else:
            self._failure_count = 0

    def _on_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self.state == CircuitState.HALF_OPEN:
            self._open()
        elif self._failure_count >= self.config.failure_threshold:
            self._open()

    def _open(self) -> None:
        old_state = self._state
        self._state = CircuitState.OPEN
        self._opened_at = time.monotonic()
        logger.warning("Circuit OPEN for %s after %d failures", self.exchange_id, self._failure_count)

    def _close(self) -> None:
        logger.info("Circuit CLOSED for %s — service recovered", self.exchange_id)
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0


class CircuitOpenError(Exception):
    """Raised when a circuit is open and requests are being rejected."""
    def __init__(self, exchange_id: str):
        super().__init__(f"Circuit breaker OPEN for {exchange_id} — requests rejected")
        self.exchange_id = exchange_id
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

- [CCXT Error Handling Guide](https://docs.ccxt.org/en/latest/manual.html#error-handling)
- [Exchange Failover Architecture](https://docs.quantconnect.com/tutorials/live-trading-overview)
- [High Availability Trading Systems](https://en.wikipedia.org/wiki/Failover)
- [Multi-Exchange Order Routing](https://docs.ccxt.org/en/latest/manual.html#exchange-market-data)
- [Resilient Exchange Connection Patterns](https://arxiv.org/abs/2111.09135)
