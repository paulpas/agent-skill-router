---
# SQL Mastery
This skill provides comprehensive methods and techniques for mastering SQL through query optimization, effective indexing, and understanding execution plans. 

## Overview

SQL (Structured Query Language) is a critical skill for database management and manipulation. Understanding how to optimize SQL queries, structure indexing strategies effectively, and analyze execution plans is vital for improving database performance and efficiency.

---
## When to Use
Use this skill when:
- You need to optimize SQL queries for performance improvement.
- You want to implement effective indexing strategies to speed up data retrieval.
- You need to understand and analyze execution plans to diagnose database performance issues.

---
## Core Workflow
**1. Initial Query Analysis**  
   Utilizing the `EXPLAIN` command to assess how SQL queries are executed.
   * Example: Use `EXPLAIN SELECT * FROM orders WHERE customer_id = 123;` to view the execution strategy.

**2. Optimization of SQL Queries**  
   Tweaking the SQL statements based on the initial analysis. This can involve rewriting queries for efficiency, reducing the number of rows returned, or eliminating unnecessary calculations.
   * Example: If `EXPLAIN` shows a full table scan, consider refinements like adding conditions to WHERE clauses or using JOINs properly.

**3. Indexing Strategies**  
   Establish a disciplined approach to indexing, choosing the right columns for indexing based on query patterns.
   * Example: Creating an index on frequently queried fields: `CREATE INDEX idx_customer_orders ON orders(customer_id);`

**4. Execution Plan Analysis**  
   Analyze the performance impact of each query using `EXPLAIN ANALYZE`, which provides actual run times and efficiency statistics.
   * Example: Use `EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;` to get performance metrics for that specific query.

**5. Monitoring and Maintenance**  
   Regularly check and maintain database performance by removing unused indexes and adjusting existing ones based on changing query patterns.
   * Example: Run diagnostics regularly, e.g., `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;` to identify unused indexes.

---
## Implementation Patterns
### Pattern 1: Query Optimization
```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
```
### Pattern 2: Indexing
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date_customer ON orders(order_date, customer_id);
```
---
## Constraints
### MUST DO
- Monitor and refactor SQL queries regularly based on performance metrics.
- Validate index effectiveness by analyzing query execution plans.
### MUST NOT DO
- Avoid cluttering tables with unnecessary indexes, which can degrade performance during write operations.
---
## Output Template  
When utilizing this skill, your output should contain:
1. **Command Analysis** — Provide clear database command(s) to execute, detailing required flags and options.  
2. **Expected Output Format** — Show clear expected output for each command (e.g., table formats, JSON output).  
3. **Error Handling** — Include common error conditions with potential solutions.  
4. **Performance Metrics** — Establish key metrics to capture before and after the application of commands.  
5. **Rollback Procedure** — Clearly document how to revert changes if the optimization does not yield the expected results.
---
## References
- PostgreSQL Documentation: Performance Tips
- MySQL Official Documentation: Replication Concepts
- MongoDB Documentation: Query Optimization Techniques
- Redis Official Documentation: Memory Efficiency Practices
