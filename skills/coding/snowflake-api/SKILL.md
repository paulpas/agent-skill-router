---
name: snowflake-api
description: Implements Snowflake API integration focusing on SQL execution, Snowpark DataFrames, Cortex, Streams, and Tasks.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
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
  triggers: snowflake, snowpark, cortex, streams, tasks, sql
  role: implementation
  scope: implementation
  output-format: code
---

# Snowflake API Skill
Integrates Snowflake API with a focus on SQL, Snowpark data manipulation, Cortex AI features, and task scheduling using streams.

## TL;DR Checklist
- [ ] Set up a Snowflake connection using `snowflake.connector.connect()`.
- [ ] Create and execute SQL commands with Snowpark DataFrames.
- [ ] Leverage Cortex for AI-integrated applications.
- [ ] Use streams and tasks for data manipulation and automation.

## When to Use
- When implementing data integration solutions with Snowflake.
- To build applications leveraging Snowflake's SQL capabilities.
- For utilizing Snowpark in data engineering tasks.

## When NOT to Use
- Avoid using this skill for POC (Proof of Concept) projects without real data.
- Not applicable for basic SQL queries that don't involve Snowflake API features.

## Core Workflow
1. **Connect to Snowflake API**  
   Set up the connection using the Snowflake connector:
   ```python
   import snowflake.connector
   conn = snowflake.connector.connect(
       user='username',
       password='password',
       account='account_identifier'
   )
   ```
   **Checkpoint:** Verify the connection works by executing `SELECT CURRENT_VERSION();`.

2. **Execute SQL Commands**  
   Utilize the connection to run SQL commands:
   ```python
   with conn.cursor() as cur:
       cur.execute("SELECT * FROM my_table;")
       for row in cur:
           print(row)
   ```
   **Checkpoint:** Ensure that the SQL runs without errors and returns the expected results.

3. **Integrate Snowpark for DataFrames**  
   Use Snowpark API for DataFrame operations:
   ```python
   from snowflake.snowpark import Session
   session = Session.builder.configs({
       'account': 'xxx',
       'user': 'xxx',
       'password': 'xxx',
       'warehouse': 'my_wh',
       'database': 'my_db',
       'schema': 'public'
   }).create()
   df = session.table('my_table')
   df.show()
   ```
   **Checkpoint:** Confirm that the DataFrame retrieves the correct table structure.

4. **Utilize Cortex for Integration**  
   Implement AI features using the Cortex API:
   ```python
   response = cortex.complete(query='Provide recommendations based on current data.')
   print(response)
   ```
   **Checkpoint:** Verify that the Cortex response is valid and informative.

5. **Setup Streams and Tasks**  
   Create Streams and Tasks for change detection and automation:
   ```sql
   CREATE STREAM my_stream ON TABLE my_table;
   CREATE TASK my_task
   WAREHOUSE = my_wh
   SCHEDULE = 'USING CRON 0 * * * *'
   AS
   INSERT INTO other_table
   SELECT * FROM my_stream;
   ```
   **Checkpoint:** Ensure that the stream captures changes and that the task runs as scheduled.

## Implementation Patterns
### Example: Using Streams and Tasks
```sql
CREATE OR REPLACE STREAM orders_stream ON TABLE orders;
CREATE OR REPLACE TASK check_orders_task
    WAREHOUSE = compute_wh
    SCHEDULE = '5 MINUTE'
AS
    INSERT INTO processed_orders
    SELECT * FROM orders_stream;
```

### BAD vs GOOD Example: SQL Execution
```python

# ❌ BAD: Using string concatenation for queries
order_id = "abc123"
cur.execute(f"SELECT * FROM orders WHERE id = '{order_id}'")

# ✅ GOOD: Using parameterized queries
cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
```

### Constraints
### MUST DO
- Always use parameterized queries to prevent SQL injection.
- Maintain minimum disconnected execution time for performance.

### MUST NOT DO
- Do not concatenate SQL strings from user input.
- Avoid heavy operations without efficient warehouse sizing based on workload.

---
## Related Skills
| Skill | Purpose |
|---|---|
| coding-snowpark | Integrates Snowpark DataFrame operations for seamless data processing. |
| coding-cortex-integration | Implements functions for leveraging AI capabilities within Snowflake. |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Snowflake API Documentation](https://docs.snowflake.com/en/developer-guide/snowflake-connectors/connectors-overview)
- [Snowflake Connector Overview](https://docs.snowflake.com/en/developer-guide/snowflake-connectors/connectors-overview)
- [Snowpark Python Developer Guide](https://docs.snowflake.com/en/developer-guide/snowpark/python/index)
- [Snowflake REST API Reference](https://docs.snowflake.com/en/developer-guide/sql-api/using-sql-api)
- [Snowflake Cortex AI Features](https://docs.snowflake.com/en/user-guide/snowflake-cortex/llm-functions)