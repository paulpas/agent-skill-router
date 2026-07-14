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

  role: implementation
  scope: implementation
  output-format: code



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

## Implementation Patterns

### Advanced K6 Script with Thresholds and Stages

A more realistic load test with parameterized options, multi-stage ramp profiles, thresholds, and response checks:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp up to 50 VUs
    { duration: '5m', target: 50 },   // sustain at 50 VUs
    { duration: '2m', target: 100 },  // ramp up to 100 VUs
    { duration: '5m', target: 100 },  // sustain at 100 VUs
    { duration: '2m', target: 0 },    // ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post(
    'https://test-api.example.com/login',
    JSON.stringify({ username: `user_${__VU}`, password: 'test' }),
    params,
  );
  check(loginRes, {
    'login succeeded': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  sleep(__ITER % 3 === 0 ? 2 : 1);

  const searchRes = http.get(
    `https://test-api.example.com/search?q=product_${__ITER % 10}`,
    params,
  );
  check(searchRes, {
    'search returned results': (r) => r.status === 200,
    'response under 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## Constraints

### MUST DO
- Define realistic load profiles using `stages` or `scenarios` to simulate real user traffic patterns
- Set explicit `thresholds` for request duration, error rate, and throughput to define pass/fail criteria
- Parameterize the target URL and virtual user count via environment variables or `--env` flags
- Run a quick smoke test (1-2 VUs) before executing full-scale load tests to validate the script

### MUST NOT DO
- Do not run load tests against production systems without explicit authorization and monitoring in place
- Avoid testing with only one endpoint — realistic tests cover multiple user journeys and API calls
- Never ignore HTTP failures or timeouts during test runs; investigate and fix before accepting results
- Do not use hardcoded authentication tokens that may expire mid-test — implement token refresh logic
