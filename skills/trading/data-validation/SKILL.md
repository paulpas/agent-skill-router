---
name: validation
description: '"Provides Data validation and quality assurance for trading data pipelines"'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: assurance, data validation, data-validation, quality, trading
  related-skills: ai-order-flow-analysis, data-alternative-data
---



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