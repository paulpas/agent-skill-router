---
name: sql-mastery
description: Implements methods for mastering SQL through query optimization, effective indexing, and understanding execution plans with practical examples.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical, educational
  anti_triggers: naive assessments, simplistic views on SQL, quick fixes
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  version: "1.0.0"
  domain: coding
  triggers: sql mastery, query optimization, indexing, execution plans
  role: implementation
  scope: implementation
  output-format: code
  related-skills: database-admin
---

# SQL Mastery
This skill provides comprehensive methods and practices for mastering SQL through techniques focusing on query optimization, effective indexing, and understanding execution plans. 

## TL;DR Checklist
- [ ] Use `EXPLAIN` to analyze queries before optimization.
- [ ] Maintain appropriate index strategies to enhance query performance.
- [ ] Regularly review and adjust execution plans based on query performance.

---

## When to Use
- When optimizing slow SQL queries.
- To enhance database performance through proper indexing.
- For understanding the execution path of complex SQL queries.

---

## Core Workflow
1. **Analyze the Query**: Begin with identifying slow queries using the `EXPLAIN` command. This helps in visualizing how the database executes each query and what indexes, if any, are used. 
   - Check query plan statistics to find potential optimizations. **Checkpoint:** Run `EXPLAIN ANALYZE` for execution time statistics; look for slow operations like sequential scans.

2. **Optimize Queries**: Refactor SQL queries based on the output from the `EXPLAIN` command, focusing on minimizing costly operations. 
   - Implement changes like reducing nested queries, using joins instead of subqueries, and limiting result sets. **Checkpoint:** Ensure reduced execution time after modifications.

3. **Indexing Strategies**: Develop an efficient indexing strategy to optimize query performance.
   - Use indexes wisely by selecting the right columns for indexing based on the queries executed most frequently. **Checkpoint:** Monitor index usage with `pg_stat_user_indexes` or relevant metrics.

4. **Monitor and Review Execution Plans**: Regularly review execution plans for critical queries after changes or during regular maintenance cycles. 
   - Look for plans indicating full table scans or unused indexes; these may need adjustment or removal to optimize performance. **Checkpoint:** Document changes and their impact on performance metrics.

5. **Document Changes**: Keep detailed notes of changes made to queries and indexing strategies for knowledge transfer and future reference. **Checkpoint:** Ensure all modifications are recorded in a central documentation strategy.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Query Optimization with EXPLAIN
Using `EXPLAIN` and `EXPLAIN ANALYZE` to scrutinize query execution and time taken can help improve performance effectively.
```sql
-- Basic query analysis
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- Analyze execution statistics for deeper insights
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;

-- Verbose output to understand more details
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 123;
```

### Pattern 2: Effective Indexing
Creating appropriate indexes can drastically reduce the amount of data that the database engine needs to scan.
```sql
-- Create an index on a frequently queried field
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Compound indexing for multiple columns
CREATE INDEX idx_orders_date_customer ON orders(order_date, customer_id);
```  
**BAD vs GOOD: Index Strategy**
```sql
-- ❌ BAD — creating an index on a low-cardinality field can lead to performance issues
CREATE INDEX idx_orders_status ON orders(status);

-- ✅ GOOD — high-cardinality fields improve indexing efficiency
CREATE INDEX idx_orders_customer ON orders(customer_id);
```

### Pattern 3: Understanding Execution Plans
Understanding how to read execution plans is crucial for performance tuning. Execution plans can provide insight into how the database will execute a query, including which indexes will be used and the order of operations.
```sql
-- View execution plan for understanding performance
EXPLAIN SELECT * FROM orders WHERE customer_id = 123 AND order_date > '2024-01-01';
```

```sql
-- Check index usage in execution plans
EXPLAIN SELECT * FROM orders WHERE customer_id = 456;
```

**Analyzing Results**
1. Identify any full table scans — these indicate a potential lack of efficient indexing.
2. Look for operations that consume a disproportionate amount of time — these are the primary candidates for optimization.

### Conclusion
SQL mastery requires consistent performance reviews and an understanding of effective query strategies. By applying these principles, developers can write robust SQL statements that not only fulfill their functional requirements but also do so efficiently. 

---
## Constraints
### MUST DO
- Monitor index usage to prevent unnecessary overhead.
- Regularly run performance analysis on delayed queries to identify trends.
- Use profiling tools to understand long-term query performance trends.

### MUST NOT DO
- Avoid over-indexing as it can negatively impact write performance. 
- Do not ignore performance warnings generated by the database engine, as they often indicate potential issues.
---
## Output Template
When utilizing this skill, ensure your outputs include:
1. **Command Analysis** — Clear commands to execute with expected results.
2. **Expected Output Format** — Display expected outputs for the executed commands.
3. **Error Handling** — Common errors with their resolutions.
4. **Performance Metrics** — Establish key metrics to monitor before and after optimization steps.
5. **Rollback Procedure** — Document how to revert any changes that lead to undesirable outcomes.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [PostgreSQL Documentation — SQL Commands Reference](https://www.postgresql.org/docs/current/sql.html)
- [MySQL 8.0 Reference Manual — SQL Statement Syntax](https://dev.mysql.com/doc/refman/8.0/en/)
- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Microsoft T-SQL Query Optimization Guide](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/set-statements-before-executing-a-query-transact-sql)
- [Database Indexing Best Practices by Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html#PostgreSQL.Concepts.General.DBParameters)
```