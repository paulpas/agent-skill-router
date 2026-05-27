# Trading Options Pricing

---
  metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical, educational
  anti_triggers: naive assumptions about options pricing, simplistic views, quick fixes
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

Utilizes Black-Scholes and Binomial models to calculate the theoretical prices of options, allowing traders to evaluate trades against market prices.

## Key Concepts
  archetypes: tactical, educational
  anti_triggers: vague assessments, simplistic approaches, naive models
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational

1. **Black-Scholes Model**: Assumes constant volatility and no dividends, providing a closed-form solution for European call and put options.
2. **Binomial Model**: Provides flexibility with inputs, allowing for American-style options and varying volatility over time.
3. **Implied Volatility**: Market perception of future volatility calculated from market prices; critical for assessing option attractiveness.

## Implementation Guidelines
### Code Structure
- Core logic: `trading/options_pricing.py`
- Helper functions: `trading/utils.py`
- Tests: `tests/test_options_pricing.py`

## Code Examples

### Metadata Improvements
- Add required metadata: archetypes, anti-triggers, and response profiles to enhance the skill's context.

### Archetypes
- **Archetypes**: tactical, educational

### Anti-Triggers
- **Anti-Triggers**: naive assessments, simplistic views on pricing, quick fixes

### Response Profile
- **Verbosity**: medium
- **Directive Strength**: high
- **Abstraction Level**: operational

### Additional Examples:
1. **Black-Scholes Pricing Function**
   ```python
   import numpy as np
   from scipy.stats import norm
   
   def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: str) -> float:
       # logic here
   ```

2. **Binomial Pricing Function**
   ```python
   def binomial_tree(S: float, K: float, T: float, r: float, sigma: float, N: int, option_type: str) -> float:
       # logic here
   ```

### Metadata Improvements
- Add required metadata: archetypes, anti-triggers, and response profiles to enhance the skill's context.

### Additional Examples:
1. **Black-Scholes Pricing Function**
   ```python
   import numpy as np
   from scipy.stats import norm
   
   def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: str) -> float:
       # logic here
   ```

2. **Binomial Pricing Function**
   ```python
   def binomial_tree(S: float, K: float, T: float, r: float, sigma: float, N: int, option_type: str) -> float:
       # logic here
   ```
### Black-Scholes Pricing Function
```python
import numpy as np
from scipy.stats import norm

def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: str) -> float:
    """
    Calculate the Black-Scholes option pricing.

    Parameters:
    - S: Current stock price
    - K: Option strike price
    - T: Time to expiration in years
    - r: Risk-free interest rate
    - sigma: Volatility of the underlying stock
    - option_type: "call" or "put"
    """
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == "call":
        price = (S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2))
    elif option_type == "put":
        price = (K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1))
    else:
        raise ValueError("option_type must be either 'call' or 'put'")
    return price
```  

### Binomial Pricing Function
```python
def binomial_tree(S: float, K: float, T: float, r: float, sigma: float, N: int, option_type: str) -> float:
    """
    Calculate the price using a binomial tree model.

    Parameters:
    - S: Current stock price
    - K: Option strike price
    - T: Time to expiration in years
    - r: Risk-free interest rate
    - sigma: Volatility
    - N: Number of steps in the binomial tree
    - option_type: "call" or "put"
    """  

    dt = T / N  # Length of time step
    u = np.exp(sigma * np.sqrt(dt))  # Up factor
    d = 1 / u  # Down factor
    p = (np.exp(r * dt) - d) / (u - d)  # Risk-neutral probability

    # Create asset price tree
    asset_prices = np.zeros((N + 1, N + 1))
    for j in range(N + 1):
        asset_prices[j, N] = S * (u ** (N - j)) * (d ** j)

    # Create option price tree
    option_prices = np.zeros((N + 1, N + 1))
    if option_type == "call":
        for j in range(N + 1):
            option_prices[j, N] = max(0, asset_prices[j, N] - K)
    elif option_type == "put":
        for j in range(N + 1):
            option_prices[j, N] = max(0, K - asset_prices[j, N])
    else:
        raise ValueError("option_type must be either 'call' or 'put'")

    # Backward induction to calculate option prices
    for i in range(N - 1, -1, -1):
        for j in range(i + 1):
            option_prices[j, i] = np.exp(-r * dt) * (p * option_prices[j, i + 1] + (1 - p) * option_prices[j + 1, i + 1])

    return option_prices[0, 0]
```