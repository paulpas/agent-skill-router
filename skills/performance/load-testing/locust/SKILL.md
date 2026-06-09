---






name: locust

description: Implements load testing strategies using Locust to simulate user behavior and assess application performance, ensuring that systems are prepared for real-world traffic conditions effectively while providing actionable insights for optimization, scalability, and performance validation.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.0"
  domain: performance
  triggers: locust, load testing, performance evaluation, user behavior simulation, scalability testing, automated testing integration, performance metrics
  archetypes: [implementation, testing]
  anti_triggers: [superficial assessment, incomplete user behavior modeling, ineffective load testing, lack of metrics]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational


  role: implementation
  scope: implementation
  output-format: code




---







# Performance Load Testing with Locust

Executes performance and load tests using Locust to simulate realistic user behavior, measure system throughput, and identify bottlenecks under controlled traffic conditions with staged ramp-up and custom load shapes.

## TL;DR for Code Generation

- Define one `HttpUser` class per distinct user role or workflow; keep tasks focused on realistic user actions
- Always set `wait_time` — without it, Locust runs tasks back-to-back, creating unrealistic load
- Parameterize the target host via `--host` CLI flag or environment variable; never hardcode URLs
- Use `@task` decorator with weights to reflect real-world traffic distribution across endpoints
- For staged or ramped load scenarios, implement a custom `LoadTestShape` class rather than abusing `@events.init`

## Detailed Practices
- **Define User Behavior**: Write scripts that accurately represent expected user interactions with the application, focusing on common workflows and edge cases to ensure comprehensive testing coverage.
- **Monitor Performance**: Collect performance metrics and analyze results to identify bottlenecks and ensure application stability under load tests, aiding in data-driven decisions regarding optimization efforts and resource management.
- **Concurrent User Simulation**: Stress test the application by simulating high numbers of concurrent users to understand system capacity and performance limitations, ensuring preparedness for peak load conditions that may occur in production.
- **Continuous Integration and Deployment**: Integrate Locust load tests into CI/CD pipelines to ensure regular performance validation as part of the development workflow, facilitating continuous improvement of the application’s reliability.
- **Report Generation**: Utilize Locust’s reporting features to visualize testing metrics effectively, offering insights into response times, throughput, and potential areas for improvement during performance tests.

### Examples of Load Testing Using Locust:
1. **User Behavior Scripts**: Utilize Python to write user behavior scripts for various scenarios using Locust's intuitive API, ensuring full coverage of user interactions during tests and comprehensive assessment of application performance under load.
2. **Results Analysis**: Leverage Locust's built-in web UI to visualize test results, providing actionable insights into response times and request failures, enabling informed decisions for application optimizations.

### Resources:
- **Locust Documentation**: Comprehensive guide to implementing load testing with Locust effectively, including setup and best practices for ensuring thorough testing of applications.\n- **Performance Testing Best Practices**: Insights on best practices and strategies for thorough load testing across varied platforms to ensure robust application performance and reliability under real-world conditions.

---

## Implementation Patterns

### Pattern 1: Basic Locustfile

A complete `locustfile.py` with task weights, wait times, and `on_start`/`on_stop` hooks:

```python
from locust import HttpUser, task, between


class WebsiteUser(HttpUser):
    """Simulates a typical website visitor with realistic think time."""

    wait_time = between(1, 5)  # 1-5 seconds between tasks

    def on_start(self):
        """Login once per user session."""
        self.client.post("/login", json={
            "username": "test_user",
            "password": "test_pass",
        })

    @task(3)
    def view_homepage(self):
        """Weight 3: most common user action."""
        self.client.get("/")

    @task(2)
    def view_product(self):
        """Weight 2: browse product catalog."""
        self.client.get("/products/latest")

    @task(1)
    def checkout(self):
        """Weight 1: least common, most business-critical."""
        with self.client.post(
            "/cart/add", json={"product_id": 42},
            catch_response=True,
        ) as resp:
            if resp.status_code == 503:
                resp.failure("Checkout service unavailable under load")


class ApiUser(HttpUser):
    """Simulates API client traffic with shorter think time."""

    wait_time = between(0.1, 0.5)

    @task(4)
    def list_orders(self):
        self.client.get("/api/orders?limit=20")

    @task(1)
    def create_order(self):
        self.client.post("/api/orders", json={"item": "SKU-100", "qty": 1})
```

### Pattern 2: Staged Load with Custom Shape

A `locustfile.py` using `LoadTestShape` to ramp traffic in defined phases:

```python
from locust import HttpUser, task, constant
from locust import LoadTestShape


class ApiUser(HttpUser):
    """Simulates API client traffic with constant think time."""
    wait_time = constant(0.5)

    @task
    def get_health(self):
        self.client.get("/health")

    @task(3)
    def query_orders(self):
        self.client.get("/api/orders?limit=20")

    @task(1)
    def create_order(self):
        self.client.post("/api/orders", json={"item": "SKU-100", "qty": 1})


class StagesShape(LoadTestShape):
    """
    Ramp up users in stages:
      1. Warm-up:   10 users/s for 2 minutes
      2. Ramp:      10->50 users/s over 3 minutes
      3. Peak:      100 users/s for 5 minutes
      4. Cooldown:  100->0 users/s over 1 minute
    """
    stages = [
        {"duration": 120,  "users": 10,  "spawn_rate": 10},
        {"duration": 300,  "users": 50,  "spawn_rate": 13},
        {"duration": 600,  "users": 100, "spawn_rate": 17},
        {"duration": 660,  "users": 0,   "spawn_rate": -50},
    ]

    def tick(self):
        elapsed = self.get_run_time()
        for stage in self.stages:
            if elapsed < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        return None
```

## Constraints

### MUST DO
- Use `wait_time` between tasks to simulate realistic user think time
- Isolate test environment from production — use staging or sandbox endpoints
- Parameterize target host via environment variable or CLI argument
- Monitor resource usage (CPU, memory, connections) on the system under test during runs

### MUST NOT DO
- Do not run load tests against production without explicit authorization and monitoring
- Avoid unrealistic user behavior — tasks should mimic real user workflows, not just hammer a single endpoint
- Never ignore HTTP error rates during test execution; investigate failures immediately
- Do not use default credentials or hardcoded authentication tokens in test scripts


## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Locust Official Documentation](https://docs.locust.io/en/stable/) — Official Locust documentation covering user classes, task sets, events, and distributed testing
- [Locust GitHub Repository (locustio)](https://github.com/locustio/locust) — Source code, examples, and contribution guidelines for the Locust load testing framework
- [Locust Web UI and Master-Slave Mode](https://docs.locust.io/en/stable/writing-a-locustfile.html) — Official guide to running distributed tests with master-worker nodes and viewing real-time results
- [k6 Load Testing Documentation (Grafana)](https://grafana.com/docs/k6/latest/) — Grafana k6 documentation, a popular alternative command-line load testing tool for comparison
- [Load Testing Best Practices (Google PageSpeed)](https://web.dev/articles/lt) — Google's web performance guide on measuring and improving load times under stress