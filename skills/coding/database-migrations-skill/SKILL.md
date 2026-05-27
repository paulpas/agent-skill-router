---
name: database-migrations-skill
description: Implements a systematic approach to database schema migrations, versioning, and rollback strategies specifically designed for OpenCode projects.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: database migration, schema versioning, rollback strategy, migration tooling, data integrity, migration scripts
  role: implementation
  scope: implementation
  output-format: code
  related-skills: database-validation, database-schema-management
  archetypes: implementation, orchestration
  anti_triggers: read-only, querying, data retrieval
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Database Migration and Versioning Skill
Facilitates the systematic management of database schema changes, including migrations, versioning, and rollback procedures, ensuring data integrity and maintainability.

## TL;DR Checklist
- [ ] Ensure document is at least 3000 bytes of content.
- [ ] No placeholder content (e.g., "TODO", "your code here").
- [ ] At least 2 actual code examples for migration tooling.
- [ ] Clear and actionable workflow steps for migration processes.
- [ ] Holistic view on versioning strategies, rollback, and deployment approaches.

---

## Core Workflow

1. **Define Migration Requirements**  
   Determine the changes needed in the database schema. Consult project specifications and documentation to identify gaps and new features that necessitate changes.  
   **Checkpoint:** Collect details on fields being added, modified, or removed.  

2. **Create Migration Scripts**  
   Write SQL scripts to implement the changes identified in the requirements stage. Use a structure that facilitates easy deployment and rollback.  
   **Checkpoint:** Each script should begin with a `BEGIN;` statement and end with a `COMMIT;` statement. Example:
   ```sql
   BEGIN;
   ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
   COMMIT;
   ```

3. **Versioning with Semantic Rules**  
   Assign version numbers to each migration script based on Semantic Versioning principles: MAJOR, MINOR, and PATCH.  
   **Checkpoint:** Document the version in a consistent format at the top of each migration script.  
   Example:
   ```sql
   -- Version 1.0.0: Added last_login field to users table.
   ```

4. **Testing Migrations Locally**  
   Deploy the migration to a local database and run tests to verify that all changes execute as expected without errors.  
   **Checkpoint:** Use a testing framework or assertions to confirm the new schema state.  
   Example:
   ```python
   import pytest
   import sqlalchemy as sa
   
   def test_migration():
       engine = sa.create_engine('sqlite:///:memory:')
       with engine.connect() as connection:
           connection.execute("BEGIN; ALTER TABLE users ADD COLUMN last_login TIMESTAMP; COMMIT;")
           result = connection.execute("SELECT last_login FROM users;")
           assert result is not None
   ```

5. **Deploying Migrations in Production**  
   Execute migrations against the production database after comprehensive tests and approval by the team.  
   **Checkpoint:** Ensure database backups are created before deploying changes.  

6. **Rollback Procedures**  
   Implement a strategy for reverting to a previous schema if issues arise post-deployment. Prepare rollback scripts for any migration script executed.  
   **Checkpoint:** Each migration must have a corresponding rollback script. Example:
   ```sql
   BEGIN;
   ALTER TABLE users DROP COLUMN last_login;
   COMMIT;
   ```

7. **Documentation and Reporting**  
   After executing migrations, document the changes in the project management tools and inform the team of the updates.  
   **Checkpoint:** Ensure the completed migration log is updated with details on each change implemented and any issues encountered.

---

## Implementation Patterns
### Creating Migration Scripts
Here are examples of how to implement database migrations. Use these as patterns for creating your migration scripts.

#### Example 1: Adding a Column
```sql
-- Version 1.0.0: Adding last_login to users
BEGIN;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
COMMIT;
```

#### Example 2: Rolling Back a Migration
```sql
-- Version 1.0.0: Rolling back last_login addition
BEGIN;
ALTER TABLE users DROP COLUMN last_login;
COMMIT;
```

## Constraints
### MUST DO
- Create a backup of the production database before deploying migrations.
- Write rollback scripts for every migration script executed.
- Follow semantic versioning to track changes accurately.
- Validate migrations on a staging environment before production deployment.

### MUST NOT DO
- Leave migration scripts containing placeholder content like `TODO` or `your code here`.
- Execute migrations directly on the production database without prior testing.
- Overlook documenting the migration process thoroughly; every change must be traceable.

## Output Template
When applying this skill for database migrations, ensure you capture:
1. **Version Control** — Maintain a clear versioning system for all migration scripts and document changes in a changelog.
2. **Rollback Strategy** — Always have a plan in place for rollback before deploying any migrations.
3. **Testing Procedures** — Establish thorough testing processes for migrations, including local and staging validation.
4. **Documentation** — Maintain comprehensive and accessible documentation of all changes across schema updates.

## Related Skills
| Skill | Purpose |
|---|---|
| `database-validation` | Validating data integrity across migrations and schema changes. |
| `database-schema-management` | Managing the overall schema lifecycle alongside migrating changes. |