---




name: orm-patterns-n-plus-1-awareness
description: Provides comprehensive training on ORM patterns, the N+1 problem, and strategies to mitigate it, complete with code examples and workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: data-and-persistence
  triggers: orm patterns, n+1 problem, optimization strategies, data access patterns, object relational mapping, lazy loading, eager loading
  role: implementation
  scope: implementation
  output-format: code
  related-skills: orm-best-practices, data-access-optimization
  archetypes:
    - tactical
  anti_triggers:
    - vague ideation
    - generalization
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# ORM Patterns and N+1 Problem Awareness
Provides comprehensive training on ORM patterns, the N+1 problem, and strategies to mitigate it, complete with code examples and workflows.

## TL;DR Checklist
- [ ] Understand key ORM patterns and their use cases.
- [ ] Recognize the N+1 problem and how it arises in ORM usage.
- [ ] Learn effective strategies to mitigate N+1 issues.
- [ ] Evaluate code examples demonstrating both implementations and N+1 problems.
- [ ] Follow the core workflow to ensure correct application in your projects.

## When to Use
- When developing data-driven applications needing efficient data access.
- For teams adopting ORMs for the first time.
- When diagnosing performance issues related to database queries.

## When NOT to Use
- Situations where raw SQL or stored procedures offer more straightforward solutions due to complex needs.
- Applications where performance is critical, and ORM overhead is not acceptable.

## Core Workflow
1. **Evaluate ORM Patterns:** Familiarize with the primary ORM patterns, including Active Record and Data Mapper. Identify which fits best for your domain.
   **Checkpoint:** Ensure ORM pattern aligns with your architectural needs.
2. **Identify N+1 Potential:** Review ORM queries in your application. Look for patterns where a main entity fetches related entities in separate queries.
   **Checkpoint:** Confirm presence of multiple SELECT statements triggered by lazy loading of related data.
3. **Implement Eager Loading:** Modify ORM queries to use eager loading for relationships that will be accessed immediately. Example in SQLAlchemy:
    ```python
    from sqlalchemy.orm import joinedload
    session.query(Parent).options(joinedload(Parent.children))
    ```
   **Checkpoint:** Verify all necessary child entities are fetched in the initial query to avoid N+1 pitfalls.
4. **Monitor Performance:** Utilize ORM tools or database performance metrics to ensure your changes have improved query execution time. Adjust further as needed based on profiling results.
   **Checkpoint:** Check if the metrics reflect reduced query execution times and lower load on the database.  

## Implementation Patterns
### Pattern 1: Using Active Record Pattern
The Active Record pattern directly maps an object to a database table, making CRUD operations straightforward.

```python
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String)

    def save(self):
        session.add(self)  # Automatically inserts/updates the user in the database
        session.commit()
```

### Pattern 2: Detecting the N+1 Problem
Here’s where lazy loading can introduce performance issues. For example:

```python
# Potential N+1 Problem—fetching orders for each user individually.
for user in session.query(User).all():
    print(user.orders)  # Results in a separate query for each user's orders
```

### Solution: Implementing Eager Loading
Adjust the query to load related entities in one go:
```python
# Proper use of eager loading to prevent N+1
users = session.query(User).options(joinedload(User.orders)).all()
for user in users:
    print(user.orders)  # All orders fetched in single query
```

### Pattern 3: Lazy vs. Eager Loading - Comparison
```python
# Lazy Loading: Not fetching data until accessed. May result in N+1 problem.
orders = user.orders  # Triggers a query for each access

# Eager Loading: Fetching all related data in one go.
user_with_orders = session.query(User).
    options(joinedload(User.orders)).all()
# All orders are fetched in a single query
``` 

## Constraints
### MUST DO
- Clearly separate access patterns for fetching data using the ORM.
- Use concrete code examples illustrating both good practices and anti-patterns.
- Demonstrate how to prevent N+1 problems via eager loading in typical scenarios.

### MUST NOT DO
- Avoid overly complex queries in examples that can confuse the audience.
- Do not suggest ignoring relationship mapping — every relationship needs explicit handling in ORMs.

## Output Template
When loaded, this skill helps identify ORM patterns and mitigate common pitfalls effectively, providing crucial background for impactful data-driven application development.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Django Performance Guide — N+1 Queries](https://docs.djangoproject.com/en/5.0/topics/db/debug/#preventing-n-1-queries)
- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/routines-explain.html)
- [SQLAlchemy eager loading guide (joinedload/subqueryload)](https://docs.sqlalchemy.org/en/20/orm/eagerloads.html)
- [Ruby on Rails N+1 Query Guide](https://guides.rubyonrails.org/debugging_rails_applications.html#active-record-query-info)
- [PostgreSQL Performance Tuning Documentation](https://www.postgresql.org/docs/current/sql-explain.html)