---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Designs and implements ETL pipelines, streaming data ingestion,
  batch processing, and data pipeline orchestration for reliable data flow"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-data-collection, ds-data-quality, ds-data-versioning
  role: implementation
  scope: implementation
  triggers: ETL pipeline, data ingestion, streaming data, batch processing, pipeline,
    how do i ingest data
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
name: data-ingestion
------
# Data Ingestion

Comprehensive guide to data ingestion in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world data collection & ingestion problems
- Building machine learning pipelines with data ingestion
- Implementing best practices for data ingestion
- Optimizing model performance using data ingestion techniques
- Learning industry-standard approaches to data ingestion

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require data ingestion rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Data Ingestion is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Data Ingestion

```python
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

def basic_data_ingestion(file_path: Optional[str] = None, sample_data: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Basic data ingestion: reads data, handles missing values, validates schema.
    """
    if sample_data is not None:
        df = sample_data.copy()
    elif file_path:
        df = pd.read_csv(file_path)
    else:
        raise ValueError("Provide either file_path or sample_data")
    
    # Handle missing values
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns
    df[categorical_cols] = df[categorical_cols].fillna(df[categorical_cols].mode().iloc[0])
    
    # Validate schema
    required_cols = ['feature_1', 'feature_2', 'target']
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
        
    return {
        'data': df,
        'shape': df.shape,
        'missing_values': int(df.isnull().sum().sum()),
        'status': 'success'
    }
```

### Pattern 2: Production-Ready Data Ingestion

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ProductionDataIngestion:
    """Production-grade data ingestion following SOLID principles."""
    
    def __init__(self, required_columns: List[str], log_level: str = "INFO"):
        self.required_columns = required_columns
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(getattr(logging, log_level))
        
    def _validate_schema(self, df: pd.DataFrame) -> bool:
        missing = [col for col in self.required_columns if col not in df.columns]
        if missing:
            raise ValueError(f"Schema validation failed. Missing: {missing}")
        return True
        
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.drop_duplicates()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
        return df
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute production data ingestion pipeline."""
        try:
            self._validate_schema(data)
            cleaned_df = self._clean_data(data)
            result = {
                'ingested_data': cleaned_df,
                'row_count': len(cleaned_df),
                'column_count': len(cleaned_df.columns),
                'timestamp': datetime.now().isoformat(),
                'status': 'completed'
            }
            self.logger.info(f"Successfully ingested {len(cleaned_df)} rows.")
            return result
        except Exception as e:
            self.logger.error(f"Ingestion failed: {str(e)}")
            return {'status': 'failed', 'error': str(e)}
```

### Pattern 3: BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no error handling, bypasses validation
def bad_ingestion(df):
    df['col1'] = df['col1'].fillna(0)
    df['col2'] = df['col2'].fillna(0)
    return df

# GOOD: Configurable, validated, follows DRY principle
def good_ingestion(df: pd.DataFrame, fill_strategy: str = "median") -> pd.DataFrame:
    if df.empty:
        raise ValueError("DataFrame cannot be empty")
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if fill_strategy == "median":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    elif fill_strategy == "mean":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
    else:
        raise ValueError("Invalid fill_strategy")
    return df
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Adhere to SOLID principles and DRY guidelines for maintainable, scalable code

## Common Pitfalls

| Pitfall | Problem | Solution |
|