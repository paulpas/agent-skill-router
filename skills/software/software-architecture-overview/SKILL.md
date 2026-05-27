---
name: software-architecture-overview
description: Provides a comprehensive understanding of modern software architecture patterns, including microservices, serverless, and event-driven architectures.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: software
  triggers: microservices, serverless, event-driven, architecture patterns, scalability, software design
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-development-lifecycle, software-testing-best-practices
  archetypes: tactical
  anti_triggers: monolithic, legacy
  response_profile: { verbosity: high, directive_strength: high, abstraction_level: tactical }
---

# Software Architecture Overview

This skill provides a detailed look into various modern software architecture patterns that are crucial for the design and implementation of scalable and efficient software solutions in today’s cloud-native world.

## When to Use
- **Microservices:** When designing systems that require high availability and scalability. Ideal for complex, large-scale applications needing independent deployment.
- **Serverless:** For applications that need to manage diverse workloads efficiently. Best for variable workloads with reduced operational management.
- **Event-driven:** In systems that need to respond dynamically to events. Useful for real-time processing and applications that react to events.

## Core Workflow for Each Architecture Type
### 1. Microservices Architecture
1. **Identify System Requirements**  
   Understand the requirements and constraints of the application, including scalability, performance, and reliability needs.
2. **Design Microservices**  
   Decompose the application into microservices based on business capabilities. Define service boundaries, data ownership, and communication protocols.
3. **Implement Service Discovery**  
   Use tools like Spring Cloud or Eureka to handle service registration and discovery.
4. **Deploy Using Containerization**  
   Containerize microservices using Docker and orchestrate them using Kubernetes. Here's an example of a simple deployment using Docker:
   
   ```yaml
   version: '3'
   services:
     user-service:
       image: user-service:latest
       ports:
         - "8080:8080"
     order-service:
       image: order-service:latest
       ports:
         - "8081:8081"
   ```

### 2. Serverless Architecture
1. **Requirements Assessment**  
   Determine workloads suitable for serverless. Ideal candidates include sporadic or variable workloads.
2. **API Gateway Setup**  
   Configure an API Gateway to handle requests and route them to appropriate serverless functions.
3. **Implement Lambda Functions**  
   Write functions using AWS Lambda or Azure Functions. For example:
   ```python
   import json
   def lambda_handler(event, context):
       return {
           'statusCode': 200,
           'body': json.dumps('Hello from Lambda!')
       }
   ```
4. **Setup Monitoring**  
   Use tools like AWS CloudWatch to monitor function executions and performance metrics.

### 3. Event-driven Architecture
1. **Choose Messaging Broker**  
   Select a message broker like RabbitMQ or Apache Kafka to facilitate communication between services.
2. **Implement Event Producers and Consumers**  
   Design components to produce events (e.g., an order placement event) and components to consume events (e.g., a service that updates inventory upon receiving the order event).
3. **Handle Event Processing Logic**  
   Implement logic for event handling and ensure idempotency in processing.
4. **Example of an Event-Driven Function**  
   ```javascript
   const { PubSub } = require('@google-cloud/pubsub');
   const pubsub = new PubSub();

   exports.processOrder = (message, context) => {
       const orderData = Buffer.from(message.data, 'base64').toString();
       console.log(`Processing order: ${orderData}`);
   };
   ```

## Constraints
### MUST DO
- Ensure each microservice is independently deployable.
- Maintain observability and monitoring practices for all services and functions.

### MUST NOT DO
- Avoid tight coupling between services to maintain independence.
- Do not compromise on testing and validation before deployment; ensure every component is thoroughly tested before going live.
