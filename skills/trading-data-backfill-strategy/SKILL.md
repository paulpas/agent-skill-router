---
name: trading-data-backfill-strategy
description: Strategic data backfill for populating historical data in trading systems
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: data backfill strategy, data-backfill-strategy, historical, populating,
    strategic
  related-skills: trading-ai-order-flow-analysis, trading-data-alternative-data, trading-data-candle-data, trading-data-validation
    trading-data-order-book
---

**Role:** Efficiently populate and maintain historical data for analysis and backtesting

**Philosophy:** Historical data quality determines backtest accuracy; backfill must be comprehensive, efficient, and auditable

## Key Principles

1. **Incremental Backfill**: Only fetch missing data to reduce API load
2. **Batch Processing**: Process data in optimized batches
3. **Gap Detection**: Identify and fill missing data periods
4. **Data Versioning**: Track backfill versions for reproducibility
5. **Progress Tracking**: Monitor and resume interrupted backfills

## Implementation Guidelines

### Structure
- Core logic: backfill/backfill_manager.py
- Gap finder: backfill/finder.py
- Tests: tests/test_backfill.py

### Patterns to Follow
- Use parallel processing for efficiency
- Implement backfill checkpoints
- Support multiple data sources
- Track backfill performance metrics

## Adherence Checklist
Before completing your task, verify:
- [ ] Incremental backfill reduces API calls
- [ ] Gaps are detected and filled
- [ ] Backfill progress is persisted
- [ ] Interrupted backfills can resume
- [ ] Backfill quality is validated


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging

class BackfillStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

@dataclass
class BackfillTask:
    """Represents a backfill task."""
    task_id: str
    symbol: str
    start_time: float
    end_time: float
    status: BackfillStatus = BackfillStatus.PENDING
    data_type: str = "candles"
    progress: float = 0.0
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    error: Optional[str] = None

@dataclass
class BackfillConfig:
    """Configuration for backfill."""
    batch_size: int = 1000
    parallel_workers: int = 4
    max_retries: int = 3
    retry_delay_seconds: float = 60.0
    rate_limit_per_second: int = 10

class BackfillManager:
    """Manages historical data backfill operations."""
    
    def __init__(self, config: BackfillConfig, data_source: Any):
        self.config = config
        self.data_source = data_source
        self.tasks: Dict[str, BackfillTask] = {}
        self.progress: Dict[str, Dict[str, Any]] = {}
        self._lock = None
    
    def create_backfill_task(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        data_type: str = "candles"
    ) -> str:
        """Create a new backfill task."""
        task_id = f"backfill_{symbol}_{int(start_time)}_{int(end_time)}"
        
        task = BackfillTask(
            task_id=task_id,
            symbol=symbol,
            start_time=start_time,
            end_time=end_time,
            data_type=data_type
        )
        
        self.tasks[task_id] = task
        return task_id
    
    async def execute_backfill(self, task_id: str) -> bool:
        """Execute a backfill task."""
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        task.status = BackfillStatus.RUNNING
        task.started_at = time.time()
        
        try:
            await self._execute_backfill_internal(task)
            task.status = BackfillStatus.COMPLETED
            task.completed_at = time.time()
            return True
            
        except Exception as e:
            task.status = BackfillStatus.FAILED
            task.error = str(e)
            task.completed_at = time.time()
            logging.error(f"Backfill failed for {task_id}: {e}")
            return False
    
    async def _execute_backfill_internal(self, task: BackfillTask):
        """Internal backfill execution."""
        # Detect gaps first
        gaps = await self._detect_gaps(task.symbol, task.start_time, task.end_time)
        
        if not gaps:
            task.progress = 100.0
            return
        
        # Process each gap
        total_gaps = len(gaps)
        processed = 0
        
        for gap in gaps:
            start, end = gap
            await self._fetch_and_store(task.symbol, start, end, task.data_type)
            processed += 1
            task.progress = (processed / total_gaps) * 100
        
        task.progress = 100.0
    
    async def _detect_gaps(
        self,
        symbol: str,
        start_time: float,
        end_time: float
    ) -> List[Tuple[float, float]]:
        """Detect gaps in existing data."""
        # This would query the data store in a real implementation
        # For example, if we have data from 2020-01-01 to 2020-06-01
        # and 2020-07-01 to 2020-12-01, gaps would be [(2020-06-01, 2020-07-01)]
        
        # Simplified: return the requested range as gap
        # In reality, would check existing data
        return [(start_time, end_time)]
    
    async def _fetch_and_store(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        data_type: str
    ):
        """Fetch and store data for a time range."""
        # Calculate required range based on data type
        if data_type == "candles":
            # Fetch hourly candles
            interval = 3600  # 1 hour
        elif data_type == "tick":
            interval = 60  # 1 minute
        else:
            interval = 3600
        
        # Fetch in batches
        current_start = start_time
        while current_start < end_time:
            current_end = min(current_start + (self.config.batch_size * interval), end_time)
            
            # Fetch data
            data = await self._fetch_data(symbol, current_start, current_end, data_type)
            
            if data:
                # Store data
                await self._store_data(symbol, data, data_type)
            
            current_start = current_end
    
    async def _fetch_data(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        data_type: str
    ) -> List[Dict[str, Any]]:
        """Fetch data from external source."""
        # This would call the actual data source API
        # For now, return empty list (placeholder)
        return []
    
    async def _store_data(
        self,
        symbol: str,
        data: List[Dict[str, Any]],
        data_type: str
    ):
        """Store fetched data."""
        # This would persist data to the data store
        pass
    
    def get_task(self, task_id: str) -> Optional[BackfillTask]:
        """Get backfill task by ID."""
        return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> List[BackfillTask]:
        """Get all backfill tasks."""
        return list(self.tasks.values())
    
    def resume_task(self, task_id: str) -> bool:
        """Resume a paused or failed task."""
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        if task.status in [BackfillStatus.PAUSED, BackfillStatus.FAILED]:
            task.status = BackfillStatus.RUNNING
            return True
        return False
    
    def pause_task(self, task_id: str) -> bool:
        """Pause a running task."""
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        if task.status == BackfillStatus.RUNNING:
            task.status = BackfillStatus.PAUSED
            return True
        return False

class GapFinder:
    """Finds gaps in historical data."""
    
    def __init__(self, data_store: Any):
        self.store = data_store
    
    async def find_gaps(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        interval_seconds: float
    ) -> List[Tuple[float, float]]:
        """Find gaps in data for a time range."""
        gaps = []
        
        # Get existing data timestamps
        existing = await self._get_existing_timestamps(symbol, start_time, end_time)
        
        if not existing:
            return [(start_time, end_time)]
        
        # Sort existing timestamps
        existing_sorted = sorted(existing)
        
        # Find gaps between consecutive timestamps
        for i in range(len(existing_sorted) - 1):
            current = existing_sorted[i]
            next_timestamp = existing_sorted[i + 1]
            
            expected_next = current + interval_seconds
            
            if next_timestamp > expected_next:
                gaps.append((expected_next, next_timestamp - 1))
        
        # Check for gaps at the beginning
        if existing_sorted[0] > start_time + interval_seconds:
            gaps.insert(0, (start_time, existing_sorted[0] - 1))
        
        # Check for gaps at the end
        if existing_sorted[-1] < end_time - interval_seconds:
            gaps.append((existing_sorted[-1] + interval_seconds, end_time))
        
        return gaps
    
    async def _get_existing_timestamps(
        self,
        symbol: str,
        start_time: float,
        end_time: float
    ) -> List[float]:
        """Get existing timestamps for symbol."""
        # This would query the data store
        return []
    
    async def fill_gaps(
        self,
        symbol: str,
        data_type: str,
        interval_seconds: float
    ) -> int:
        """Fill all gaps for a symbol. Returns number of gaps filled."""
        gaps = await self.find_gaps(symbol, 0, time.time(), interval_seconds)
        
        filled = 0
        for start, end in gaps:
            # Fetch and store missing data
            # Implementation would call backfill manager
            filled += 1
        
        return filled

class BackfillProgressTracker:
    """Tracks and persists backfill progress."""
    
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self._progress: Dict[str, Any] = {}
        self._load_progress()
    
    def _load_progress(self):
        """Load saved progress."""
        # This would read from persistent storage
        pass
    
    def save_progress(self, task_id: str, progress: float, current_time: float):
        """Save backfill progress."""
        self._progress[task_id] = {
            "progress": progress,
            "last_update": current_time
        }
        # Would persist to storage
    
    def get_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get saved progress for task."""
        return self._progress.get(task_id)
    
    def get_all_progress(self) -> Dict[str, Dict]:
        """Get progress for all tasks."""
        return self._progress.copy()

class BatchBackfillWorker:
    """Worker for parallel backfill processing."""
    
    def __init__(self, task_id: str, data_source: Any):
        self.task_id = task_id
        self.data_source = data_source
        self.completed_ranges: List[Tuple[float, float]] = []
    
    async def process_batch(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        data_type: str
    ) -> bool:
        """Process a single batch."""
        try:
            data = await self._fetch_data(symbol, start_time, end_time, data_type)
            
            if data:
                await self._store_data(symbol, data, data_type)
                self.completed_ranges.append((start_time, end_time))
                return True
            
            return False
            
        except Exception as e:
            logging.error(f"Batch processing failed: {e}")
            return False
    
    async def _fetch_data(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        data_type: str
    ) -> List[Dict[str, Any]]:
        """Fetch data for batch."""
        # Implementation
        return []
    
    async def _store_data(
        self,
        symbol: str,
        data: List[Dict[str, Any]],
        data_type: str
    ):
        """Store batch data."""
        # Implementation
        pass
    
    def get_completed_ranges(self) -> List[Tuple[float, float]]:
        """Get list of completed time ranges."""
        return self.completed_ranges
```