---
name: trading-ai-order-flow-analysis
description: Analyze order flow to detect market pressure and anticipate price moves
---

**Role:** Extract actionable insights from order book dynamics and trade flow data

**Philosophy:** Order flow reveals hidden liquidity and order imbalances. Prioritize microsecond timing, bid-ask spread analysis, and volume profiling for predictive signals.

## Key Principles

1. **Hidden Liquidity Detection**: Identify hidden orders through trade size and timing patterns
2. **Order Flow Imbalance**: Track buy vs sell pressure at each price level
3. **Liquidity Profiling**: Map liquidity across price levels and time
4. **Trade Size Analysis**: Detect large institutional orders via size anomalies
5. **Time and Sales Processing**: Analyze tick-by-tick data for microstructure signals

## Implementation Guidelines

### Structure
- Core logic: `orderflow/parser.py` - Order flow data parsing
- Analyzer: `orderflow/analyzers.py` - Order flow analysis
- Detector: `orderflow/detectors.py` - Order flow pattern detection
- Config: `config/orderflow_config.yaml` - Order flow parameters

### Patterns to Follow
- Process order book snapshots and trade streams separately
- Calculate cumulative delta over multiple time scales
- Track order flow imbalance with volume-weighted pricing
- Detect order flow divergence from price action

## Adherence Checklist
Before completing your task, verify:
- [ ] Order book imbalance (bid-ask pressure) calculated
- [ ] Cumulative delta tracked over time
- [ ] Hidden liquidity detected via trade size patterns
- [ ] Volume profile constructed at key levels
- [ ] Order flow divergence from price identified



## Code Examples

### Order Book Imbalance Calculator

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class OrderBook:
    """Order book state at a point in time."""
    timestamp: int
    bids: List[Tuple[float, float]]  # (price, size)
    asks: List[Tuple[float, float]]  # (price, size)

class OrderBookImbalance:
    """Calculate order book imbalance metrics."""
    
    def __init__(self, depth: int = 5):
        self.depth = depth
    
    def calculate_imbalance(self, order_book: OrderBook) -> Dict:
        """Calculate order book imbalance metrics."""
        bids = order_book.bids[:self.depth]
        asks = order_book.asks[:self.depth]
        
        if not bids or not asks:
            return {
                'imbalance': 0.5,
                'bid_volume': 0,
                'ask_volume': 0,
                'imbalance_signed': 0,
                'price_weighted_imbalance': 0
            }
        
        # Calculate volumes
        bid_volume = sum(size for _, size in bids)
        ask_volume = sum(size for _, size in asks)
        total_volume = bid_volume + ask_volume
        
        # Basic imbalance (0 = all bids, 1 = all asks)
        imbalance = ask_volume / total_volume if total_volume > 0 else 0.5
        
        # Signed imbalance (-1 = all bids, +1 = all asks)
        imbalance_signed = (ask_volume - bid_volume) / total_volume if total_volume > 0 else 0
        
        # Price-weighted imbalance (better pressure indicator)
        bid_weighted = sum(price * size for price, size in bids)
        ask_weighted = sum(price * size for price, size in asks)
        price_weighted_imbalance = (ask_weighted - bid_weighted) / (bid_weighted + ask_weighted) if (bid_weighted + ask_weighted) > 0 else 0
        
        return {
            'imbalance': imbalance,
            'imbalance_signed': imbalance_signed,
            'bid_volume': bid_volume,
            'ask_volume': ask_volume,
            'total_volume': total_volume,
            'price_weighted_imbalance': price_weighted_imbalance,
            'bid_ask_ratio': bid_volume / ask_volume if ask_volume > 0 else float('inf')
        }
    
    def calculate_imbalance_change(self, imbalance_series: np.ndarray,
                                  window: int = 10) -> np.ndarray:
        """Calculate change in order book imbalance."""
        if len(imbalance_series) < window:
            return np.zeros_like(imbalance_series)
        
        current = np.array(imbalance_series)
        previous = np.roll(current, window)
        previous[:window] = current[:window]
        
        return current - previous
    
    def calculate_cumulative_delta(self, prices: np.ndarray,
                                  volumes: np.ndarray,
                                  buy_signals: np.ndarray) -> np.ndarray:
        """Calculate cumulative delta (net buying volume)."""
        delta = np.where(buy_signals, volumes, -volumes)
        return np.cumsum(delta)
```

### Trade Flow Analyzer

```python
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class Trade:
    """Single trade record."""
    timestamp: int
    price: float
    size: float
    side: str  # 'buy' or 'sell'

class TradeFlowAnalyzer:
    """Analyze trade flow patterns for market signals."""
    
    def __init__(self, high_frequency_threshold: float = 1000):
        """High frequency = trades faster than this threshold (ms)."""
        self.high_freq_threshold = high_frequency_threshold
    
    def detect_large_liquidity_orders(self, trades: List[Trade],
                                     volume_threshold: float = 3.0) -> List[Dict]:
        """Detect large hidden liquidity orders."""
        if not trades:
            return []
        
        volumes = [t.size for t in trades]
        avg_volume = np.mean(volumes)
        std_volume = np.std(volumes)
        
        large_orders = []
        for trade in trades:
            z_score = (trade.size - avg_volume) / (std_volume + 1e-6)
            
            if z_score > volume_threshold:
                large_orders.append({
                    'timestamp': trade.timestamp,
                    'price': trade.price,
                    'size': trade.size,
                    'z_score': z_score,
                    'side': trade.side,
                    'type': 'large_liquidity'
                })
        
        return large_orders
    
    def detect_aggressive_trades(self, trades: List[Trade],
                                spread: float = 0.01) -> List[Dict]:
        """Detect aggressive trades that hit posted orders."""
        if not trades or len(trades) < 2:
            return []
        
        aggressive = []
        
        for i in range(1, len(trades)):
            prev_trade = trades[i-1]
            curr_trade = trades[i]
            
            # Check if trade crossed spread aggressively
            if curr_trade.side == 'buy' and curr_trade.price >= prev_trade.price + spread:
                aggressive.append({
                    'timestamp': curr_trade.timestamp,
                    'price': curr_trade.price,
                    'size': curr_trade.size,
                    'side': 'buy',
                    'type': 'aggressive_buy'
                })
            elif curr_trade.side == 'sell' and curr_trade.price <= prev_trade.price - spread:
                aggressive.append({
                    'timestamp': curr_trade.timestamp,
                    'price': curr_trade.price,
                    'size': curr_trade.size,
                    'side': 'sell',
                    'type': 'aggressive_sell'
                })
        
        return aggressive
    
    def calculate_volume_profile(self, trades: List[Trade],
                                price_bins: int = 100) -> Dict:
        """Calculate volume profile across price levels."""
        if not trades:
            return {}
        
        prices = [t.price for t in trades]
        volumes = [t.size for t in trades]
        
        min_price = min(prices)
        max_price = max(prices)
        bin_size = (max_price - min_price) / price_bins
        
        volume_profile = np.zeros(price_bins)
        
        for price, volume in zip(prices, volumes):
            bin_idx = int((price - min_price) / bin_size)
            bin_idx = min(bin_idx, price_bins - 1)
            volume_profile[bin_idx] += volume
        
        return {
            'min_price': min_price,
            'max_price': max_price,
            'bin_size': bin_size,
            'volume_profile': volume_profile,
            'price_levels': np.linspace(min_price, max_price, price_bins),
            'total_volume': sum(volumes)
        }
    
    def detect_volume_spike(self, volumes: np.ndarray,
                           window: int = 60,
                           threshold: float = 2.0) -> List[Dict]:
        """Detect volume spikes relative to recent average."""
        if len(volumes) < window:
            return []
        
        # Rolling statistics
        rolling_mean = pd.Series(volumes).rolling(window).mean().fillna(np.mean(volumes))
        rolling_std = pd.Series(volumes).rolling(window).std().fillna(np.std(volumes))
        
        spikes = []
        for i in range(len(volumes)):
            if rolling_std[i] > 0:
                z_score = (volumes[i] - rolling_mean[i]) / rolling_std[i]
                
                if z_score > threshold:
                    spikes.append({
                        'timestamp': i,
                        'volume': volumes[i],
                        'z_score': z_score,
                        'rolling_mean': rolling_mean[i],
                        'rolling_std': rolling_std[i]
                    })
        
        return spikes
```

### Hidden Liquidity Detector

```python
import numpy as np
import pandas as pd
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class Trade:
    timestamp: int
    price: float
    size: float
    side: str

class HiddenLiquidityDetector:
    """Detect hidden liquidity through trade flow patterns."""
    
    def __init__(self, min_order_size: float = 1000,
                 timing_window: int = 10):
        self.min_order_size = min_order_size
        self.timing_window = timing_window
    
    def detect_iceberg_orders(self, trades: List[Trade]) -> List[Dict]:
        """Detect iceberg orders (large orders broken into smaller pieces)."""
        if len(trades) < 3:
            return []
        
        # Filter for large individual trades
        large_trades = [t for t in trades if t.size >= self.min_order_size]
        
        if len(large_trades) < 2:
            return []
        
        # Find clusters of trades at same price
        iceberg_orders = []
        i = 0
        
        while i < len(large_trades):
            current_price = large_trades[i].price
            current_side = large_trades[i].side
            
            # Count consecutive trades at same price
            cluster_size = 1
            cluster_start = i
            cluster_time = large_trades[i].timestamp
            
            while (i + cluster_size < len(large_trades) and
                   large_trades[i + cluster_size].price == current_price and
                   large_trades[i + cluster_size].side == current_side and
                   large_trades[i + cluster_size].timestamp - cluster_start < self.timing_window):
                cluster_size += 1
            
            # Iceberg pattern: multiple trades of similar size
            if cluster_size >= 3:
                sizes = [large_trades[cluster_start + j].size for j in range(cluster_size)]
                avg_size = np.mean(sizes)
                
                # Check if sizes are consistent (iceberg signature)
                size_variance = np.var(sizes)
                
                if size_variance < avg_size * 0.5:  # Low variance relative to size
                    iceberg_orders.append({
                        'start_time': large_trades[cluster_start].timestamp,
                        'end_time': large_trades[cluster_start + cluster_size - 1].timestamp,
                        'price': current_price,
                        'side': current_side,
                        'total_volume': sum(sizes),
                        'avg_chunk_size': avg_size,
                        'chunk_count': cluster_size,
                        'estimate_total': avg_size * 5  # Assume 5 chunks typically
                    })
            
            i += max(1, cluster_size)
        
        return iceberg_orders
    
    def detect_sweep_orders(self, trades: List[Trade],
                           book_levels: int = 5) -> List[Dict]:
        """Detect sweep orders that take out multiple liquidity levels."""
        if len(trades) < 2:
            return []
        
        sweeps = []
        
        for i in range(1, len(trades)):
            prev = trades[i-1]
            curr = trades[i]
            
            # Check if price moved against expected direction
            if curr.side == 'buy' and curr.price > prev.price * 1.001:
                # Price surged up - likely took out ask levels
                sweeps.append({
                    'timestamp': curr.timestamp,
                    'type': 'sweep_up',
                    'price': curr.price,
                    'size': curr.size,
                    'direction': 'up',
                    'confidence': 0.8
                })
            elif curr.side == 'sell' and curr.price < prev.price * 0.999:
                # Price dropped - likely took out bid levels
                sweeps.append({
                    'timestamp': curr.timestamp,
                    'type': 'sweep_down',
                    'price': curr.price,
                    'size': curr.size,
                    'direction': 'down',
                    'confidence': 0.8
                })
        
        return sweeps
    
    def detect_absorption(self, trades: List[Trade],
                         price_support: float = None,
                         price_resistance: float = None) -> List[Dict]:
        """Detect absorption (large orders absorbing liquidity at support/resistance)."""
        if not trades:
            return []
        
        absptions = []
        
        for i in range(1, len(trades)):
            curr = trades[i]
            prev = trades[i-1]
            
            # Check for absorption at support
            if price_support and abs(curr.price - price_support) < 0.01:
                if curr.side == 'buy' and curr.size > np.mean([t.size for t in trades]):
                    absptions.append({
                        'timestamp': curr.timestamp,
                        'type': 'absorption_at_support',
                        'price': curr.price,
                        'size': curr.size,
                        'support_level': price_support
                    })
            
            # Check for absorption at resistance
            if price_resistance and abs(curr.price - price_resistance) < 0.01:
                if curr.side == 'sell' and curr.size > np.mean([t.size for t in trades]):
                    absptions.append({
                        'timestamp': curr.timestamp,
                        'type': 'absorption_at_resistance',
                        'price': curr.price,
                        'size': curr.size,
                        'resistance_level': price_resistance
                    })
        
        return absptions
```

### Order Flow Divergence Detector

```python
import numpy as np
import pandas as pd
from typing import List, Dict

class OrderFlowDivergenceDetector:
    """Detect divergence between order flow and price action."""
    
    def __init__(self, window: int = 20):
        self.window = window
    
    def calculate_cumulative_volume_delta(self, prices: np.ndarray,
                                         volumes: np.ndarray,
                                         buy_signals: np.ndarray) -> np.ndarray:
        """Calculate cumulative volume delta."""
        delta = np.where(buy_signals, volumes, -volumes)
        return np.cumsum(delta)
    
    def detect_divergence(self, prices: np.ndarray,
                         cumulative_delta: np.ndarray) -> List[Dict]:
        """Detect bullish and bearish divergences."""
        if len(prices) < 2 * self.window:
            return []
        
        divergences = []
        
        # Calculate price and delta trends
        price_returns = np.diff(prices)
        delta_changes = np.diff(cumulative_delta)
        
        for i in range(self.window, len(prices) - self.window):
            # Price high/low
            price_window = prices[i-self.window:i+self.window]
            current_price = prices[i]
            
            local_max = np.max(price_window)
            local_min = np.min(price_window)
            
            # Delta high/low
            delta_window = cumulative_delta[i-self.window:i+self.window]
            current_delta = cumulative_delta[i]
            
            local_delta_max = np.max(delta_window)
            local_delta_min = np.min(delta_window)
            
            # Bullish divergence: price lower, delta higher
            if current_price < local_min and current_delta > local_delta_min * 0.9:
                divergences.append({
                    'timestamp': i,
                    'type': 'bullish',
                    'price_level': current_price,
                    'delta_level': current_delta,
                    'price_min': local_min,
                    'delta_min': local_delta_min,
                    'signal': 'potential_bottom'
                })
            
            # Bearish divergence: price higher, delta lower
            if current_price > local_max * 0.99 and current_delta < local_delta_max * 0.9:
                divergences.append({
                    'timestamp': i,
                    'type': 'bearish',
                    'price_level': current_price,
                    'delta_level': current_delta,
                    'price_max': local_max,
                    'delta_max': local_delta_max,
                    'signal': 'potential_top'
                })
        
        return divergences
    
    def calculate_order_flow_strength(self, prices: np.ndarray,
                                     volumes: np.ndarray,
                                     buy_signals: np.ndarray) -> np.ndarray:
        """Calculate order flow strength indicator."""
        delta = np.where(buy_signals, volumes, -volumes)
        
        # Rolling statistics
        delta_sma = pd.Series(delta).rolling(self.window).mean().fillna(0)
        delta_std = pd.Series(delta).rolling(self.window).std().fillna(1)
        
        # Strength = delta / (std * volume)
        strength = delta_sma / (delta_std * np.sqrt(volumes) + 1e-6)
        
        return strength
```
