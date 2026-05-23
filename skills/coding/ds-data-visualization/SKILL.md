---
name: data-visualization
description: '"Creates effective visualizations including plots, charts, dashboards,
  and interactive visualizations for data insight and storytelling"'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: data visualization, plotting, dashboards, charts, matplotlib, seaborn,
    plotly, how do i visualize data
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
  related-skills: ds-correlation-analysis, ds-data-profiling, ds-eda
------



# Data Visualization

Comprehensive guide to data visualization in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world exploratory data analysis problems
- Building machine learning pipelines with data visualization
- Implementing best practices for data visualization
- Optimizing model performance using data visualization techniques
- Learning industry-standard approaches to data visualization

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require data visualization rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Data Visualization is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Data Visualization

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def create_basic_visualizations(df: pd.DataFrame) -> dict:
    """Generate basic exploratory visualizations for a DataFrame."""
    if df.empty:
        raise ValueError("DataFrame cannot be empty")

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) == 0:
        raise ValueError("No numeric columns found for visualization")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Histogram of first numeric column
    sns.histplot(df[numeric_cols[0]], kde=True, ax=axes[0], color='skyblue')
    axes[0].set_title(f'Distribution of {numeric_cols[0]}')

    # Boxplot for remaining numeric columns
    if len(numeric_cols) > 1:
        df[numeric_cols].plot.box(ax=axes[1])
        axes[1].set_title('Boxplots of Numeric Features')
    else:
        axes[1].text(0.5, 0.5, 'Need >1 numeric column for boxplot', ha='center')

    plt.tight_layout()
    return {'figure': fig, 'numeric_columns': numeric_cols.tolist()}

if __name__ == "__main__":
    sample_df = pd.DataFrame({
        'age': np.random.normal(35, 10, 200),
        'income': np.random.exponential(50000, 200),
        'score': np.random.randint(0, 100, 200)
    })
    result = create_basic_visualizations(sample_df)
    plt.show()
    print(f"Generated plots for columns: {result['numeric_columns']}")
```

### Pattern 2: Production-Ready Data Visualization

```python
import logging
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Any, Dict, List, Optional
import os

logger = logging.getLogger(__name__)

class DataVisualization:
    """Production implementation of Data Visualization"""
    
    def __init__(self, output_dir: Optional[str] = None, dpi: int = 150):
        self.output_dir = output_dir or "viz_output"
        self.dpi = dpi
        os.makedirs(self.output_dir, exist_ok=True)
        logger.info(f"Initialized DataVisualization with output_dir={self.output_dir}")
    
    def _validate_data(self, data: pd.DataFrame) -> None:
        if not isinstance(data, pd.DataFrame):
            raise TypeError("Input must be a pandas DataFrame")
        if data.empty:
            raise ValueError("Input DataFrame cannot be empty")
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            raise ValueError("DataFrame must contain at least one numeric column")

    def execute(self, data: pd.DataFrame, target_col: Optional[str] = None) -> Dict[str, Any]:
        """Execute Data Visualization on data"""
        self._validate_data(data)
        results = {'plots_generated': [], 'status': 'success'}
        
        try:
            # 1. Correlation Heatmap
            fig_corr, ax_corr = plt.subplots(figsize=(8, 6))
            corr_matrix = data.corr(numeric_only=True)
            sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', ax=ax_corr, fmt='.2f')
            ax_corr.set_title('Feature Correlation Matrix')
            plt.tight_layout()
            corr_path = os.path.join(self.output_dir, 'correlation_heatmap.png')
            fig_corr.savefig(corr_path, dpi=self.dpi)
            plt.close(fig_corr)
            results['plots_generated'].append(corr_path)
            logger.info(f"Saved correlation heatmap to {corr_path}")

            # 2. Distribution Plots
            numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
            for col in numeric_cols[:5]:
                fig_dist, ax_dist = plt.subplots(figsize=(6, 4))
                sns.histplot(data[col], kde=True, ax=ax_dist, color='teal')
                ax_dist.set_title(f'Distribution of {col}')
                plt.tight_layout()
                dist_path = os.path.join(self.output_dir, f'dist_{col}.png')
                fig_dist.savefig(dist_path, dpi=self.dpi)
                plt.close(fig_dist)
                results['plots_generated'].append(dist_path)
                
        except Exception as e:
            logger.error(f"Visualization pipeline failed: {str(e)}")
            results['status'] = 'failed'
            results['error'] = str(e)
            
        return results
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