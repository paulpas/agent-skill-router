---
name: nosql-data-modeling
description: Provides comprehensive patterns and best practices for modeling data in NoSQL databases like MongoDB, Cassandra, and DynamoDB.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: nosql, mongodb, cassandra, dynamodb, data modeling, schema design
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - examples
    - do-dont
  related-skills: database-design-modeling, api-design-principles
---
# NoSQL Data Modeling for MongoDB, Cassandra, and DynamoDB
This skill provides comprehensive patterns and best practices for modeling data in popular NoSQL databases including MongoDB, Cassandra, and DynamoDB. When this skill is loaded, the model produces concrete examples, migration scripts, and query optimization patterns — not generic advice.
## TL;DR Checklist
- [ ] Identify and define data entities and relationships clearly.
- [ ] Use appropriate data types based on the database's strengths and weaknesses.
- [ ] Choose key design strategies: embedded documents (MongoDB), wide rows (Cassandra), and partition keys (DynamoDB).
- [ ] Implement indexing strategies to optimize query performance.
- [ ] Ensure consistency and availability align with the chosen database's architecture.
- [ ] Document data access patterns and provide migration scripts when necessary.
- [ ] Validate each design with real use cases to ensure scalability and performance.
## Purpose and Use Cases
**Primary Purpose:** Provide developers with guidance on properly modeling data in NoSQL systems for optimal performance and scalability.
**Common Use Cases:**
1. **Schema Design for e-commerce Platforms** — Modeling products, categories, and orders.
2. **Social Networks** — Managing user profiles, posts, and interactions.
3. **IoT Applications** — Collecting and analyzing telemetry data in real time.
4. **Content Management Systems** — Structuring articles, authors, and tags effectively.
5. **Real-time Analytics** — Storing session data and event streams.

## Architecture Design Patterns
### Pattern 1: MongoDB Document Design with Embedded Relationships
```javascript
// Example document for a blog post in MongoDB:
{
    _id: ObjectId('...'),
    title: 'NoSQL Databases',
    author: {
        name: 'Jane Doe',
        email: 'jane@example.com'
    },
    content: 'A deep dive into NoSQL...',
    comments: [
        {
            user: 'John',
            message: 'Great article!',
            date: ISODate('2026-05-27T00:00:00Z')
        },
        // Additional comments
    ],
    created_at: ISODate('2026-05-27T00:00:00Z')
}
```
**Key Elements:**
- Embedding user data within posts eliminates the need for additional queries.
- Comments are stored as an array, allowing fast access and easy manipulation.
- Timestamp fields track document creation and updates.

### Pattern 2: Cassandra Wide Table Design for Time-Series Data
```cql
CREATE TABLE user_activity (
    user_id UUID,
    activity_time TIMESTAMP,
    activity_type TEXT,
    details TEXT,
    PRIMARY KEY (user_id, activity_time)
);

// Insert example:
INSERT INTO user_activity (user_id, activity_time, activity_type, details)
VALUES (123e4567-e89b-12d3-a456-426614174000, '2026-05-27T00:00:00Z', 'login', 'User logged in from web.');
```
**Key Elements:**
- The partition key `user_id` ensures all activities belong to a user.
- The clustering key `activity_time` maintains order for each user's activities.

### Pattern 3: DynamoDB Key Design for Scalable Access
```yaml
Resources:
  UserSessions:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: UserSessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: UserId
          AttributeType: S
        - AttributeName: CreatedAt
          AttributeType: S
      KeySchema:
        - AttributeName: UserId
          KeyType: HASH
        - AttributeName: CreatedAt
          KeyType: RANGE

description: DynamoDB User Sessions Table
```
**Key Elements:**
- Partition key is `UserId` for retrieving all sessions of a specific user.
- Sort key `CreatedAt` allows you to retrieve activity in chronological order efficiently.
- PAY_PER_REQUEST enables handling unexpected traffic spikes.

## Core Workflow
1. **Analyze Requirements:** Extract entities (nouns), attributes, and relationships (verbs) from requirements. Identify read/write patterns and cardinality constraints. **Checkpoint:** Document core entities and relationships.
2. **Plan Data Model:** Map entities to data store constructs (tables/collections) and define their relationships. **Checkpoint:** Validate that the model addresses all requirements.
3. **Implement and Optimize:** Translate the model into actual implementations with appropriate data types and indexing strategies. **Checkpoint:** Test each model early to ensure it fits expected usage patterns.
4. **Test and Validate:** Ensure that queries perform well under expected loads. Make adjustments based on testing feedback. **Checkpoint:** Document any changes made and update design diagrams as necessary.

## Implementation Patterns
### Pattern 1: Using Aggregates with MongoDB for Performance Optimization
```javascript
// Example aggregate query for user activity
db.user_activity.aggregate([
    { $match: { user_id: '1234' } },
    { $sort: { activity_time: -1 } },
    { $limit: 10 }
]);
```
### Pattern 2: Using Materialized Views with Cassandra for Fast Reads
```cql
CREATE MATERIALIZED VIEW user_logins AS
    SELECT user_id, login_time, ip_address
    FROM logins
    WHERE login_time IS NOT NULL
    PRIMARY KEY (user_id, login_time);
```
### Pattern 3: DynamoDB with Global Secondary Indexes for Diverse Access Patterns
```yaml
Resources:
  UserInfo:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: UserInfo
      AttributeDefinitions:
        - AttributeName: UserId
          AttributeType: S
        - AttributeName: Birthdate
          AttributeType: S
      GlobalSecondaryIndexes:
        - IndexName: BirthdateIndex
          KeySchema:
            - AttributeName: Birthdate
              KeyType: HASH
          Projection:
            ProjectionType: ALL
```

## Constraints
### MUST DO
- Ensure proper key selections that maximize performance and reduce latency.
- Regularly test access patterns against the chosen model to confirm efficiency and scalability.

### MUST NOT DO
- Use overly normalized schemes that hamper read performance in document databases.
- Assume one-size-fits-all approaches for disparate database systems without adjustments.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [NoSQL Data Modeling Patterns (DynamoDB)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html) — AWS DynamoDB's best practices for data modeling patterns including singleton, time series, and hierarchical
- [Document Database Design Patterns (MongoDB)](https://www.mongodb.com/resources/products/guides/noSQL-data-modeling) — MongoDB's official guide to document data modeling strategies and anti-patterns
- [Graph Database Modeling (Neo4j)](https://neo4j.com/developer/graph-data-modeling/) — Neo4j's guide to graph data modeling techniques for relationship-heavy domains
- [Cassandra Data Modeling](https://docs.datastax.com/en/cassandra-oss/cassandra-developer/dql/dqldataModel.html) — DataStax documentation on designing tables and partitioning strategies for Apache Cassandra
- [Key-Value Store Patterns (Redis)](https://redis.io/docs/latest/develop/use/data-types/) — Redis data type patterns for efficient key-value data modeling in high-performance systems
