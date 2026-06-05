---




name: aws-dynamodb-integration
description: Implements AWS DynamoDB functionalities, showcasing data modeling, queries, and performance optimization using the AWS SDK.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dynamodb, aws, data modeling, aws sdk, performance optimization
  role: implementation
  scope: implementation
  output-format: code
  related-skills: aws-sqs, bigquery-api-query




---





# AWS DynamoDB Integration

Implements AWS DynamoDB functionalities, showcasing essential operations for data modeling, querying, and performance optimization using the AWS SDK.

## Use Cases

Use this skill when:
- Setting up a new DynamoDB table and defining its schema.
- Performing CRUD operations on DynamoDB items.
- Querying data efficiently based on various indexes.

## Implementation Patterns

This skill covers essential functionalities of AWS DynamoDB and offers examples for performing common operations. It's designed to assist developers in using DynamoDB efficiently and effectively.

### Setting Up a DynamoDB Table
The following example demonstrates how to create a new DynamoDB table with specified attributes and key schema:
```python
import boto3

def create_table(table_name: str):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.create_table(
        TableName=table_name,
        KeySchema=[
            {'AttributeName': 'id', 'KeyType': 'HASH'}  # Partition key
        ],
        AttributeDefinitions=[
            {'AttributeName': 'id', 'AttributeType': 'S'}  # String
        ],
        ProvisionedThroughput={
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        }
    )
    return table
```

### Querying Data
This example illustrates how to use the `get_item` method to fetch data based on the primary key:
```python
import boto3

def query_data(table_name: str, id_value: str):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    response = table.get_item(
        Key={'id': id_value}
    )
    return response.get('Item')
```

### Performance Optimization Guidelines
DynamoDB offers automatic performance optimization mechanisms. Follow these best practices to maximize the performance of this NoSQL database:
- Properly use partition keys and sort keys to speed up data retrieval.
- Enable DynamoDB Auto Scaling to adjust capacity automatically based on traffic.
- Use Global Secondary Indexes (GSI) wisely to enable complex querying.

### Constraints
Ensure that you adhere to the following constraints when working with DynamoDB:
#### MUST DO
- Define clear access policies and IAM roles for DynamoDB operations.
- Monitor throughput and adjust capacity settings as needed to avoid throttling.
#### MUST NOT DO
- Avoid performing large-scale scans without keys; utilize queries and index scans instead.
- Do not overlook the importance of monitoring metrics provided by AWS.

## Metadata Updates
```yaml
archetypes: tactical
anti_triggers:
  - generic query
  - vague search
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
```

### Setting Up a Table
```python
import boto3

def create_table(table_name: str):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.create_table(
        TableName=table_name,
        KeySchema=[
            {'AttributeName': 'id', 'KeyType': 'HASH'}  # Partition key
        ],
        AttributeDefinitions=[
            {'AttributeName': 'id', 'AttributeType': 'S'}  # String
        ],
        ProvisionedThroughput={
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        }
    )
    return table
```

### Querying Data
```python
import boto3

def query_data(table_name: str, id_value: str):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    response = table.get_item(
        Key={'id': id_value}
    )
    return response.get('Item')
```

### Performance Optimization
- Use DynamoDB's built-in partition and sort keys to maximize throughput and data scanning efficiency.
- Consider global secondary indexes for complex queries.
- Monitor and adjust read/write capacity as necessary.

---
## Constraints

### MUST DO
- Define clear access policies & roles for DynamoDB operations.
- Monitor performance and adjust capacity settings to handle varying loads.

### MUST NOT DO
- Perform large-scale scans indiscriminately; this is inefficient and can lead to throttling.
- Ignore monitoring metrics provided by AWS for DynamoDB.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Amazon DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/) — Official AWS DynamoDB documentation covering tables, items, queries, indexes, and performance
- [DynamoDB Data Modeling Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html) — AWS best practices for DynamoDB data modeling, access patterns, and query optimization
- [AWS SDK for Python (boto3)](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) — Official boto3 documentation for interacting with DynamoDB and other AWS services from Python
- [DynamoDB Streams Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html) — AWS guide to using DynamoDB Streams for change data capture and event-driven architectures
- [NoSQL Data Modeling Patterns (Amazon)](https://www.oreilly.com/library/view/nosql-introduction/9781449304486/) — O'Reilly reference on NoSQL data modeling patterns applicable to DynamoDB design
