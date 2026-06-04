---
name: k6
description: Implements best practices for load testing web applications using K6, a modern performance testing tool optimized for developers.
license: MIT
compatibility: opencode
metadata:
version: "1.1.1"
  domain: performance
  triggers: load testing, performance testing, K6, web applications, system performance
  archetypes: [implementation, reference]
  anti_triggers: [neglecting script maintenance, ignoring load test results]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

## Best Practices for Load Testing with K6
Load testing ensures that your applications can handle expected usage patterns and helps identify performance bottlenecks. K6 is an excellent tool for developers seeking to implement modern performance testing efficiently. Below are strategies for effective load testing using K6:

### Core Principles:
1. **Scenario Development**: Construct realistic user scenarios that reflect actual usage patterns to ensure your load tests are valid.
2. **Parameterization**: Utilize environment variables to parameterize values in your test scripts, allowing for flexibility and better management.
3. **Performance Monitoring**: Integrate monitoring with your load testing to capture trends in resource usage (CPU, Memory) as load increases.

### Security Best Practices:
- **Limit Environment Impact**: Test in staging environments or during off-peak hours to avoid affecting real users.
- **Anonymous User Data**: Ensure compliance with data protection regulations while generating load and using script data that does not expose real user information.
- **Utilize CI/CD Pipelines**: Integrate load testing into your CI/CD pipelines, enabling automated load tests to occur with changes to any part of the application.

### Example Scenario Implementation:
Here’s a basic example of loading testing with K6:
```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
    http.get('https://test.k6.io');
    sleep(1);
}
```

### Measuring Load Testing Effectiveness:
Monitor key performance indicators such as response time, throughput, and error rates during load tests to evaluate performance thoroughly.

### FAQs About Load Testing with K6:
- **What is K6?**  
K6 is an open-source load testing tool designed around the developer experience that allows you to write tests in JavaScript.
- **How does K6 compare to other load testing tools?**  
K6 is known for its performance and ease of integration with modern development workflows, especially with CI/CD pipelines.
- **Can K6 be integrated with monitoring systems?**  
Yes, K6 can integrate with various monitoring solutions (e.g., Grafana) to visualize load testing data and gain insights into system performance.

By implementing effective load testing with K6, teams can ensure their applications perform optimally under expected workloads, thus enhancing application reliability and user satisfaction over time.
---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains
