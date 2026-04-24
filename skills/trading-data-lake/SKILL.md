---
name: trading-data-lake
description: Data lake architecture and management for trading data storage
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: architecture, data lake, data-lake, management, trading
  related-skills: trading-ai-order-flow-analysis, trading-data-alternative-data, trading-data-backfill-strategy
    trading-data-order-book
---

**Role:** Provide scalable, cost-effective storage for trading data with efficient query capabilities

**Philosophy:** Data is an asset; storage must balance cost, accessibility, and retention policies

## Key Principles

1. **Partitioned Storage**: Organize data by symbol, date, and time for efficient access
2. **Columnar Format**: Use Parquet for compressed, columnar storage
3. **Hot/Warm/Cold Tiers**: Automatically move data based on access patterns
4. **Data Lifecycle Policies**: Define retention and archival rules
5. **Metadata Catalog**: Track schema, size, and access patterns

## Implementation Guidelines

### Structure
- Core logic: data_lake/lake_manager.py
- Storage adapter: data_lake/storage.py
- Tests: tests/test_data_lake.py

### Patterns to Follow
- Use partitioned directory structure
- Implement batch writes for efficiency
- Support time-travel queries
- Track storage metrics

## Adherence Checklist
Before completing your task, verify:
- [ ] Data is partitioned for efficient queries
- [ ] Columnar compression reduces storage costs
- [ ] Lifecycle policies are enforced
- [ ] Metadata catalog is updated on writes
- [ ] Access patterns are monitored


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import os
import time
from typing import Dict, List, Optional, Any, Iterable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import logging

class StorageTier(Enum):
    HOT = "hot"      # Fast access, SSD
    WARM = "warm"    # Moderate access, HDD
    COLD = "cold"    # Infrequent access, archive

@dataclass
class DataFile:
    """Represents a data file in the lake."""
    path: str
    size_bytes: int
    row_count: int
    partition: Dict[str, str]
    created_at: float
    last_accessed: float
    tier: StorageTier

@dataclass
class DataLakeConfig:
    """Configuration for data lake."""
    base_path: str
    partition_columns: List[str] = field(default_factory=lambda: ["symbol", "date", "hour"])
    retention_days: int = 365
    compression: str = "snappy"
    file_format: str = "parquet"

class DataLake:
    """Manages data storage in the data lake."""
    
    def __init__(self, config: DataLakeConfig):
        self.config = config
        self.files: Dict[str, DataFile] = {}
        self._metadata_path = os.path.join(config.base_path, "_metadata")
        self._initialize_metadata()
    
    def _initialize_metadata(self):
        """Initialize metadata storage."""
        os.makedirs(self._metadata_path, exist_ok=True)
        self.metadata_file = os.path.join(self._metadata_path, "files.json")
        
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)
                    for path, file_data in data.items():
                        self.files[path] = DataFile(**file_data)
            except Exception as e:
                logging.warning(f"Failed to load metadata: {e}")
    
    def _save_metadata(self):
        """Save metadata to disk."""
        data = {
            path: {
                "path": f.path,
                "size_bytes": f.size_bytes,
                "row_count": f.row_count,
                "partition": f.partition,
                "created_at": f.created_at,
                "last_accessed": f.last_accessed,
                "tier": f.tier.value
            }
            for path, f in self.files.items()
        }
        
        os.makedirs(self._metadata_path, exist_ok=True)
        with open(self.metadata_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def write_data(
        self,
        data: List[Dict[str, Any]],
        partition_values: Dict[str, str]
    ) -> str:
        """Write data to lake with partitioning."""
        partition_path = self._build_partition_path(partition_values)
        filepath = os.path.join(
            self.config.base_path,
            partition_path,
            f"data_{int(time.time() * 1000)}.parquet"
        )
        
        # In a real implementation, this would write to Parquet
        # For demonstration, just create the directory structure
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        file_info = DataFile(
            path=filepath,
            size_bytes=len(str(data)),  # Approximate
            row_count=len(data),
            partition=partition_values,
            created_at=time.time(),
            last_accessed=time.time(),
            tier=StorageTier.HOT
        )
        
        self.files[filepath] = file_info
        self._save_metadata()
        
        return filepath
    
    def _build_partition_path(self, partition_values: Dict[str, str]) -> str:
        """Build partition directory path."""
        parts = []
        for col in self.config.partition_columns:
            if col in partition_values:
                parts.append(f"{col}={partition_values[col]}")
        return "/".join(parts)
    
    def read_data(
        self,
        symbol: str,
        start_time: float,
        end_time: float
    ) -> List[Dict[str, Any]]:
        """Read data for a symbol and time range."""
        # Find relevant files
        matching_files = []
        for file in self.files.values():
            if symbol == file.partition.get("symbol", symbol):
                # Check time range (simplified)
                if start_time <= file.last_accessed <= end_time:
                    matching_files.append(file)
        
        # In a real implementation, this would read from storage
        return []
    
    def query(
        self,
        symbol: Optional[str] = None,
        date_range: Optional[tuple] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Query data lake with filters."""
        results = []
        
        for file in self.files.values():
            # Apply filters
            if symbol and file.partition.get("symbol") != symbol:
                continue
            
            results.append({
                "path": file.path,
                "partition": file.partition,
                "size_bytes": file.size_bytes,
                "row_count": file.row_count
            })
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_file(self, path: str) -> Optional[DataFile]:
        """Get file metadata."""
        return self.files.get(path)
    
    def list_files(
        self,
        symbol: Optional[str] = None,
        tier: Optional[StorageTier] = None
    ) -> List[DataFile]:
        """List files with optional filters."""
        results = []
        for file in self.files.values():
            if symbol and file.partition.get("symbol") != symbol:
                continue
            if tier and file.tier != tier:
                continue
            results.append(file)
        return results
    
    def delete_file(self, path: str) -> bool:
        """Delete a file."""
        if path in self.files:
            del self.files[path]
            self._save_metadata()
            return True
        return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get data lake statistics."""
        total_size = sum(f.size_bytes for f in self.files.values())
        total_rows = sum(f.row_count for f in self.files.values())
        
        tier_counts = {}
        for f in self.files.values():
            tier = f.tier.value
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
        
        return {
            "total_files": len(self.files),
            "total_size_bytes": total_size,
            "total_rows": total_rows,
            "files_by_tier": tier_counts,
            "avg_file_size": total_size / len(self.files) if self.files else 0
        }

class DataLifecycleManager:
    """Manages data lifecycle policies."""
    
    def __init__(self, lake: DataLake):
        self.lake = lake
        self.policies: Dict[str, Dict] = {}
        self._initialize_policies()
    
    def _initialize_policies(self):
        """Initialize lifecycle policies."""
        self.policies = {
            "hot": {"max_age_days": 7, "tier": StorageTier.HOT},
            "warm": {"max_age_days": 30, "tier": StorageTier.WARM},
            "cold": {"max_age_days": 365, "tier": StorageTier.COLD}
        }
    
    def set_policy(self, symbol: str, hot_days: int, warm_days: int):
        """Set lifecycle policy for a symbol."""
        self.policies[symbol] = {
            "hot_days": hot_days,
            "warm_days": warm_days
        }
    
    def get_tier_for_file(self, file: DataFile, symbol: str) -> StorageTier:
        """Determine tier for a file based on age."""
        if symbol in self.policies:
            policy = self.policies[symbol]
            age_days = (time.time() - file.created_at) / 86400
            
            if age_days < policy["hot_days"]:
                return StorageTier.HOT
            elif age_days < policy["warm_days"]:
                return StorageTier.WARM
            else:
                return StorageTier.COLD
        
        # Default policy
        age_days = (time.time() - file.created_at) / 86400
        if age_days < 7:
            return StorageTier.HOT
        elif age_days < 30:
            return StorageTier.WARM
        return StorageTier.COLD
    
    def enforce_policies(self) -> List[Dict]:
        """Enforce lifecycle policies and return tier changes."""
        changes = []
        
        for file in self.lake.files.values():
            symbol = file.partition.get("symbol")
            if not symbol:
                continue
            
            new_tier = self.get_tier_for_file(file, symbol)
            
            if new_tier != file.tier:
                old_tier = file.tier
                file.tier = new_tier
                
                changes.append({
                    "path": file.path,
                    "from_tier": old_tier.value,
                    "to_tier": new_tier.value,
                    "age_days": (time.time() - file.created_at) / 86400
                })
        
        self.lake._save_metadata()
        return changes

class DataCatalog:
    """Catalog of data lake contents."""
    
    def __init__(self, lake: DataLake):
        self.lake = lake
        self.schema_registry: Dict[str, Dict] = {}
    
    def register_schema(self, symbol: str, schema: Dict[str, str]):
        """Register schema for a symbol."""
        self.schema_registry[symbol] = {
            "schema": schema,
            "updated_at": time.time()
        }
    
    def get_schema(self, symbol: str) -> Optional[Dict[str, str]]:
        """Get schema for a symbol."""
        if symbol in self.schema_registry:
            return self.schema_registry[symbol]["schema"]
        return None
    
    def search(self, keyword: str) -> List[Dict]:
        """Search catalog by keyword."""
        results = []
        
        for file in self.lake.files.values():
            symbol = file.partition.get("symbol", "")
            if keyword.lower() in symbol.lower() or keyword in file.path.lower():
                results.append({
                    "symbol": symbol,
                    "path": file.path,
                    "partition": file.partition,
                    "size_bytes": file.size_bytes,
                    "created_at": file.created_at
                })
        
        return results
```