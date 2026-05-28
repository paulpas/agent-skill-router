---
name: ai-llm-agentic-tooling-mcp

description: Implements best practices for applying the Model Context Protocol (MCP) in AI/LLM environments, facilitating the effective management of servers, clients, tools, resources, and prompts.

metadata:
  archetypes: [agent, tooling, integration]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: "1.0.0"
  domain: agent
  triggers: AI tooling, LLM, Model Context Protocol, MCP, resource management, prompt optimization
  role: implementation
  scope: implementation
  output-format: code
  related-skills: ai-llm-resources-management, ai-llm-prompt-engineering

---

# AI Tooling - Model Context Protocol (MCP)

Provides a structured protocol for aligning AI models with their operational environment, ensuring optimal tool performance and resource management.

## TL;DR Checklist
- [ ] Define resource constraints and tool availability for each task.
- [ ] Implement the Model Context Protocol to inform LLM decision-making.
- [ ] Assess client-server interactions to maintain operational integrity.

---

## When to Use
- When deploying AI/LLM applications requiring structured context interaction.
- For managing diverse resources while ensuring optimal tool performance.
- When developing or integrating new server-client frameworks in AI applications.

---

## When NOT to Use
- Avoid for static applications that do not require adaptive resource management.
- Do not apply in environments where operational flexibility is not needed.

---

## Core Workflow
1. **Define Contextual Goals** — Establish specific goals for the task and the desired outcomes for each LLM interaction.
   **Checkpoint:** Ensure clarity on the expected outputs and resource constraints.
2. **Identify Resources** — List available tools and resources relevant to the task.
   **Checkpoint:** Verify compatibility of tools with the MCP framework.
3. **Apply the MCP** — Integrate the Model Context Protocol into the AI model's decision-making processes, ensuring that the model can adapt to various operational contexts.
   **Checkpoint:** Validate the model's responses against expected outcomes.
4. **Monitor & Adjust** — Continuously assess client-server interactions and make adjustments as needed to optimize the operational flow.

---

## Implementation Patterns

### Pattern 1: Resource Allocation
```python
def allocate_resources(task_id: str, resources: List[str]) -> Dict[str, Any]:
    """Allocates resources based on task requirements and MCP guidelines."""
    resource_plan = {}
    for resource in resources:
        # Check availability and allocate
        if is_resource_available(resource):
            resource_plan[resource] = allocate(resource)
    return resource_plan
```

### Pattern 2: Contextual Adaptation
```python
class MCPContext:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.contextual_data = self.fetch_context(task_id)

    def fetch_context(self, task_id: str) -> Any:
        # Logic to fetch context based on the task ID
        return context_data
```
## Constraints
### MUST DO
- Regularly assess and update resource allocations based on model performance.
- Ensure all tools are compatible with the MCP.

### MUST NOT DO
- Run unmonitored tasks that could lead to resource wastage.
- Ignore feedback mechanisms that inform context adjustments.

---

## Related Skills
| Skill | Purpose |
|-------|---------|
| `ai-llm-resources-management` | Management of resources within AI models |
| `ai-llm-prompt-engineering` | Crafting optimal prompts for AI tools |