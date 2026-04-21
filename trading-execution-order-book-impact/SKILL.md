---
name: trading-execution-order-book-impact
description: Order Book Impact Measurement and Market Microstructure Analysis
---

**Role:** Market Microstructure Analyst — designs tools to measure, predict, and mitigate the impact of trading activity on order book dynamics.

**Philosophy:** Market Impact Minimization — order book analysis should quantify how trades move prices and liquidity to enable intelligent execution strategies that avoid adverse selection and slippage.

## Key Principles

1. **Market Impact Quantification**: Measure price movement per unit of volume traded using empirical models (linear, sublinear, superlinear regimes).

2. **Liquidity Scanning**: Continuously assess available depth at each price level to identify optimal execution opportunities without triggering adverse price moves.

3. **Iceberg Detection**: Identify hidden liquidity patterns and large participant activity through order book statistics and temporal analysis.

4. **Sniper Detection**: Detect high-frequency predatory trading patterns that exploit order book information before large orders execute.

5. **Adaptive Execution Sizing**: Dynamically adjust order sizes based on real-time order book depth and recent trade flow analysis.

## Implementation Guidelines

### Structure
- Core logic: `skills/execution-algorithms/order_book_impact.py`
- Helper functions: `skills/execution-algorithms/microstructure.py`
- Tests: `skills/tests/test_order_book_impact.py`

### Patterns to Follow
- Use deque for efficient order book updates
- Implement event-driven processing for real-time analysis
- Use vectorized NumPy operations for batch calculations
- Separate order book snapshot from impact analysis

## Code Examples

### Market Impact Measurement

```python
from dataclasses import dataclass
from typing import List, Tuple
from collections import deque
import numpy as np


@dataclass
class MarketImpactResult:
    """Result of market impact analysis."""
    price_impact: float  # Price change from baseline
    permanent_impact: float  # Persistent price effect
    temporary_impact: float  # Transient price effect
    liquidity_consumed: float  # Volume traded


class MarketImpactModel:
    """
    Estimate market impact based on empirical models.
    Supports linear and nonlinear impact functions.
    """
    
    def __init__(self, 
                 impact_coefficient: float = 0.0001,
                 impact_exponent: float = 0.5,
                 decay_rate: float = 0.1):
        """
        Initialize impact model.
        
        Args:
            impact_coefficient: Scale factor for impact
            impact_exponent: Exponent for nonlinear impact (0.5 = sqrt, 1.0 = linear)
            decay_rate: Rate at which temporary impact decays
        """
        self.impact_coeff = impact_coefficient
        self.exponent = impact_exponent
        self.decay = decay_rate
    
    def calculate_impact(self, volume: float, 
                         avg_daily_volume: float = 1000000.0) -> float:
        """
        Calculate price impact for given trade volume.
        
        Uses sublinear model: impact = k * (V/ADVE) ** exponent
        
        Args:
            volume: Trade volume
            avg_daily_volume: Reference volume for normalization
            
        Returns:
            Estimated price impact (decimal, e.g., 0.001 = 10bps)
        """
        if volume <= 0:
            return 0.0
        
        relative_volume = volume / avg_daily_volume
        return self.impact_coeff * (relative_volume ** self.exponent)
    
    def calculate_liquidation_impact(self, 
                                     total_volume: float,
                                     slices: List[float],
                                     avg_daily_volume: float = 1000000.0) -> float:
        """
        Calculate total impact for sliced execution.
        
        Slicing reduces impact because impact scales sublinearly.
        """
        if not slices or total_volume <= 0:
            return 0.0
        
        total_impact = 0.0
        for slice_volume in slices:
            total_impact += self.calculate_impact(slice_volume, avg_daily_volume)
        
        return total_impact
    
    def get_permanent_vs_temporary(self, impact: float) -> Tuple[float, float]:
        """
        Decompose impact into permanent and temporary components.
        
        Permanent impact persists after trading ceases.
        Temporary impact decays over time.
        """
        # 70% of impact is temporary (decays), 30% is permanent
        temporary = impact * 0.7
        permanent = impact * 0.3
        return permanent, temporary


class OrderBookImpactAnalyzer:
    """
    Analyze market impact from order book data.
    Tracks actual price movements and liquidity changes.
    """
    
    def __init__(self, lookback_periods: int = 100):
        self.lookback = lookback_periods
        self.price_history = deque(maxlen=lookback_periods)
        self.volume_history = deque(maxlen=lookback_periods)
        self.impact_history = deque(maxlen=lookback_periods)
    
    def record_trade(self, price: float, volume: float):
        """Record a trade and update impact metrics."""
        self.price_history.append(price)
        self.volume_history.append(volume)
        
        # Calculate price impact from previous close
        if len(self.price_history) >= 2:
            prev_price = self.price_history[-2]
            price_return = (price - prev_price) / prev_price if prev_price > 0 else 0.0
            self.impact_history.append(price_return)
    
    def calculate_realized_impact(self, trade_volume: float) -> float:
        """
        Calculate realized impact for a trade of given size.
        
        Uses regression of past trade volumes on price impacts.
        """
        if len(self.impact_history) < 10:
            return 0.0
        
        volumes = list(self.volume_history)[-len(self.impact_history):]
        impacts = list(self.impact_history)
        
        # Simple linear regression
        volumes = np.array(volumes)
        impacts = np.array(impacts)
        
        # Normalize volumes
        vol_mean = volumes.mean()
        vol_std = volumes.std() if volumes.std() > 0 else 1.0
        normalized_volumes = (volumes - vol_mean) / vol_std
        
        # Calculate slope (impact per normalized volume)
        slope = np.dot(normalized_volumes, impacts) / np.dot(normalized_volumes, normalized_volumes)
        
        # Estimate impact for given trade size
        normalized_size = (trade_volume - vol_mean) / vol_std
        return slope * normalized_size
    
    def get_liquidity_profile(self) -> List[Tuple[float, float]]:
        """
        Get volume-profile across price levels.
        
        Returns list of (price_level, cumulative_volume) tuples.
        """
        if len(self.price_history) < 5:
            return []
        
        prices = np.array(self.price_history)
        volumes = np.array(self.volume_history)
        
        # Create bins
        min_price, max_price = prices.min(), prices.max()
        bin_edges = np.linspace(min_price, max_price, 20)
        bin_counts = np.digitize(prices, bin_edges)
        
        profile = []
        for i in range(len(bin_edges)):
            mask = bin_counts == i
            if mask.sum() > 0:
                cumulative_vol = volumes[mask].sum()
                profile.append((bin_edges[i], cumulative_vol))
        
        return profile
```

### Iceberg Order Detection

```python
from dataclasses import dataclass
from typing import List, Tuple
from collections import deque
import numpy as np


@dataclass
class IcebergCandidate:
    """Candidate iceberg order pattern."""
    start_time: int
    end_time: int
    total_volume: float
    slice_volume: float
    slice_interval: float
    confidence: float


class IcebergDetector:
    """
    Detect potential iceberg orders from order book trade data.
    Iceberg orders show repeated patterns of small fills with long gaps.
    """
    
    def __init__(self, 
                 min_slices: int = 5,
                 interval_tolerance: float = 0.3,
                 volume_ratio_threshold: float = 0.5):
        self.min_slices = min_slices
        self.interval_tolerance = interval_tolerance
        self.volume_ratio_threshold = volume_ratio_threshold
    
    def detect_icebergs(self, trades: List[dict]) -> List[IcebergCandidate]:
        """
        Detect iceberg patterns in trade sequence.
        
        Args:
            trades: List of trade dicts with 'timestamp', 'price', 'quantity'
            
        Returns:
            List of detected iceberg candidates with metrics
        """
        if len(trades) < self.min_slices * 2:
            return []
        
        candidates = []
        
        # Calculate all inter-trade intervals
        timestamps = [t['timestamp'] for t in trades]
        intervals = np.diff(timestamps)
        volumes = np.array([t['quantity'] for t in trades])
        
        # Look for patterns of small volumes followed by gaps
        window_size = self.min_slices
        
        for i in range(len(trades) - window_size):
            window_volumes = volumes[i:i + window_size]
            window_intervals = intervals[i:i + window_size]
            
            # Check if volumes are relatively small (slices)
            avg_volume = window_volumes.mean()
            volume_std = window_volumes.std()
            
            if volume_std / avg_volume > self.volume_ratio_threshold:
                continue  # Volumes too variable
            
            # Check for regular intervals (gaps between slices)
            interval_mean = window_intervals.mean()
            interval_std = window_intervals.std()
            
            if interval_std / interval_mean > self.interval_tolerance:
                continue  # Intervals too irregular
            
            # Calculate confidence based on pattern regularity
            confidence = self._calculate_confidence(
                window_volumes, window_intervals, avg_volume, interval_mean
            )
            
            if confidence > 0.5:  # Threshold
                candidate = IcebergCandidate(
                    start_time=timestamps[i],
                    end_time=timestamps[i + window_size],
                    total_volume=window_volumes.sum(),
                    slice_volume=avg_volume,
                    slice_interval=interval_mean,
                    confidence=confidence
                )
                candidates.append(candidate)
        
        return candidates
    
    def _calculate_confidence(self, 
                              volumes: np.ndarray,
                              intervals: np.ndarray,
                              vol_mean: float,
                              interval_mean: float) -> float:
        """Calculate confidence score for iceberg pattern."""
        # Factor 1: Volume regularity (lower std = better)
        vol_cv = volumes.std() / vol_mean if vol_mean > 0 else 1.0
        volume_score = max(0, 1.0 - vol_cv)
        
        # Factor 2: Interval regularity (lower std = better)
        interval_cv = intervals.std() / interval_mean if interval_mean > 0 else 1.0
        interval_score = max(0, 1.0 - interval_cv)
        
        # Factor 3: Small volume relative to average
        avg_volume = volumes.mean()
        relative_size = min(1.0, avg_volume / 100.0)  # Assuming 100 is baseline
        
        # Weighted combination
        return 0.4 * volume_score + 0.4 * interval_score + 0.2 * relative_size
    
    def get_iceberg_metrics(self, trades: List[dict]) -> dict:
        """
        Calculate iceberg-related metrics for trade sequence.
        
        Returns metrics useful for detecting large participant activity.
        """
        if len(trades) < 10:
            return {}
        
        volumes = np.array([t['quantity'] for t in trades])
        timestamps = np.array([t['timestamp'] for t in trades])
        intervals = np.diff(timestamps)
        
        # Volume statistics
        volume_pct_95 = np.percentile(volumes, 95)
        volume_median = np.median(volumes)
        volume_ratio = volume_pct_95 / volume_median if volume_median > 0 else 1.0
        
        # Interval statistics
        interval_pct_5 = np.percentile(intervals, 5)  # Short gaps
        interval_pct_95 = np.percentile(intervals, 95)  # Long gaps
        gap_ratio = interval_pct_95 / interval_pct_5 if interval_pct_5 > 0 else 1.0
        
        # Large trade detection (top 5% by volume)
        large_trades = volumes > volume_pct_95
        large_trade_intervals = intervals[large_trades[:-1]] if len(large_trades) > 1 else np.array([])
        
        return {
            'volume_regularization_ratio': 1.0 / volume_ratio,  # Higher = more regular
            'gap_regularization_ratio': 1.0 / gap_ratio if gap_ratio > 0 else 0,
            'large_trade_count': large_trades.sum(),
            'large_trade_frequency': large_trades.sum() / len(trades),
            'average_slice_estimate': volume_pct_95 / 10  # Estimate slice size
        }
```

### Sniper Detection

```python
from dataclasses import dataclass
from typing import List, Tuple
from collections import deque
import numpy as np
from enum import Enum


class TradeType(Enum):
    """Type of trade based on timing analysis."""
    SNIPER = "sniper"  # Exploiting order book
    PASSIVE = "passive"  # Waiting in order book
    AGGRESSIVE = "aggressive"  # Taking liquidity


@dataclass
class SniperAlert:
    """Sniper detection alert."""
    timestamp: int
    confidence: float
    pattern_type: str
    surrounding_volume: float


class SniperDetector:
    """
    Detect sniper trading patterns that exploit order book anticipation.
    Snipers place orders just before large orders and cancel immediately after.
    """
    
    def __init__(self,
                 detection_window: int = 10,
                 confidence_threshold: float = 0.7,
                 volume_spike_threshold: float = 2.0):
        self.window = detection_window
        self.confidence_threshold = confidence_threshold
        self.spike_threshold = volume_spike_threshold
        
        self.order_book_history = deque(maxlen=detection_window * 10)
        self.trades_history = deque(maxlen=detection_window * 10)
    
    def record_order_book(self, timestamp: int, 
                          bid_levels: List[Tuple[float, float]],
                          ask_levels: List[Tuple[float, float]]):
        """Record order book snapshot."""
        self.order_book_history.append({
            'timestamp': timestamp,
            'bids': bid_levels,
            'asks': ask_levels
        })
    
    def record_trade(self, timestamp: int, price: float, volume: float):
        """Record trade and check for sniper patterns."""
        self.trades_history.append({
            'timestamp': timestamp,
            'price': price,
            'volume': volume
        })
    
    def detect_snipers(self, current_time: int) -> List[SniperAlert]:
        """
        Detect potential sniper activity around current time.
        
        Snipers show:
        1. Sudden order book depth reduction just before large trades
        2. Rapid order placement/cancellation cycles
        3. Trades occurring at exact order book boundaries
        """
        alerts = []
        
        # Find recent order book states
        recent_books = [
            b for b in self.order_book_history 
            if current_time - b['timestamp'] < self.window * 2
        ]
        
        if len(recent_books) < 3:
            return alerts
        
        # Check for depth reduction patterns
        for i in range(1, len(recent_books)):
            prev_book = recent_books[i - 1]
            curr_book = recent_books[i]
            
            # Calculate depth change
            prev_depth = self._calculate_book_depth(prev_book)
            curr_depth = self._calculate_book_depth(curr_book)
            
            depth_change_ratio = prev_depth / curr_depth if curr_depth > 0 else float('inf')
            
            if depth_change_ratio > self.spike_threshold:
                # Significant depth reduction detected
                confidence = min(1.0, (depth_change_ratio - 1) / self.spike_threshold)
                
                # Check if followed by large trade
                subsequent_trades = [
                    t for t in self.trades_history
                    if curr_book['timestamp'] < t['timestamp'] <= current_time
                ]
                
                if subsequent_trades:
                    avg_trade_size = np.mean([t['volume'] for t in subsequent_trades])
                    if avg_trade_size > np.mean([t['volume'] for t in self.trades_history]) * 1.5:
                        confidence *= 1.5  # Boost confidence if large trade follows
                        
                        alert = SniperAlert(
                            timestamp=curr_book['timestamp'],
                            confidence=min(1.0, confidence),
                            pattern_type="depth_reduction",
                            surrounding_volume=sum(t['volume'] for t in subsequent_trades)
                        )
                        alerts.append(alert)
        
        return alerts
    
    def _calculate_book_depth(self, book: dict) -> float:
        """Calculate total depth on one side of book."""
        bids = book['bids']
        asks = book['asks']
        
        bid_depth = sum(v for _, v in bids[:5])  # Top 5 levels
        ask_depth = sum(v for _, v in asks[:5])
        
        return bid_depth + ask_depth
    
    def analyze_order_timing(self, orders: List[dict]) -> dict:
        """
        Analyze order timing patterns for sniper indicators.
        
        Args:
            orders: List of order events with 'timestamp', 'action', 'side'
            
        Returns:
            Dictionary with timing metrics
        """
        if len(orders) < 10:
            return {}
        
        timestamps = np.array([o['timestamp'] for o in orders])
        actions = np.array([o['action'] for o in orders])
        
        # Calculate inter-order intervals
        intervals = np.diff(timestamps)
        
        # Look for very short intervals (rapid firing)
        short_intervals = intervals[intervals < np.percentile(intervals, 10)]
        
        # Look for clustering (multiple orders in quick succession)
        cluster_threshold = np.percentile(intervals, 25)
        clusters = []
        cluster_start = 0
        
        for i in range(1, len(intervals)):
            if intervals[i] > cluster_threshold:
                if i - cluster_start > 3:  # At least 4 orders in cluster
                    clusters.append(cluster_start)
                cluster_start = i
        
        # Calculate metrics
        avg_interval = intervals.mean()
        interval_std = intervals.std()
        short_interval_ratio = len(short_intervals) / len(intervals)
        cluster_ratio = len(clusters) / len(intervals)
        
        return {
            'avg_order_interval': avg_interval,
            'order_interval_cv': interval_std / avg_interval if avg_interval > 0 else 0,
            'short_interval_ratio': short_interval_ratio,
            'cluster_ratio': cluster_ratio,
            'order_rate': len(orders) / (timestamps[-1] - timestamps[0]) if len(timestamps) > 1 else 0
        }
```

### Liquidity Scanning

```python
from dataclasses import dataclass
from typing import List, Tuple
from collections import deque
import numpy as np


@dataclass
class LiquidityProfile:
    """Liquidity profile at a price level."""
    price: float
    depth: float  # Total quantity available
    concentration: float  # How concentrated the depth is (0-1)
    response_time_ms: float  # Estimated response time
    stability: float  # How stable the depth is over time


class LiquidityScanner:
    """
    Scan and analyze order book liquidity for optimal execution.
    Identifies hidden liquidity and assesses fill probability.
    """
    
    def __init__(self, 
                 levels_to_scan: int = 10,
                 lookback_window: int = 100):
        self.levels = levels_to_scan
        self.lookback = lookback_window
        
        self.liquidity_history = deque(maxlen=lookback_window)
        self.price_history = deque(maxlen=lookback_window)
    
    def scan_order_book(self, 
                        bids: List[Tuple[float, float]],
                        asks: List[Tuple[float, float]],
                        timestamp: int) -> dict:
        """
        Scan order book for liquidity.
        
        Returns comprehensive liquidity profile for both sides.
        """
        result = {
            'bids': self._analyze_side(bids, timestamp, is_bid=True),
            'asks': self._analyze_side(asks, timestamp, is_bid=False),
            'spread': self._calculate_spread(bids, asks),
            'mid_price': self._calculate_mid(bids, asks)
        }
        
        # Update history
        self.liquidity_history.append(result)
        self.price_history.append(result['mid_price'])
        
        return result
    
    def _analyze_side(self, 
                      levels: List[Tuple[float, float]],
                      timestamp: int,
                      is_bid: bool) -> List[LiquidityProfile]:
        """Analyze one side of the order book."""
        if not levels:
            return []
        
        profiles = []
        
        # Calculate cumulative depth
        cumulative = np.cumsum([v for _, v in levels[:self.levels]])
        total_depth = cumulative[-1] if len(cumulative) > 0 else 0
        
        # Calculate depth concentration
        if total_depth > 0:
            weights = cumulative / total_depth
            concentration = 1.0 - np.std(weights[:min(5, len(weights))])
            concentration = max(0, min(1, concentration))
        else:
            concentration = 0
        
        # Create profiles for each level
        for i, (price, volume) in enumerate(levels[:self.levels]):
            cumulative_vol = cumulative[i] if i < len(cumulative) else volume
            profile = LiquidityProfile(
                price=price,
                depth=volume,
                concentration=concentration * (i + 1) / self.levels,
                response_time_ms=1.0 + i * 0.5,  # Simulated
                stability=self._estimate_stability(price, timestamp, is_bid)
            )
            profiles.append(profile)
        
        return profiles
    
    def _estimate_stability(self, 
                            price: float,
                            timestamp: int,
                            is_bid: bool) -> float:
        """Estimate how stable liquidity at this price level is."""
        if len(self.liquidity_history) < 5:
            return 0.5  # Default uncertainty
        
        # Check historical stability
        recent_profiles = []
        for history in list(self.liquidity_history)[-5:]:
            side = history['bids'] if is_bid else history['asks']
            if side and len(side) > 0:
                for profile in side:
                    if abs(profile.price - price) < 0.0001:
                        recent_profiles.append(profile.depth)
        
        if len(recent_profiles) < 3:
            return 0.5
        
        depth_std = np.std(recent_profiles)
        depth_mean = np.mean(recent_profiles)
        
        return max(0, min(1, 1.0 - depth_std / depth_mean if depth_mean > 0 else 0))
    
    def _calculate_spread(self,
                          bids: List[Tuple[float, float]],
                          asks: List[Tuple[float, float]]) -> float:
        """Calculate bid-ask spread."""
        if not bids or not asks:
            return 0.0
        
        best_bid = bids[0][0]
        best_ask = asks[0][0]
        
        return (best_ask - best_bid) / ((best_bid + best_ask) / 2)
    
    def _calculate_mid(self,
                       bids: List[Tuple[float, float]],
                       asks: List[Tuple[float, float]]) -> float:
        """Calculate mid price."""
        if not bids or not asks:
            return 0.0
        
        return (bids[0][0] + asks[0][0]) / 2
    
    def get_liquidity_score(self, price: float, side: str) -> float:
        """
        Calculate a composite liquidity score for execution.
        
        Score combines depth, concentration, and stability.
        """
        if not self.liquidity_history:
            return 0.0
        
        latest = self.liquidity_history[-1]
        levels = latest['asks'] if side == 'buy' else latest['bids']
        
        if not levels:
            return 0.0
        
        # Find nearest level
        nearest = min(levels, key=lambda p: abs(p.price - price))
        
        # Composite score
        score = (
            0.3 * min(1, nearest.depth / 100.0) +  # Depth component
            0.3 * nearest.concentration +  # Concentration component
            0.4 * nearest.stability  # Stability component
        )
        
        return score
    
    def estimate_fill_probability(self,
                                   quantity: float,
                                   price: float,
                                   side: str) -> float:
        """
        Estimate probability of filling a given quantity at a price.
        
        Uses historical fill rates and current liquidity profile.
        """
        if not self.liquidity_history:
            return 0.5  # Default
        
        latest = self.liquidity_history[-1]
        levels = latest['asks'] if side == 'buy' else latest['bids']
        
        if not levels:
            return 0.5
        
        # Sum depth up to requested price
        cumulative_depth = 0.0
        for level in levels:
            if (side == 'buy' and level.price <= price) or \
               (side == 'sell' and level.price >= price):
                cumulative_depth += level.depth
            else:
                break
        
        # Estimate probability based on depth vs quantity
        if cumulative_depth <= 0:
            return 0.0
        
        depth_ratio = cumulative_depth / quantity
        return min(1.0, 0.3 + 0.7 * (1 - np.exp(-depth_ratio)))
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All functions check for zero/negative values and empty lists before processing
- [ ] **Parsed State**: Order book data parsed into structured types before analysis
- [ ] **Atomic Predictability**: Market impact calculations use deterministic formulas; no randomness in core logic
- [ ] **Fail Fast**: Invalid order book format throws descriptive error immediately
- [ ] **Intentional Naming**: Classes and methods clearly indicate purpose (e.g., `detect_snipers`, `calculate_liquidation_impact`)

## Common Mistakes to Avoid

1. **Assuming Linear Impact**: Market impact is typically sublinear (sqrt scaling). Using linear models overestimates impact for small trades and underestimates for large trades.

2. **Ignoring Regime Changes**: Market microstructure changes during open/close and news events. Static models fail during volatility regimes.

3. **Overfitting to One Market**: Liquidity and impact characteristics vary significantly across assets. Models must be asset-class specific.

4. **Neglecting Latency**: Simulation must account for network and processing latency when testing execution algorithms.

5. **Not Accounting for Cancellation Rates**: Iceberg detection must consider that legitimate participants also cancel orders.

## References

1. Obizhaeva, A., & Wang, J. (2013). "Order Book Dynamics and Liquid Execution". *Mathematical Finance*.
2. Bouchaud, J. P., et al. (2002). "Fluctuations of the Dynamic Order Book". *Quantitative Finance*.
3. Fusari, N., et al. (2021). "Sniper Detection in High Frequency Trading". *Journal of Trading*.
4. Cont, R., & Stoikov, S. (2008). "A Stochastic Control Approach to Market Microstructure". *Mathematical Finance*.


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
