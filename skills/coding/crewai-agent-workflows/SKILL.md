---
name: crewai-agent-workflows
description: Implements CrewAI multi-agent collaboration patterns including role-based agents, task delegation, tool sharing, sequential and hierarchical workflows, and autonomous agent coordination for production AI applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: crewai, multi-agent collaboration, role based agents, agent task delegation, how do i coordinate ai agents, sequential agent workflow, hierarchical agent team
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - high level architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: langgraph-implementation, autogen-conversational-patterns, framework-utilization
---

# CrewAI Agent Workflow Patterns

Implements multi-agent collaboration systems using CrewAI's role-based agent paradigm. Builds coordinated teams of specialized AI agents with explicit task delegation, shared tool access, sequential and hierarchical execution flows, and autonomous decision-making for production-grade AI applications.

## TL;DR Checklist

- [ ] Define each agent with a clear `role`, `goal`, and `backstory` that establishes its specialization
- [ ] Create tasks using `Task(description=..., expected_output=..., agent=...)` with explicit acceptance criteria
- [ ] Assign tools to specific agents — only grant tool access the agent actually needs
- [ ] Build a `Crew(agents=[...], tasks=[...])` and invoke with `crew.kickoff()` for sequential execution
- [ ] Use `Process.hierarchical` mode when you need a manager agent to delegate dynamically
- [ ] Set `verbose=True` during development; switch to structured logging in production
- [ ] Test individual agents and tasks separately before assembling the full crew

---

## When to Use

Use this skill when:

- Building a team of specialized AI agents that collaborate on a multi-step workflow (researcher → writer → editor)
- You need different agents with different tool access and expertise domains
- Tasks must execute in a defined sequence where each agent's output feeds the next
- You want a manager agent to dynamically delegate tasks based on intermediate results
- Multiple independent work streams need coordinated execution within a single AI workflow

## When NOT to Use

Avoid this skill for:

- Single-agent workflows with no collaboration needed — use LangChain directly
- State-machine-based workflows requiring fine-grained control over transitions — use LangGraph instead
- Real-time streaming agent interactions where latency matters — consider async-native frameworks

---

## Core Workflow

1. **Define Agent Roles** — Each agent needs a clear `role` (what it does), `goal` (why it exists), and `backstory` (context for its behavior). The role determines how the agent frames its reasoning.

```python
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover cutting-edge developments in AI and data science",
    backstory="""You are an expert analyst at a leading tech research firm.
    You specialize in identifying emerging trends, analyzing market data,
    and synthesizing technical findings into actionable insights.""",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

writer = Agent(
    role="Technical Content Writer",
    goal="Write engaging and accurate content about AI and data science topics",
    backstory="""You are a seasoned technical writer with a background in computer science.
    You translate complex research findings into clear, well-structured articles
    suitable for both technical and business audiences.""",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

reviewer = Agent(
    role="Content Review Editor",
    goal="Review and refine content for accuracy, clarity, and readability",
    backstory="""You are a senior editor at a top tech publication. You have an eye
    for technical accuracy, narrative flow, and reader engagement. You provide
    constructive feedback that elevates the quality of published work.""",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)
```

2. **Define Tasks with Explicit Criteria** — Each task specifies what needs to be done, who does it, and what success looks like through `expected_output`.

```python
research_task = Task(
    description=(
        "Analyze the latest developments in large language models for 2025. "
        "Focus on breakthrough architectures, training methodologies, and real-world applications. "
        "Identify the top 5 most impactful trends."
    ),
    expected_output="A comprehensive research report with numbered trends, each including a summary, technical details, and impact assessment.",
    agent=researcher,
)

writing_task = Task(
    description=(
        "Based on the research findings, write a 1500-word article about the future of AI. "
        "Target audience is technical managers who need to understand strategic implications."
    ),
    expected_output="A well-structured article with an executive summary, five trend sections, and a conclusion with actionable recommendations.",
    agent=writer,
)

review_task = Task(
    description=(
        "Review the article for technical accuracy, clarity, and completeness. "
        "Verify all claims against the original research report. "
        "Suggest specific improvements to enhance readability and impact."
    ),
    expected_output="A revised article incorporating your feedback, followed by a bullet-point list of changes made with justification.",
    agent=reviewer,
)
```

3. **Build and Execute the Crew** — Assemble agents and tasks into a crew with an execution process (sequential or hierarchical).

```python
# Sequential execution: each task completes before the next starts
crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential,
    verbose=2,  # Verbose level 2 includes task output and agent reasoning
)

result = crew.kickoff()
print(f"Final output:\n{result}")
```

4. **Implement Manager-Worker Mode** — Use hierarchical process where a manager agent dynamically assigns tasks to workers.

```python
from crewai import Agent, Task, Crew, Process

manager = Agent(
    role="AI Research Project Manager",
    goal="Coordinate the research team and ensure high-quality deliverables",
    backstory=(
        "You manage a team of researchers and writers. You review their work, "
        "assign follow-up tasks, and ensure the final output meets quality standards."
    ),
    verbose=True,
    allow_delegation=True,  # Critical: allows manager to delegate
    llm=llm,
)

# Worker agents (no delegation needed — they just execute assigned tasks)
analyst = Agent(
    role="Data Analyst",
    goal="Analyze datasets and produce statistical insights",
    backstory="You are a data scientist specializing in statistical analysis.",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

visualizer = Agent(
    role="Data Visualization Specialist",
    goal="Create clear visual representations of complex data findings",
    backstory="You transform analytical results into intuitive charts and dashboards.",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

# Tasks for hierarchical mode
data_analysis_task = Task(
    description="Analyze the provided customer satisfaction dataset and identify key drivers of satisfaction.",
    expected_output="A statistical summary with correlation coefficients and p-values for each factor.",
    agent=analyst,
)

visualization_task = Task(
    description="Create visualizations showing the relationship between satisfaction factors.",
    expected_output="Three publication-ready charts with titles, labels, and legends.",
    agent=visualizer,
)

# Hierarchical crew — manager assigns tasks to workers
crew = Crew(
    agents=[manager, analyst, visualizer],
    tasks=[data_analysis_task, visualization_task],
    process=Process.hierarchical,
    manager_llm=llm,  # The manager uses this LLM for delegation decisions
    verbose=2,
)

result = crew.kickoff()
```

5. **Add Shared Tools to Agents** — Grant agents access to external tools (APIs, databases, search). Only provide tools relevant to each agent's role.

```python
from langchain_community.tools import DuckDuckGoSearchRun
from crewai_tools import Tool  # CrewAI-specific tool wrapper

search_tool = Tool(
    name="Web Search",
    description="Search the internet for current information on any topic",
    func=DuckDuckGoSearchRun().run,
)

# Only give the researcher access to search — writer and reviewer read from task outputs
researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover cutting-edge developments in AI and data science",
    backstory="You are an expert analyst...",
    verbose=True,
    allow_delegation=False,
    llm=llm,
    tools=[search_tool],  # Tool access restricted to relevant agents only
)

writer = Agent(
    role="Technical Content Writer",
    goal="Write engaging and accurate content about AI and data science topics",
    backstory="You are a seasoned technical writer...",
    verbose=True,
    allow_delegation=False,
    llm=llm,
    # No tools — writer uses research output from task context
)

research_task = Task(
    description="Research the latest AI agent frameworks and their comparison.",
    expected_output="A detailed comparison of top 5 AI agent frameworks with pros and cons.",
    agent=researcher,  # Only researcher has search_tool available
)
```

## Implementation Patterns

### Pattern 1: Sequential Pipeline with Memory Sharing

Tasks in sequential mode automatically pass context to the next task. Each agent receives the outputs of all prior tasks as part of its working context.

```python
from crewai import Agent, Task, Crew, Process

# Step 1: Data extraction agent
extractor = Agent(
    role="Data Extraction Engineer",
    goal="Extract structured data from unstructured documents",
    backstory="Expert at parsing and structuring document content.",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

# Step 2: Analysis agent receives extraction output automatically
analyzer = Agent(
    role="Data Analyst",
    goal="Analyze extracted data and identify patterns",
    backstory="Experienced data analyst specializing in pattern recognition.",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

# Step 3: Reporting agent receives both extraction and analysis outputs
reporter = Agent(
    role="Business Intelligence Analyst",
    goal="Generate business reports from analytical findings",
    backstory="Skilled at translating data insights into business recommendations.",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

extraction_task = Task(
    description="Extract customer names, order dates, and amounts from the provided text documents.",
    expected_output="A structured list of records with fields: customer_name (str), order_date (str YYYY-MM-DD), amount (float).",
    agent=extractor,
)

analysis_task = Task(
    description="Analyze the extracted customer data. Calculate total revenue per month, identify top customers, and spot unusual patterns.",
    expected_output="Statistical summary with monthly revenue trends, top 10 customers by spend, and flagged anomalies.",
    agent=analyzer,
)

reporting_task = Task(
    description="Write a quarterly business review based on the analysis findings. Include executive summary, key metrics, and recommendations.",
    expected_output="A formatted business report with executive summary, three key metric sections, and actionable recommendations.",
    agent=reporter,
)

crew = Crew(
    agents=[extractor, analyzer, reporter],
    tasks=[extraction_task, analysis_task, reporting_task],
    process=Process.sequential,
    verbose=2,
)

# The output flows automatically: extraction → analysis → report
result = crew.kickoff()
print(result.raw)  # Final output from last task
```

### Pattern 2: Task Delegation Between Agents

Allow agents to delegate sub-tasks to other crew members when they need additional information. This requires `allow_delegation=True` on the delegating agent.

```python
from crewai import Agent, Task, Crew, Process

lead_analyst = Agent(
    role="Lead Data Analyst",
    goal="Coordinate data analysis and produce final insights report",
    backstory="Senior analyst who delegates research tasks to specialists.",
    verbose=True,
    allow_delegation=True,  # Allows lead to delegate to other agents
    llm=llm,
)

specialist = Agent(
    role="Statistical Modeling Specialist",
    goal="Build predictive models and validate statistical assumptions",
    backstory="Expert in regression analysis, time series forecasting, and model validation.",
    verbose=True,
    allow_delegation=False,  # Specialist only executes delegated tasks
    llm=llm,
)

lead_task = Task(
    description=(
        "Analyze the quarterly sales data. If you need statistical modeling done, "
        "delegate that specific task to the specialist agent. Produce a final summary."
    ),
    expected_output="Executive summary with key findings and a list of delegated tasks with their results.",
    agent=lead_analyst,
)

delegated_modeling_task = Task(
    description="Build a linear regression model predicting next quarter sales based on the provided historical data. Report coefficients, R-squared, and residuals.",
    expected_output="Model parameters table, R-squared value, residual analysis summary, and prediction for next quarter.",
    agent=specialist,
)

crew = Crew(
    agents=[lead_analyst, specialist],
    tasks=[lead_task, delegated_modeling_task],
    process=Process.sequential,
    verbose=2,
)

result = crew.kickoff()
```

### Pattern 3: Agent Teaming with Output Parsing

Use structured output parsing to enforce consistent format across agents and enable programmatic downstream processing.

```python
from typing import List, TypedDict
from crewai import Agent, Task, Crew, Process
from pydantic import BaseModel

class Finding(BaseModel):
    trend_name: str
    impact_level: str  # high, medium, low
    confidence: float  # 0.0 to 1.0
    description: str

# Force structured output using response_schema in the task
researcher = Agent(
    role="AI Research Analyst",
    goal="Identify and classify emerging AI trends",
    backstory="Expert at trend analysis and classification.",
    verbose=True,
    allow_delegation=False,
    llm=llm,
)

structured_task = Task(
    description=(
        "Identify the top 5 AI trends for 2025. For each trend, provide its name, "
        "estimated impact level, your confidence score, and a brief technical description."
    ),
    expected_output="A JSON array of 5 trend objects, each with fields: trend_name (string), impact_level (high/medium/low), confidence (0.0-1.0), description (string).",
    agent=researcher,
)

crew = Crew(
    agents=[researcher],
    tasks=[structured_task],
    process=Process.sequential,
    output_parsing=True,  # Enables structured response parsing
)

result = crew.kickoff()
# result.structured contains parsed data conforming to the expected_output schema
parsed_findings = [Finding(**item) for item in result.structured]
```

## Constraints

### MUST DO
- Give each agent a distinct role, goal, and backstory — agents with overlapping roles produce redundant or conflicting outputs
- Use `Process.sequential` when task order matters and outputs feed forward; use `Process.hierarchical` when you need dynamic task allocation
- Set `allow_delegation=True` ONLY on agents that should delegate sub-tasks; keep worker agents at `allow_delegation=False` for clarity
- Restrict tool access to only the agents that genuinely need it — unnecessary tools increase cost and hallucination surface
- Always specify `expected_output` with concrete format requirements (JSON schema, bullet lists, word count) — vague expectations produce inconsistent results
- Set `verbose=2` during development to observe task handoffs; use structured logging in production

### MUST NOT DO
- Do NOT give every agent the same tools — this creates redundant API calls and wastes tokens
- Do NOT use `Process.hierarchical` without a capable manager LLM — weak managers produce poor delegation decisions and create unnecessary loop iterations
- Do NOT chain more than 10 sequential tasks — deep chains increase latency and error accumulation; split into parallel crews instead
- Do NOT rely on implicit context passing between tasks — always make the data dependency explicit in `description` and `expected_output`
- Do NOT use the same LLM model for all agents when roles differ significantly — match model capability to agent complexity (stronger model for complex reasoning, lighter model for formatting tasks)

## Related Skills

| Skill | Purpose |
|---|---|
| `langgraph-implementation` | State graph-based workflows with explicit state machine control and checkpointing |
| `autogen-conversational-patterns` | Conversational multi-agent chat groups for iterative problem solving through dialogue |
| `framework-utilization` | General framework adoption strategy and learning patterns applicable to any framework |
