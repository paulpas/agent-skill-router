# Skill: datadog-api-synthetic-tests

---
name: datadog-api-synthetic-tests
description: Implements management and execution of Datadog Synthetic Tests using the API, focusing on setup, validation, and best practices.
license: MIT
compatibility: opencode
metadata:
  archetypes: monitoring, synthetic testing
  anti_triggers: manual testing, performance bottlenecks
  response_profile:
      verbosity: medium
      directive_strength: high

  version: 1.0.0
  domain: coding
  triggers: datadog synthetic tests, create synthetic tests, manage synthetic tests, datadog tests API, how do I use datadog synthetic tests
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-monitors, datadog-api-logs, datadog-api-metrics
------
# Datadog Synthetic Tests Management
Implements the creation and management of Datadog Synthetic Tests through the API. This skill focuses on ensuring proper configurations and execution of synthetic monitoring for application performance.

## TL;DR Checklist
- [ ] Use the Datadog API to create and manage synthetic tests with valid configurations.
- [ ] Validate all synthetic tests to ensure they reflect real-world scenarios.
- [ ] Ensure monitoring notifications are correctly set up for test failures or performance drops.

## Core Workflow
1. **Define Synthetic Test Configuration**: Establish the configurations needed for synthetic tests, which include the type of test (API, browser), test frequency, and URLs.
   **Checkpoint:** Validate the configurations before creating the test.

2. **Create Synthetic Tests**: Utilize the Synthetic Tests API to create the test with the defined configurations.
   **Checkpoint:** Check API response for confirmation of test creation and log accordingly.

3. **Monitor and Update Tests**: Regularly review the status and performance of synthetic tests, updating configurations as necessary.
   **Checkpoint:** Log any modifications to keep an audit trail.

## Implementation Patterns
### Pattern 1: Creating a Synthetic Test
```python
from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.synthetics_api import SyntheticsApi
from datadog_api_client.v2.model.synthetics_test import SyntheticsTest
import os

class SyntheticTestManager:
    def __init__(self):
        self.configuration = Configuration(api_key={"apiKeyAuth": os.environ["DD_API_KEY"]},
                                           server_variables={"site": os.environ.get("DD_SITE", "datadoghq.com")})
        self.api_client = ApiClient(self.configuration)
        self.synthetics_api = SyntheticsApi(self.api_client)

    def create_synthetic_test(self, test: SyntheticsTest) -> int:
        response = self.synthetics_api.create_synthetic_test(test)
        return response.id
```
### Pattern 2: Updating a Synthetic Test
```python
def update_synthetic_test(test_id: int, new_url: str):
    test = self.synthetics_api.get_synthetic_test(test_id)
    test.config.request.url = new_url
    self.synthetics_api.update_synthetic_test(test_id, test)
``` 

### Constraints
#### MUST DO
- Ensure synthetic tests are accurately reflecting user interactions and environments.
- Validate that each test configuration adheres to Datadog’s guidelines.

#### MUST NOT DO
- Avoid omitting important configurations (test frequency, notifications) as this can lead to missed incidents.
- Never use hardcoded values in test configurations; rely on environment variables instead.

---