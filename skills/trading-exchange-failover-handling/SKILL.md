---
name: trading-exchange-failover-handling
description: Automated failover and redundancy management for exchange connectivity
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: automated, exchange failover handling, exchange-failover-handling, management,
    redundancy
  related-skills: trading-data-alternative-data, trading-data-backfill-strategy, trading-ai-order-flow-analysis,
    trading-data-order-book
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