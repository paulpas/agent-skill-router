---
name: kill-switches
description: '"Implementing multi-layered kill switches at account, strategy, market"
  and infrastructure levels to prevent catastrophic losses and system failures'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: account, implementing, multi-layered, risk kill switches, risk-kill-switches
  related-skills: backtest-drawdown-analysis, exchange-order-execution-api
---



**Role:** Guide an AI coding assistant to build comprehensive kill switch systems that automatically halt trading operations when predefined risk thresholds are breached, protecting capital and preventing system damage

**Philosophy:** Kill switches are the emergency brakes of a trading system—they must be reliable, instantaneous, and fail-safe. Systems should assume that any component can fail and design kill switches accordingly. Multiple layers of kill switches ensure that no single point of failure can cause catastrophic loss. The philosophy is "trust but verify": always assume code can have bugs, so external validation through kill switches is essential.

## Key Principles

1. **Multi-Layered Protection**: Kill switches operate at account, strategy, market, and infrastructure levels. Each layer provides independent protection against different failure modes.

2. **Immediate Execution**: Kill switches must execute immediately and irreversibly when triggered. No graceful shutdown—only emergency stop to prevent further damage.

3. **Hierarchical Response**: When a kill switch triggers, the system should first reduce exposure, then pause trading, then alert operators, and finally log the event for analysis.

4. **Automatic Recovery with Limits**: After a kill switch triggers, automatic recovery should be possible but only after cooldown periods and operator approval for significant breaches.

5. **Immutable State**: Once a kill switch has been triggered, the state should be immutable and logged to persistent storage to prevent tampering or accidental reactivation.

## Implementation Guidelines

### Structure
- Core logic: `risk_engine/kill_switches.py`
- Account-level: `risk_engine/account_switches.py`
- Strategy-level: `risk_engine/strategy_switches.py`
- Market-level: `risk_engine/market_switches.py`
- Infrastructure: `risk_engine/infrastructure_switches.py`

### Patterns to Follow
- **Early Exit**: Immediately halt when kill switch thresholds are breached
- **Atomic Predictability**: Kill switch evaluation is deterministic and idempotent
- **Fail Fast**: Kill switches trigger immediately when breached; no second chances
- **Intentional Naming**: Clear names for each kill switch type (daily_loss, drawdown, volatility_spike)
- **Parse Don't Validate**: Kill switch configuration parsed at startup, validated internally

## Code Examples

```python
# Example 1: Account-Level Kill Switches
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Optional
import logging


class KillSwitchState(Enum):
    ACTIVE = "active"
    TRIGGERED = "triggered"
    COOLDOWN = "cooldown"
    MANUAL_OVERRIDE = "manual_override"


@dataclass
class KillSwitchConfig:
    """Configuration for an account-level kill switch"""
    enabled: bool = True
    threshold: float  # Value at which trigger occurs
    cooldown_minutes: int = 60
    recovery_threshold: float = 0.5  # Must recover this fraction to re-enable
    alert_email: Optional[str] = None
    alert_slack_webhook: Optional[str] = None


@dataclass
class KillSwitchStatus:
    """Current status of a kill switch"""
    state: KillSwitchState
    last_triggered: Optional[datetime] = None
    triggered_count: int = 0
    triggered_reason: Optional[str] = None
    next_activation: Optional[datetime] = None


class AccountLevelKillSwitches:
    """
    Manages account-level kill switches
    
    Protects against:
    - Excessive daily drawdown
    - Excessive daily loss
    - Account balance falling below minimum
    - Margin calls
    - Excessive leverage
    """
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Initialize switch configurations
        self.switches: dict[str, KillSwitchConfig] = {
            'daily_drawdown': KillSwitchConfig(
                enabled=True,
                threshold=0.05,  # 5% daily drawdown
                cooldown_minutes=120
            ),
            'daily_loss': KillSwitchConfig(
                enabled=True,
                threshold=0.03,  # 3% daily loss
                cooldown_minutes=60
            ),
            'minimum_equity': KillSwitchConfig(
                enabled=True,
                threshold=1000.0,  # $1000 minimum equity
                cooldown_minutes=60
            ),
            'margin_call': KillSwitchConfig(
                enabled=True,
                threshold=0.80,  # 80% margin usage
                cooldown_minutes=30
            ),
            'max_leverage': KillSwitchConfig(
                enabled=True,
                threshold=10.0,  # 10x leverage
                cooldown_minutes=60
            ),
            'rapid_depletion': KillSwitchConfig(
                enabled=True,
                threshold=0.02,  # 2% loss in 5 minutes
                cooldown_minutes=15
            ),
        }
        
        # Track switch states
        self.switch_states: dict[str, KillSwitchStatus] = {
            name: KillSwitchStatus(state=KillSwitchState.ACTIVE)
            for name in self.switches.keys()
        }
        
        # Track daily metrics
        self.daily_metrics: dict = {
            'start_balance': None,
            'current_balance': None,
            'peak_balance': None,
            'start_time': None,
            'trades_today': 0
        }
        
        # Track rapid depletion
        self.rapid_depletion_tracker: dict = {
            'loss_timestamps': [],
            'loss_amounts': []
        }
    
    def update_daily_metrics(
        self,
        start_balance: float,
        current_balance: float,
        peak_balance: float,
        timestamp: datetime = None
    ):
        """Update daily trading metrics"""
        timestamp = timestamp or datetime.now()
        
        self.daily_metrics['start_balance'] = start_balance
        self.daily_metrics['current_balance'] = current_balance
        self.daily_metrics['peak_balance'] = peak_balance
        self.daily_metrics['start_time'] = timestamp
    
    def check_daily_drawdown(self) -> tuple[bool, str]:
        """
        Check if daily drawdown exceeds threshold
        
        Drawdown = (Peak - Current) / Peak
        """
        config = self.switches['daily_drawdown']
        
        if not config.enabled:
            return True, "Daily drawdown check disabled"
        
        if not self.daily_metrics['peak_balance']:
            return True, "No peak balance recorded"
        
        peak = self.daily_metrics['peak_balance']
        current = self.daily_metrics['current_balance']
        
        if peak <= 0:
            return True, "Invalid peak balance"
        
        drawdown = (peak - current) / peak
        
        if drawdown >= config.threshold:
            return False, f"DAILY_DROWNDOWN_EXCEEDED: {drawdown:.2%} >= {config.threshold:.2%}"
        
        return True, "Daily drawdown within limits"
    
    def check_daily_loss(self) -> tuple[bool, str]:
        """Check if daily loss exceeds threshold"""
        config = self.switches['daily_loss']
        
        if not config.enabled:
            return True, "Daily loss check disabled"
        
        if not self.daily_metrics['start_balance']:
            return True, "No start balance recorded"
        
        start = self.daily_metrics['start_balance']
        current = self.daily_metrics['current_balance']
        
        if start <= 0:
            return True, "Invalid start balance"
        
        loss_percent = (start - current) / start
        
        if loss_percent >= config.threshold:
            return False, f"DAILY_LOSS_EXCEEDED: {loss_percent:.2%} >= {config.threshold:.2%}"
        
        return True, "Daily loss within limits"
    
    def check_minimum_equity(self, current_balance: float) -> tuple[bool, str]:
        """Check if account balance falls below minimum"""
        config = self.switches['minimum_equity']
        
        if not config.enabled:
            return True, "Minimum equity check disabled"
        
        if current_balance < config.threshold:
            return False, f"MINIMUM_EQUITY_EXCEEDED: ${current_balance:.2f} < ${config.threshold:.2f}"
        
        return True, "Equity above minimum"
    
    def check_margin_call(
        self,
        account_value: float,
        margin_used: float,
        maintenance_margin: float = 0.25
    ) -> tuple[bool, str]:
        """Check if margin usage exceeds threshold"""
        config = self.switches['margin_call']
        
        if not config.enabled:
            return True, "Margin call check disabled"
        
        if account_value <= 0:
            return True, "Invalid account value"
        
        # Calculate effective margin usage
        equity = account_value - margin_used
        
        if equity <= 0:
            return False, "MARGIN_CALL: Equity negative"
        
        margin_ratio = margin_used / account_value
        
        if margin_ratio >= config.threshold:
            return False, f"MARGIN_CALL_EXCEEDED: {margin_ratio:.2%} >= {config.threshold:.2%}"
        
        return True, "Margin usage within limits"
    
    def check_max_leverage(
        self,
        account_value: float,
        gross_exposure: float
    ) -> tuple[bool, str]:
        """Check if leverage exceeds maximum"""
        config = self.switches['max_leverage']
        
        if not config.enabled:
            return True, "Max leverage check disabled"
        
        if account_value <= 0:
            return True, "Invalid account value"
        
        leverage = gross_exposure / account_value
        
        if leverage > config.threshold:
            return False, f"MAX_LEVERAGE_EXCEEDED: {leverage:.2f}x > {config.threshold:.2f}x"
        
        return True, "Leverage within limits"
    
    def check_rapid_depletion(
        self,
        current_balance: float,
        threshold_minutes: int = 5,
        loss_threshold: float = 0.02
    ) -> tuple[bool, str]:
        """
        Check for rapid account depletion
        
        Detects if account has lost more than loss_threshold in threshold_minutes
        """
        config = self.switches['rapid_depletion']
        
        if not config.enabled:
            return True, "Rapid depletion check disabled"
        
        now = datetime.now()
        
        # Clean old entries
        cutoff = now - timedelta(minutes=threshold_minutes)
        
        # Track this loss
        start_balance = self.daily_metrics.get('start_balance')
        if start_balance:
            current_loss = start_balance - current_balance
            if current_loss > 0:
                self.rapid_depletion_tracker['loss_timestamps'].append(now)
                self.rapid_depletion_tracker['loss_amounts'].append(current_loss)
        
        # Filter to recent losses
        recent_indices = [
            i for i, ts in enumerate(self.rapid_depletion_tracker['loss_timestamps'])
            if ts > cutoff
        ]
        
        if len(recent_indices) < 2:
            return True, "Insufficient recent loss data"
        
        # Calculate total loss in window
        recent_losses = [
            self.rapid_depletion_tracker['loss_amounts'][i]
            for i in recent_indices
        ]
        
        # Check if losses are accumulating too quickly
        start_of_window = min(
            self.rapid_depletion_tracker['loss_timestamps'][i]
            for i in recent_indices
        )
        elapsed_minutes = (now - start_of_window).total_seconds() / 60
        
        if elapsed_minutes > 0:
            loss_rate = sum(recent_losses) / elapsed_minutes
            
            # Trigger if loss rate exceeds threshold
            start_balance = self.daily_metrics.get('start_balance', 10000)
            hourly_loss_rate = loss_rate * 60
            hourly_loss_percent = hourly_loss_rate / start_balance
            
            if hourly_loss_percent > loss_threshold * (60 / threshold_minutes):
                return False, "RAPID_DEPLETION_DETECTED: Account losing too quickly"
        
        return True, "Loss rate within normal range"
    
    def get_all_account_switches_status(self, current_balance: float) -> dict:
        """Get status of all account-level kill switches"""
        results = {}
        
        # Check each switch
        checks = [
            ('daily_drawdown', lambda: self.check_daily_drawdown()),
            ('daily_loss', lambda: self.check_daily_loss()),
            ('minimum_equity', lambda: self.check_minimum_equity(current_balance)),
            ('margin_call', lambda: self.check_margin_call(current_balance, 0)),  # Simplified
            ('max_leverage', lambda: self.check_max_leverage(current_balance, 0)),  # Simplified
            ('rapid_depletion', lambda: self.check_rapid_depletion(current_balance)),
        ]
        
        for name, check_func in checks:
            is_ok, message = check_func()
            results[name] = {
                'triggered': not is_ok,
                'message': message,
                'state': self.switch_states[name].state.value
            }
        
        return results
    
    def should_halt_trading(self, current_balance: float) -> tuple[bool, list[str]]:
        """
        Check if trading should be halted based on all account-level switches
        
        Returns (should_halt, list_of_reasons)
        """
        reasons = []
        
        status = self.get_all_account_switches_status(current_balance)
        
        for switch_name, switch_status in status.items():
            if switch_status['triggered']:
                reasons.append(f"{switch_name}: {switch_status['message']}")
        
        should_halt = len(reasons) > 0
        
        if should_halt:
            self.logger.warning(f"ACCOUNT KILL SWITCH TRIGGERED: {reasons}")
        
        return should_halt, reasons


# Example 2: Strategy-Level Kill Switches
class StrategyLevelKillSwitches:
    """
    Manages strategy-level kill switches
    
    Protects against:
    - Strategy-specific drawdown limits
    - Consecutive losses
    - Performance degradation
    - Correlation with other strategies
    """
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Default strategies
        self.strategy_configs: dict[str, dict] = {
            'default': {
                'max_drawdown': 0.10,
                'max_consecutive_losses': 5,
                'min_win_rate': 0.45,
                'max_trade_time_hours': 4,
                'max_drawdown_recovery_time_hours': 24,
            }
        }
        
        # Track strategy performance
        self.strategy_metrics: dict[str, dict] = {}
    
    def init_strategy(self, strategy_id: str, config: dict = None):
        """Initialize metrics for a strategy"""
        base_config = self.strategy_configs.get('default', {}).copy()
        if config:
            base_config.update(config)
        
        self.strategy_configs[strategy_id] = base_config
        
        self.strategy_metrics[strategy_id] = {
            'peak_balance': 0.0,
            'max_drawdown': 0.0,
            'consecutive_losses': 0,
            'win_rate': 0.0,
            'total_trades': 0,
            'wins': 0,
            'last_trade_time': None,
            'last_peak_time': None,
        }
    
    def update_strategy_pnl(
        self,
        strategy_id: str,
        current_balance: float,
        timestamp: datetime = None
    ):
        """Update strategy PnL and track drawdown"""
        timestamp = timestamp or datetime.now()
        metrics = self.strategy_metrics.get(strategy_id)
        
        if not metrics:
            return
        
        # Update peak
        if current_balance > metrics['peak_balance']:
            metrics['peak_balance'] = current_balance
            metrics['last_peak_time'] = timestamp
        
        # Update drawdown
        if metrics['peak_balance'] > 0:
            drawdown = (metrics['peak_balance'] - current_balance) / metrics['peak_balance']
            metrics['max_drawdown'] = max(metrics['max_drawdown'], drawdown)
        
        metrics['last_trade_time'] = timestamp
    
    def record_trade_result(
        self,
        strategy_id: str,
        pnl: float,
        win_rate: float = None
    ):
        """Record a trade result"""
        metrics = self.strategy_metrics.get(strategy_id)
        
        if not metrics:
            return
        
        metrics['total_trades'] += 1
        
        if pnl > 0:
            metrics['wins'] += 1
            metrics['consecutive_losses'] = 0
        else:
            metrics['consecutive_losses'] += 1
        
        if win_rate is not None:
            metrics['win_rate'] = win_rate
        elif metrics['total_trades'] > 0:
            metrics['win_rate'] = metrics['wins'] / metrics['total_trades']
    
    def check_strategy_drawdown(
        self,
        strategy_id: str,
        current_balance: float
    ) -> tuple[bool, str]:
        """Check if strategy drawdown exceeds limit"""
        config = self.strategy_configs.get(strategy_id, self.strategy_configs['default'])
        
        metrics = self.strategy_metrics.get(strategy_id)
        if not metrics:
            return True, "Strategy not initialized"
        
        if metrics['peak_balance'] <= 0:
            return True, "No peak balance recorded"
        
        drawdown = (metrics['peak_balance'] - current_balance) / metrics['peak_balance']
        
        if drawdown >= config['max_drawdown']:
            return False, f"STRATEGY_DRAWDOWN_EXCEEDED: {drawdown:.2%} >= {config['max_drawdown']:.2%}"
        
        return True, "Strategy drawdown within limits"
    
    def check_consecutive_losses(self, strategy_id: str) -> tuple[bool, str]:
        """Check if consecutive losses exceed threshold"""
        config = self.strategy_configs.get(strategy_id, self.strategy_configs['default'])
        
        metrics = self.strategy_metrics.get(strategy_id)
        if not metrics:
            return True, "Strategy not initialized"
        
        if metrics['consecutive_losses'] >= config['max_consecutive_losses']:
            return False, f"CONSECUTIVE_LOSES_EXCEEDED: {metrics['consecutive_losses']} >= {config['max_consecutive_losses']}"
        
        return True, "Consecutive losses within limits"
    
    def check_performance_degradation(
        self,
        strategy_id: str,
        min_trades_required: int = 10
    ) -> tuple[bool, str]:
        """Check if strategy performance has degraded below threshold"""
        config = self.strategy_configs.get(strategy_id, self.strategy_configs['default'])
        
        metrics = self.strategy_metrics.get(strategy_id)
        if not metrics:
            return True, "Strategy not initialized"
        
        if metrics['total_trades'] < min_trades_required:
            return True, "Insufficient trades for performance check"
        
        if metrics['win_rate'] < config['min_win_rate']:
            return False, f"PERFORMANCE_DEGRADATION: win_rate {metrics['win_rate']:.2%} < {config['min_win_rate']:.2%}"
        
        return True, "Strategy performance within limits"
    
    def get_strategy_status(self, strategy_id: str, current_balance: float) -> dict:
        """Get comprehensive status for a strategy"""
        config = self.strategy_configs.get(strategy_id, self.strategy_configs['default'])
        metrics = self.strategy_metrics.get(strategy_id, {})
        
        checks = [
            ('drawdown', lambda: self.check_strategy_drawdown(strategy_id, current_balance)),
            ('consecutive_losses', lambda: self.check_consecutive_losses(strategy_id)),
            ('performance', lambda: self.check_performance_degradation(strategy_id)),
        ]
        
        results = {}
        for name, check_func in checks:
            is_ok, message = check_func()
            results[name] = {
                'triggered': not is_ok,
                'message': message,
            }
        
        return {
            'strategy_id': strategy_id,
            'metrics': metrics,
            'config': config,
            'checks': results,
            'should_halt': any(r['triggered'] for r in results.values()),
            'halt_reasons': [r['message'] for r in results.values() if r['triggered']]
        }


# Example 3: Market-Level Kill Switches
class MarketLevelKillSwitches:
    """
    Manages market-level kill switches
    
    Protects against:
    - Volatility spikes (VIX > threshold)
    - Spread widening beyond normal
    - Liquidity drying up
    - Market regime changes (e.g., high-frequency trading ban)
    """
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Market thresholds
        self.thresholds = {
            'max_volatility': self.config.get('max_volatility', 0.03),  # 3% daily
            'max_spread_bps': self.config.get('max_spread_bps', 5.0),  # 5 bps
            'min_liquidity_score': self.config.get('min_liquidity_score', 0.5),
            'max_correlation': self.config.get('max_correlation', 0.8),
            'max_volatility_spike': self.config.get('max_volatility_spike', 0.10),  # 10% spike
            'min_order_size': self.config.get('min_order_size', 0.0),  # Disable if < threshold
        }
    
    def check_volatility(
        self,
        current_volatility: float,
        historical_volatility: float
    ) -> tuple[bool, str]:
        """Check if current volatility exceeds threshold"""
        current_exceeded = current_volatility > self.thresholds['max_volatility']
        
        if current_exceeded:
            return False, f"HIGH_VOLATILITY: {current_volatility:.2%} > {self.thresholds['max_volatility']:.2%}"
        
        return True, "Volatility within limits"
    
    def check_volatility_spike(
        self,
        current_volatility: float,
        historical_volatility: float
    ) -> tuple[bool, str]:
        """Check for sudden volatility spikes"""
        if historical_volatility <= 0:
            return True, "No historical volatility data"
        
        spike_ratio = current_volatility / historical_volatility
        
        if spike_ratio > 1 + self.thresholds['max_volatility_spike']:
            return False, f"VOLATILITY_SPIKE: {spike_ratio:.2f}x increase"
        
        return True, "Volatility spike within limits"
    
    def check_spread(
        self,
        current_spread_bps: float,
        normal_spread_bps: float = 1.0
    ) -> tuple[bool, str]:
        """Check if spread has widened excessively"""
        if current_spread_bps > self.thresholds['max_spread_bps']:
            return False, f"WIDE_SPREAD: {current_spread_bps:.1f} bps > {self.thresholds['max_spread_bps']:.1f} bps"
        
        if current_spread_bps > normal_spread_bps * 2:
            return False, f"DEGRADED_SPREAD: {current_spread_bps:.1f} bps > {normal_spread_bps * 2:.1f} bps"
        
        return True, "Spread within limits"
    
    def check_liquidity(
        self,
        liquidity_score: float,
        order_size: float
    ) -> tuple[bool, str]:
        """Check if liquidity is sufficient for the order"""
        if liquidity_score < self.thresholds['min_liquidity_score']:
            return False, f"LOW_LIQUIDITY: score {liquidity_score:.2f} < {self.thresholds['min_liquidity_score']:.2f}"
        
        # Check order size vs liquidity
        min_order_size = self.thresholds['min_order_size']
        if order_size > 0 and liquidity_score < order_size:
            return False, f"EXCESSIVE_ORDER_SIZE: {order_size} > liquidity {liquidity_score:.2f}"
        
        return True, "Liquidity sufficient"
    
    def check_correlation(
        self,
        current_correlation: float,
        historical_correlation: float
    ) -> tuple[bool, str]:
        """Check if correlations have increased (reduced diversification)"""
        if current_correlation > self.thresholds['max_correlation']:
            return False, f"HIGH_CORRELATION: {current_correlation:.2f} > {self.thresholds['max_correlation']:.2f}"
        
        # Check correlation spike
        correlation_spike = current_correlation - historical_correlation
        if correlation_spike > 0.2:  # 20% absolute increase
            return False, f"CORRELATION_SPIKE: {correlation_spike:.2f} increase"
        
        return True, "Correlations within normal range"
    
    def check_market_regime(
        self,
        regime: str,
        allowed_regimes: list[str] = None
    ) -> tuple[bool, str]:
        """Check if current market regime is tradable"""
        allowed = allowed_regimes or self.config.get('allowed_regimes', ['trending', 'range_bound'])
        
        if regime not in allowed:
            return False, f"DISALLOWED_REGIME: '{regime}' not in allowed list {allowed}"
        
        return True, "Market regime is tradable"
    
    def get_market_status(
        self,
        current_volatility: float,
        historical_volatility: float,
        current_spread_bps: float,
        liquidity_score: float,
        order_size: float,
        current_correlation: float,
        historical_correlation: float,
        market_regime: str
    ) -> dict:
        """Get comprehensive market status"""
        checks = [
            ('volatility', lambda: self.check_volatility(current_volatility, historical_volatility)),
            ('volatility_spike', lambda: self.check_volatility_spike(current_volatility, historical_volatility)),
            ('spread', lambda: self.check_spread(current_spread_bps)),
            ('liquidity', lambda: self.check_liquidity(liquidity_score, order_size)),
            ('correlation', lambda: self.check_correlation(current_correlation, historical_correlation)),
            ('market_regime', lambda: self.check_market_regime(market_regime)),
        ]
        
        results = {}
        for name, check_func in checks:
            is_ok, message = check_func()
            results[name] = {
                'triggered': not is_ok,
                'message': message,
            }
        
        return {
            'checks': results,
            'should_halt': any(r['triggered'] for r in results.values()),
            'halt_reasons': [r['message'] for r in results.values() if r['triggered']]
        }


# Example 4: Infrastructure-Level Kill Switches
class InfrastructureKillSwitches:
    """
    Manages infrastructure-level kill switches
    
    Protects against:
    - Exchange latency exceeding threshold
    - WebSocket disconnections
    - Data feed latency
    - API rate limiting
    """
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Infrastructure thresholds
        self.thresholds = {
            'max_exchange_latency_ms': self.config.get('max_exchange_latency_ms', 100),
            'max_data_latency_seconds': self.config.get('max_data_latency_seconds', 30),
            'max_websocket_disconnects': self.config.get('max_websocket_disconnects', 3),
            'max_api_rate_limit_hits': self.config.get('max_api_rate_limit_hits', 10),
            'max_order_reject_rate': self.config.get('max_order_reject_rate', 0.1),
        }
    
    def check_exchange_latency(
        self,
        current_latency_ms: float,
        avg_latency_ms: float
    ) -> tuple[bool, str]:
        """Check if exchange latency exceeds threshold"""
        if current_latency_ms > self.thresholds['max_exchange_latency_ms']:
            return False, f"HIGH_EXCHANGE_LATENCY: {current_latency_ms:.0f} ms > {self.thresholds['max_exchange_latency_ms']} ms"
        
        # Check if latency is significantly worse than average
        if avg_latency_ms > 0:
            latency_ratio = current_latency_ms / avg_latency_ms
            if latency_ratio > 3:  # 3x worse than average
                return False, f"LATENCY_SPIKE: {latency_ratio:.1f}x average"
        
        return True, "Exchange latency within limits"
    
    def check_data_latency(self, data_age_seconds: float) -> tuple[bool, str]:
        """Check if data is fresh enough"""
        if data_age_seconds > self.thresholds['max_data_latency_seconds']:
            return False, f"STALE_DATA: {data_age_seconds:.0f} seconds old > {self.thresholds['max_data_latency_seconds']} seconds"
        
        return True, "Data latency within limits"
    
    def check_websocket_status(
        self,
        disconnect_count: int,
        last_disconnect_reason: str,
        reconnecting: bool
    ) -> tuple[bool, str]:
        """Check WebSocket connection status"""
        if disconnect_count > self.thresholds['max_websocket_disconnects']:
            return False, f"EXCESSIVE_WEBSOCKET_DISCONNECTS: {disconnect_count} > {self.thresholds['max_websocket_disconnects']}"
        
        if reconnecting:
            return False, "WEBSOCKET_RECONNECTING: Connection unstable"
        
        return True, "WebSocket connection stable"
    
    def check_api_rate_limit(
        self,
        rate_limit_hits: int,
        window_minutes: int
    ) -> tuple[bool, str]:
        """Check if API rate limits are approaching threshold"""
        max_hits = self.thresholds['max_api_rate_limit_hits']
        
        if rate_limit_hits > max_hits:
            return False, f"API_RATE_LIMIT_EXCEEDED: {rate_limit_hits} hits in {window_minutes} minutes"
        
        if rate_limit_hits > max_hits * 0.8:
            return False, f"API_RATE_LIMIT_WARNING: {rate_limit_hits} hits ({rate_limit_hits/max_hits*100:.0f}%)"
        
        return True, "API rate limit within limits"
    
    def check_order_reject_rate(
        self,
        total_orders: int,
        rejected_orders: int
    ) -> tuple[bool, str]:
        """Check order reject rate"""
        if total_orders == 0:
            return True, "No orders to evaluate"
        
        reject_rate = rejected_orders / total_orders
        
        if reject_rate > self.thresholds['max_order_reject_rate']:
            return False, f"HIGH_ORDER_REJECT_RATE: {reject_rate:.2%} > {self.thresholds['max_order_reject_rate']:.2%}"
        
        return True, "Order reject rate within limits"
    
    def check_system_health(
        self,
        exchange_latency_ms: float,
        data_age_seconds: float,
        websocket_disconnect_count: int,
        api_rate_limit_hits: int,
        total_orders: int,
        rejected_orders: int
    ) -> dict:
        """Get comprehensive infrastructure health status"""
        checks = [
            ('exchange_latency', lambda: self.check_exchange_latency(exchange_latency_ms, 50)),
            ('data_latency', lambda: self.check_data_latency(data_age_seconds)),
            ('websocket_status', lambda: self.check_websocket_status(websocket_disconnect_count, "none", False)),
            ('api_rate_limit', lambda: self.check_api_rate_limit(api_rate_limit_hits, 60)),
            ('order_reject_rate', lambda: self.check_order_reject_rate(total_orders, rejected_orders)),
        ]
        
        results = {}
        for name, check_func in checks:
            is_ok, message = check_func()
            results[name] = {
                'triggered': not is_ok,
                'message': message,
            }
        
        return {
            'checks': results,
            'should_halt': any(r['triggered'] for r in results.values()),
            'halt_reasons': [r['message'] for r in results.values() if r['triggered']]
        }


# Example 5: Kill Switch Controller (Centralized)
class KillSwitchController:
    """Central controller managing all kill switches"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        self.account_switches = AccountLevelKillSwitches(config)
        self.strategy_switches = StrategyLevelKillSwitches(config)
        self.market_switches = MarketLevelKillSwitches(config)
        self.infrastructure_switches = InfrastructureKillSwitches(config)
        
        # Track global state
        self.all_triggered: set = set()
        self.global_halt = False
    
    def update_account_metrics(
        self,
        start_balance: float,
        current_balance: float,
        peak_balance: float
    ):
        """Update account-level metrics"""
        self.account_switches.update_daily_metrics(start_balance, current_balance, peak_balance)
    
    def check_all_switches(
        self,
        current_balance: float,
        strategy_id: str = None,
        market_data: dict = None,
        infrastructure_data: dict = None
    ) -> dict:
        """
        Check all kill switches and return comprehensive status
        
        Args:
            current_balance: Current account balance
            strategy_id: Strategy to check (optional)
            market_data: dict with market metrics
            infrastructure_data: dict with infrastructure metrics
        
        Returns:
            dict with all switch statuses and overall halt decision
        """
        results = {
            'account': {},
            'strategies': {},
            'market': {},
            'infrastructure': {},
            'overall': {}
        }
        
        # Check account-level
        account_status = self.account_switches.get_all_account_switches_status(current_balance)
        results['account'] = account_status
        
        account_halt = any(v['triggered'] for v in account_status.values())
        if account_halt:
            self.all_triggered.add('account')
        
        # Check strategy-level
        if strategy_id:
            strategy_status = self.strategy_switches.get_strategy_status(strategy_id, current_balance)
            results['strategies'][strategy_id] = strategy_status
            
            if strategy_status.get('should_halt'):
                self.all_triggered.add(f'strategy_{strategy_id}')
        
        # Check market-level
        if market_data:
            market_status = self.market_switches.get_market_status(**market_data)
            results['market'] = market_status
            
            if market_status.get('should_halt'):
                self.all_triggered.add('market')
        
        # Check infrastructure-level
        if infrastructure_data:
            infra_status = self.infrastructure_switches.check_system_health(**infrastructure_data)
            results['infrastructure'] = infra_status
            
            if infra_status.get('should_halt'):
                self.all_triggered.add('infrastructure')
        
        # Overall halt decision
        overall_halt = len(self.all_triggered) > 0
        
        results['overall'] = {
            'triggered_switches': list(self.all_triggered),
            'should_halt': overall_halt,
            'trigger_count': len(self.all_triggered)
        }
        
        if overall_halt:
            self.logger.critical(f"KILL SWITCH TRIGGERED: {self.all_triggered}")
        
        return results
    
    def get_global_halt_status(self) -> tuple[bool, list[str]]:
        """Get overall halt status"""
        return self.global_halt, list(self.all_triggered)
    
    def reset_switch(self, switch_name: str):
        """Reset a triggered switch"""
        if switch_name in self.all_triggered:
            self.all_triggered.remove(switch_name)
            self.logger.info(f"Kill switch '{switch_name}' reset")
    
    def force_halt(self, reason: str):
        """Force halt all trading"""
        self.global_halt = True
        self.all_triggered.add('manual')
        self.logger.critical(f"TRADING HALTED: {reason}")
    
    def resume_trading(self):
        """Resume trading if all switches are clear"""
        if len(self.all_triggered) == 0:
            self.global_halt = False
            self.logger.info("Trading resumed")
        else:
            self.logger.warning(f"Cannot resume trading: {self.all_triggered} still triggered")
```

## Adherence Checklist
Before completing your task, verify:
- [ ] Kill switches operate at account, strategy, market, and infrastructure levels
- [ ] Triggered switches immediately halt trading operations
- [ ] Each switch type has clear, configurable thresholds
- [ ] Switch state is tracked with last trigger time and count
- [ ] Early exit is used to immediately halt when thresholds are breached
- [ ] All switch names are intentional and descriptive

## Common Mistakes to Avoid

### ❌ Mistake 1: Kill Switches Disabled or Bypassed Without Audit Trail
```python
# BAD: Kill switches can be easily disabled
def __init__(self):
    self.kill_switches = {
        'daily_loss': False,  # Disabled - no audit!
        'margin_call': False,  # Disabled - why?
        'max_leverage': True,
    }
    # No way to track who disabled what or when

# GOOD: Kill switches enforced with immutable audit trail
@dataclass
class KillSwitchConfig:
    enabled: bool
    threshold: float
    cooldown_minutes: int
    _audit_log: List[dict] = field(default_factory=list, init=False, repr=False)

class KillSwitchManager:
    def __init__(self):
        self.switches_locked = True  # Immutable by default
    
    def disable_switch(self, name: str, reason: str, approver: str):
        """Only disable with approval and full audit logging"""
        if self.switches_locked:
            raise PermissionError(f"Switches locked. Contact {self.admin_email}")
        
        self.config[name]._audit_log.append({
            'timestamp': datetime.now(),
            'action': 'disabled',
            'reason': reason,
            'approver': approver
        })
        self.config[name].enabled = False
```

**Why BAD is dangerous:** A single line comment disables critical risk protection. Days later, you forget it's disabled. Account wipes.

**Why GOOD works:** Requires explicit approval, logs everything, and defaults to **locked**.

### ❌ Mistake 2: Single-Layer Kill Switch (No Defense in Depth)
```python
# BAD: Only ONE check before trading
def execute_trade(self, order):
    if self.daily_loss < 0.03:  # Single check!
        self.execute(order)
    # If this check has a bug, no fallback protection

# GOOD: Multi-layered kill switches (Defense in Depth)
def should_execute_trade(self, order) -> tuple[bool, List[str]]:
    """Check multiple independent layers before execution"""
    kill_reasons = []
    
    # Layer 1: Account-level protection
    ok, msg = self.account_switches.check_daily_loss()
    if not ok:
        kill_reasons.append(f"ACCOUNT: {msg}")
    
    # Layer 2: Strategy-level protection
    ok, msg = self.strategy_switches.check_consecutive_losses(order.strategy)
    if not ok:
        kill_reasons.append(f"STRATEGY: {msg}")
    
    # Layer 3: Market-level protection
    ok, msg = self.market_switches.check_volatility(order.symbol)
    if not ok:
        kill_reasons.append(f"MARKET: {msg}")
    
    # Layer 4: Infrastructure-level protection
    ok, msg = self.infra_switches.check_network_health()
    if not ok:
        kill_reasons.append(f"INFRASTRUCTURE: {msg}")
    
    return len(kill_reasons) == 0, kill_reasons
```

**Why BAD fails:** If that one check has a bug, no fallback. You're unprotected.

**Why GOOD works:** 4 independent layers. Even if one fails, 3 others protect you.

### ❌ Mistake 3: Delayed Kill Switch Execution
```python
# BAD: Kill switch triggers but execution is delayed
def check_and_halt():
    if account_loss > 0.05:
        print("KILL SWITCH TRIGGERED!")  # Just logs
        time.sleep(1)  # Why delay?!
        self.log_event("Kill switch")  # Logging takes time
        self.send_email()  # Emails are slow
        close_all_positions()  # NOW we exit - but losses already accumulated!

# GOOD: Immediate, synchronous kill switch execution with async notifications
def check_and_halt():
    """Kill switch must execute IMMEDIATELY"""
    if account_loss > 0.05:
        # SYNCHRONOUS: Close positions first, before anything else
        closed_positions = self.close_all_positions_immediately()
        
        # THEN: Log and notify (these are async - won't block trading halt)
        self.thread_pool.submit(lambda: self.audit_log.record({
            'timestamp': datetime.now(),
            'type': 'kill_switch_triggered',
            'positions_closed': len(closed_positions),
            'loss_percent': account_loss
        }))
        
        self.thread_pool.submit(self.notify_operators_urgent)
```

**Why BAD fails:** The delay between trigger and execution causes additional losses.

**Why GOOD works:** Closes positions immediately. Only THEN notifies (async).

## References

- Trading System Design - Van Tharp Institute
- Risk Management Best Practices - CFA Institute
- Kill Switch Design - NYSE Market Rules
- Exchange Latency Management - High-Frequency Trading Research
- Market Microstructure - O'Hara (1995)

## Base Directory
file:///home/paulpas/git/ideas/trading_bot/skills/risk-engine