---
name: trading-fundamentals-market-structure
description: Market Structure and Trading Participants Analysis
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: analysis, fundamentals market structure, fundamentals-market-structure,
    participants, trading
---


**Role:** Market Microstructure Analyst — implements comprehensive market structure analysis to understand how trading venues, order types, and participant behaviors influence price formation and execution quality.

**Philosophy:** Venue-Aware Trading — successful trading requires understanding the architecture of financial markets; different venues and participants create unique microstructures that affect slippage, liquidity, and execution quality.

## Key Principles

1. **Venue Hierarchy**: Markets consist of multiple venues (exchanges, ECNs, dark pools) with different liquidity profiles, fee structures, and participant types.

2. **Order Type Dynamics**: Different order types (market, limit, stop, iceberg, hidden) serve distinct purposes and interact uniquely with market microstructure.

3. **Participant Classification**: Market participants include market makers, liquidity providers, arbitrageurs, institutional traders, and retail investors—each with distinct behaviors.

4. **Regulatory Framework**: Regulations like Reg ATS, Regulation NMS, and MiFID II shape market structure, fair access, and transparency requirements.

5. **Price Discovery Mechanism**: Price formation results from the interaction of order flow, inventory management, and arbitrage across venues.

## Implementation Guidelines

### Structure
- Core logic: `skills/trading-fundamentals/market_structure.py`
- Venue data: `skills/trading-fundamentals/venue_data.py`
- Tests: `skills/tests/test_market_structure.py`

### Patterns to Follow
- Implement market structure as a modular analysis framework
- Support multiple regulatory frameworks (US, EU, global)
- Include venue comparison and routing optimization
- Provide participant behavior modeling
- Use data structures for venue and participant classification

## Adherence Checklist
Before completing your task, verify:
- [ ] **Venue Classification**: Are trading venues correctly classified by type and function?
- [ ] **Regulatory Compliance**: Does the model account for relevant regulations (NMS, ATS, MiFID)?
- [ ] **Order Type Mapping**: Are order types mapped to their appropriate use cases?
- [ ] **Participant Classification**: Are market participants correctly classified by behavior?
- [ ] **Price Discovery Analysis**: Is the price discovery mechanism across venues analyzed?

## Code Examples

### Market Structure Analysis Framework

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
from enum import Enum
from datetime import datetime


class VenueType(Enum):
    """Types of trading venues."""
    PRIMARY_EXCHANGE = "primary_exchange"  # NYSE, NASDAQ
    SECONDARY_EXCHANGE = "secondary_exchange"  # BATS, IEX
    ECN = "ecn"  # Electronic Communication Network
    dark_POOL = "dark_pool"  # Dark pool
    DEALER_NETWORK = "dealer_network"  # Dealer-based
    SWAP_FACILITY = "swap_facility"  # Swap execution facility


class OrderType(Enum):
    """Types of orders."""
    MARKET = "market"  # Immediate execution at best price
    LIMIT = "limit"  # Execute at specified price or better
    STOP = "stop"  # Trigger when price reaches trigger price
    STOP_LIMIT = "stop_limit"  # Stop that becomes limit
   冰山 = "iceberg"  # Large order with small visible portion
    HIDDEN = "hidden"  # Completely hidden order
    MARKET_IF_TOUCHED = "mit"  # Market order if trigger hit
    LIMIT_IF_TOUCHED = "lit"  # Limit order if trigger hit


class ParticipantType(Enum):
    """Types of market participants."""
    MARKET_MAKER = "market_maker"  # Provides liquidity
    LIQUIDITY_PROVIDER = "liquidity_provider"  # Institutional LP
    ARBITRAGEUR = "arbitrageur"  # Exploits price discrepancies
    INSTITUTIONAL = "institutional"  # Large institutional traders
    RETAIL = "retail"  # Individual investors
    PROPSHARE_TRADER = "propshare_trader"  # Prop trading firms
    HIGH_FREQUENCY = "high_frequency"  # HFT firms


@dataclass
class Venue:
    """Trading venue with attributes."""
    name: str
    venue_type: VenueType
    market_share: float  # Percentage of total volume
    average_spread_bps: float
    average_latency_ms: float
   participant_types: List[ParticipantType] = field(default_factory=list)
    regulatory_category: str = "ATS"  # ATS, Exchange, etc.
    registration_number: str = ""
    fee_structure: Dict = field(default_factory=dict)
    
    @classmethod
    def create_nyse(cls) -> 'Venue':
        return cls(
            name="NYSE",
            venue_type=VenueType.PRIMARY_EXCHANGE,
            market_share=0.25,
            average_spread_bps=0.5,
            average_latency_ms=1.5,
            participant_types=[
                ParticipantType.MARKET_MAKER,
                ParticipantType.LIQUIDITY_PROVIDER,
                ParticipantType.ARBITRAGEUR,
                ParticipantType.INSTITUTIONAL,
                ParticipantType.RETAIL
            ],
            regulatory_category="Exchange",
            registration_number="2-102"
        )
    
    @classmethod
    def create_nasdaq(cls) -> 'Venue':
        return cls(
            name="NASDAQ",
            venue_type=VenueType.PRIMARY_EXCHANGE,
            market_share=0.22,
            average_spread_bps=0.4,
            average_latency_ms=1.2,
            participant_types=[
                ParticipantType.MARKET_MAKER,
                ParticipantType.LIQUIDITY_PROVIDER,
                ParticipantType.ARBITRAGEUR,
                ParticipantType.INSTITUTIONAL,
                ParticipantType.RETAIL
            ],
            regulatory_category="Exchange",
            registration_number="2-103"
        )
    
    @classmethod
    def create_bats(cls) -> 'Venue':
        return cls(
            name="BATS",
            venue_type=VenueType.SECONDARY_EXCHANGE,
            market_share=0.12,
            average_spread_bps=0.3,
            average_latency_ms=0.8,
            participant_types=[
                ParticipantType.LIQUIDITY_PROVIDER,
                ParticipantType.ARBITRAGEUR,
                ParticipantType.PROPSHARE_TRADER,
                ParticipantType.HIGH_FREQUENCY
            ],
            regulatory_category="ATS",
            registration_number="2-301"
        )
    
    @classmethod
    def create_cboe(cls) -> 'Venue':
        return cls(
            name="CBOE",
            venue_type=VenueType.SECONDARY_EXCHANGE,
            market_share=0.10,
            average_spread_bps=0.35,
            average_latency_ms=0.9,
            participant_types=[
                ParticipantType.LIQUIDITY_PROVIDER,
                ParticipantType.ARBITRAGEUR,
                ParticipantType.PROPSHARE_TRADER,
                ParticipantType.HIGH_FREQUENCY
            ],
            regulatory_category="ATS",
            registration_number="2-302"
        )
    
    @classmethod
    def create_dark_pool(cls, name: str = "DarkPool", share: float = 0.08) -> 'Venue':
        return cls(
            name=name,
            venue_type=VenueType.dark_POOL,
            market_share=share,
            average_spread_bps=0.1,
            average_latency_ms=5.0,
            participant_types=[
                ParticipantType.INSTITUTIONAL,
                ParticipantType.ARBITRAGEUR
            ],
            regulatory_category="ATS",
            registration_number="2-401"
        )


@dataclass
class MarketParticipant:
    """Market participant with behavior characteristics."""
    participant_type: ParticipantType
    market_share: float
    avg_daily_volume: float
    order_size_bps: float
    order_frequency: float  # Orders per day
    latency_ms: float
    strategy_type: str = "market_making"
    
    @classmethod
    def create_market_maker(cls, name: str = "MM_Firm") -> 'MarketParticipant':
        return cls(
            participant_type=ParticipantType.MARKET_MAKER,
            market_share=0.15,
            avg_daily_volume=50000000,
            order_size_bps=0.5,
            order_frequency=10000,
            latency_ms=0.5,
            strategy_type="market_making"
        )
    
    @classmethod
    def create_arbitrageur(cls, name: str = "Arb_Fund") -> 'MarketParticipant':
        return cls(
            participant_type=ParticipantType.ARBITRAGEUR,
            market_share=0.05,
            avg_daily_volume=10000000,
            order_size_bps=5.0,
            order_frequency=500,
            latency_ms=1.0,
            strategy_type="statistical_arbitrage"
        )
    
    @classmethod
    def create_institutional(cls, name: str = "Institutional") -> 'MarketParticipant':
        return cls(
            participant_type=ParticipantType.INSTITUTIONAL,
            market_share=0.30,
            avg_daily_volume=200000000,
            order_size_bps=50.0,
            order_frequency=100,
            latency_ms=5.0,
            strategy_type="portfolio_rebalancing"
        )
    
    @classmethod
    def create_high_frequency(cls, name: str = "HFT_Firm") -> 'MarketParticipant':
        return cls(
            participant_type=ParticipantType.HIGH_FREQUENCY,
            market_share=0.25,
            avg_daily_volume=100000000,
            order_size_bps=1.0,
            order_frequency=50000,
            latency_ms=0.1,
            strategy_type="market_microstructure"
        )


class MarketStructureAnalyzer:
    """
    Comprehensive market structure analysis framework.
    Analyzes venue hierarchy, participant behavior, and price discovery.
    """
    
    def __init__(self, venues: List[Venue] = None, participants: List[MarketParticipant] = None):
        """
        Initialize market structure analyzer.
        
        Args:
            venues: List of trading venues
            participants: List of market participants
        """
        self.venues = venues or [
            Venue.create_nyse(),
            Venue.create_nasdaq(),
            Venue.create_bats(),
            Venue.create_cboe(),
            Venue.create_dark_pool("QuantConnect", 0.05),
            Venue.create_dark_pool("Liquidnet", 0.03)
        ]
        self.participants = participants or [
            MarketParticipant.create_market_maker(),
            MarketParticipant.create_arbitrageur(),
            MarketParticipant.create_institutional(),
            MarketParticipant.create_high_frequency()
        ]
        
        self.price_discovery_map = {}  # Maps venues to their price discovery role
    
    def get_venue_hierarchy(self) -> Dict[str, List[str]]:
        """
        Get venue hierarchy by liquidity and priority.
        
        Returns:
            Dictionary mapping priority levels to venue names
        """
        # Sort venues by market share
        sorted_venues = sorted(self.venues, key=lambda v: v.market_share, reverse=True)
        
        hierarchy = {}
        for i, venue in enumerate(sorted_venues):
            priority = min(i // 2 + 1, 5)  # Group into 5 priority levels
            if priority not in hierarchy:
                hierarchy[priority] = []
            hierarchy[priority].append(venue.name)
        
        return hierarchy
    
    def get_venue_by_type(self) -> Dict[str, List[str]]:
        """Get venues grouped by type."""
        by_type = {}
        for venue in self.venues:
            if venue.venue_type.value not in by_type:
                by_type[venue.venue_type.value] = []
            by_type[venue.venue_type.value].append(venue.name)
        return by_type
    
    def calculate_venue_compatibility(self,
                                     venue: Venue,
                                     participant_type: ParticipantType) -> float:
        """
        Calculate compatibility score between venue and participant type.
        
        Args:
            venue: The venue
            participant_type: The participant type
            
        Returns:
            Compatibility score (0-1)
        """
        if participant_type not in venue.participant_types:
            return 0.0
        
        # Base compatibility
        compatibility = 0.5
        
        # Adjust based on latency (lower is better)
        latency_score = max(0, 1 - venue.average_latency_ms / 50)
        compatibility += latency_score * 0.2
        
        # Adjust based on spread (lower is better)
        spread_score = max(0, 1 - venue.average_spread_bps / 5)
        compatibility += spread_score * 0.2
        
        # Adjust based on market share (higher is better for liquidity)
        share_score = venue.market_share / 0.3
        compatibility += share_score * 0.1
        
        return min(compatibility, 1.0)
    
    def analyze_venue_competition(self) -> pd.DataFrame:
        """
        Analyze competition between venues.
        
        Returns:
            DataFrame with venue comparison
        """
        data = []
        for venue in self.venues:
            row = {
                'venue': venue.name,
                'type': venue.venue_type.value,
                'market_share': venue.market_share,
                'spread_bps': venue.average_spread_bps,
                'latency_ms': venue.average_latency_ms,
                'participant_count': len(venue.participant_types),
                'regulatory_category': venue.regulatory_category
            }
            data.append(row)
        
        return pd.DataFrame(data)
    
    def get_price_discovery_venues(self, n: int = 3) -> List[str]:
        """
        Get venues that drive price discovery.
        Typically primary exchanges and high-liquidity ECNs.
        
        Args:
            n: Number of venues to return
            
        Returns:
            List of venue names
        """
        # Price discovery venues have high market share and liquidity
        return [v.name for v in sorted(self.venues, key=lambda x: x.market_share, reverse=True)[:n]]
    
    def calculate_market_concentration(self) -> Dict:
        """
        Calculate market concentration metrics.
        
        Returns:
            Dictionary with concentration metrics
        """
        shares = [v.market_share for v in self.venues]
        total_volume = sum(shares)
        
        # Market share percentages
        share_pct = [s / total_volume * 100 for s in shares]
        
        # Herfindahl-Hirschman Index (HHI)
        hhi = sum(s ** 2 for s in share_pct)
        
        # Top 4 concentration
        share_pct_sorted = sorted(share_pct, reverse=True)
        top_4_concentration = sum(share_pct_sorted[:4])
        
        # Top 10 concentration
        top_10_concentration = sum(share_pct_sorted[:10] if len(share_pct_sorted) >= 10 else share_pct_sorted)
        
        return {
            'hhi': hhi,
            'top_4_concentration': top_4_concentration,
            'top_10_concentration': top_10_concentration,
            'venue_count': len(self.venues),
            'market_shares': {v.name: v.market_share * 100 for v in self.venues}
        }
```

### Order Routing and Venue Selection Model

```python
class OrderRouter:
    """
    Smart order router that selects optimal venues based on market structure.
    """
    
    def __init__(self, market_structure: MarketStructureAnalyzer):
        self.structure = market_structure
        self.current_inventory = {}  # Current positions by venue
    
    def route_order(self,
                   symbol: str,
                   quantity: int,
                   order_type: OrderType,
                   side: str,
                   time_limit_ms: float = 100,
                   max_slippage_bps: float = 10.0) -> Dict:
        """
        Route an order to optimal venues.
        
        Args:
            symbol: Trading symbol
            quantity: Order quantity
            order_type: Type of order
            side: 'buy' or 'sell'
            time_limit_ms: Time limit for execution
            max_slippage_bps: Maximum acceptable slippage
            
        Returns:
            Dictionary with routing plan
        """
        # Get venue scores
        venue_scores = {}
        for venue in self.structure.venues:
            score = self._calculate_venue_score(venue, side, quantity)
            venue_scores[venue.name] = score
        
        # Sort venues by score
        sorted_venues = sorted(venue_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Create routing plan
        plan = []
        remaining = quantity
        
        for venue_name, score in sorted_venues:
            if remaining <= 0:
                break
            
            venue = next(v for v in self.structure.venues if v.name == venue_name)
            
            # Calculate allocation
            allocation = min(remaining, int(quantity * venue.market_share * 1.5))
            
            if allocation > 0:
                plan.append({
                    'venue': venue_name,
                    'allocation': allocation,
                    'score': score,
                    'expected_spread_bps': venue.average_spread_bps,
                    'estimated_latency_ms': venue.average_latency_ms
                })
                remaining -= allocation
        
        # Check if plan meets constraints
        total_latency = sum(p['estimated_latency_ms'] for p in plan)
        is_feasible = total_latency <= time_limit_ms
        
        return {
            'symbol': symbol,
            'total_quantity': quantity,
            'order_type': order_type.value,
            'side': side,
            'time_limit_ms': time_limit_ms,
            'max_slippage_bps': max_slippage_bps,
            'is_feasible': is_feasible,
            'routing_plan': plan,
            'total_expected_latency_ms': total_latency,
            'expected_execution_quality': 'Good' if is_feasible else 'Caution'
        }
    
    def _calculate_venue_score(self,
                               venue: Venue,
                               side: str,
                               quantity: int) -> float:
        """
        Calculate score for a venue.
        
        Args:
            venue: The venue
            side: Order side
            quantity: Order quantity
            
        Returns:
            Score (0-100)
        """
        score = 0
        
        # Market share component (20 points)
        score += venue.market_share * 20
        
        # Spread component (30 points) - lower is better
        score += (1 - venue.average_spread_bps / 10) * 30
        
        # Latency component (20 points) - lower is better
        score += (1 - venue.average_latency_ms / 50) * 20
        
        # Inventory compatibility (30 points)
        current_inv = self.current_inventory.get(venue.name, 0)
        if (side == 'buy' and current_inv < 0) or (side == 'sell' and current_inv > 0):
            # Favorable inventory for this side
            score += 30
        elif (side == 'buy' and current_inv > 0) or (side == 'sell' and current_inv < 0):
            # Opposing inventory - penalize
            score += 10
        else:
            score += 20
        
        return min(score, 100)
    
    def update_inventory(self, venue: str, symbol: str, delta: int):
        """Update inventory after a trade."""
        key = f"{venue}_{symbol}"
        self.current_inventory[key] = self.current_inventory.get(key, 0) + delta


# Regulatory Compliance Analyzer
class RegulatoryAnalyzer:
    """
    Analyze regulatory compliance for venues and participants.
    """
    
    def __init__(self):
        self.regulations = {
            'NMS': {
                'description': 'National Market System',
                'key_rules': [
                    'Rule 605: Quote and trade publication',
                    'Rule 606: Order routing disclosure',
                    'Rule 610: Access to market data',
                    'Rule 612: Best execution'
                ],
                'applicable_to': ['NYSE', 'NASDAQ', 'ECNs', 'Dark Pools']
            },
            'ATS': {
                'description': 'Alternative Trading System',
                'key_rules': [
                    'Registration as broker-dealer',
                    'Form ATS filing',
                    'Fair access requirements',
                    'Equity rules applicability'
                ],
                'applicable_to': ['Dark Pools', 'ECNs']
            },
            'MiFID II': {
                'description': 'Markets in Financial Instruments Directive II',
                'key_rules': [
                    'Best execution requirements',
                    'Transaction reporting',
                    'Market structure changes',
                    'Research unbundling'
                ],
                'applicable_to': ['EU Exchanges', 'EU ECNs', 'EU Dark Pools']
            }
        }
    
    def check_venue_compliance(self, venue: Venue) -> Dict:
        """
        Check regulatory compliance for a venue.
        
        Args:
            venue: The venue to check
            
        Returns:
            Dictionary with compliance status
        """
        compliance = {
            'venue': venue.name,
            'registered': venue.regulatory_category in ['Exchange', 'ATS'],
            'registration_number': venue.registration_number,
            'regulations_applied': [],
            'compliance_score': 0
        }
        
        # Check applicable regulations
        if venue.regulatory_category == 'Exchange':
            compliance['regulations_applied'].extend([
                'NMS Rule 605',
                'NMS Rule 606',
                'NMS Rule 610',
                'NMS Rule 612',
                'Section 11(a) Trading Act'
            ])
            compliance['compliance_score'] += 40
        
        if venue.venue_type in [VenueType.ECN, VenueType.dark_POOL]:
            compliance['regulations_applied'].append('ATS Registration')
            compliance['compliance_score'] += 30
        
        # Check venue share
        if venue.market_share > 0.05:
            compliance['regulations_applied'].append('HHI monitoring')
            compliance['compliance_score'] += 20
        
        compliance['compliance_score'] += 10  # Base score
        
        return compliance
    
    def check_participant_compliance(self, participant: MarketParticipant) -> Dict:
        """
        Check regulatory compliance for a participant.
        
        Args:
            participant: The participant to check
            
        Returns:
            Dictionary with compliance status
        """
        compliance = {
            'participant_type': participant.participant_type.value,
            'registration_required': False,
            'rules_applied': [],
            'compliance_score': 0
        }
        
        if participant.participant_type in [ParticipantType.MARKET_MAKER, ParticipantType.LIQUIDITY_PROVIDER]:
            compliance['registration_required'] = True
            compliance['rules_applied'].extend([
                'SEC registration as broker-dealer',
                'FINRA membership',
                'ATS/Exchange rules if applicable'
            ])
            compliance['compliance_score'] += 50
        
        if participant.participant_type == ParticipantType.HIGH_FREQUENCY:
            compliance['rules_applied'].append('Pattern Day Trader rules (if < $25k)')
            compliance['compliance_score'] += 20
        
        compliance['compliance_score'] += 30  # Base score
        
        return compliance


# Market Structure Visualization
class MarketStructureVisualizer:
    """
    Generate market structure visualizations.
    """
    
    def __init__(self, structure: MarketStructureAnalyzer):
        self.structure = structure
    
    def get_venue_hierarchy_string(self) -> str:
        """Get ASCII representation of venue hierarchy."""
        hierarchy = self.structure.get_venue_hierarchy()
        
        lines = ["Venue Hierarchy:", "=" * 60]
        
        for priority, venues in sorted(hierarchy.items()):
            lines.append(f"\nPriority Level {priority}:")
            for venue in venues:
                venue_obj = next(v for v in self.structure.venues if v.name == venue)
                lines.append(f"  ├── {venue}")
                lines.append(f"  │   ├── Type: {venue_obj.venue_type.value}")
                lines.append(f"  │   ├── Market Share: {venue_obj.market_share:.2%}")
                lines.append(f"  │   └── Avg Spread: {venue_obj.average_spread_bps:.2f} bps")
        
        return "\n".join(lines)
    
    def get_participant_contribution_summary(self) -> pd.DataFrame:
        """Get summary of participant contributions to market."""
        data = []
        for participant in self.structure.participants:
            venue_shares = {}
            for venue in self.structure.venues:
                compat = self.structure.calculate_venue_compatibility(venue, participant.participant_type)
                if compat > 0.3:
                    venue_shares[venue.name] = participant.market_share * compat
            
            data.append({
                'participant': participant.participant_type.value,
                'market_share': participant.market_share,
                'avg_daily_volume': f"${participant.avg_daily_volume/1e6:.1f}M",
                'avg_order_size_bps': f"{participant.order_size_bps:.1f}%",
                'order_frequency': f"{participant.order_frequency}/day",
                'venue_access': len(venue_shares),
                'primary_venues': ", ".join(sorted(venue_shares.keys(), key=lambda x: venue_shares[x], reverse=True)[:3])
            })
        
        return pd.DataFrame(data)
```
