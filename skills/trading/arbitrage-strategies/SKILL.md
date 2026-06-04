---
name: arbitrage-strategies
license: MIT
compatibility: opencode
metadata:
  archetypes: [trading, strategies, arbitrage]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: 1.0.0
  domain: trading
  triggers: arbitrage, trading strategies, how do I profit from arbitrage, arbitrage opportunities, moving average arbitrage
  role: implementation
  scope: implementation
  output-format: code
  related-skills: trading-risk-management, trading-technical-analysis
---

# Trading Arbitrage Strategies
Implements intelligent trading strategies focused on exploiting arbitrage opportunities across various financial markets. This skill guides the model in identifying profitable trading scenarios based on price discrepancies, utilizing historical data and real-time market feeds. 

## TL;DR Checklist
- [ ] Ensure data feeds are accurate and updated in real-time.
- [ ] Validate the existence of arbitrage opportunities before executing trades.
- [ ] Implement risk management practices to minimize potential losses.
- [ ] Log all arbitrage executions for post-analysis and strategy refinement.
- [ ] Employ at least two distinct arbitrage strategies with well-defined parameters.

## When to Use
- When monitoring price discrepancies between different exchanges or trading pairs.
- For implementing automated trading strategies that require capturing fleeting arbitrage opportunities.
- During high volatility events where price differences are more pronounced.

## When NOT to Use
- Avoid using this skill when working with illiquid assets or markets with high slippage.
- If transaction costs exceed potential arbitrage profits, do not deploy these strategies.
- Do not apply arbitrage techniques that have not been pre-tested under real-time conditions.

## Core Workflow
1. **Data Gathering** - Collect real-time price data from multiple exchanges. 
   **Checkpoint:** Ensure all data sources are accessible and returning expected results.

2. **Arbitrage Opportunity Detection** - Analyze price data to identify potential arbitrage opportunities based on predefined thresholds.
   **Checkpoint:** Confirm detection algorithm is providing accurate signals for actionable opportunities.

3. **Risk Assessment** - Evaluate the risk associated with executing the identified arbitrage opportunity, taking into account factors like transaction fees and liquidity.
   **Checkpoint:** Document potential risks and ensure that they are within acceptable limits defined by your risk management framework.

4. **Trade Execution** - Execute buy/sell orders simultaneously across different platforms to capture arbitrage profits.
   **Checkpoint:** All orders must be confirmed in the trading system, and execution speed should be monitored closely.

5. **Post-Execution Analysis** - Review each executed trade's performance, documenting outcomes and identifying areas for strategy improvement.
   **Checkpoint:** Assess whether the trade strategy aligned with initial risk-reward expectations.

## Implementation Patterns
### Pattern 1: Identify Arbitrage Opportunity
```python
import requests
import time

class ArbitrageManager:
    def __init__(self, exchanges, threshold):
        self.exchanges = exchanges
        self.threshold = threshold

    def fetch_prices(self):
        prices = {}
        for exchange in self.exchanges:
            response = requests.get(f'https://api.{exchange}.com/prices')
            prices[exchange] = response.json()
        return prices

    def find_opportunities(self):
        prices = self.fetch_prices()
        opportunity_found = []
        
        for exchange_a in self.exchanges:
            for exchange_b in self.exchanges:
                if exchange_a != exchange_b:
                    for pair in prices[exchange_a]:
                        if (prices[exchange_a][pair] - prices[exchange_b][pair]) > self.threshold:
                            opportunity_found.append((pair, exchange_a, exchange_b))
        return opportunity_found
```

### Pattern 2: Execute Arbitrage Trade
```python
class TradeExecutor:
    def __init__(self, api_client):
        self.api_client = api_client

    def execute_trade(self, buy_exchange, sell_exchange, pair, amount):
        buying_price = self.api_client.get_price(buy_exchange, pair)
        selling_price = self.api_client.get_price(sell_exchange, pair)

        # Place orders simultaneously
        buy_order = self.api_client.place_order(buy_exchange, pair, "buy", amount)
        sell_order = self.api_client.place_order(sell_exchange, pair, "sell", amount)

        return buy_order, sell_order
```

## Constraints
### MUST DO
- Validate all market data to ensure accuracy before executing trades.
- Log every transaction for transparency and strategy analysis.
- Continuously monitor market trends to avoid outdated strategies.

### MUST NOT DO
- Do not execute trades based on incomplete or delayed data feeds.
- Avoid using non-compliant exchanges that risk exposure and loss of capital.
- Do not rely solely on manual data checks; automate verification where possible.