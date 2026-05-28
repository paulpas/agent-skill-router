# Skill: datadog-api-dashboards

---
name: datadog-api-dashboards
description: Creates and manages dashboards in Datadog API using `datadog-api-client`, with a focus on template widget creation, layout management, and configuration best practices.
license: MIT
compatibility: opencode
metadata:
  archetypes: monitoring, dashboard management
  anti_triggers: performance issues, alert fatigue
  response_profile:
      verbosity: medium
      directive_strength: high

  version: 1.0.0
  domain: coding
  triggers: datadog dashboards, create datadog dashboards, datadog API dashboards, dashboards management, how do I create a dashboard in datadog
  role: implementation
  scope: implementation
  output-format: code
  related-skills: datadog-api-logs, datadog-api-monitors, datadog-api-metrics
------
# Datadog Dashboards Management
Implements dashboard creation and management in Datadog using the `datadog-api-client`. This skill covers creating various types of widgets, configuring layout settings, and ensuring that best practices are followed for performance and usability.

## TL;DR Checklist
- [ ] Use the `datadog-api-client` SDK to manage and create dashboards.
- [ ] Batch-create widgets to minimize API calls and ensure efficient resource usage.
- [ ] Use consistent naming conventions for dashboards and widget titles.
- [ ] Validate configurations on each change to avoid misconfigurations that impact usability.

## Core Workflow
1. **Initialize Dashboard Configuration**: Define how the dashboard's layout, title, and description are set up before sending requests to create the dashboard.
   **Checkpoint:** Validate the structure against Datadog’s API specifications.

2. **Create Widgets**: Add various types of widgets (time series, query value, heat map) based on the metrics you are tracking.
   **Checkpoint:** Verify that widget configurations adhere to best practices for clarity and efficiency.

3. **Submit dashboard to Datadog**: Use the `DashboardsApi` within the client to send the complete dashboard structure for creation along with widgets.
   **Checkpoint:** Handle potential errors during submission and ensure a fallback mechanism is in place.

## Implementation Patterns
### Pattern 1: Dashboard Creation
```python
from datadog_api_client import ApiClient, Configuration
from datadog_api_client.v2.api.dashboards_api import DashboardsApi
from datadog_api_client.v2.model.dashboard import Dashboard
from datadog_api_client.v2.model.widget import Widget
from datadog_api_client.v2.model.widget_definition import WidgetDefinition
import os

class DatadogDashboard:
    def __init__(self):
        self.configuration = Configuration(api_key={"apiKeyAuth": os.environ["DD_API_KEY"]},
                                           server_variables={"site": os.environ.get("DD_SITE", "datadoghq.com")})
        self.api_client = ApiClient(self.configuration)
        self.dashboards_api = DashboardsApi(self.api_client)

    def create_dashboard(self, title: str, widgets: list[Widget]) -> int:
        dashboard = Dashboard(title=title, widgets=widgets)
        result = self.dashboards_api.create_dashboard(dashboard=dashboard)
        return result.id
```
### Pattern 2: Adding Widgets to a Dashboard
```python
def add_widget_to_dashboard(dashboard_id: int, widget: Widget):
    dashboard = self.dashboards_api.get_dashboard(dashboard_id)
    dashboard.widgets.append(widget)
    self.dashboards_api.update_dashboard(dashboard_id, dashboard)
    logger.info(f"Widget added to dashboard {dashboard_id}.")
``` 

### Constraints

#### MUST DO
- Always configure dashboards to reflect team and service tagging for easier management.
- Use structured error handling when creating/updating dashboards to prevent losing configurations.

#### MUST NOT DO
- Avoid creating unwieldy dashboards with too many widgets, which can affect loading performance.
- Never send requests with missing required parameters, as this can cause API errors.

---