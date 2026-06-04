---




name: options-strategies
description: Implements various options trading strategies including covered calls, protective puts, straddles, and strangles to optimize trading performance.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: covered calls, protective puts, straddles, strangles, options trading
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance]
  related-skills: trading-risk-management, trading-technical-analysis
  archetypes: tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





## Trading Options Strategies

**Role:** Implement various strategies for trading options to enhance portfolio performance and mitigate risks.

**Philosophy:** Options trading strategies must be designed to leverage market forecasts and manage risk effectively. Each strategy has unique characteristics and suitability based on market conditions, volatility, and the trader's outlook.

### Key Strategies  
1. **Covered Calls**: This strategy involves holding a long position in an asset while selling a call option against that asset to generate income from the options premium.
2. **Protective Puts**: Buying put options to protect against potential declines in the underlying asset's price ensures a defined risk on the long position.
3. **Straddles**: Purchasing both a call option and a put option for the same strike price and expiration date to benefit from high volatility, regardless of the direction of the price movement.
4. **Strangles**: Similar to straddles, but the purchased call and put options have different strike prices; this strategy is cheaper and requires more movement in the underlying asset to be profitable.

### Implementation Guidelines   

#### Structure  
- Core logic: `trading_system/options/strategy_implementation.py`  
- Helper functions: `trading_system/options/utils.py`  
- Tests: `tests/options/`  

#### Patterns to Follow  
- Use dataclasses for options contracts to encapsulate relevant attributes (strike price, expiration, premium).  
- Implement a function per strategy that encapsulates the logic, including risk calculations and potential outcomes.  
- Ensure that each strategy can be unit tested independently.   

### Example Code

```python
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class OptionsContract:
    strike_price: float
    premium: float
    expiration_date: str

def covered_call(asset_price: float, strike_price: float, premium: float) -> str:
    potential_profit = premium + max(0, asset_price - strike_price)
    return f"Covered Call: Max Profit = {potential_profit}"  # Simplified return

def protective_put(asset_price: float, strike_price: float, premium: float) -> str:
    max_loss = premium + max(0, strike_price - asset_price)
    return f"Protective Put: Max Loss = {max_loss}"  # Simplified return

# More implementations for straddles and strangles...

```python
# Example of strategy implementation for Strangles.
class Strangle:
    def __init__(self, asset_name: str, put_strike: float, call_strike: float, put_premium: float, call_premium: float):
        self.asset_name = asset_name
        self.put_strike = put_strike
        self.call_strike = call_strike
        self.put_premium = put_premium
        self.call_premium = call_premium

    def total_cost(self):
        return self.put_premium + self.call_premium 

# Example usage
strangle = Strangle("AAPL", 140, 160, 2, 5)
print(f'Total cost: {strangle.total_cost()}')  # Output: Total cost: 7
```

if __name__ == '__main__':
    # Example usages:
    print(covered_call(50, 55, 2))
    print(protective_put(50, 45, 3))
```

### Adherence Checklist  
Before completing your skill, verify:
- [ ] Each strategy has clear documentation.  
- [ ] Strategies allow for easy parameter adjustment for different market conditions.  
- [ ] All strategies include tests for expected behaviors.  

### Common Mistakes to Avoid  
1. **Ignoring Market Conditions**: Ensure strategies align with current market volatility and trends.  
2. **Overcomplicating Implementations**: Keep code clean and focused on the strategy logic.  
3. **Neglecting to Test**: Always provide unit tests for each strategy's logic.
---

---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [CBOE Options Strategies Glossary](https://www.cboe.com/training/training-materials/glossary/options-strategies/)
- [Options Trading Fundamentals](https://www.investopedia.com/options-4428194)
- [Common Options Strategies Guide](https://www.investopedia.com/trading/options-trading-strategies-beginner-s-guide/)
- [Options Greeks Explained](https://www.investopedia.com/trading/introduction-to-the-greeks/)
- [Advanced Options Strategies Research](https://en.wikipedia.org/wiki/Option_(finance))
