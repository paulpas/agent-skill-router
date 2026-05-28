---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements multi-armed bandits, contextual bandits, exploration-exploitation
  tradeoff, and online learning algorithms"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-ab-testing, ds-experimental-design, ds-metrics-and-kpis
  role: implementation
  scope: implementation
  triggers: multi-armed bandits, bandits, contextual bandits, exploration exploitation
    online learning
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: online-experiments
------
# Online Experiments

Comprehensive guide to online experiments in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world experimentation & a/b testing problems
- Building machine learning pipelines with online experiments
- Implementing best practices for online experiments
- Optimizing model performance using online experiments techniques
- Learning industry-standard approaches to online experiments

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require online experiments rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Online Experiments is a critical component of the machine learning workflow. This skill covers:

1. **Theoretical foundations** — Mathematical principles and statistical concepts
2. **Practical implementation** — Working code examples and patterns
3. **Common pitfalls** — Mistakes to avoid and how to recover from them
4. **Best practices** — Industry-standard approaches and optimization techniques

## Core Workflow

1. **Understand the problem** — Clearly define what you're solving for
2. **Select approach** — Choose the right technique for your data and constraints
3. **Implement solution** — Write clean, tested code following best practices
4. **Validate results** — Verify your implementation with tests and validation
5. **Optimize performance** — Improve efficiency and accuracy incrementally

## Implementation Patterns

### Pattern 1: Basic Online Experiments

```python
import numpy as np
from typing import Dict, List, Tuple

class EpsilonGreedyBandit:
    """Basic epsilon-greedy multi-armed bandit implementation."""
    
    def __init__(self, n_arms: int, epsilon: float = 0.1) -> None:
        if n_arms <= 0:
            raise ValueError("n_arms must be a positive integer")
        self.n_arms = n_arms
        self.epsilon = max(0.0, min(1.0, epsilon))
        self.q_values = np.zeros(n_arms)
        self.arm_counts = np.zeros(n_arms)
        
    def select_arm(self) -> int:
        if np.random.random() < self.epsilon:
            return int(np.random.randint(self.n_arms))
        return int(np.argmax(self.q_values))
        
    def update(self, arm: int, reward: float) -> None:
        if not 0 <= arm < self.n_arms:
            raise ValueError(f"Arm index {arm} out of range [0, {self.n_arms})")
        self.arm_counts[arm] += 1
        n = self.arm_counts[arm]
        old_q = self.q_values[arm]
        self.q_values[arm] = old_q + (1.0 / n) * (reward - old_q)
        
    def get_statistics(self) -> Dict[str, List[float]]:
        return {
            'avg_reward': [float(np.mean(self.q_values))]
            'arm_counts': self.arm_counts.tolist()
            'q_values': self.q_values.tolist()
        }
```

### Pattern 2: Production-Ready Online Experiments

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

class UCBBandit:
    """Upper Confidence Bound bandit for production online experiments."""
    
    def __init__(self, n_arms: int, confidence: float = 2.0) -> None:
        if n_arms <= 0:
            raise ValueError("n_arms must be positive")
        self.n_arms = n_arms
        self.confidence = confidence
        self.q_values = np.zeros(n_arms)
        self.arm_counts = np.zeros(n_arms)
        self.total_pulls = 0
        
    def select_arm(self) -> int:
        if self.total_pulls < self.n_arms:
            return int(np.argmin(self.arm_counts))
        ucb_values = self.q_values + self.confidence * np.sqrt(
            np.log(self.total_pulls) / self.arm_counts
        )
        return int(np.argmax(ucb_values))
        
    def update(self, arm: int, reward: float) -> None:
        self.arm_counts[arm] += 1
        self.total_pulls += 1
        n = self.arm_counts[arm]
        old_q = self.q_values[arm]
        self.q_values[arm] = old_q + (1.0 / n) * (reward - old_q)
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        required_cols = {'reward', 'arm'}
        if not required_cols.issubset(data.columns):
            raise ValueError(f"DataFrame must contain columns: {required_cols}")
            
        results: List[Dict[str, Any]] = []
        for _, row in data.iterrows():
            arm = int(row['arm'])
            reward = float(row['reward'])
            self.update(arm, reward)
            results.append({
                'arm': arm, 
                'reward': reward, 
                'q_estimate': float(self.q_values[arm])
            })
            
        logger.info(f"Processed {len(results)} observations across {self.n_arms} arms")
        return {
            'final_q_values': self.q_values.tolist()
            'arm_counts': self.arm_counts.tolist()
            'total_pulls': self.total_pulls
            'history': results
        }
```

### Pattern 3: BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no type hints, bypasses validation, monolithic function
def bad_bandit(data):
    q = [0.0, 0.0, 0.0]
    for i in range(len(data)):
        if i < 3:
            arm = i
        else:
            arm = q.index(max(q))
        q[arm] = q[arm] + 0.1 * (data[i] - q[arm])
    return q

# GOOD: Parameterized, typed, validated, decomposed, follows SOLID principles
import numpy as np
from typing import List, Dict

def good_bandit(rewards: List[float], n_arms: int = 3, alpha: float = 0.1) -> Dict[str, List[float]]:
    if n_arms <= 0 or not rewards:
        raise ValueError("Invalid parameters")
        
    q_estimates = np.zeros(n_arms)
    arm_counts = np.zeros(n_arms)
    
    for t, reward in enumerate(rewards):
        if t < n_arms:
            arm = t
        else:
            arm = int(np.argmax(q_estimates))
            
        arm_counts[arm] += 1
        n = arm_counts[arm]
        q_estimates[arm] += alpha * (reward - q_estimates[arm])
        
    return {
        'estimated_means': q_estimates.tolist()
        'pull_counts': arm_counts.tolist()
    }
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Follow SOLID principles for class design and DRY for utility functions

## Common Pitfalls

| Pitfall | Problem | Solution |
|

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Online Controlled Experiments (Microsoft Research)](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/online-a-b-testing.pdf)
- [Optimizely Online Experimentation Guide](https://blog.optimizely.com/a-b-testing-best-practices/)
- [VWO A/B Testing Best Practices](https://vwo.com/blog/ab-testing-best-practices/)
- [Experimentation at Scale — Netflix Eng Blog](https://netflixtechblog.com/experimentation-at-scale-netflix-and-the-evolution-of-distributed-decision-making-a1f7b2e45a0e)
- [Google Optimize Documentation](https://support.google/optimize/)