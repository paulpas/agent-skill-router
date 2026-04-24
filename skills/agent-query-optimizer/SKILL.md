---
name: agent-query-optimizer
description: Analyzes and optimizes database queries for performance, identifying
  bottlenecks and generating optimization recommendations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: optimization
  scope: query
  output-format: optimization
  triggers: database optimization, query optimization, query optimizer, query-optimizer, relational database, sql optimization, postgresql, postgres
  related-skills: agent-add-new-skill, agent-code-correctness-verifier, agent-confidence-based-selector, agent-goal-to-milestones
---




# Query Optimizer (Database Query Analysis)

> **Load this skill** when designing or modifying query optimization pipelines that analyze database queries, identify performance bottlenecks, and generate optimization recommendations.

## TL;DR Checklist

When optimizing database queries:

- [ ] Parse and analyze query structure
- [ ] Identify missing indexes and suboptimal joins
- [ ] Detect N+1 queries and inefficient patterns
- [ ] Calculate query complexity and estimated cost
- [ ] Generate optimization recommendations
- [ ] Validate optimizations with execution plans
- [ ] Track query performance over time
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use Query Optimizer when:

- Investigating slow database queries
- Optimizing application database performance
- Identifying missing indexes and statistics
- Reducing query execution times
- Analyzing query execution plans
- Query performance monitoring

---

## When NOT to Use

Avoid using Query Optimizer for:

- Single ad-hoc query analysis (use database CLI)
- Real-time query monitoring (use query profiler)
- Environments without query access
- Tasks where manual query tuning is preferred
- Non-SQL databases without query structure

---

## Core Concepts

### Query Optimization Pipeline

```
Query Optimization Pipeline
├── Query Parsing
│   ├── Syntax Validation
│   ├── Structure Extraction
│   └── Dependency Analysis
├── Analysis Phase
│   ├── Table Scans
│   ├── Join Operations
│   ├── Index Usage
│   └── Filter Efficiency
├── Bottleneck Detection
│   ├── Missing Indexes
│   ├── N+1 Queries
│   ├── Suboptimal Joins
│   └── Function Usage
├── Optimization Phase
│   ├── Index Recommendations
│   ├── Query Rewrite
│   ├── Caching Strategy
│   └── Partitioning
└── Validation Phase
    ├── Execution Plan
    ├── Performance Testing
    └── Impact Analysis
```

### Query Types

#### 1. SELECT Queries
```
Simple: Single table, basic filters
Complex: Multi-table joins, subqueries
Aggregated: GROUP BY, HAVING, aggregates
Window: Window functions, RANK, ROW_NUMBER
```

#### 2. DML Queries
```
INSERT: Bulk inserts, batch operations
UPDATE: Bulk updates, selective updates
DELETE: Bulk deletes, selective deletes
```

#### 3. Performance Indicators
```
Full Table Scans: No index used
High I/O: Large result sets
Long Execution: Complex operations
Lock Contention: Concurrent access issues
```

### Optimization Strategies

#### 1. Index Optimization
```
Add missing indexes on join/filter columns
Composite indexes for multi-column queries
Covering indexes to avoid table lookups
```

#### 2. Query Rewrite
```
Subquery to JOIN conversion
Exist/Not exist optimization
Union to union all where appropriate
```

#### 3. Caching Strategy
```
Query result caching
Result set caching
Connection pooling
```

---

## Implementation Patterns

### Pattern 1: Query Parser

Parse and analyze SQL query structure:

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Set
import re
from enum import Enum


class QueryType(Enum):
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    CREATE = "CREATE"
    ALTER = "ALTER"
    DROP = "DROP"
    UNKNOWN = "UNKNOWN"


@dataclass
class QueryStructure:
    query_type: QueryType
    tables: Set[str]
    columns: Set[str]
    joins: List[dict]
    filters: List[dict]
    aggregations: List[dict]
    order_by: List[str]
    group_by: List[str]
    subqueries: List[str]
    complexity_score: int


def parse_query(query: str) -> QueryStructure:
    """Parse SQL query and extract structure."""
    # Normalize query
    normalized = normalize_query(query)
    
    # Determine query type
    query_type = detect_query_type(normalized)
    
    # Extract components
    tables = extract_tables(normalized)
    columns = extract_columns(normalized, query_type)
    joins = extract_joins(normalized)
    filters = extract_filters(normalized)
    aggregations = extract_aggregations(normalized)
    order_by = extract_order_by(normalized)
    group_by = extract_group_by(normalized)
    subqueries = extract_subqueries(normalized)
    
    # Calculate complexity
    complexity = calculate_complexity(
        tables=tables,
        joins=joins,
        filters=filters,
        aggregations=aggregations
    )
    
    return QueryStructure(
        query_type=query_type,
        tables=tables,
        columns=columns,
        joins=joins,
        filters=filters,
        aggregations=aggregations,
        order_by=order_by,
        group_by=group_by,
        subqueries=subqueries,
        complexity_score=complexity
    )


def normalize_query(query: str) -> str:
    """Normalize query for analysis."""
    # Remove comments
    query = re.sub(r'--.*?$', '', query, flags=re.MULTILINE)
    query = re.sub(r'/\*.*?\*/', '', query, flags=re.DOTALL)
    
    # Normalize whitespace
    query = ' '.join(query.split())
    
    # Convert to uppercase for analysis
    return query.upper()


def detect_query_type(query: str) -> QueryType:
    """Detect query type from first keyword."""
    keywords = ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"]
    
    for keyword in keywords:
        if query.strip().startswith(keyword):
            return QueryType(keyword)
    
    return QueryType.UNKNOWN
```

### Pattern 2: Bottleneck Detector

Detect common query performance bottlenecks:

```python
from dataclasses import dataclass
from typing import List, Set


@dataclass
class Bottleneck:
    type: str
    description: str
    severity: str  # critical, high, medium, low
    query_location: str
    recommendation: str


def detect_bottlenecks(
    structure: QueryStructure,
    schema: dict,
    statistics: dict
) -> List[Bottleneck]:
    """Detect performance bottlenecks in query structure."""
    bottlenecks = []
    
    # Check for full table scans
    if not structure.tables.issubset(structure.tables & get_indexed_tables(schema)):
        bottlenecks.append(Bottleneck(
            type="FULL_TABLE_SCAN",
            description="Query may perform full table scan",
            severity="high",
            query_location="WHERE clause",
            recommendation="Add index on filter columns"
        ))
    
    # Check for N+1 patterns
    if has_n_plus_one_pattern(structure, schema):
        bottlenecks.append(Bottleneck(
            type="N_PLUS_ONE",
            description="Possible N+1 query pattern detected",
            severity="critical",
            query_location="Nested queries",
            recommendation="Use JOIN or batch query"
        ))
    
    # Check for suboptimal joins
    for join in structure.joins:
        if not is_join_optimized(join, schema):
            bottlenecks.append(Bottleneck(
                type="SUBOPTIMAL_JOIN",
                description="Join may be suboptimal",
                severity="medium",
                query_location=f"JOIN {join['table']}",
                recommendation="Add index on join columns"
            ))
    
    # Check for function usage in filters
    for filter_ in structure.filters:
        if function_in_filter(filter_):
            bottlenecks.append(Bottleneck(
                type="FUNCTION_IN_FILTER",
                description="Function in WHERE clause prevents index usage",
                severity="high",
                query_location="WHERE clause",
                recommendation="Move function to application or use computed column"
            ))
    
    # Check for wildcard LIKE
    for filter_ in structure.filters:
        if wildcard_like(filter_):
            bottlenecks.append(Bottleneck(
                type="WILDCARD_LIKE",
                description="Wildcard LIKE pattern prevents index usage",
                severity="medium",
                query_location="WHERE clause",
                recommendation="Use prefix match or full-text search"
            ))
    
    # Check for SELECT *
    if "SELECT *" in structure.query_type.name or any(c == "*" for c in structure.columns):
        bottlenecks.append(Bottleneck(
            type="SELECT_STAR",
            description="SELECT * fetches unnecessary columns",
            severity="low",
            query_location="SELECT clause",
            recommendation="Select only required columns"
        ))
    
    return bottlenecks


def has_n_plus_one_pattern(
    structure: QueryStructure,
    schema: dict
) -> bool:
    """Detect N+1 query patterns."""
    # Look for subqueries in SELECT clause
    for column in structure.columns:
        if is_subquery(column):
            return True
    
    # Look for correlated subqueries
    for subquery in structure.subqueries:
        if is_correlated(subquery, structure.tables):
            return True
    
    return False


def is_join_optimized(join: dict, schema: dict) -> bool:
    """Check if join is properly optimized."""
    # Check if join columns are indexed
    join_col = join.get('on')
    table = join.get('table')
    
    if not join_col or not table:
        return False
    
    return is_column_indexed(table, join_col, schema)
```

### Pattern 3: Index Recommender

Recommend indexes based on query patterns:

```python
from dataclasses import dataclass
from typing import List, Set


@dataclass
class IndexRecommendation:
    table: str
    columns: List[str]
    index_type: str  # btree, hash, gin, gist
    reason: str
    estimated_improvement: str


def recommend_indexes(
    structure: QueryStructure,
    schema: dict
) -> List[IndexRecommendation]:
    """Recommend indexes to optimize query."""
    recommendations = []
    
    # Analyze WHERE clause columns
    for table in structure.tables:
        filter_columns = get_filter_columns_for_table(table, structure.filters)
        if filter_columns and not has_index(table, filter_columns, schema):
            recommendations.append(IndexRecommendation(
                table=table,
                columns=filter_columns,
                index_type="btree",
                reason=f"Optimize WHERE clause filters on {', '.join(filter_columns)}",
                estimated_improvement="High"
            ))
    
    # Analyze JOIN columns
    for join in structure.joins:
        join_table = join.get('table')
        join_col = join.get('on')
        if join_col and not has_index(join_table, [join_col], schema):
            recommendations.append(IndexRecommendation(
                table=join_table,
                columns=[join_col],
                index_type="btree",
                reason=f"Optimize JOIN on {join_table}.{join_col}",
                estimated_improvement="High"
            ))
    
    # Analyze ORDER BY columns
    if structure.order_by and structure.query_type == QueryType.SELECT:
        table = list(structure.tables)[0] if structure.tables else None
        if table:
            order_cols = [col.split('.')[1] if '.' in col else col for col in structure.order_by]
            if order_cols and not has_index(table, order_cols, schema):
                recommendations.append(IndexRecommendation(
                    table=table,
                    columns=order_cols,
                    index_type="btree",
                    reason=f"Optimize ORDER BY on {', '.join(order_cols)}",
                    estimated_improvement="Medium"
                ))
    
    # Analyze GROUP BY columns
    if structure.group_by:
        table = list(structure.tables)[0] if structure.tables else None
        if table:
            group_cols = structure.group_by
            if group_cols and not has_index(table, group_cols, schema):
                recommendations.append(IndexRecommendation(
                    table=table,
                    columns=group_cols,
                    index_type="btree",
                    reason=f"Optimize GROUP BY on {', '.join(group_cols)}",
                    estimated_improvement="Medium"
                ))
    
    return recommendations
```

### Pattern 4: Query Rewriter

Suggest query rewrites for optimization:

```python
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class RewriteSuggestion:
    current_pattern: str
    suggested_rewrite: str
    explanation: str
    expected_improvement: str


def suggest_rewrites(
    structure: QueryStructure,
    bottlenecks: List[Bottleneck]
) -> List[RewriteSuggestion]:
    """Suggest query rewrites for optimization."""
    suggestions = []
    
    # Check for EXISTS/NOT EXISTS patterns
    for filter_ in structure.filters:
        if is_exists_pattern(filter_):
            suggestions.append(RewriteSuggestion(
                current_pattern=filter_.get('raw', ''),
                suggested_rewrite=convert_exists_to_join(filter_),
                explanation="EXISTS can often be optimized as JOIN",
                expected_improvement="High"
            ))
    
    # Check for IN subqueries
    for filter_ in structure.filters:
        if is_in_subquery(filter_):
            suggestions.append(RewriteSuggestion(
                current_pattern=filter_.get('raw', ''),
                suggested_rewrite=convert_in_subquery_to_join(filter_),
                explanation="IN subquery can be converted to JOIN",
                expected_improvement="High"
            ))
    
    # Check for UNION vs UNION ALL
    if structure.query_type == QueryType.SELECT and is_union_query(structure):
        suggestions.append(RewriteSuggestion(
            current_pattern="UNION",
            suggested_rewrite="UNION ALL (if duplicates acceptable)",
            explanation="UNION performs duplicate removal which is expensive",
            expected_improvement="Medium"
        ))
    
    # Check for correlated subqueries in SELECT
    for column in structure.columns:
        if is_correlated_subquery(column):
            suggestions.append(RewriteSuggestion(
                current_pattern=f"Subquery in SELECT: {column}",
                suggested_rewrite="JOIN with pre-aggregated subquery",
                explanation="Correlated subqueries in SELECT are executed per row",
                expected_improvement="High"
            ))
    
    return suggestions


def convert_exists_to_join(filter_: dict) -> str:
    """Convert EXISTS subquery to JOIN."""
    # Simplified example
    subquery = filter_.get('subquery', '')
    return f"JOIN ({subquery}) AS sub ON main.id = sub.main_id"
```

### Pattern 5: Execution Plan Analyzer

Analyze and interpret execution plans:

```python
from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class PlanNode:
    operation: str
    table: str
    index: Optional[str]
    rows: int
    cost: float
    filters: List[str]
    children: List['PlanNode']


def analyze_execution_plan(
    plan: dict,
    structure: QueryStructure
) -> List[dict]:
    """Analyze execution plan for optimization opportunities."""
    analysis = []
    
    def traverse_plan(node: dict, depth: int = 0):
        # Check for sequential scan
        if node.get('operation') in ('Seq Scan', 'TABLE SCAN'):
            analysis.append({
                'type': 'SEQUENTIAL_SCAN',
                'table': node.get('table'),
                'rows': node.get('rows', 0),
                'depth': depth,
                'recommendation': 'Add index or use index scan'
            })
        
        # Check for hash join
        if node.get('operation') in ('Hash Join', 'HASH JOIN'):
            if node.get('hash_condition'):
                analysis.append({
                    'type': 'HASH_JOIN',
                    'condition': node.get('hash_condition'),
                    'rows': node.get('rows', 0),
                    'depth': depth,
                    'recommendation': 'Verify join columns are indexed'
                })
        
        # Check for sort operation
        if node.get('operation') in ('Sort', 'SORT'):
            analysis.append({
                'type': 'SORT',
                'rows': node.get('rows', 0),
                'depth': depth,
                'recommendation': 'Consider adding index for sort order'
            })
        
        # Traverse children
        for child in node.get('children', []):
            traverse_plan(child, depth + 1)
    
    traverse_plan(plan)
    
    return analysis
```

---

## Common Patterns

### Pattern 1: Query Performance Score

Calculate overall query performance score:

```python
def calculate_query_performance_score(
    structure: QueryStructure,
    bottlenecks: List[Bottleneck],
    execution_analysis: List[dict]
) -> dict:
    """Calculate query performance score."""
    score = 100
    
    # Deduct for bottlenecks
    for bottleneck in bottlenecks:
        if bottleneck.severity == "critical":
            score -= 30
        elif bottleneck.severity == "high":
            score -= 15
        elif bottleneck.severity == "medium":
            score -= 8
        elif bottleneck.severity == "low":
            score -= 3
    
    # Deduct for execution plan issues
    for issue in execution_analysis:
        if issue['type'] == 'SEQUENTIAL_SCAN':
            score -= 20
        elif issue['type'] == 'HASH_JOIN':
            score -= 10
        elif issue['type'] == 'SORT':
            score -= 10
    
    # Ensure score is within bounds
    score = max(0, min(100, score))
    
    return {
        "score": score,
        "grade": get_grade(score),
        "bottleneck_count": len(bottlenecks),
        "execution_issues": len(execution_analysis)
    }


def get_grade(score: int) -> str:
    """Get letter grade from score."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"
```

### Pattern 2: Query Optimization Pipeline

Build comprehensive optimization pipeline:

```python
async def optimize_query(
    query: str,
    schema: dict,
    statistics: dict
) -> dict:
    """Comprehensive query optimization pipeline."""
    # Parse query
    structure = parse_query(query)
    
    # Detect bottlenecks
    bottlenecks = detect_bottlenecks(structure, schema, statistics)
    
    # Generate recommendations
    index_recommendations = recommend_indexes(structure, schema)
    rewrite_suggestions = suggest_rewrites(structure, bottlenecks)
    
    # Execute if possible
    execution_plan = None
    try:
        execution_plan = await get_execution_plan(query)
        execution_analysis = analyze_execution_plan(execution_plan, structure)
    except:
        execution_analysis = []
    
    # Calculate score
    performance_score = calculate_query_performance_score(
        structure, bottlenecks, execution_analysis
    )
    
    return {
        "original_query": query,
        "structure": structure,
        "bottlenecks": bottlenecks,
        "recommendations": {
            "indexes": index_recommendations,
            "rewrites": rewrite_suggestions
        },
        "execution_analysis": execution_analysis,
        "performance_score": performance_score,
        "summary": generate_optimization_summary(
            bottlenecks, index_recommendations, rewrite_suggestions
        )
    }
```

### Pattern 3: Query Cache Analyzer

Analyze query caching potential:

```python
def analyze_query_caching(
    structure: QueryStructure,
    query: str
) -> dict:
    """Analyze caching potential for query."""
    # Check if query is cacheable
    if structure.query_type != QueryType.SELECT:
        return {"cacheable": False, "reason": "Only SELECT queries are cacheable"}
    
    # Check for non-deterministic functions
    non_deterministic = has_non_deterministic_functions(query)
    if non_deterministic:
        return {
            "cacheable": False,
            "reason": f"Contains non-deterministic functions: {non_deterministic}"
        }
    
    # Check for time-based filters
    time_based = has_time_filters(structure)
    if time_based:
        return {
            "cacheable": False,
            "reason": "Contains time-based filters that change frequently"
        }
    
    # Calculate cache TTL
    cache_ttl = calculate_cache_ttl(structure)
    
    return {
        "cacheable": True,
        "estimated_ttl_seconds": cache_ttl,
        "recommended_ttl": max(60, cache_ttl)
    }


def calculate_cache_ttl(structure: QueryStructure) -> int:
    """Calculate recommended cache TTL."""
    ttl = 300  # Default 5 minutes
    
    # Shorter TTL for frequently updated tables
    for table in structure.tables:
        if structure.filters:
            ttl = min(ttl, 60)  # 1 minute for filtered queries
    
    return ttl
```

---

## Common Mistakes

### Mistake 1: Not Analyzing Execution Plans

**Wrong:**
```python
# ❌ Only analyzing query structure
structure = parse_query(query)
bottlenecks = detect_bottlenecks(structure)
# Missing actual execution plan analysis
```

**Correct:**
```python
# ✅ Analyze actual execution plan
structure = parse_query(query)
bottlenecks = detect_bottlenecks(structure)
plan = get_execution_plan(query)
plan_analysis = analyze_execution_plan(plan)
# Combine both analyses
```

### Mistake 2: Over-Optimizing Simple Queries

**Wrong:**
```python
# ❌ Applying complex optimizations to simple queries
query = "SELECT * FROM users WHERE id = 1"
# Don't need optimization - simple lookup
```

**Correct:**
```python
# ✅ Check query complexity before optimizing
structure = parse_query(query)
if structure.complexity_score < 10:
    return {"optimized": query, "notes": "Query too simple to optimize"}
# Apply optimizations only to complex queries
```

### Mistake 3: Ignoring Query Frequency

**Wrong:**
```python
# ❌ Optimizing rarely-run queries
query = "SELECT ... FROM large_table WHERE rare_condition"
# Rarely run, optimization may not be worth it
```

**Correct:**
```python
# ✅ Consider query frequency
query = "SELECT ... FROM large_table WHERE rare_condition"
frequency = get_query_frequency(query)
if frequency < 10:  # Less than 10 times per day
    return {"optimized": query, "notes": "Query too infrequent to optimize"}
```

### Mistake 4: Not Validating Optimizations

**Wrong:**
```python
# ❌ Applying optimizations without testing
recommendations = recommend_indexes(structure)
apply_indexes(recommendations)
# No testing of actual improvement
```

**Correct:**
```python
# ✅ Test optimizations before applying
recommendations = recommend_indexes(structure)
for rec in recommendations[:3]:  # Test top 3
    improvement = test_optimization(query, rec)
    if improvement > 0.1:  # 10% improvement
        apply_recommendation(rec)
```

### Mistake 5: Not Tracking Performance Over Time

**Wrong:**
```python
# ❌ Single point in time optimization
query = "SELECT ..."
optimized = optimize_query(query)
# Never check if performance changed
```

**Correct:**
```python
# ✅ Track query performance over time
while True:
    current_performance = measure_query_performance(query)
    historical = get_historical_performance(query)
    
    if current_performance < historical * 0.8:
        alert("Query performance degraded")
    
    await asyncio.sleep(3600)  # Check hourly
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Input validation for SQL queries
- [ ] **Parsed State:** Raw SQL parsed into typed structures
- [ ] **Purity:** Analysis functions are pure
- [ ] **Fail Loud:** Invalid SQL throws descriptive errors
- [ ] **Readability:** Optimization reports read like analysis

### Testing

- [ ] Unit tests for query parsing
- [ ] Integration tests for bottleneck detection
- [ ] Index recommendation tests
- [ ] Query rewrite tests
- [ ] Execution plan analysis tests

### Security

- [ ] SQL injection prevention
- [ ] Query sanitization
- [ ] No arbitrary code execution
- [ ] Schema access controlled
- [ ] Query logs sanitized

### Performance

- [ ] Efficient query parsing
- [ ] Concurrent analysis for multiple queries
- [ ] Cached execution plans
- [ ] Incremental analysis updates
- [ ] Memory-efficient streaming for large queries

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-optimizer` | Optimize query resources |
| `ci-cd-pipeline-analyzer` | Analyze CI/CD queries |
| `latency-analyzer` | Measure query latency |
| `hot-path-detector` | Identify slow queries |
| `query-optimizer` | Query validation |

### Core Dependencies

- **Parser:** SQL structure parsing
- **Analyzer:** Bottleneck detection
- **Recommender:** Optimization recommendations
- **Rewriter:** Query rewrite suggestions
- **Validator:** Performance validation

### External Resources

- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [MySQL Query Optimizer](https://dev.mysql.com/doc/refman/8.0/en/optimizer-trace.html)
- [SQL Performance Explained](https://use-the-index-luke.com/)

---

## Implementation Tracking

### Agent Query Optimizer - Core Patterns

| Task | Status |
|------|--------|
| Query parser | ✅ Complete |
| Bottleneck detector | ✅ Complete |
| Index recommender | ✅ Complete |
| Query rewriter | ✅ Complete |
| Execution plan analyzer | ✅ Complete |
| Performance scoring | ✅ Complete |
| Cache analyzer | ✅ Complete |
| Optimization pipeline | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Query parsing
- Bottleneck detection
- Index recommendations
- Query rewrites
- Execution plan analysis

### 1.1.0 (Planned)
- Multi-database support
- Query history analysis
- Automated query rewriting
- Performance regression detection

### 2.0.0 (Future)
- ML-based optimization
- Adaptive query optimization
- Distributed query optimization
- Real-time query monitoring

---

## Implementation Prompt (Execution Layer)

When implementing the Query Optimizer skill, use this prompt for code generation:

```
Create a Query Optimizer implementation following these requirements:

1. Core Classes:
   - QueryStructure: Parsed query with components
   - Bottleneck: Performance bottleneck finding
   - IndexRecommendation: Index suggestion
   - RewriteSuggestion: Query rewrite suggestion
   - PlanNode: Execution plan node
   - QueryPerformanceScore: Performance metrics

2. Key Methods:
   - parse_query(query): Parse SQL query
   - detect_bottlenecks(structure, schema, stats): Find issues
   - recommend_indexes(structure, schema): Suggest indexes
   - suggest_rewrites(structure, bottlenecks): Query rewrites
   - analyze_execution_plan(plan, structure): Execution analysis
   - calculate_query_performance_score(structure, bottlenecks, analysis): Score
   - optimize_query(query, schema, statistics): Full optimization

3. Data Structures:
   - QueryStructure with tables, columns, joins, filters, aggregations
   - Bottleneck with type, severity, recommendation
   - IndexRecommendation with table, columns, type, reason
   - RewriteSuggestion with current, suggested, explanation
   - PlanNode with operation, table, index, rows, cost
   - QueryPerformanceScore with score, grade, metrics

4. Optimization Strategies:
   - Index optimization: Add missing indexes
   - Query rewrite: Convert to more efficient patterns
   - Caching: Enable query caching where appropriate
   - Execution plan: Analyze actual query plans

5. Configuration Options:
   - min_complexity: Minimum complexity to optimize
   - frequency_threshold: Minimum query frequency
   - max_recommendations: Max indexes to suggest
   - cache_ttl_default: Default cache TTL
   - severity_threshold: Minimum severity to report

6. Output Features:
   - Query structure analysis
   - Performance bottleneck report
   - Index recommendations
   - Query rewrite suggestions
   - Execution plan analysis
   - Performance score
   - Optimization summary

7. Error Handling:
   - Invalid SQL handling
   - Missing schema information
   - Partial optimization
   - Graceful degradation
   - Comprehensive logging

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw SQL into typed structures
- Pure analysis functions
- Fail fast on invalid state
- Clear names for all components
```
