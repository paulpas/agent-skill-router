---
name: ds-topic-modeling
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements topic modeling using Latent Dirichlet Allocation (LDA)
  Non-negative Matrix Factorization (NMF), and other topic extraction methods"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-association-rules, ds-clustering, ds-dimensionality-reduction
  role: implementation
  scope: implementation
  triggers: topic modeling, LDA, NMF, topic extraction, latent dirichlet allocation
    text analysis
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
version: "1.0.0"
---
# Topic Modeling

Comprehensive guide to topic modeling in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world unsupervised learning problems
- Building machine learning pipelines with topic modeling
- Implementing best practices for topic modeling
- Optimizing model performance using topic modeling techniques
- Learning industry-standard approaches to topic modeling

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require topic modeling rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Topic Modeling is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Topic Modeling

```python
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
from typing import List, Dict, Any

def basic_topic_modeling(texts: List[str], n_topics: int = 5) -> Dict[str, Any]:
    """
    Perform basic topic modeling using Latent Dirichlet Allocation (LDA).
    
    Args:
        texts: List of raw text documents
        n_topics: Number of topics to extract
        
    Returns:
        Dictionary containing fitted model, vectorizer, and topic-word distributions
    """
    if not texts:
        raise ValueError("Input texts list cannot be empty")
        
    # Vectorize text documents
    vectorizer = CountVectorizer(max_df=0.95, min_df=2, stop_words='english')
    doc_term_matrix = vectorizer.fit_transform(texts)
    
    # Initialize and fit LDA model
    lda_model = LatentDirichletAllocation(
        n_components=n_topics
        max_iter=10
        learning_method='online'
        random_state=42
    )
    lda_model.fit(doc_term_matrix)
    
    # Extract top words per topic
    feature_names = vectorizer.get_feature_names_out()
    topics = {}
    for idx, topic in enumerate(lda_model.components_):
        top_words_idx = topic.argsort()[:-10:-1]
        topics[f'topic_{idx}'] = [feature_names[i] for i in top_words_idx]
        
    return {
        'model': lda_model
        'vectorizer': vectorizer
        'topics': topics
        'doc_term_matrix': doc_term_matrix
    }
```

### Pattern 2: Production-Ready Topic Modeling

```python
import logging
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF
from sklearn.pipeline import Pipeline
from typing import Any, Dict, List, Optional
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class TopicModeling:
    """Production-grade implementation of Topic Modeling using NMF"""
    
    def __init__(self, n_topics: int = 5, max_features: int = 1000, random_state: int = 42):
        self.n_topics = n_topics
        self.max_features = max_features
        self.random_state = random_state
        self.pipeline: Optional[Pipeline] = None
        self.feature_names: List[str] = []
        
    def _validate_input(self, data: pd.DataFrame, text_column: str) -> None:
        if text_column not in data.columns:
            raise ValueError(f"Column '{text_column}' not found in DataFrame")
        if data[text_column].isnull().any():
            logger.warning("Dropping rows with missing text data")
            data = data.dropna(subset=[text_column])
        if len(data) < self.n_topics:
            raise ValueError("Dataset size must be greater than n_topics")
            
    def _build_pipeline(self) -> Pipeline:
        vectorizer = TfidfVectorizer(
            max_features=self.max_features
            stop_words='english'
            ngram_range=(1, 2)
        )
        nmf_model = NMF(
            n_components=self.n_topics
            init='nndsvd'
            random_state=self.random_state
            max_iter=200
        )
        return Pipeline([('tfidf', vectorizer), ('nmf', nmf_model)])
        
    def execute(self, data: pd.DataFrame, text_column: str = 'text') -> Dict[str, Any]:
        """Execute Topic Modeling on data"""
        self._validate_input(data, text_column)
        
        self.pipeline = self._build_pipeline()
        tfidf_matrix = self.pipeline.named_steps['tfidf'].fit_transform(data[text_column])
        self.pipeline.fit(tfidf_matrix)
        
        feature_names = self.pipeline.named_steps['tfidf'].get_feature_names_out()
        topic_words = {}
        for i, topic in enumerate(self.pipeline.named_steps['nmf'].components_):
            top_indices = topic.argsort()[:-10:-1]
            topic_words[f'topic_{i}'] = [feature_names[idx] for idx in top_indices]
            
        reconstructed = self.pipeline.named_steps['nmf'].transform(tfidf_matrix) @ \
                        self.pipeline.named_steps['nmf'].components_
        inertia = float(np.linalg.norm(tfidf_matrix.toarray() - reconstructed))
        
        return {
            'topics': topic_words
            'inertia': inertia
            'pipeline': self.pipeline
            'document_topics': self.pipeline.named_steps['nmf'].transform(tfidf_matrix)
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
- Follow DRY (Don't Repeat Yourself) and KISS (Keep It Simple, Stupid) principles for maintainable code

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

- [Topic Modeling — Wikipedia](https://en.wikipedia.org/wiki/Topic_model)
- [Gensim Documentation](https://radimrehurek.com/gensim/)
- [LDA Topic Modeling — Scikit-learn docs](https://scikit-learn.org/stable/modules/lda_lda.html)
- [BERTopic Documentation](https://maartengr.github.io/BERTopic/)
- [NMF for Topic Extraction (Scikit-learn)](https://scikit-learn.org/stable/modules/decomposition.html#nmf)