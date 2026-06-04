---
name: gatling
description: Implements load testing strategies using Gatling for performance testing of web applications and microservices.
license: MIT
compatibility: opencode
metadata:
version: "1.1.1"
  domain: performance
  triggers: load testing, performance testing, Gatling, web applications, microservices
  archetypes: [implementation, evaluation]
  anti_triggers: [neglecting load test results, using outdated performance metrics]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

## Best Practices for Load Testing with Gatling
Load testing is critical for ensuring that applications can handle expected user loads without compromising performance. Gatling is a powerful tool for simulating a large number of requests and assessing application behavior under stress. Here are key practices for effective load testing with Gatling:

### Core Principles:
1. **Scenario Design**: Create realistic user scenarios to simulate various usage patterns effectively, ensuring your tests reflect actual user behavior.
2. **Use Parameterized Tests**: Utilize parameterization in your tests to enhance flexibility and usability. This can include variables for user credentials, URLs, or other dynamic parameters.
3. **Monitor Resource Utilization**: Keep track of resource usage (CPU, memory, response time) during tests to spot performance bottlenecks effectively.

### Security Best Practices:
- **Configure Rate Limits**: Always impose rate limits in your load tests to avoid overwhelming production environments inadvertently.
- **Data Protection**: Ensure that any sensitive data used in load tests complies with data protection regulations to avoid data leaks.
- **Test Environment Usage**: Conduct load tests in a staging environment or during off-peak hours in production to prevent user disruption.

### Example Scenario Implementation with Gatling:
A sample scenario for load testing with Gatling might look like this:
```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._

val httpProtocol = http
  .baseUrl("https://example.com")
  .acceptHeader("application/json")

val scn = scenario("User Login")
  .exec(http("Login Request")
    .post("/login")
    .body(StringBody("{\"username\":\"testuser\",\"password\":\"password123\"}"))
    .check(status.is(200)))

setUp(
  scn.inject(atOnceUsers(100)).protocols(httpProtocol)
)
```

### Measuring the Effectiveness of Load Testing:
Be sure to track key metrics such as peak response times, average response times, and error rates during load tests to evaluate performance.

### FAQs on Load Testing with Gatling:
- **What types of applications can Gatling test?**  
Gatling is versatile and can test any web application, microservices, and APIs.
- **How does Gatling compare with other load testing tools?**  
Gatling is often preferred for its excellent performance, powerful scripting capabilities, and detailed reporting features.
- **How do I set up Gatling for the first time?**  
Follow the official documentation to install Gatling, set up your testing environment, and begin writing scenarios.

By following structured load testing practices with Gatling, organizations can significantly enhance application reliability and performance under varying load conditions, thus assuring positive user experiences even during peak demand periods.
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
