---
name: trading-exchange-order-execution-api
description: Order execution and management API for trading systems
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: exchange order execution api, exchange-order-execution-api, management, trading, systems
---

**Role:** Execute and manage orders across multiple exchanges with consistency and reliability

**Philosophy:** Order execution is the final step in the trading pipeline; it must be precise, auditable, and resilient to failure

## Key Principles

1. **Order State Machine**: Explicit states (PENDING, ACTIVE, FILLED, CANCELLED, REJECTED)
2. **Idempotent Operations**: Repeated requests for the same order produce consistent results
3. **Audit Trail**: Every order change is logged with timestamp and reason
4. **Partial Fill Handling**: Orders can be filled in multiple partial executions
5. **Error Recovery**: Failed orders trigger appropriate recovery workflows

## Implementation Guidelines

### Structure
- Core logic: execution/order_executor.py
- State machine: execution/order_state_machine.py
- Tests: tests/test_order_execution.py

### Patterns to Follow
- Use enums for order states
- Implement synchronous and asynchronous execution modes
- Support both market and limit orders
- Handle exchange-specific order formats

## Adherence Checklist
Before completing your task, verify:
- [ ] Order state transitions are explicit and logged
- [ ] Idempotency keys prevent duplicate orders
- [ ] Partial fills are tracked and aggregated correctly
- [ ] Failed orders trigger appropriate error handling
- [ ] Execution reports include timing metrics


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import uuid
import time
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging

class OrderStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LIMIT = "stop_limit"

@dataclass
class Order:
    id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    avg_fill_price: float = 0.0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    client_order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    exchange_id: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class Fill:
    order_id: str
    execution_id: str
    quantity: float
    price: float
    timestamp: float
    commission: float = 0.0

class OrderExecutor:
    """Handles order execution across multiple exchanges."""
    
    def __init__(self, exchange_connector):
        self.exchange = exchange_connector
        self.active_orders: Dict[str, Order] = {}
        self.fills: List[Fill] = []
        self.order_callbacks: Dict[str, List[Callable]] = {}
    
    def create_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        tags: Optional[Dict[str, str]] = None
    ) -> Order:
        """Create a new order and submit to exchange."""
        order = Order(
            id=str(uuid.uuid4()),
            symbol=symbol,
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
            stop_price=stop_price,
            tags=tags or {}
        )
        
        try:
            exchange_response = self._submit_to_exchange(order)
            order.exchange_id = exchange_response.get("order_id")
            order.status = OrderStatus.ACTIVE
            order.updated_at = time.time()
            self.active_orders[order.id] = order
            self._trigger_callbacks(order.id, "active")
        except Exception as e:
            order.status = OrderStatus.REJECTED
            order.updated_at = time.time()
            logging.error(f"Order rejected: {e}")
        
        return order
    
    def _submit_to_exchange(self, order: Order) -> Dict:
        """Submit order to exchange connector."""
        params = {
            "symbol": order.symbol,
            "side": order.side.value,
            "type": order.order_type.value,
            "quantity": order.quantity,
        }
        
        if order.order_type == OrderType.LIMIT and order.price:
            params["price"] = order.price
        
        if order.order_type == OrderType.STOP_LIMIT:
            if order.price:
                params["price"] = order.price
            if order.stop_price:
                params["stop_price"] = order.stop_price
        
        return self.exchange.place_order(**params)
    
    def cancel_order(self, order_id: str) -> bool:
        """Cancel an active order."""
        order = self.active_orders.get(order_id)
        if not order or order.status not in [OrderStatus.ACTIVE, OrderStatus.PARTIALLY_FILLED]:
            return False
        
        try:
            result = self.exchange.cancel_order(order.exchange_id)
            if result:
                order.status = OrderStatus.CANCELLED
                order.updated_at = time.time()
                self._trigger_callbacks(order_id, "cancelled")
                return True
        except Exception as e:
            logging.error(f"Failed to cancel order {order_id}: {e}")
        
        return False
    
    def handle_fill_notification(self, fill_data: Dict):
        """Process fill notifications from exchange."""
        order_id = fill_data.get("order_id")
        order = self.active_orders.get(order_id)
        
        if not order:
            logging.warning(f"Fill for unknown order: {order_id}")
            return
        
        fill = Fill(
            order_id=order_id,
            execution_id=fill_data.get("execution_id"),
            quantity=fill_data.get("quantity", 0),
            price=fill_data.get("price", 0),
            timestamp=fill_data.get("timestamp", time.time()),
            commission=fill_data.get("commission", 0)
        )
        
        self.fills.append(fill)
        
        # Update order state
        order.filled_quantity += fill.quantity
        total_value = order.filled_quantity * order.avg_fill_price + fill.quantity * fill.price
        order.avg_fill_price = total_value / order.filled_quantity if order.filled_quantity > 0 else 0
        
        remaining = order.quantity - order.filled_quantity
        
        if remaining <= 0:
            order.status = OrderStatus.FILLED
            self._trigger_callbacks(order_id, "filled")
        else:
            order.status = OrderStatus.PARTIALLY_FILLED
        
        order.updated_at = time.time()
    
    def get_order(self, order_id: str) -> Optional[Order]:
        """Retrieve order by ID."""
        return self.active_orders.get(order_id)
    
    def get_active_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """Get all active orders, optionally filtered by symbol."""
        orders = [
            o for o in self.active_orders.values()
            if o.status in [OrderStatus.ACTIVE, OrderStatus.PARTIALLY_FILLED]
        ]
        if symbol:
            orders = [o for o in orders if o.symbol == symbol]
        return orders
    
    def register_callback(self, order_id: str, callback: Callable):
        """Register a callback for order status changes."""
        if order_id not in self.order_callbacks:
            self.order_callbacks[order_id] = []
        self.order_callbacks[order_id].append(callback)
    
    def _trigger_callbacks(self, order_id: str, status: str):
        """Trigger registered callbacks for order status change."""
        if order_id in self.order_callbacks:
            for callback in self.order_callbacks[order_id]:
                callback(order_id, status)
```
