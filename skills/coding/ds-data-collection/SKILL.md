---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements data gathering strategies including APIs, web scraping,
  sensor data collection, and database queries for building machine learning datasets"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-data-ingestion, ds-data-quality, ds-data-versioning
  role: implementation
  scope: implementation
  triggers: data collection, web scraping, API integration, data gathering, data acquisition,
    ETL, how do i collect data
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
name: data-collection
------
# Data Collection

Comprehensive guide to data collection in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world data collection & ingestion problems
- Building machine learning pipelines with data collection
- Implementing best practices for data collection
- Optimizing model performance using data collection techniques
- Learning industry-standard approaches to data collection

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require data collection rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Data Collection is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Data Collection

```python
import pandas as pd
import requests
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_api_data(url: str, params: Dict[str, Any] = None) -> pd.DataFrame:
    """Fetch data from a REST API and convert to DataFrame."""
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Handle different JSON structures
        if isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, dict) and 'results' in data:
            df = pd.DataFrame(data['results'])
        else:
            df = pd.DataFrame([data])
            
        logger.info(f"Successfully fetched {len(df)} records from {url}")
        return df
        
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        raise
```

### Pattern 2: Production-Ready Data Collection

```python
import logging
import time
import requests
import pandas as pd
from typing import Any, Dict, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class ProductionDataCollector:
    """Production-grade data collection with retries, rate limiting, and validation."""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None, 
                 max_retries: int = 3, timeout: int = 15):
        self.base_url = base_url
        self.api_key = api_key
        self.max_retries = max_retries
        self.timeout = timeout
        self.session = requests.Session()
        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_with_retry(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/{endpoint}"
        response = self.session.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()
        
    def execute(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute data collection with full error handling and logging."""
        try:
            raw_data = self._fetch_with_retry(endpoint, params)
            df = pd.DataFrame(raw_data if isinstance(raw_data, list) else [raw_data])
            
            # Basic schema validation
            required_cols = ['id', 'timestamp', 'value']
            missing_cols = [c for c in required_cols if c not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")
                
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.dropna(subset=['value'])
            
            return {
                'status': 'success',
                'records_collected': len(df),
                'data': df,
                'metadata': {'source': endpoint, 'columns': list(df.columns)}
            }
        except Exception as e:
            logger.error(f"Collection failed for {endpoint}: {e}")
            return {'status': 'failed', 'error': str(e), 'data': pd.DataFrame()}
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