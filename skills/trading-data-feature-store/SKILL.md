---
name: trading-data-feature-store
description: Feature storage and management for machine learning trading models
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: data feature store, data-feature-store, machine, management, ml, storage,
    machine learning, ai
  related-skills: trading-ai-order-flow-analysis, trading-data-alternative-data, trading-data-backfill-strategy
    trading-data-order-book
---

**Role:** Store and retrieve engineered features for consistent model training and inference

**Philosophy:** Features are the foundation of ML models; feature store ensures reproducibility and consistency across training and production

## Key Principles

1. **Feature Versioning**: Version features to track changes and enable rollback
2. **Feature Lineage**: Track feature origins and transformations
3. **Offline vs Online Store**: Separate storage for training and real-time inference
4. **Feature Discovery**: Searchable catalog of available features
5. **Consistency Checks**: Validate feature consistency across store types

## Implementation Guidelines

### Structure
- Core logic: features/feature_store.py
- Offline store: features/offline_store.py
- Online store: features/online_store.py
- Tests: tests/test_feature_store.py

### Patterns to Follow
- Use DuckDB or Parquet for offline storage
- Use Redis or Memcached for online storage
- Implement feature groups for batch operations
- Support time-travel queries

## Adherence Checklist
Before completing your task, verify:
- [ ] Feature versioning is enforced
- [ ] Lineage tracking is maintained
- [ ] Offline and online stores are synchronized
- [ ] Feature queries include metadata
- [ ] Consistency checks run on sync


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
import uuid
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import hashlib
import logging

class FeatureType(Enum):
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"
    EMBEDDING = "embedding"

@dataclass
class FeatureMetadata:
    """Metadata for a feature."""
    name: str
    feature_type: FeatureType
    description: str = ""
    default_value: Any = None
    valid_range: Tuple[Any, Any] = None
    categories: List[str] = None
    version: int = 1

@dataclass
class FeatureVersion:
    """Version of a feature."""
    version: int
    created_at: float
    definition: Dict[str, Any]
    metadata: FeatureMetadata
    checksum: str

@dataclass
class FeatureGroup:
    """Group of related features."""
    name: str
    description: str
    features: List[str]
    version: int = 1
    created_at: float = field(default_factory=time.time)

class FeatureStore:
    """Manages features for ML models."""
    
    def __init__(self):
        self.features: Dict[str, List[FeatureVersion]] = {}
        self.feature_groups: Dict[str, FeatureGroup] = {}
        self.metadata: Dict[str, FeatureMetadata] = {}
        self._initialize_default_features()
    
    def _initialize_default_features(self):
        """Initialize default feature definitions."""
        # Price-based features
        self.register_feature(
            "price_return_1h",
            FeatureMetadata(
                name="price_return_1h",
                feature_type=FeatureType.NUMERIC,
                description="1-hour price return",
                valid_range=(-1.0, 1.0)
            )
        )
        
        self.register_feature(
            "price_volatility_24h",
            FeatureMetadata(
                name="price_volatility_24h",
                feature_type=FeatureType.NUMERIC,
                description="24-hour price volatility",
                valid_range=(0.0, 0.5)
            )
        )
        
        # Volume-based features
        self.register_feature(
            "volume_zscore_1h",
            FeatureMetadata(
                name="volume_zscore_1h",
                feature_type=FeatureType.NUMERIC,
                description="1-hour volume z-score",
                valid_range=(-10.0, 10.0)
            )
        )
    
    def register_feature(self, name: str, metadata: FeatureMetadata):
        """Register a new feature."""
        if name not in self.metadata:
            self.metadata[name] = metadata
            self.features[name] = []
        
        # Create initial version
        version_data = {
            "metadata": metadata.__dict__,
            "created_at": time.time()
        }
        
        checksum = hashlib.md5(
            str(version_data).encode()
        ).hexdigest()
        
        version = FeatureVersion(
            version=1,
            created_at=time.time(),
            definition=version_data,
            metadata=metadata,
            checksum=checksum
        )
        
        self.features[name].append(version)
    
    def register_feature_group(self, group: FeatureGroup):
        """Register a feature group."""
        self.feature_groups[group.name] = group
    
    def get_feature(self, name: str, version: int = None) -> Optional[FeatureVersion]:
        """Get feature by name and optional version."""
        if name not in self.features:
            return None
        
        versions = self.features[name]
        if version is None:
            return versions[-1]  # Latest version
        
        for v in reversed(versions):
            if v.version == version:
                return v
        return None
    
    def get_feature_metadata(self, name: str) -> Optional[FeatureMetadata]:
        """Get feature metadata."""
        return self.metadata.get(name)
    
    def get_features_by_group(self, group_name: str) -> List[str]:
        """Get all features in a group."""
        group = self.feature_groups.get(group_name)
        if group:
            return group.features
        return []
    
    def search_features(self, keyword: str) -> List[FeatureMetadata]:
        """Search features by keyword."""
        results = []
        for name, metadata in self.metadata.items():
            if keyword.lower() in name.lower() or keyword.lower() in metadata.description.lower():
                results.append(metadata)
        return results
    
    def log_feature_values(
        self,
        symbol: str,
        timestamp: float,
        features: Dict[str, Any]
    ):
        """Log feature values for a timestamp."""
        # This would persist to storage in a real implementation
        logging.debug(
            f"Logged features for {symbol} at {datetime.fromtimestamp(timestamp)}"
        )
    
    def get_feature_values(
        self,
        symbol: str,
        feature_names: List[str],
        start_time: float,
        end_time: float
    ) -> Optional[Dict[str, List[Any]]]:
        """Retrieve feature values for a time range."""
        # This would query storage in a real implementation
        return None  # Placeholder
    
    def get_current_features(
        self,
        symbol: str,
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """Get most recent feature values."""
        # This would query online store in a real implementation
        return {name: 0.0 for name in feature_names}

class FeatureValidator:
    """Validates feature values."""
    
    def __init__(self, store: FeatureStore):
        self.store = store
    
    def validate_feature_value(
        self,
        name: str,
        value: Any
    ) -> Tuple[bool, Optional[str]]:
        """Validate a feature value."""
        metadata = self.store.get_feature_metadata(name)
        if not metadata:
            return False, f"Unknown feature: {name}"
        
        # Type check
        if not self._check_type(value, metadata.feature_type):
            return False, f"Invalid type for {name}"
        
        # Range check
        if metadata.valid_range:
            min_val, max_val = metadata.valid_range
            if value < min_val or value > max_val:
                return False, f"Value {value} out of range [{min_val}, {max_val}]"
        
        # Categorical check
        if metadata.categories and value not in metadata.categories:
            return False, f"Value {value} not in categories {metadata.categories}"
        
        return True, None
    
    def _check_type(self, value: Any, feature_type: FeatureType) -> bool:
        """Check if value matches feature type."""
        type_map = {
            FeatureType.NUMERIC: (int, float),
            FeatureType.CATEGORICAL: str,
            FeatureType.BOOLEAN: bool,
            FeatureType.TEXT: str,
            FeatureType.EMBEDDING: list
        }
        
        valid_types = type_map.get(feature_type, (int, float, str))
        return isinstance(value, valid_types)
    
    def validate_batch(
        self,
        feature_values: Dict[str, Any]
    ) -> List[Tuple[str, Optional[str]]]:
        """Validate multiple feature values."""
        results = []
        for name, value in feature_values.items():
            valid, error = self.validate_feature_value(name, value)
            results.append((name, error))
        return results

class FeatureCache:
    """Cache for frequently accessed features."""
    
    def __init__(self, max_size: int = 10000, ttl: float = 300.0):
        self.max_size = max_size
        self.ttl = ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = None  # Would use threading.Lock in practice
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached feature value."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        """Set cached feature value."""
        if len(self._cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
        self._cache[key] = (value, time.time())
    
    def delete(self, key: str):
        """Delete feature from cache."""
        if key in self._cache:
            del self._cache[key]
```