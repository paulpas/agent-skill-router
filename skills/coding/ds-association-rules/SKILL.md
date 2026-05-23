---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Discovers association rules and frequent itemsets using Apriori,
  Eclat, and market basket analysis for pattern mining"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-clustering, ds-community-detection, ds-topic-modeling
  role: implementation
  scope: implementation
  triggers: association rules, market basket, apriori, frequent itemsets, recommendation,
    pattern mining
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
name: association-rules
------
# Association Rules

Comprehensive guide to association rules in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world unsupervised learning problems
- Building machine learning pipelines with association rules
- Implementing best practices for association rules
- Optimizing model performance using association rules techniques
- Learning industry-standard approaches to association rules

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require association rules rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Association Rules is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Association Rules

```python
import pandas as pd
import numpy as np
from itertools import combinations
from typing import Dict, List, Set, Tuple

def find_frequent_itemsets(transactions: List[Set[str]], min_support: float = 0.5) -> Tuple[Dict[frozenset, float], Dict[frozenset, float]]:
    """Find frequent itemsets using a simplified Apriori approach."""
    if not transactions:
        raise ValueError("Transactions list cannot be empty")
        
    all_items: Set[str] = set()
    for txn in transactions:
        all_items.update(txn)
        
    # Calculate support for single items
    itemset_support: Dict[frozenset, float] = {
        frozenset({item}): sum(1 for txn in transactions if item in txn) / len(transactions)
        for item in all_items
    }
    
    frequent_singletons: Dict[frozenset, float] = {k: v for k, v in itemset_support.items() if v >= min_support}
    
    # Generate candidate pairs and calculate support
    frequent_pairs: Dict[frozenset, float] = {}
    items: List[frozenset] = list(frequent_singletons.keys())
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            candidate: frozenset = items[i] | items[j]
            support: float = sum(1 for txn in transactions if candidate.issubset(txn)) / len(transactions)
            if support >= min_support:
                frequent_pairs[candidate] = support
                
    return frequent_singletons, frequent_pairs
```

### Pattern 2: Production-Ready Association Rules

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Set, Tuple
from itertools import combinations

logger = logging.getLogger(__name__)

class AssociationRuleMiner:
    """Production-grade implementation of Association Rule Mining."""
    
    def __init__(self, min_support: float = 0.1, min_confidence: float = 0.5):
        self.min_support = min_support
        self.min_confidence = min_confidence
        self.frequent_itemsets: Dict[frozenset, float] = {}
        self.rules: List[Dict[str, Any]] = []
        
    def _count_support(self, transactions: List[Set[str]], itemset: frozenset) -> float:
        count = sum(1 for txn in transactions if itemset.issubset(txn))
        return count / len(transactions)
        
    def fit(self, transactions: List[Set[str]]) -> 'AssociationRuleMiner':
        """Find frequent itemsets and generate association rules."""
        if not transactions:
            raise ValueError("Transactions list cannot be empty")
            
        logger.info(f"Processing {len(transactions)} transactions...")
        all_items = set().union(*transactions)
        self.frequent_itemsets = {
            frozenset({item}): self._count_support(transactions, frozenset({item}))
            for item in all_items
        }
        
        # Generate rules from frequent pairs
        for itemset, support in self.frequent_itemsets.items():
            if len(itemset) == 2:
                antecedent = itemset.copy()
                consequent = itemset.copy()
                consequent.discard(next(iter(antecedent)))
                antecedent.discard(next(iter(consequent)))
                antecedent = frozenset(antecedent)
                consequent = frozenset(consequent)
                
                confidence = support / self.frequent_itemsets[antecedent]
                if confidence >= self.min_confidence:
                    lift = confidence / self.frequent_itemsets[consequent]
                    self.rules.append({
                        'antecedent': list(antecedent),
                        'consequent': list(consequent),
                        'support': support,
                        'confidence': confidence,
                        'lift': lift
                    })
        logger.info(f"Generated {len(self.rules)} rules.")
        return self
        
    def get_rules(self) -> pd.DataFrame:
        """Return rules as a DataFrame."""
        return pd.DataFrame(self.rules)
```

### Pattern 3: BAD vs GOOD Examples

```python
# BAD: Hardcoded thresholds, no validation, ignores lift metric, violates DRY principle
def bad_rule_mining(transactions):
    rules = []
    for t in transactions:
        if 'Bread' in t and 'Butter' in t:
            rules.append({'antecedent': 'Bread', 'consequent': 'Butter'})
    return rules

# GOOD: Parameterized, validates input, computes support/confidence/lift, uses type hints
def good_rule_mining(transactions: List[Set[str]], min_support: float = 0.1, min_confidence: float = 0.5) -> pd.DataFrame:
    if not transactions:
        raise ValueError("Transactions cannot be empty")
    total = len(transactions)
    rules = []
    for antecedent in transactions:
        for consequent in transactions:
            if antecedent == consequent: continue
            support = sum(1 for t in transactions if antecedent.issubset(t) and consequent.issubset(t)) / total
            conf = support / sum(1 for t in transactions if antecedent.issubset(t))
            if support >= min_support and conf >= min_confidence:
                lift = conf / sum(1 for t in transactions if consequent.issubset(t)) / total
                rules.append({'antecedent': list(antecedent), 'consequent': list(consequent), 'support': support, 'confidence': conf, 'lift': lift})
    return pd.DataFrame(rules)
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Follow DRY and KISS principles to maintain clean, reusable code
- ✅ Reference industry standards like OWASP for data security and privacy compliance

## Common Pitfalls

| Pitfall | Problem | Solution |
|