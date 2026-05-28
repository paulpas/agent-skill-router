---
name: ai-llm-agentic-tooling-langchain-langgraph
description: Integrates LangChain/LangGraph for building LLM-powered agents and applications in Python, facilitating advanced logic and workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: langchain, langgraph, llm integration, agent, workflows, python
  role: implementation
  scope: implementation
  output-format: code
  related-skills: ai-llm-agentic-tooling-mcp
---

# AI LLM Agentic Tooling with LangChain/LangGraph

Integrates LangChain and LangGraph to facilitate the development of LLM-powered agents and applications. This skill focuses on building advanced logic and workflows using these frameworks in Python.

## Use Cases

Use this skill when:
- Creating complex workflows involving decision-making models.
- Building agents that require chaining multiple LLM calls efficiently.
- Integrating external tools or APIs within a conversational agent framework.

## Implementation Patterns

This skill offers an integration guide for LangChain and LangGraph, enabling the development of LLM-powered agents in Python. It facilitates various advanced logic and workflows through examples and best practices.

### Basic LangChain Agent Creation
This example demonstrates how to define a basic LangChain agent:
```python
from langchain import LLMChain, PromptTemplate

# Define a simple LLM chain
prompt = PromptTemplate(input_variables=['input'], template="""You are a helpful assistant. Assist with: {input}.
""")

agent = LLMChain(prompt=prompt)
```

### LangGraph Workflow Example
This section illustrates how to use LangGraph to define tasks:
```python
from langgraph import Executor, Task

@Task
def fetch_data():
    return {'data_key': 'value'}

@Task
def process_data(data):
    return data['data_key'] + ' processed'

executor = Executor(tasks=[fetch_data, process_data])
executor.run()
```

### Advanced Usage with Error Handling
Include retries and error logging in your agents. Use state management techniques to preserve data between tasks.

## Constraints on Use
- Ensure prompt structures are maintained to maximize performance and clarity.
- Validate context objects to ensure they adhere to expected formats and types.

## Metadata Updates
```yaml
archetypes: tactical
anti_triggers:
  - vague conversation
  - overly generic request
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
```

### Basic LangChain Agent Creation
```python
from langchain import LLMChain, PromptTemplate

# Define a simple LLM chain
prompt = PromptTemplate(input_variables=['input'], template="""You are a helpful assistant. Assist with: {input}.
""")

agent = LLMChain(prompt=prompt)
```

### LangGraph Workflow Example
```python
from langgraph import Executor, Task

# Define tasks and executor
@Task
def fetch_data():
    return {'data_key': 'value'}

@Task
def process_data(data):
    return data['data_key'] + ' processed'

executor = Executor(tasks=[fetch_data, process_data])
executor.run()
```

### Advanced Usage with Error Handling
- Include retries and error logging in your agents.
- Use state management techniques to preserve data between tasks.

---
## Constraints

### MUST DO
- Define and document each workflow clearly, especially the input and output structure.
- Implement logging and monitoring to track agent performance and identify bottlenecks.

### MUST NOT DO
- Skip testing integrations with external APIs and tools; ensure all dependencies function as expected.
- Assume workflows will automatically adjust; handle edge cases explicitly in your implementations.
