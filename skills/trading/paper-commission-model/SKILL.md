---
name: commission-model
description: '"Implements commission model and fee structure simulation for risk management
  and algorithmic trading execution."'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: cloud infrastructure, paper commission model, paper-commission-model,
    simulation, structure
  related-skills: fundamentals-market-regimes, fundamentals-trading-plan, paper-market-impact
---



**Role:** Cost Analysis Specialist — implements comprehensive fee models to accurately calculate trading costs including commissions, exchange fees, clearing fees, and tax lot tracking for realistic backtesting and performance attribution.

**Philosophy:** Cost Transparency — every trade cost must be accounted for in performance calculations; hidden or underestimated fees lead to false confidence in strategy viability.

## Key Principles

1. **Fee Structure Accuracy**: Different brokers, exchanges, and clearing firms have distinct fee structures; models must support multiple fee schedules.

2. **Tax Lot Tracking**: Cost basis tracking using methods (FIFO, LIFO, HIFO, AVG) significantly impacts tax liability and should be simulated.

3. **Volume-Based Pricing**: Commission rates often decrease with trading volume; models must track cumulative volume for tiered pricing.

4. **Regulatory Fees**: SEC, FINRA, and other regulatory fees add to trading costs; these must be included for realistic cost projection.

5. ** Rebate Optimization**: Some trades generate rebates (market making, liquidity provision); models should identify rebate-eligible trades.

## Implementation Guidelines

### Structure
- Core logic: `skills/paper-trading/commission_model.py`
- Fee structure definitions: `skills/paper-trading/fee_structures.py`
- Tests: `skills/tests/test_commission_model.py`

### Patterns to Follow
- Implement fee calculation as modular components
- Support multiple fee structures (broker-specific)
- Include tax lot tracking with multiple cost basis methods
- Provide fee breakdown by component
- Use vectorized operations for efficient batch calculations

## Adherence Checklist
Before completing your task, verify:
- [ ] **Tiered Pricing**: Are commission rates correctly applied based on volume tiers?
- [ ] **Exchange Fees**: Are exchange and clearing fees properly calculated?
- [ ] **Regulatory Fees**: Are SEC, FINRA, and other regulatory fees included?
- [ ] **Tax Lot Tracking**: Is cost basis tracked using the specified method (FIFO/LIFO/etc)?
- [ ] **Rebate Identification**: Are rebate-eligible trades correctly identified?

## Code Examples

### Commission Model Framework

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
from enum import Enum
from datetime import datetime
from collections import defaultdict


class CostBasisMethod(Enum):
    """Cost basis calculation methods for tax purposes."""
    FIFO = "fifo"      # First-In, First-Out
    LIFO = "lifo"      # Last-In, First-Out
    HIFO = "hifo"      # Highest-In, First-Out (tax optimization)
    AVG = "avg"        # Average Cost


@dataclass
class FeeStructure:
    """Fee structure for a broker or exchange."""
    # Commission fees
    per_share_commission: float = 0.005  # Per share
    per_contract_commission: float = 0.65  # Per options contract
    per_trade_commission: float = 0.0  # Per trade (flat fee)
    
    # Percentage-based
    percent_commission: float = 0.0  # Percentage of trade value
    
    # Exchange fees
    sec_fee: float = 0.0000221  # SEC fee on sales
    finra_fee: float = 0.000119  # FINRA trading activity fee
    taf_fee: float = 0.00016  # TAF fee
    
    # Clearing fees
    clearing_fee: float = 0.02  # Per options contract
    clearing_commission: float = 0.001  # Per share clearing fee
    
    # Rebates (negative fees)
    liquidity_rebate: float = 0.00018  # Rebate for liquidity provision
    maker_rebate: float = 0.0001  # Maker rebate
    
    # Minimum/maximum fees
    min_commission: float = 0.0
    max_commission: float = float('inf')
    min_sec_fee: float = 0.01
    max_sec_fee: float = float('inf')
    
    # Volume-based tiers
    volume_tiers: List[Tuple[int, float]] = field(default_factory=list)
    
    # Instruments
    supported_instruments: List[str] = field(default_factory=lambda: ['stock', 'option', 'etf'])
    
    @classmethod
    def schwab_direct(cls) -> 'FeeStructure':
        """Charles Schwab Direct fee structure."""
        return cls(
            per_share_commission=0.0,
            per_contract_commission=0.65,
            per_trade_commission=0.0,
            percent_commission=0.0,
            sec_fee=0.0000221,
            finra_fee=0.000119,
            taf_fee=0.00016,
            clearing_fee=0.0,
            liquidity_rebate=0.00018,
            min_commission=0.0
        )
    
    @classmethod
    def ibkr_pro(cls) -> 'FeeStructure':
        """Interactive Brokers Professional fee structure."""
        return cls(
            per_share_commission=0.005,
            per_contract_commission=0.65,
            per_trade_commission=0.0,
            percent_commission=0.0035,
            sec_fee=0.0000221,
            finra_fee=0.000119,
            taf_fee=0.00016,
            clearing_fee=0.02,
            liquidity_rebate=0.00018,
            min_commission=1.0,
            max_commission=10.0,
            volume_tiers=[
                (0, 0.005),
                (100000, 0.004),
                (1000000, 0.003),
                (10000000, 0.002),
                (100000000, 0.001)
            ]
        )
    
    @classmethod
    def tradestation(cls) -> 'FeeStructure':
        """TradeStation fee structure."""
        return cls(
            per_share_commission=0.005,
            per_contract_commission=0.50,
            per_trade_commission=0.0,
            percent_commission=0.0,
            sec_fee=0.0000221,
            finra_fee=0.000119,
            taf_fee=0.00016,
            clearing_fee=0.02,
            liquidity_rebate=0.00018,
            min_commission=0.0,
            max_commission=6.95
        )


@dataclass
class TradeRecord:
    """Record of a single trade."""
    timestamp: datetime
    symbol: str
    quantity: int
    price: float
    order_type: str  # 'buy', 'sell', 'short', 'cover'
    instrument_type: str  # 'stock', 'option', 'etf'
    commission: float = 0.0
    sec_fee: float = 0.0
    finra_fee: float = 0.0
    taf_fee: float = 0.0
    clearing_fee: float = 0.0
    total_fees: float = 0.0
    net_cost: float = 0.0


@dataclass
class TaxLot:
    """Tax lot tracking for cost basis."""
    entry_timestamp: datetime
    symbol: str
    quantity: int
    price: float
    cost_basis: float
    lot_id: str
    method: CostBasisMethod


class CommissionCalculator:
    """
    Comprehensive fee calculator supporting multiple fee structures
    and tax lot tracking.
    """
    
    def __init__(self, 
                 fee_structure: FeeStructure,
                 cost_basis_method: CostBasisMethod = CostBasisMethod.FIFO):
        """
        Initialize commission calculator.
        
        Args:
            fee_structure: Fee structure to use
            cost_basis_method: Method for calculating cost basis
        """
        self.fee_structure = fee_structure
        self.cost_basis_method = cost_basis_method
        
        # Track cumulative volumes for tiered pricing
        self.cumulative_volume = 0.0
        self.cumulative_volume_window_start = None
        
        # Tax lots tracking
        self.tax_lots: Dict[str, List[TaxLot]] = defaultdict(list)
        
        # Current inventory
        self.inventory: Dict[str, int] = defaultdict(int)
    
    def calculate_commission(self, 
                             quantity: int,
                             price: float,
                             instrument_type: str = 'stock') -> float:
        """
        Calculate commission for a trade.
        
        Args:
            quantity: Trade quantity
            price: Trade price
            instrument_type: Type of instrument
            
        Returns:
            Commission amount
        """
        # Check volume tiers
        commission_rate = self.fee_structure.per_share_commission
        
        if self.fee_structure.volume_tiers:
            for threshold, rate in self.fee_structure.volume_tiers:
                if self.cumulative_volume >= threshold:
                    commission_rate = rate
        
        # Calculate commission
        if instrument_type == 'stock':
            commission = commission_rate * quantity
        elif instrument_type == 'option':
            commission = self.fee_structure.per_contract_commission * (quantity // 100)
        else:
            commission = commission_rate * quantity
        
        # Apply percentage commission if higher
        percent_commission = self.fee_structure.percent_commission * (quantity * price)
        commission = max(commission, percent_commission)
        
        # Apply min/max constraints
        commission = max(self.fee_structure.min_commission, 
                        min(commission, self.fee_structure.max_commission))
        
        commission = max(self.fee_structure.min_commission, commission)
        
        return commission
    
    def calculate_exchange_fees(self, 
                                quantity: int,
                                price: float,
                                is_sale: bool = False) -> Dict[str, float]:
        """
        Calculate exchange and regulatory fees.
        
        Args:
            quantity: Trade quantity
            price: Trade price
            is_sale: Whether this is a sale (for SEC fee)
            
        Returns:
            Dictionary of fees
        """
        fees = {
            'sec': 0.0,
            'finra': 0.0,
            'taf': 0.0
        }
        
        if is_sale:
            # SEC fee (0.00221% of sale value)
            sec_fee = self.fee_structure.sec_fee * (quantity * price)
            sec_fee = max(self.fee_structure.min_sec_fee, sec_fee)
            sec_fee = min(sec_fee, self.fee_structure.max_sec_fee)
            fees['sec'] = sec_fee
        
        # FINRA TAF fee (0.0119% for stocks)
        if self.fee_structure.finra_fee > 0:
            fees['finra'] = self.fee_structure.finra_fee * (quantity * price)
        
        # TAF fee (0.016% for stocks)
        if self.fee_structure.taf_fee > 0:
            fees['taf'] = self.fee_structure.taf_fee * (quantity * price)
        
        return fees
    
    def calculate_clearing_fees(self,
                                quantity: int,
                                instrument_type: str = 'stock') -> float:
        """
        Calculate clearing fees.
        
        Args:
            quantity: Trade quantity
            instrument_type: Type of instrument
            
        Returns:
            Clearing fee amount
        """
        if instrument_type == 'option':
            return self.fee_structure.clearing_fee * (quantity // 100)
        elif instrument_type == 'stock':
            return self.fee_structure.clearing_commission * quantity
        return 0.0
    
    def calculate_liquidity_rebate(self,
                                   quantity: int,
                                   price: float,
                                   is_maker: bool = False) -> float:
        """
        Calculate liquidity rebate.
        
        Args:
            quantity: Trade quantity
            price: Trade price
            is_maker: Whether this trade provides liquidity
            
        Returns:
            Rebate amount (positive = credit)
        """
        if is_maker:
            return self.fee_structure.liquidity_rebate * (quantity * price)
        return 0.0
    
    def process_trade(self,
                      quantity: int,
                      price: float,
                      order_type: str,
                      instrument_type: str = 'stock',
                      timestamp: Optional[datetime] = None,
                      is_maker: bool = False) -> TradeRecord:
        """
        Process a trade and calculate all fees.
        
        Args:
            quantity: Trade quantity
            price: Trade price
            order_type: Type of order (buy, sell, short, cover)
            instrument_type: Type of instrument
            timestamp: Trade timestamp
            is_maker: Whether this trade provides liquidity
            
        Returns:
            TradeRecord with all fee information
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        # Determine if this is a sale
        is_sale = order_type in ['sell', 'cover']
        
        # Calculate commission
        commission = self.calculate_commission(quantity, price, instrument_type)
        
        # Calculate exchange fees
        exchange_fees = self.calculate_exchange_fees(quantity, price, is_sale)
        
        # Calculate clearing fees
        clearing_fee = self.calculate_clearing_fees(quantity, instrument_type)
        
        # Calculate liquidity rebate
        rebate = self.calculate_liquidity_rebate(quantity, price, is_maker)
        
        # Total fees
        total_fees = (
            commission +
            exchange_fees['sec'] +
            exchange_fees['finra'] +
            exchange_fees['taf'] +
            clearing_fee -
            rebate
        )
        
        # Net cost (positive = cost, negative = credit)
        trade_value = quantity * price
        net_cost = trade_value + total_fees if order_type in ['buy', 'short'] else trade_value - total_fees
        
        # Update cumulative volume
        self.cumulative_volume += trade_value
        if self.cumulative_volume_window_start is None:
            self.cumulative_volume_window_start = timestamp
        
        # Create trade record
        trade = TradeRecord(
            timestamp=timestamp,
            symbol='',
            quantity=quantity,
            price=price,
            order_type=order_type,
            instrument_type=instrument_type,
            commission=commission,
            sec_fee=exchange_fees['sec'],
            finra_fee=exchange_fees['finra'],
            taf_fee=exchange_fees['taf'],
            clearing_fee=clearing_fee,
            total_fees=total_fees,
            net_cost=net_cost
        )
        
        # Update inventory and tax lots
        self._update_inventory(trade)
        
        return trade
    
    def _update_inventory(self, trade: TradeRecord):
        """Update inventory and tax lots after a trade."""
        if trade.order_type == 'buy':
            # Add to inventory and create tax lot
            lot = TaxLot(
                entry_timestamp=trade.timestamp,
                symbol='',
                quantity=trade.quantity,
                price=trade.price,
                cost_basis=trade.net_cost,
                lot_id=f"lot_{len(self.tax_lots)}",
                method=self.cost_basis_method
            )
            self.tax_lots[''].append(lot)
            self.inventory[''] += trade.quantity
            
        elif trade.order_type == 'sell':
            # Remove from inventory using cost basis method
            lots_to_remove = self._select_lots_to_remove(trade.quantity)
            for lot in lots_to_remove:
                lot_quantity = min(lot.quantity, trade.quantity)
                lot.quantity -= lot_quantity
                trade.quantity -= lot_quantity
                
        elif trade.order_type == 'short':
            # Short selling creates liability, tracked separately
            pass
            
        elif trade.order_type == 'cover':
            # Covering short positions
            pass
    
    def _select_lots_to_remove(self, quantity: int) -> List[TaxLot]:
        """Select tax lots to remove based on cost basis method."""
        all_lots = []
        for lots in self.tax_lots.values():
            all_lots.extend(lots)
        
        all_lots.sort(key=lambda x: x.entry_timestamp)
        
        selected = []
        remaining = quantity
        
        if self.cost_basis_method == CostBasisMethod.FIFO:
            for lot in all_lots:
                if lot.quantity > 0 and remaining > 0:
                    take = min(lot.quantity, remaining)
                    lot.quantity -= take
                    selected.append(TaxLot(
                        entry_timestamp=lot.entry_timestamp,
                        symbol=lot.symbol,
                        quantity=take,
                        price=lot.price,
                        cost_basis=lot.price * take,
                        lot_id=lot.lot_id,
                        method=self.cost_basis_method
                    ))
                    remaining -= take
                    
        elif self.cost_basis_method == CostBasisMethod.LIFO:
            for lot in reversed(all_lots):
                if lot.quantity > 0 and remaining > 0:
                    take = min(lot.quantity, remaining)
                    lot.quantity -= take
                    selected.append(TaxLot(
                        entry_timestamp=lot.entry_timestamp,
                        symbol=lot.symbol,
                        quantity=take,
                        price=lot.price,
                        cost_basis=lot.price * take,
                        lot_id=lot.lot_id,
                        method=self.cost_basis_method
                    ))
                    remaining -= take
                    
        elif self.cost_basis_method == CostBasisMethod.HIFO:
            all_lots.sort(key=lambda x: x.price, reverse=True)
            for lot in all_lots:
                if lot.quantity > 0 and remaining > 0:
                    take = min(lot.quantity, remaining)
                    lot.quantity -= take
                    selected.append(TaxLot(
                        entry_timestamp=lot.entry_timestamp,
                        symbol=lot.symbol,
                        quantity=take,
                        price=lot.price,
                        cost_basis=lot.price * take,
                        lot_id=lot.lot_id,
                        method=self.cost_basis_method
                    ))
                    remaining -= take
                    
        elif self.cost_basis_method == CostBasisMethod.AVG:
            # Average cost method - calculate weighted average
            total_cost = sum(lot.price * lot.quantity for lot in all_lots if lot.quantity > 0)
            total_qty = sum(lot.quantity for lot in all_lots if lot.quantity > 0)
            
            if total_qty > 0:
                avg_price = total_cost / total_qty
                take = min(total_qty, remaining)
                for lot in all_lots:
                    if lot.quantity > 0:
                        lot.quantity -= take // len(all_lots)
                        selected.append(TaxLot(
                            entry_timestamp=lot.entry_timestamp,
                            symbol=lot.symbol,
                            quantity=take // len(all_lots),
                            price=avg_price,
                            cost_basis=avg_price * (take // len(all_lots)),
                            lot_id=lot.lot_id,
                            method=self.cost_basis_method
                        ))
        
        return selected
    
    def reset_volume_tier(self, reset_date: Optional[datetime] = None):
        """Reset cumulative volume for tier calculation."""
        self.cumulative_volume = 0.0
        self.cumulative_volume_window_start = reset_date or datetime.now()
    
    def get_current_volume_tier(self) -> Tuple[int, float]:
        """Get current volume tier."""
        for threshold, rate in self.fee_structure.volume_tiers:
            if self.cumulative_volume >= threshold:
                return threshold, rate
        return 0, self.fee_structure.per_share_commission
```

### Fee Structure Repository for Multiple Brokers

```python
class FeeStructureRepository:
    """
    Repository of fee structures for multiple brokers and exchanges.
    """
    
    def __init__(self):
        self.structures = {}
        self._initialize_structures()
    
    def _initialize_structures(self):
        """Initialize known fee structures."""
        self.structures['schwab_direct'] = FeeStructure.schwab_direct()
        self.structures['ibkr_pro'] = FeeStructure.ibkr_pro()
        self.structures['tradestation'] = FeeStructure.tradestation()
        
        # Generic structures
        self.structures['discount_broker'] = FeeStructure(
            per_share_commission=0.005,
            per_contract_commission=0.65,
            percent_commission=0.0,
            min_commission=0.0,
            max_commission=9.99
        )
        
        self.structures['low_cost_broker'] = FeeStructure(
            per_share_commission=0.0035,
            per_contract_commission=0.50,
            percent_commission=0.0,
            min_commission=0.0,
            max_commission=6.95
        )
    
    def get_structure(self, name: str) -> FeeStructure:
        """Get fee structure by name."""
        if name not in self.structures:
            raise ValueError(f"Unknown fee structure: {name}")
        return self.structures[name]
    
    def list_structures(self) -> List[str]:
        """List all available fee structures."""
        return list(self.structures.keys())
    
    def create_custom_structure(self,
                                name: str,
                                per_share: float = 0.005,
                                per_contract: float = 0.65,
                                percent: float = 0.0,
                                min_commission: float = 0.0,
                                max_commission: float = float('inf'),
                                sec_fee: float = 0.0000221) -> FeeStructure:
        """Create a custom fee structure."""
        structure = FeeStructure(
            per_share_commission=per_share,
            per_contract_commission=per_contract,
            percent_commission=percent,
            min_commission=min_commission,
            max_commission=max_commission,
            sec_fee=sec_fee
        )
        self.structures[name] = structure
        return structure


# Fee Breakdown Report Generator
class FeeBreakdownReport:
    """
    Generate detailed fee breakdown reports for analysis.
    """
    
    def __init__(self, trades: List[TradeRecord], fee_structure: FeeStructure):
        self.trades = trades
        self.fee_structure = fee_structure
    
    def generate_breakdown(self) -> pd.DataFrame:
        """
        Generate fee breakdown by component.
        
        Returns:
            DataFrame with fee breakdown
        """
        if not self.trades:
            return pd.DataFrame()
        
        data = []
        for trade in self.trades:
            total_trade_value = trade.quantity * trade.price
            
            data.append({
                'timestamp': trade.timestamp,
                'symbol': trade.symbol,
                'quantity': trade.quantity,
                'price': trade.price,
                'trade_value': total_trade_value,
                'commission': trade.commission,
                'sec_fee': trade.sec_fee,
                'finra_fee': trade.finra_fee,
                'taf_fee': trade.taf_fee,
                'clearing_fee': trade.clearing_fee,
                'total_fees': trade.total_fees,
                'fees_as_percent': trade.total_fees / total_trade_value * 100 if total_trade_value > 0 else 0
            })
        
        return pd.DataFrame(data)
    
    def summarize_fees(self) -> Dict:
        """
        Summarize total fees and breakdown.
        
        Returns:
            Dictionary with fee summary
        """
        df = self.generate_breakdown()
        
        if df.empty:
            return {}
        
        summary = {
            'total_trades': len(df),
            'total_volume': df['trade_value'].sum(),
            'total_fees': df['total_fees'].sum(),
            'average_fees_per_trade': df['total_fees'].mean(),
            'average_fees_percent': df['fees_as_percent'].mean(),
            
            'commission_total': df['commission'].sum(),
            'sec_total': df['sec_fee'].sum(),
            'finra_total': df['finra_fee'].sum(),
            'taf_total': df['taf_fee'].sum(),
            'clearing_total': df['clearing_fee'].sum(),
            
            'commission_percent': df['commission'].sum() / df['total_fees'].sum() * 100 if df['total_fees'].sum() > 0 else 0,
            'sec_percent': df['sec_fee'].sum() / df['total_fees'].sum() * 100 if df['total_fees'].sum() > 0 else 0,
            'finra_percent': df['finra_fee'].sum() / df['total_fees'].sum() * 100 if df['total_fees'].sum() > 0 else 0
        }
        
        return summary
    
    def generate_fee_heatmap(self) -> pd.DataFrame:
        """
        Generate fee heatmap by day of week and hour.
        
        Returns:
            DataFrame with fee heatmap data
        """
        df = self.generate_breakdown()
        
        if df.empty:
            return pd.DataFrame()
        
        df['day_of_week'] = df['timestamp'].dt.day_name()
        df['hour'] = df['timestamp'].dt.hour
        
        # Pivot table for heatmap
        heatmap = df.pivot_table(
            values='total_fees',
            index='day_of_week',
            columns='hour',
            aggfunc='mean'
        )
        
        return heatmap


if __name__ == "__main__":
    # Example usage
    from datetime import timedelta
    
    # Create fee structure
    fee_structure = FeeStructure.schwab_direct()
    
    # Create calculator
    calculator = CommissionCalculator(fee_structure, CostBasisMethod.FIFO)
    
    # Simulate some trades
    trades = []
    base_time = datetime.now().replace(hour=9, minute=30)
    
    for i in range(10):
        quantity = np.random.choice([100, 500, 1000, 5000])
        price = 100 + np.random.uniform(-5, 5)
        is_buy = np.random.random() > 0.5
        
        order_type = 'buy' if is_buy else 'sell'
        
        trade = calculator.process_trade(
            quantity=quantity,
            price=price,
            order_type=order_type,
            instrument_type='stock',
            timestamp=base_time + timedelta(minutes=i*5)
        )
        trades.append(trade)
    
    # Generate report
    report = FeeBreakdownReport(trades, fee_structure)
    summary = report.summarize_fees()
    
    print("Commission and Fee Analysis")
    print("=" * 50)
    print(f"Total Trades: {summary['total_trades']}")
    print(f"Total Volume: ${summary['total_volume']:,.2f}")
    print(f"Total Fees: ${summary['total_fees']:,.2f}")
    print(f"Average Fees per Trade: ${summary['average_fees_per_trade']:.2f}")
    print(f"Average Fees (%): {summary['average_fees_percent']:.4f}%")
    print(f"\nFee Breakdown:")
    print(f"  Commission: ${summary['commission_total']:,.2f} ({summary['commission_percent']:.1f}%)")
    print(f"  SEC Fee: ${summary['sec_total']:,.2f} ({summary['sec_percent']:.1f}%)")
    print(f"  FINRA Fee: ${summary['finra_total']:,.2f} ({summary['finra_percent']:.1f}%)")
```

### Batch Trade Processing with Tiered Pricing

```python
class BatchTradeProcessor:
    """
    Process multiple trades efficiently with tiered pricing.
    """
    
    def __init__(self, fee_structure: FeeStructure, cost_basis_method: CostBasisMethod = CostBasisMethod.FIFO):
        self.calculator = CommissionCalculator(fee_structure, cost_basis_method)
    
    def process_trades(self, 
                      trades_df: pd.DataFrame,
                      batch_size: int = 100) -> pd.DataFrame:
        """
        Process trades in batches for efficiency.
        
        Args:
            trades_df: DataFrame of trades to process
            batch_size: Number of trades per batch
            
        Returns:
            DataFrame with processed trades and fees
        """
        results = []
        
        for i in range(0, len(trades_df), batch_size):
            batch = trades_df.iloc[i:i+batch_size]
            
            for _, trade_row in batch.iterrows():
                trade = self.calculator.process_trade(
                    quantity=int(trade_row['quantity']),
                    price=float(trade_row['price']),
                    order_type=trade_row['order_type'],
                    instrument_type=trade_row.get('instrument_type', 'stock'),
                    timestamp=trade_row.get('timestamp', datetime.now())
                )
                results.append(trade)
        
        return results
    
    def calculate_volume_tier_progress(self) -> Dict:
        """
        Calculate progress through volume tiers.
        
        Returns:
            Dictionary with tier progress
        """
        current_tier = self.calculator.get_current_volume_tier()
        tiers = self.calculator.fee_structure.volume_tiers
        
        progress = {
            'current_volume': self.calculator.cumulative_volume,
            'current_tier_threshold': current_tier[0],
            'current_tier_rate': current_tier[1],
            'next_tier_threshold': tiers[0][0] if tiers else 0,
            'remaining_to_next_tier': max(0, tiers[0][0] - self.calculator.cumulative_volume) if tiers else 0
        }
        
        return progress
```