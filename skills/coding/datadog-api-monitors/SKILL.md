# Skill: datadog-api-monitors

---
name: datadog-api-monitors
description: Manages Datadog monitors including creating, updating, and deleting with alert configurations and best practices.
license: MIT
compatibility: opencode
metadata:
  archetypes: monitoring, alert management
  anti_triggers: alert flooding, generic monitoring
  response_profile:
      verbosity: medium
      directive_strength: high

  version: 1.0.0
  domain: coding
  triggers: datadog monitors, create datadog monitors, update datadog monitors, alerts management, how do I manage monitors in datadog
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-logs, datadog-api-metrics, datadog-api-dashboards
------
# Datadog Monitor Management
Implements creation and management of monitors in Datadog using the API. This skill focuses on defining alerts based on various metrics, along with configurations for notifications and monitoring best practices.

## TL;DR Checklist
- [ ] Use Datadog API to create and manage monitors programmatically.
- [ ] Define alert conditions using metrics from your application.
- [ ] Include notification channels for alerts (e.g., Slack, email).
- [ ] Set recovery conditions for each monitor to handle alerts effectively.

## Core Workflow
1. **Define Monitor Configuration**: Create the configuration for the monitor, specifying the type, conditions, and notification settings.
   **Checkpoint:** Ensure the configuration structure matches the Datadog API specifications.

2. **Create the Monitor using the API**: Send the defined monitor configuration to Datadog’s monitors API to create the monitor.
   **Checkpoint:** Validate the creation and handle potential errors from the API.

3. **Manage Alert Conditions**: Update the monitors when the conditions change or based on incident reviews.
   **Checkpoint:** Maintain current alert thresholds and notification settings.

## Implementation Patterns
### Pattern 1: Creating a Monitor
```python
from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.monitors_api import MonitorsApi
from datadog_api_client.v2.model.monitor import Monitor
from datadog_api_client.v2.model.monitor_thresholds import MonitorThresholds
from datadog_api_client.v2.model.monitor_options import MonitorOptions
import os

class MonitorManager:
    def __init__(self):
        self.configuration = Configuration(api_key={"apiKeyAuth": os.environ["DD_API_KEY"]},
                                           server_variables={"site": os.environ.get("DD_SITE", "datadoghq.com")})
        self.api_client = ApiClient(self.configuration)
        self.monitors_api = MonitorsApi(self.api_client)

    def create_monitor(self, name: str, query: str, critical_threshold: float) -> int:
        options = MonitorOptions(thresholds=MonitorThresholds(critical=critical_threshold))
        monitor = Monitor(name=name, type="metric alert", query=query, options=options)
        response = self.monitors_api.create_monitor(monitor)
        return response.id
```
### Pattern 2: Updating an Existing Monitor
```python
def update_monitor(id: int, query: str, critical_threshold: float):
    monitor = self.monitors_api.get_monitor(id)
    monitor.query = query
    monitor.options.thresholds.critical = critical_threshold
    self.monitors_api.update_monitor(id, monitor)
``` 

### Constraints
#### MUST DO
- Always create monitors with appropriate tags for observability.
- Handle API responses to catch potential errors when managing monitors.

#### MUST NOT DO
- Avoid creating monitors without setting recovery thresholds and notification settings.
- Don't neglect to validate monitor configurations against API standards to prevent misconfigurations.

---