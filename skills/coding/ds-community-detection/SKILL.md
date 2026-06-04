---
name: ds-community-detection
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Detects communities and clusters in graphs using modularity optimization
  spectral methods, and graph partitioning algorithms"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-association-rules, ds-clustering, ds-dimensionality-reduction
  role: implementation
  scope: implementation
  triggers: community detection, graph clustering, modularity, spectral clustering
    graph partitioning
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
------
# Community Detection

Comprehensive guide to community detection in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world unsupervised learning problems
- Building machine learning pipelines with community detection
- Implementing best practices for community detection
- Optimizing model performance using community detection techniques
- Learning industry-standard approaches to community detection

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require community detection rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Community Detection is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Community Detection

```python
import networkx as nx
import numpy as np
from typing import Dict, Any

def basic_community_detection(graph: nx.Graph) -> Dict[str, Any]:
    """Basic community detection using greedy modularity optimization."""
    communities = nx.community.greedy_modularity_communities(graph)
    community_labels = {node: idx for idx, comm in enumerate(communities) for node in comm}
    modularity = nx.community.modularity(graph, communities)
    return {
        'communities': communities
        'labels': community_labels
        'modularity': float(modularity)
    }

# Create a sample graph with known community structure
G = nx.gnm_random_graph(50, 150, seed=42)
for i in range(0, 25):
    for j in range(i+1, 25):
        if np.random.rand() < 0.3:
            G.add_edge(i, j)
    for i in range(25, 50):
        for j in range(i+1, 50):
            if np.random.rand() < 0.3:
                G.add_edge(i, j)

results = basic_community_detection(G)
print(f"Detected {len(results['communities'])} communities with modularity Q={results['modularity']:.4f}")
```

### Pattern 2: Production-Ready Community Detection

```python
import logging
import networkx as nx
import numpy as np
from typing import Any, Dict, Union
from sklearn.cluster import SpectralClustering

logger = logging.getLogger(__name__)

class CommunityDetection:
    """Production implementation of Community Detection using spectral methods"""
    
    def __init__(self, n_communities: int = 4, method: str = "spectral"):
        self.n_communities = n_communities
        self.method = method
        
    def execute(self, graph: Union[nx.Graph, np.ndarray]) -> Dict[str, Any]:
        """Execute Community Detection on graph data"""
        try:
            if isinstance(graph, np.ndarray):
                G = nx.from_numpy_array(graph)
            elif isinstance(graph, nx.Graph):
                G = graph.copy()
            else:
                raise TypeError("Input must be a NetworkX graph or adjacency matrix")
                
            if self.method == "spectral":
                adj_matrix = nx.to_numpy_array(G)
                sc = SpectralClustering(n_clusters=self.n_communities, affinity='precomputed')
                labels = sc.fit_predict(adj_matrix)
                communities = {int(i): list(np.where(labels == i)[0]) for i in range(self.n_communities)}
                modularity = nx.community.modularity(G, communities.values())
            else:
                communities = list(nx.community.greedy_modularity_communities(G))
                labels = np.array([community_labels[node] for node in G.nodes()])
                modularity = nx.community.modularity(G, communities)
                
            return {
                'status': 'success'
                'communities': communities
                'labels': labels.tolist()
                'modularity': float(modularity)
                'node_count': G.number_of_nodes()
                'edge_count': G.number_of_edges()
            }
        except Exception as e:
            logger.error(f"Community detection failed: {e}")
            return {'status': 'error', 'message': str(e)}
```

### Pattern 3: BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no error handling, violates DRY principle
def bad_detection(G):
    labels = [0] * G.number_of_nodes()
    for i in range(10):
        labels[i] = 1
    return labels

# GOOD: Type hints, validation, modular design, follows SOLID principles
def good_detection(graph: nx.Graph, n_clusters: int = 4) -> list[int]:
    if not isinstance(graph, nx.Graph):
        raise TypeError("Expected NetworkX graph")
    if graph.number_of_nodes() == 0:
        raise ValueError("Graph is empty")
    adj = nx.to_numpy_array(graph)
    sc = SpectralClustering(n_clusters=n_clusters, affinity='precomputed')
    return sc.fit_predict(adj).tolist()
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging

## Common Pitfalls

| Pitfall | Problem | Solution |
|

---

---

## Constraints

### MUST DO
- Validate all data preprocessing steps are fit-only on training data, never on validation or test sets
- Implement reproducible pipelines with fixed random seeds and deterministic operations where possible
- Report model performance with confidence intervals via bootstrapping or cross-validation across multiple runs
- Log all experiments with parameters, metrics, and artifacts using MLflow or equivalent tracking system

### MUST NOT DO
- Do not evaluate a model on the same data used for training — always hold out a proper test set
- Avoid overfitting to the validation set by limiting hyperparameter search iterations
- Never use features that can only be computed at inference time (look-ahead bias)
- Do not report single-run accuracy without statistical significance testing or error bars


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Community Detection — Wikipedia](https://en.wikipedia.org/wiki/Community_detection)
- [NetworkX Community Detection Module](https://networkx.org/documentation/stable/reference/algorithms/community.html)
- [Louvain Method Implementation (python-louvain)](https://github.com/JoshuaOConnor/python-louvain)
- [Graph Community Structure — Complex Networks Lecture Notes](https://networksciencebook.com/chapter/7)
- [Leiden Algorithm — Traag et al.](https://arxiv.org/abs/1810.08473)