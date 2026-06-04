---
name: options_pricing
description: Calculates theoretical option prices using Black-Scholes and Binomial tree models with implied volatility analysis for European and American-style options.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: options pricing, black-scholes, binomial tree, implied volatility, greeks, american options, european options
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance]
  archetypes: [tactical, educational]
  anti_triggers: [naive assumptions about options pricing, simplistic views, quick fixes]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Options Pricing Models

Utilizes Black-Scholes and Binomial models to calculate the theoretical prices of options, allowing traders to evaluate trades against market prices.

## TL;DR Checklist

- [ ] Use Black-Scholes for European-style options with constant volatility assumptions
- [ ] Use Binomial tree for American-style options or when modeling varying volatility
- [ ] Calculate and analyze all five Greeks (delta, gamma, theta, vega, rho) for risk assessment
- [ ] Validate implied volatility against historical volatility before pricing decisions
- [ ] Handle edge cases: zero time to expiration, deep ITM/OTM options

---

## When to Use

Use this skill when:

- Pricing European or American options to compare theoretical value against market price
- Calculating implied volatility from market prices to assess option attractiveness
- Computing option Greeks for portfolio risk management and hedging strategies
- Building options trading algorithms that require real-time pricing calculations
- Backtesting options strategies that need accurate theoretical price models

---

## When NOT to Use

- For exotic options with non-standard payoffs (use Monte Carlo or custom models)
- When you only need historical volatility analysis (not implied vol-based pricing)
- For simple directional equity trades (equity options pricing is overkill)

---

## Key Concepts

1. **Black-Scholes Model**: Assumes constant volatility and no dividends, providing a closed-form solution for European call and put options. Best for liquid options with stable underlying assets.

2. **Binomial Model**: Provides flexibility with inputs, allowing for American-style options (early exercise) and varying volatility over time. More computationally intensive but handles more complex scenarios.

3. **Implied Volatility**: Market perception of future volatility calculated from market prices; critical for assessing option attractiveness. Compare against historical volatility to find mispriced options.

---

## Implementation Patterns

### Pattern 1: Black-Scholes Pricing Function

```python
import numpy as np
from scipy.stats import norm

def black_scholes(
    S: float,          # Current stock price
    K: float,          # Option strike price
    T: float,          # Time to expiration in years
    r: float,          # Risk-free interest rate
    sigma: float,      # Volatility of the underlying stock
    option_type: str   # "call" or "put"
) -> float:
    """
    Calculate the Black-Scholes option pricing.

    Parameters:
    - S: Current stock price
    - K: Option strike price
    - T: Time to expiration in years
    - r: Risk-free interest rate
    - sigma: Volatility of the underlying stock
    - option_type: "call" or "put"

    Returns:
    - Theoretical option price
    """
    if T <= 0:
        # Option has expired
        if option_type == "call":
            return max(0, S - K)
        else:
            return max(0, K - S)

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == "call":
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    elif option_type == "put":
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    else:
        raise ValueError("option_type must be either 'call' or 'put'")

    return price
```

### Pattern 2: Binomial Tree Pricing

```python
def binomial_tree(
    S: float,          # Current stock price
    K: float,          # Option strike price
    T: float,          # Time to expiration in years
    r: float,          # Risk-free interest rate
    sigma: float,      # Volatility
    N: int,            # Number of steps in the binomial tree
    option_type: str   # "call" or "put"
) -> float:
    """
    Calculate the option price using a Cox-Ross-Rubinstein binomial tree model.

    Handles American-style options by checking early exercise at each node.

    Parameters:
    - S: Current stock price
    - K: Option strike price
    - T: Time to expiration in years
    - r: Risk-free interest rate
    - sigma: Volatility
    - N: Number of steps (higher = more accurate but slower)
    - option_type: "call" or "put"

    Returns:
    - Theoretical option price at the root node
    """
    dt = T / N  # Length of time step
    u = np.exp(sigma * np.sqrt(dt))       # Up factor
    d = 1.0 / u                           # Down factor
    p = (np.exp(r * dt) - d) / (u - d)    # Risk-neutral probability

    # Create asset price tree: asset_prices[steps][node]
    asset_prices = np.zeros((N + 1, N + 1))
    for j in range(N + 1):
        asset_prices[j, N] = S * (u ** j) * (d ** (N - j))

    # Create option price tree at expiration
    option_prices = np.zeros((N + 1, N + 1))
    if option_type == "call":
        for j in range(N + 1):
            option_prices[j, N] = max(0, asset_prices[j, N] - K)
    elif option_type == "put":
        for j in range(N + 1):
            option_prices[j, N] = max(0, K - asset_prices[j, N])
    else:
        raise ValueError("option_type must be either 'call' or 'put'")

    # Backward induction through the tree
    for i in range(N - 1, -1, -1):
        for j in range(i + 1):
            continuation = np.exp(-r * dt) * (p * option_prices[j, i + 1]
                                              + (1 - p) * option_prices[j + 1, i + 1])

            # American-style: check early exercise
            if option_type == "call":
                exercise = max(0, asset_prices[j, i] - K)
            else:
                exercise = max(0, K - asset_prices[j, i])

            option_prices[j, i] = max(exercise, continuation)

    return option_prices[0, 0]
```

### Pattern 3: Option Greeks Calculation

```python
def calculate_greeks(
    S: float, K: float, T: float, r: float, sigma: float,
    option_type: str = "call", num_steps: int = 100
) -> dict:
    """
    Calculate all five option Greeks using finite differences.

    Returns a dictionary with delta, gamma, theta, vega, and rho values.
    """
    epsilon = S * 0.01   # 1% price shock for delta/gamma
    dt_epsilon = 1/365   # 1 day for theta
    vol_epsilon = 0.001  # 0.1% volatility shock for vega
    rate_epsilon = 0.001 # 0.1% rate shock for rho

    # Base price
    base = black_scholes(S, K, T, r, sigma, option_type)

    # Delta: dV/dS
    S_up = black_scholes(S * (1 + epsilon), K, T, r, sigma, option_type)
    delta = (S_up - base) / (S * epsilon)

    # Gamma: d2V/dS2
    S_down = black_scholes(S * (1 - epsilon), K, T, r, sigma, option_type)
    gamma = (S_up - 2 * base + S_down) / ((S * epsilon) ** 2)

    # Theta: dV/dt (annualized, negative for long options)
    if T > dt_epsilon:
        T_down = T - dt_epsilon
    else:
        T_down = T - dt_epsilon / 4
    theta_val = (black_scholes(S, K, T_down, r, sigma, option_type) - base) / (-dt_epsilon)

    # Vega: dV/dsigma
    vega_val = (black_scholes(S, K, T, r, sigma + vol_epsilon, option_type) - base) / vol_epsilon

    # Rho: dV/dr
    rho_val = (black_scholes(S, K, T, r + rate_epsilon, sigma, option_type) - base) / rate_epsilon

    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta_val, 4),
        "vega": round(vega_val, 4),
        "rho": round(rho_val, 4),
    }
```

---

## Constraints

### MUST DO
- Validate all inputs: S > 0, K > 0, T >= 0, sigma > 0, r >= 0
- Use the Binomial model for American-style options (early exercise possible)
- Use Black-Scholes for European-style options with constant volatility
- Handle edge case of zero time to expiration explicitly
- Include implied volatility calculation when comparing theoretical vs market prices

### MUST NOT DO
- Apply Black-Scholes to American options without checking early exercise premium
- Ignore dividend payments when pricing equity options (use Merton extension)
- Use unvalidated or zero volatility values — they produce NaN results
- Trust model output blindly — always compare implied vol against historical vol

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Black-Scholes Model (Wikipedia)](https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model)
- [Binomial Option Pricing Model](https://www.investopedia.com/terms/b/binomial-option-pricing-model.asp)
- [Options Greeks in Pricing](https://www.investopedia.com/trading/introduction-to-the-greeks/)
- [Monte Carlo Methods for Options](https://en.wikipedia.org/wiki/Monte_Carlo_method)
- [Implied Volatility Guide](https://www.investopedia.com/terms/i/iv.asp)
