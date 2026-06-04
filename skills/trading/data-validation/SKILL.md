---
name: data-validation
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Provides Data validation and quality assurance for trading data pipelines"'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data
  role: implementation
  scope: implementation
  triggers: assurance, data validation, data-validation, quality, trading
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
**Role:** Ensure trading data meets quality standards before processing to prevent bad decisions

**Philosophy:** Garbage in, garbage out; validating data at pipeline boundaries catches errors early and prevents cascading failures

## Key Principles

1. **Schema Validation**: Strict schema enforcement with typed dataclasses
2. **Range Checks**: Validate values against expected ranges and business rules
3. **Consistency Checks**: Ensure related data is coherent
4. **Missing Data Detection**: Identify and handle missing or null values
5. **Data Quality Metrics**: Track validation success rates and error patterns

## Implementation Guidelines

### Structure
- Core logic: validation/data_validator.py
- Schemas: validation/schemas.py
- Tests: tests/test_data_validation.py

### Patterns to Follow
- Use Pydantic or dataclasses for schema definition
- Implement validation as pure functions
- Return detailed validation errors with context
- Support both synchronous and asynchronous validation

## Adherence Checklist
Before completing your task, verify:
- [ ] All required fields are validated
- [ ] Range constraints are enforced
- [ ] Cross-field consistency is checked
- [ ] Validation errors include field paths
- [ ] Metrics are collected for monitoring


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging

class ValidationErrorType(Enum):
    MISSING = "missing"
    INVALID_TYPE = "invalid_type"
    OUT_OF_RANGE = "out_of_range"
    CONSISTENCY = "consistency"
    FORMAT = "format"
    BUSINESS_RULE = "business_rule"

@dataclass
class ValidationError:
    """Represents a single validation error."""
    field: str
    error_type: ValidationErrorType
    message: str
    value: Any
    context: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "field": self.field,
            "error_type": self.error_type.value,
            "message": self.message,
            "value": self.value,
            "context": self.context
        }

@dataclass
class ValidationResult:
    """Result of data validation."""
    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)
    processed_at: float = field(default_factory=time.time)
    
    def add_error(self, error: ValidationError):
        """Add error to validation result."""
        self.errors.append(error)
        self.is_valid = False
    
    def add_warning(self, warning: ValidationError):
        """Add warning to validation result."""
        self.warnings.append(warning)
    
    def to_dict(self) -> Dict:
        return {
            "is_valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
            "processed_at": self.processed_at
        }

class DataValidator:
    """Validates trading data according to defined rules."""
    
    def __init__(self):
        self.validators: Dict[str, List[callable]] = {}
        self._initialize_default_validators()
    
    def _initialize_default_validators(self):
        """Initialize default validators for common data types."""
        self.register_validator("price", self._validate_price)
        self.register_validator("quantity", self._validate_quantity)
        self.register_validator("timestamp", self._validate_timestamp)
        self.register_validator("symbol", self._validate_symbol)
        self.register_validator("candle", self._validate_candle)
        self.register_validator("orderbook", self._validate_orderbook)
    
    def register_validator(self, data_type: str, validator_func: callable):
        """Register a custom validator function."""
        if data_type not in self.validators:
            self.validators[data_type] = []
        self.validators[data_type].append(validator_func)
    
    def validate(self, data: Any, schema: str = None) -> ValidationResult:
        """Validate data against schema."""
        result = ValidationResult(is_valid=True)
        
        if schema and schema in self.validators:
            for validator in self.validators[schema]:
                try:
                    validation_result = validator(data, result)
                    if validation_result:
                        result.add_error(validation_result)
                except Exception as e:
                    result.add_error(ValidationError(
                        field="validation",
                        error_type=ValidationErrorType.BUSINESS_RULE,
                        message=f"Validator error: {str(e)}",
                        value=str(validator)
                    ))
        
        return result
    
    def _validate_price(self, data: Any, result: ValidationResult) -> Optional[ValidationError]:
        """Validate price value."""
        if data is None:
            return ValidationError(
                field="price",
                error_type=ValidationErrorType.MISSING,
                message="Price is required",
                value=None
            )
        
        if not isinstance(data, (int, float)):
            return ValidationError(
                field="price",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Price must be numeric",
                value=data
            )
        
        if data <= 0:
            return ValidationError(
                field="price",
                error_type=ValidationErrorType.OUT_OF_RANGE,
                message="Price must be positive",
                value=data
            )
        
        return None
    
    def _validate_quantity(self, data: Any, result: ValidationResult) -> Optional[ValidationError]:
        """Validate quantity value."""
        if data is None:
            return ValidationError(
                field="quantity",
                error_type=ValidationErrorType.MISSING,
                message="Quantity is required",
                value=None
            )
        
        if not isinstance(data, (int, float)):
            return ValidationError(
                field="quantity",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Quantity must be numeric",
                value=data
            )
        
        if data <= 0:
            return ValidationError(
                field="quantity",
                error_type=ValidationErrorType.OUT_OF_RANGE,
                message="Quantity must be positive",
                value=data
            )
        
        return None
    
    def _validate_timestamp(self, data: Any, result: ValidationResult) -> Optional[ValidationError]:
        """Validate timestamp value."""
        if data is None:
            return ValidationError(
                field="timestamp",
                error_type=ValidationErrorType.MISSING,
                message="Timestamp is required",
                value=None
            )
        
        if not isinstance(data, (int, float)):
            return ValidationError(
                field="timestamp",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Timestamp must be numeric",
                value=data
            )
        
        # Check if timestamp is reasonable (within last year or next day)
        current_time = time.time()
        valid_range = 365 * 24 * 3600  # 1 year
        if abs(data - current_time) > valid_range:
            return ValidationError(
                field="timestamp",
                error_type=ValidationErrorType.OUT_OF_RANGE,
                message="Timestamp appears invalid",
                value=data,
                context={"expected_range": f"±{valid_range}s from now"}
            )
        
        return None
    
    def _validate_symbol(self, data: Any, result: ValidationResult) -> Optional[ValidationError]:
        """Validate symbol value."""
        if data is None:
            return ValidationError(
                field="symbol",
                error_type=ValidationErrorType.MISSING,
                message="Symbol is required",
                value=None
            )
        
        if not isinstance(data, str):
            return ValidationError(
                field="symbol",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Symbol must be string",
                value=data
            )
        
        if not data or len(data) < 1:
            return ValidationError(
                field="symbol",
                error_type=ValidationErrorType.FORMAT,
                message="Symbol cannot be empty",
                value=data
            )
        
        return None
    
    def _validate_candle(self, data: Any, result: ValidationResult) -> Optional[ValidationError]:
        """Validate candle data structure."""
        if not isinstance(data, dict):
            return ValidationError(
                field="candle",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Candle must be a dictionary",
                value=data
            )
        
        required_fields = ["timestamp", "open", "high", "low", "close", "volume"]
        for field in required_fields:
            if field not in data:
                return ValidationError(
                    field=f"candle.{field}",
                    error_type=ValidationErrorType.MISSING,
                    message=f"Required field missing: {field}",
                    value=data
                )
        
        # Validate individual fields
        price_validation = self._validate_price(data.get("open"), result)
        if price_validation:
            return ValidationError(
                field="candle.open",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Invalid open price",
                value=data.get("open"),
                context={"original_error": price_validation.message}
            )
        
        return None
    
    def _validate_orderbook(self, data: Any, result: ValidationResult) -> Optional[ValidationError]:
        """Validate orderbook data structure."""
        if not isinstance(data, dict):
            return ValidationError(
                field="orderbook",
                error_type=ValidationErrorType.INVALID_TYPE,
                message="Orderbook must be a dictionary",
                value=data
            )
        
        if "bids" not in data or "asks" not in data:
            return ValidationError(
                field="orderbook",
                error_type=ValidationErrorType.MISSING,
                message="Orderbook must have bids and asks",
                value=data
            )
        
        # Validate bids and asks are lists
        for side in ["bids", "asks"]:
            if not isinstance(data[side], list):
                return ValidationError(
                    field=f"orderbook.{side}",
                    error_type=ValidationErrorType.INVALID_TYPE,
                    message=f"{side} must be a list",
                    value=data[side]
                )
        
        return None

class ValidationPipeline:
    """Pipeline for multi-stage data validation."""
    
    def __init__(self, validators: List[DataValidator] = None):
        self.validators = validators or []
        self.metrics = {
            "total_validated": 0,
            "valid_count": 0,
            "invalid_count": 0,
            "warning_count": 0
        }
    
    def add_validator(self, validator: DataValidator):
        """Add validator to pipeline."""
        self.validators.append(validator)
    
    def validate(self, data: Any) -> ValidationResult:
        """Run validation through all validators."""
        result = ValidationResult(is_valid=True)
        self.metrics["total_validated"] += 1
        
        for validator in self.validators:
            validation = validator.validate(data)
            
            if not validation.is_valid:
                result.is_valid = False
                
                for error in validation.errors:
                    result.add_error(error)
                
                for warning in validation.warnings:
                    result.add_warning(warning)
                    self.metrics["warning_count"] += 1
            
            if not validation.is_valid:
                self.metrics["invalid_count"] += 1
            else:
                self.metrics["valid_count"] += 1
        
        return result
    
    def get_metrics(self) -> Dict:
        """Get validation metrics."""
        return self.metrics.copy()

class BatchValidator:
    """Validates batches of data with aggregated reporting."""
    
    def __init__(self, validator: DataValidator, batch_size: int = 1000):
        self.validator = validator
        self.batch_size = batch_size
        self.results: List[ValidationResult] = []
    
    def validate_batch(self, data_list: List[Any]) -> List[ValidationResult]:
        """Validate a batch of data items."""
        results = []
        for data in data_list:
            result = self.validator.validate(data)
            results.append(result)
            self.results.append(result)
        
        return results
    
    def get_aggregate_report(self) -> Dict:
        """Get aggregate report of validation results."""
        valid = sum(1 for r in self.results if r.is_valid)
        invalid = len(self.results) - valid
        total_errors = sum(len(r.errors) for r in self.results)
        
        error_summary = {}
        for result in self.results:
            for error in result.errors:
                key = f"{error.field}:{error.error_type.value}"
                error_summary[key] = error_summary.get(key, 0) + 1
        
        return {
            "total_items": len(self.results),
            "valid_items": valid,
            "invalid_items": invalid,
            "total_errors": total_errors,
            "error_breakdown": error_summary,
            "valid_rate": valid / len(self.results) if self.results else 0
        }
```

---

---


### Pattern 2: Schema Validation with Pydantic for Financial Data

```python
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


logger = logging.getLogger(__name__)


# --- Input Schemas (Parse Don't Validate — validated at boundary) ---

class TickData(BaseModel):
    """Validated tick record with strict constraints."""
    symbol: str = Field(min_length=3, max_length=20, pattern=r'^[A-Z]+/[A-Z]+$')
    price: Decimal = Field(gt=0)
    size: Decimal = Field(gte=0)
    side: str = Field(pattern=r'^(buy|sell)$')
    timestamp_ms: int = Field(gt=0)
    exchange: str = Field(min_length=1)

    @field_validator("timestamp_ms")
    @classmethod
    def validate_timestamp_recent(cls, v: int) -> int:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        if now_ms - v > 30_000:  # Stale by more than 30 seconds
            raise ValueError("Timestamp is stale — data may be too old to trade on")
        return v


class CandleData(BaseModel):
    """Validated OHLCV candle with cross-field validation."""
    symbol: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    open_price: Decimal = Field(gt=0)
    high_price: Decimal
    low_price: Decimal
    close_price: Decimal = Field(gt=0)
    volume: Decimal = Field(gte=0)

    @field_validator("high_price")
    @classmethod
    def validate_high_not_below_prices(cls, v, info):
        data = info.data
        if v < data.get("open_price", 0) or v < data.get("low_price", 0):
            raise ValueError(f"High ({v}) must be >= open and low")
        return v

    @field_validator("low_price")
    @classmethod
    def validate_low_not_above_prices(cls, v, info):
        data = info.data
        if v > data.get("open_price", 0) or v > data.get("high_price", 0):
            raise ValueError(f"Low ({v}) must be <= open and high")
        return v


class ValidationResult(BaseModel):
    """Result of validating a batch of records."""
    total: int
    valid: int
    invalid: int
    errors: list[dict] = Field(default_factory=list)

    @property
    def pass_rate(self) -> float:
        return self.valid / self.total if self.total > 0 else 0.0


class DataValidator:
    """Validates batches of financial data against schema constraints."""

    def validate_ticks(self, raw_records: list[dict]) -> ValidationResult:
        results = ValidationResult(total=len(raw_records), valid=0, invalid=0)
        for i, record in enumerate(raw_records):
            try:
                TickData(**record)
                results.valid += 1
            except Exception as e:
                results.invalid += 1
                results.errors.append({
                    "index": i,
                    "error": str(e),
                    "record_sample": {k: v for k, v in list(record.items())[:3]},
                })
        logger.info(
            "Tick validation: %d/%d valid (%.1f%% pass rate)",
            results.valid, results.total, results.pass_rate * 100,
        )
        return results

    def validate_candles(self, raw_records: list[dict]) -> ValidationResult:
        results = ValidationResult(total=len(raw_records), valid=0, invalid=0)
        for i, record in enumerate(raw_records):
            try:
                CandleData(**record)
                results.valid += 1
            except Exception as e:
                results.invalid += 1
                results.errors.append({
                    "index": i,
                    "error": str(e),
                })
        logger.info(
            "Candle validation: %d/%d valid (%.1f%% pass rate)",
            results.valid, results.total, results.pass_rate * 100,
        )
        return results
```

## Constraints

### MUST DO
- Validate all incoming data against schema constraints (type, range, nullability) before processing or storage
- Implement idempotent operations: re-processing the same data must produce identical results
- Track data lineage and provenance with timestamps, source identifiers, and transformation history for every record
- Handle out-of-order data by implementing a watermark-based ordering mechanism with configurable tolerance window
- Log data quality metrics (completeness, freshness, accuracy) per source with automatic alerting on degradation

### MUST NOT DO
- Do not silently drop records that fail validation — log them to a quarantine table for review
- Avoid concatenating strings for timestamp comparison; use proper datetime/timedelta objects
- Never assume data arrives in chronological order from any external feed without explicit ordering guarantees
- Do not store raw and processed data in the same table without clear partitioning or separation strategy
- Avoid blocking on slow data sources — implement async prefetch with timeout-based fallback to cached data


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Great Expectations Documentation](https://greatexpectations.io/)
- [Data Quality Testing Best Practices](https://www.oreilly.com/radar/data-quality-in-the-age-of-ml/)
- [Validating Market Data Integrity](https://docs.quantconnect.com/tutorials/data-sources-and-format)
- [Schema Validation with Pandas](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.validate.html)
- [Automated Data Quality Pipelines](https://greatexpectations.io/quickstart_guide/)
