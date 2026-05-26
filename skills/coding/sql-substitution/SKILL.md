---
name: sql-substitution
description: Implements SQL variable substitution (Oracle &varname, psql :variable, MySQL @var, SQLite3 .variable) with ACCEPT prompts, ampersand escaping, COALESCE defaults, and CI/CD-safe patterns.
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: SQL substitution, ampersand variable, Oracle substitution, psql variables, &varname, ACCEPT PROMPT, escaping ampersand, missing variable handling
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: linux-shell-command-chaining, error-handling
---

# SQL Variable Substitution Across Database Tools

Implements interactive and scripted SQL variable substitution for Oracle SQL*Plus, PostgreSQL psql, MySQL CLI, and SQLite3. When loaded, the model produces correct variable definition prompts, substitution references, literal-ampersand escaping, missing-variable guards with COALESCE/NULLIF, and CI/CD-safe non-interactive patterns across all four database CLI environments.

## TL;DR Checklist

- [ ] Match the database dialect to its specific variable syntax (`&varname` for Oracle, `:variable` for psql, shell expansion for MySQL)
- [ ] Use `ACCEPT var PROMPT '...'` for interactive prompts in Oracle SQL*Plus scripts
- [ ] Prefix persistent variables with `&&` so they survive beyond a single statement execution
- [ ] Escape literal ampersands that must not trigger substitution (Oracle: `SET ESCAPE ON`, psql: `\set :variable` quoting)
- [ ] Wrap all substituted values in `COALESCE()` or guard with `NULLIF()` to handle missing/undefined variables gracefully
- [ ] Never use interactive ACCEPT prompts in CI/CD pipelines — pass variables via file, environment, or `-v` flags
- [ ] Validate every variable has a default or fallback before running production DML

---

## When to Use

Use this skill when:

- Writing SQL scripts that accept user input interactively (Oracle SQL*Plus `ACCEPT`, psql `\prompt`)
- Building ETL or data-generation scripts where table names, date ranges, or file paths are supplied at runtime
- Converting a hardcoded query into a parameterized script for reuse across environments (dev → staging → prod)
- Escaping literal ampersand characters in strings that must NOT trigger variable substitution (e.g., "C++&PHP")
- Hardening scripts against missing variables by providing defaults via `COALESCE('&var', 'default_value')`
- Automating SQL execution in CI/CD where interactive prompts would hang the pipeline

---

## When NOT to Use

Avoid this skill for:

- Application-layer queries — use your language's parameterized query API (e.g., Python `cursor.execute("SELECT * FROM t WHERE id = %s", [val])`) instead of CLI substitution
- High-performance production workloads where variable substitution adds parsing overhead — bind variables at the driver level are faster
- Simple one-off queries with no reuse potential — inline the values directly

---

## Core Workflow

1. **Identify the Database Dialect** — Determine which CLI tool runs your SQL: Oracle SQL*Plus, PostgreSQL psql, MySQL CLI, or SQLite3. Each has a completely different substitution syntax. **Checkpoint:** Confirm the target tool by checking `SELECT banner FROM v$version;` (Oracle), `\q` help text (psql), or `--help` flag availability.

2. **Choose Substitution Method** — Select the right approach for your use case:
   - Interactive prompts → Oracle `ACCEPT`, psql `\prompt`, MySQL shell variables
   - Pre-set values → Oracle `DEFINE`, psql `\set`, MySQL `mysql -e "SET @var=..."`, SQLite `.read` with `-cmd`
   - CI/CD non-interactive → environment variable export, heredoc, or config file injection
   **Checkpoint:** Ensure the chosen method works in your execution context (terminal vs. cron vs. GitHub Actions).

3. **Define Variables with Defaults** — Always provide a fallback value so missing variables don't cause errors. In Oracle: `DEFINE var = COALESCE('&var', 'default')`. In psql: `\set var :'DEFAULT_VAR'` then reference `:var`. **Checkpoint:** Test the script with the variable unset to confirm the default activates without hanging or throwing an error.

4. **Escape Literal Ampersands** — If your SQL data contains literal `&` characters that must not trigger substitution, configure the escape mechanism for your dialect before running any DML. **Checkpoint:** Run a test statement that includes "A&B" and verify it stores as "A&B", not as an expanded variable reference.

5. **Execute and Validate** — Run the script and confirm all substituted values produce the expected results. For CI/CD, capture output and assert non-zero exit codes on errors. **Checkpoint:** Review execution log for any `SP2-0552` (Oracle bind variable undefined) or `\1: variable "x" is not set` (psql) messages.

---

## Implementation Patterns

### Pattern 1: Oracle SQL*Plus ACCEPT for Interactive Prompts

The `ACCEPT` command prompts the user and stores input into a substitution variable. This is the primary interactive pattern in Oracle SQL*Plus scripts.

```sql
-- ❌ BAD: No prompt text, no default — user sees bare cursor with no guidance
ACCEPT myvar

SELECT * FROM employees WHERE department_id = &myvar;
```

```sql
-- ✅ GOOD: Clear prompt, data type hint, and sensible fallback via DEFINE
ACCEPT dept_id NUMBER PROMPT 'Enter department ID (or press Enter for 10): ' DEFAULT 10

ACCEPT report_date DATE PROMPT 'Report date (YYYY-MM-DD): ' FORMAT YYYY-MM-DD

SELECT employee_name, salary
  FROM employees
 WHERE department_id = NVL(&dept_id, 10)
   AND hire_date < TO_DATE('&report_date', 'YYYY-MM-DD');
```

```sql
-- ✅ GOOD: ACCEPT with validation via a wrapper script pattern
ACCEPT emp_id PROMPT 'Employee ID (must be numeric): '

BEGIN
  -- Guard clause: reject empty or non-numeric input
  IF '&emp_id' IS NULL OR '&emp_id' NOT LIKE '%[^0-9]%' THEN
    :output_msg := 'Processing employee: ' || &emp_id;
  ELSE
    RAISE_APPLICATION_ERROR(-20001, 'Invalid employee ID: &emp_id');
  END IF;
END;
/
```

### Pattern 2: Oracle Persistent Substitution (&&) vs. Single-Use (&)

Single `&` prompts each time the variable is referenced; double `&&` defines it once and reuses across the entire session.

```sql
-- ❌ BAD: Single & asks user for start_date on every reference — tedious and error-prone
SELECT * FROM orders WHERE order_date >= '&start_date';
SELECT COUNT(*) FROM orders WHERE order_date >= '&start_date';
SELECT SUM(amount) FROM orders WHERE order_date >= '&start_date';
```

```sql
-- ✅ GOOD: && defines once, reuses everywhere in the session
DEFINE start_date = TO_DATE('&_START_DATE', 'YYYY-MM-DD')

SELECT *   FROM orders WHERE order_date >= &start_date;
SELECT COUNT(*) FROM orders WHERE order_date >= &start_date;
SELECT SUM(amount) FROM orders WHERE order_date >= &start_date;
```

```sql
-- ✅ GOOD: Using the built-in _DATE and _USER substitution variables for common defaults
DEFINE run_user = UPPER('&_USER')

INSERT INTO audit_log (action, performed_by, action_date)
VALUES ('EXPORT_DATA', '&run_user', SYSDATE);
```

### Pattern 3: Escaping Literal Ampersands in Oracle SQL*Plus

When your data contains literal `&` characters, you must escape them or disable substitution to prevent unwanted prompt behavior.

```sql
-- ❌ BAD: "C++&PHP" triggers an interactive prompt for the variable named "PHP"
SET DEFINE ON
INSERT INTO language_versions (name) VALUES ('C++&PHP');
-- Result: Oracle prompts "Enter value for php:" — inserts wrong data or fails

-- ✅ GOOD A: SET ESCAPE ON with backslash before literal ampersand
SET DEFINE ON
SET ESCAPE ON
INSERT INTO language_versions (name) VALUES ('C++\&PHP');
```

```sql
-- ✅ GOOD B: SET SCAN OFF to completely disable substitution for a section
SET SCAN OFF
INSERT INTO language_versions (name) VALUES ('C++&PHP & Ruby & Go');
SET SCAN ON
-- After this, normal & substitution resumes
INSERT INTO project_tags (tag) VALUES (&project_name);
```

```sql
-- ✅ GOOD C: CONCAT function to build strings with literal ampersands without triggering substitution
SET DEFINE ON
INSERT INTO language_versions (name) VALUES (CONCAT('C++', CHR(38), 'PHP'));
-- CHR(38) produces the & character at runtime, bypassing SQL*Plus parsing entirely
```

### Pattern 4: PostgreSQL psql \set and :variable Syntax

psql uses `\set` to define variables and `:variable` (colon-prefixed) to reference them. The colon enables special modifiers like `:var::text` for type casting.

```sql
-- ❌ BAD: Hardcoded date — script cannot be reused without editing the file
SELECT * FROM events
WHERE event_date BETWEEN '2024-01-01' AND '2024-12-31'
  AND region = 'us-east';
```

```sql
-- ✅ GOOD: psql \set with shell variable interpolation for CI/CD integration
\set start_date :'START_DATE'
\set end_date :'END_DATE'
\set region :'REGION'

SELECT event_id, event_name, event_date
  FROM events
 WHERE event_date BETWEEN :'start_date'::date AND :'end_date'::date
   AND region = :'region';
```

```sql
-- ✅ GOOD B: psql \prompt for interactive use in a script
\prompt 'Enter tenant ID: ' tenant_id
\prompt 'Enter output format (csv, json, tsv): ' out_format

SELECT * FROM tenants WHERE id = :'tenant_id';
\pset format :'out_format'
```

```sql
-- ✅ GOOD C: psql shell variable passing via -v flag (CI/CD safe)
-- Command line: psql -v START_DATE="'2024-01-01'" -v END_DATE="'2024-12-31'" -v REGION=us-west -f query.sql
\set start_date :'START_DATE'
\set end_date :'END_DATE'

SELECT COUNT(*) AS event_count FROM events
 WHERE event_date BETWEEN :'start_date' AND :'end_date';
```

### Pattern 5: MySQL CLI Variable Substitution

MySQL offers multiple approaches: user-defined session variables (`@var`), shell variable expansion, and the `-e` flag with interactive substitution syntax.

```sql
-- ❌ BAD: No fallback — if @date_range is unset, comparison returns NULL silently
SET @date_range = 'monthly';

SELECT month, SUM(revenue) AS total
  FROM sales_summary
 WHERE period_type = @date_range
 GROUP BY month;
```

```sql
-- ✅ GOOD A: MySQL session variables with explicit initialization and validation
SET @table_name = 'customers';
SET @date_filter = COALESCE(NULLIF('2024-06', ''), NOW());

-- Validate table name matches expected pattern before executing dynamic SQL
SELECT CASE
  WHEN @table_name REGEXP '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN 1
  ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid table name';
END;
```

```sql
-- ✅ GOOD B: Shell variable expansion in bash for MySQL CLI (CI/CD safe)
#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-production}"
REPORT_MONTH="${REPORT_MONTH:-$(date +%Y-%m)}

mysql -h "$DB_HOST" -D "$DB_NAME" <<EOF
SET @report_month = '$REPORT_MONTH';

SELECT month, SUM(revenue) AS total_revenue, COUNT(order_id) AS order_count
  FROM sales_summary
 WHERE period_type = 'monthly'
   AND month >= @report_month
 GROUP BY month
 ORDER BY month;
EOF
```

```sql
-- ✅ GOOD C: MySQL -e with shell variable interpolation for one-liners in CI/CD
DB_PASS="$(cat /run/secrets/db_password)"
TABLE_NAME="orders_$(date +%Y%m%d)_archive"

mysql -h "$DB_HOST" \
  -u admin \
  -p"$DB_PASS" \
  -D production \
  -e "SET @archive_table = '$TABLE_NAME'; CREATE TABLE IF NOT EXISTS \$@archive_table LIKE orders;"
```

### Pattern 6: SQLite3 .variable Command for Session Variables

SQLite3 CLI provides `.variable` for defining named variables and `&varname` (in newer versions) or bound parameters for referencing them.

```sql
-- ❌ BAD: No variable — hardcoded filename makes the script unusable for other databases
.mode csv
.output /tmp/report.csv
SELECT * FROM analytics;
```

```sql
-- ✅ GOOD A: SQLite3 .variable with .read and -cmd flag
-- Command line: sqlite3 -cmd ".variable output_file" data.db < query.sql
.variable output_file TEXT :output_file

.mode csv
.output &output_file
SELECT * FROM analytics WHERE created_at >= date('now', '-30 days');

-- ✅ GOOD B: SQLite3 bound parameters via shell variable injection
#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-/tmp}"
TABLE_NAME="${2:-customers}"

sqlite3 data.db "
  CREATE TABLE IF NOT EXISTS \"${TABLE_NAME}_backup\" AS SELECT * FROM \"${TABLE_NAME}\";
"
cp data.db "${OUTPUT_DIR}/${TABLE_NAME}_$(date +%Y%m%d).db"
```

### Pattern 7: Handling Missing/Undefined Variables with COALESCE and NULLIF

Protecting scripts against undefined variables is critical — a missing variable should produce a sensible default, not a prompt or error.

```sql
-- ❌ BAD: Undefined &threshold triggers interactive prompt; pipeline hangs forever
SELECT * FROM anomalies
 WHERE deviation_pct > &threshold;
```

```sql
-- ✅ GOOD A: Oracle COALESCE pattern for safe defaults
DEFINE threshold = COALESCE('&threshold', '5.0')

SELECT * FROM anomalies
 WHERE deviation_pct > &threshold;

-- ✅ GOOD B: Oracle NULLIF pattern to convert empty string to NULL, then COALESCE
DEFINE date_filter = TO_DATE(COALESCE(NULLIF('&date_filter', ''), '2024-01-01'), 'YYYY-MM-DD')

SELECT * FROM sales WHERE sale_date >= &date_filter;
```

```sql
-- ✅ GOOD C: psql pattern with default fallback
\set threshold :'THRESHOLD'
-- If THRESHOLD env var is unset, NULLIF converts empty to NULL, COALESCE provides 5.0
SELECT * FROM anomalies
 WHERE deviation_pct > COALESCE(:threshold::float, 5.0);
```

```sql
-- ✅ GOOD D: MySQL pattern with IFNULL for session variable defaults
SET @threshold = IFNULL(NULLIF(@threshold, ''), 5.0);
SET @threshold = CAST(@threshold AS DECIMAL(10,2));

SELECT * FROM anomalies
 WHERE deviation_pct > @threshold;
```

### Pattern 8: CI/CD-Safe Non-Interactive Patterns

Automated pipelines must never hang on interactive prompts. These patterns pass variables through environment, files, or command-line flags.

```bash
# ❌ BAD: ACCEPT prompt in a script called by GitHub Actions — workflow times out after 6 minutes
cat > /tmp/query.sql <<'SQLEOF'
ACCEPT start_date PROMPT 'Enter start date (YYYY-MM-DD): '
SELECT COUNT(*) FROM events WHERE event_date >= &start_date;
SQLEOF
sqlplus user/pass@db @/tmp/query.sql
# This hangs indefinitely in CI — no user to type a date
```

```bash
# ✅ GOOD A: Oracle SQL*Plus with DEFINE pre-set from environment variable, -S silent mode
#!/usr/bin/env bash
set -euo pipefail

START_DATE="${START_DATE:-$(date +%Y-%m-01)}"
END_DATE="${END_DATE:-$(date +%Y-%m-15)}"

sqlplus -s user/pass@db <<SQLEOF
WHENEVER SQLERROR EXIT SQL.SQLCODE
DEFINE start_date = '&START_DATE'
DEFINE end_date = '&END_DATE'

SELECT COUNT(*) AS event_count FROM events
 WHERE event_date >= TO_DATE('&start_date', 'YYYY-MM-DD')
   AND event_date <  TO_DATE('&end_date', 'YYYY-MM-DD');
SQLEOF
```

```bash
# ✅ GOOD B: psql with -v flags and heredoc for multi-statement scripts
#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
     -v START_DATE="${START_DATE:-2024-01-01}" \
     -v END_DATE="${END_DATE:-2024-06-30}" \
     -v REPORT_NAME="${REPORT_NAME:-monthly_summary}" \
     <<'PSQLEOF'
\set report_name :'REPORT_NAME'

CREATE TABLE IF NOT EXISTS reports.:\report_name AS
SELECT region, COUNT(*) AS order_count, SUM(amount) AS total_amount
  FROM orders
 WHERE order_date BETWEEN :'START_DATE'::date AND :'END_DATE'::date
 GROUP BY region;

-- Log completion for CI/CD visibility
INSERT INTO reports.execution_log (report_name, completed_at, row_count)
SELECT :'report_name', CURRENT_TIMESTAMP, COUNT(*) FROM :.report_name;
PSQLEOF
```

```bash
# ✅ GOOD C: SQLite3 with environment variables and output redirection
#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${DB_PATH:-/data/analytics.db}"
OUTPUT_CSV="${OUTPUT_CSV:-/tmp/report_$(date +%Y%m%d).csv}"
TABLE_FILTER="${TABLE_FILTER:-analytics_2024*}"

sqlite3 "$DB_PATH" <<SQL
.mode csv
.headers on
.output $OUTPUT_CSV
SELECT * FROM analytics WHERE category LIKE '${TABLE_FILTER}' ORDER BY created_at DESC;
SQL

echo "Report written to: $OUTPUT_CSV ($(wc -l < "$OUTPUT_CSV") lines)"
```

### Pattern 9: Shell-Based Parameter Passing with SQL Scripts

Combine shell scripting (variables, validation, loops) with database-specific substitution for powerful automation.

```bash
# ❌ BAD: Hardcoded table name in every invocation — no parameterization
#!/bin/bash
sqlite3 /data/sales.db "SELECT COUNT(*) FROM sales_2024;"
```

```bash
# ✅ GOOD A: Shell loop over multiple tables with Oracle SQL*Plus
#!/usr/bin/env bash
set -euo pipefail

readonly DB_CONN="user/password@orclpdb"
readonly TABLES=("customers" "orders" "inventory" "payments")

for tbl in "${TABLES[@]}"; do
  echo "--- Processing: ${tbl} ---"

  sqlplus -s "$DB_CONN" <<SQLEOF
SET PAGESIZE 50
SET FEEDBACK ON
DEFINE table_name = '${tbl}'

SELECT COUNT(*) AS row_count,
       MAX(created_at) AS latest_entry
  FROM &table_name;
SQLEOF
done
```

```bash
# ✅ GOOD B: PostgreSQL with -v flags in a cron-usable script
#!/usr/bin/env bash
set -euo pipefail

readonly TARGET_DB="${1:?Usage: $0 <database_name>}"
readonly MAX_ROWS="${2:-1000}"

psql -t -A -v ON_ERROR_STOP=1 \
     -v TARGET_DB="$TARGET_DB" \
     -v MAX_ROWS="$MAX_ROWS" \
     -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(quote_ident(:'TARGET_DB')::regclass)) AS size
  FROM pg_tables
 WHERE tablename = :'TARGET_DB';

SELECT COUNT(*) FROM :'TARGET_DB';
"
```

---

## Constraints

### MUST DO
- Always provide a default or fallback value for every substitution variable using `COALESCE`, `IFNULL`, or explicit `DEFINE` defaults
- Use `SET SCAN OFF` / `SET DEFINE OFF` when your data contains literal ampersands that must not trigger substitution
- Run SQL*Plus scripts in `-S` (silent) mode in automated environments to suppress banner output
- Validate variable content before injection — especially for table names or schema qualifiers used in dynamic SQL
- Use `&&varname` instead of `&varname` when the same value is referenced multiple times to avoid redundant prompts
- Wrap date/time substitutions in `TO_DATE()` / `::date` casts with explicit format masks
- Test every script with the variable intentionally unset to confirm the default activates cleanly

### MUST NOT DO
- Never use interactive `ACCEPT` or `\prompt` commands in CI/CD pipelines, cron jobs, or any non-interactive context — they will hang the pipeline
- Do not concatenate user input directly into SQL strings without validation — this enables injection attacks even through CLI substitution
- Do not rely on Oracle's default prompt text "Enter value for X:" as documentation — always provide custom `PROMPT '...'` messages
- Do not omit `WHENEVER SQLERROR EXIT` in production scripts — errors should terminate the script rather than silently continue
- Do not use bare `&variable` references in MySQL without ensuring the variable is set via `SET @var = ...` first

---

## Output Template

When applying this skill, produce:

1. **Dialect identification** — State which database CLI tool is targeted (Oracle SQL*Plus, PostgreSQL psql, MySQL CLI, SQLite3)
2. **Variable definition block** — Show the exact command to define each variable with its default/fallback value
3. **Substitution references** — Show how each variable is referenced in the SQL using the correct syntax for that dialect
4. **Escape mechanism** — If literal ampersands appear in data, show the escaping approach (SET ESCAPE, CONCAT + CHR(38), SET SCAN OFF)
5. **Missing-variable guard** — Wrap every substitution in `COALESCE()` or provide an explicit default via `DEFINE`/`\set`
6. **CI/CD wrapper script** — For automated execution, provide the full bash wrapper with environment variable sourcing and non-interactive flags

---

## Related Skills

| Skill | Purpose |
|---|---|
| `linux-shell-command-chaining` | Shell-based parameter passing to SQL scripts via environment variables, heredocs, and command-line argument parsing |
| `error-handling` | Missing variable error recovery — detecting undefined variables at runtime and producing structured error messages instead of hangs |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references.

- [Oracle SQL*Plus User's Guide — Substitution Variables](https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlpl/substitution-variables.html)
- [Oracle SQL*Plus DEFINE and ACCEPT Commands Reference](https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlpl/accept.html)
- [PostgreSQL psql Documentation — Meta-commands and Variables](https://www.postgresql.org/docs/current/app-psql.html#APP-PSQL-META-COMMAND-VARIABLES)
- [MySQL Command-Line Client Documentation](https://dev.mysql.com/doc/refman/8.4/en/mysql.html)
- [SQLite3 Command Line Shell — Variables and I/O Redirection](https://www.sqlite.org/cli.html)
- [Oracle SQL*Plus SET Commands — ESCAPE, DEFINE, SCAN](https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlpl/set.html)
- [psql Variable Substitution Modifiers (colon-prefixed :var modifiers)](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
