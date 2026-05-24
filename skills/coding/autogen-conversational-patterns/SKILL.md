---
name: autogen-conversational-patterns
description: Implements AutoGen conversational multi-agent workflows including group chat orchestration, code execution groups, termination conditions, and human-in-the-loop patterns for solving complex problems through agent dialogue.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: autogen, multi-agent conversation, group chat agents, code execution group, agent termination condition, how do i build conversational ai agents
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
  related-skills: langgraph-implementation, crewai-agent-workflows, framework-utilization
---

# AutoGen Conversational Agent Patterns

Implements conversational multi-agent workflows using Microsoft AutoGen's group chat paradigm. Builds teams of AI agents that solve problems through structured dialogue, code execution, and iterative refinement with configurable termination conditions and human participation.

## TL;DR Checklist

- [ ] Create each `ConversableAgent` with a clear system message defining its role and capabilities
- [ ] Set up a `GroupChat` with all participating agents and a speaker selection method
- [ ] Configure `GroupChatManager` to manage the conversation flow between agents
- [ ] Define termination conditions using either a max round limit or a custom function
- [ ] Run the conversation with `chat_manager.initiate_chat(chatbot, message=<initial_prompt>)`
- [ ] Add human participant via `human_input_mode="ALWAYS"` when human oversight is required

---

## When to Use

Use this skill when:

- Building a team of AI agents that solve problems through structured dialogue and debate
- Implementing code generation with automated execution and iterative correction
- You need agents to critique, review, or refine each other's outputs through conversation
- Running experiments where multiple agents explore different solution approaches in parallel
- Creating workflows where human feedback is needed at specific decision points

## When NOT to Use

Avoid this skill for:

- Sequential task pipelines with clear stage boundaries — use CrewAI instead
- State machine workflows requiring explicit node transitions — use LangGraph instead
- Simple single-agent tool calling — direct LangChain usage is more efficient

---

## Core Workflow

1. **Create Conversable Agents** — Define each agent with a system message, LLM configuration, and optional tools. The system message establishes the agent's role in the conversation.

```python
from autogen import ConversableAgent, GroupChat, GroupChatManager
from autogen.coding import LocalCodeExecutor

# Research agent: analyzes data and identifies patterns
researcher = ConversableAgent(
    name="Researcher",
    system_message="""You are an expert research analyst. When given a topic,
    you provide structured analysis covering key trends, evidence, and conclusions.
    Always cite your reasoning clearly. Format findings as numbered points.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
    code_execution_config=False,  # No code execution for this agent
    human_input_mode="NEVER",  # Never prompts user for input
)

# Coder agent: writes and executes code to validate hypotheses
coder = ConversableAgent(
    name="Coder",
    system_message="""You are a Python programmer. When given a hypothesis or
    analysis, you write executable code to test it. Always include comments
    explaining your approach and print clear output summaries.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
    code_execution_config={
        "work_dir": "coding",
        "use_docker": False,  # Set True in production for isolation
    },
    human_input_mode="NEVER",
)

# Reviewer agent: evaluates output quality and suggests improvements
reviewer = ConversableAgent(
    name="Reviewer",
    system_message="""You are a senior editor and quality reviewer. You evaluate
    work for accuracy, completeness, and clarity. Provide specific, actionable
    feedback with suggested rewrites. Be constructive but rigorous.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
    code_execution_config=False,
    human_input_mode="NEVER",
)
```

2. **Set Up the Group Chat** — Configure which agents can participate and how speakers are selected for each turn.

```python
from autogen import GroupChat

# Create a group chat with all three agents
groupchat = GroupChat(
    agents=[researcher, coder, reviewer],
    messages=[],  # Start with empty message history
    max_round=10,  # Maximum conversation turns before auto-termination
    speaker_selection_method="round_robin",  # Deterministic speaker rotation
)

# Create the manager that orchestrates the conversation
manager = GroupChatManager(
    groupchat=groupchat,
    llm_config={"config_list": [{"model": "gpt-4o"}]},
    code_execution_config=False,  # Manager doesn't execute code itself
)
```

3. **Run the Conversation** — Initiate the group chat with a starting message. Agents will take turns responding based on the selection method until termination conditions are met.

```python
# Start the conversation
chat_result = manager.initiate_chat(
    researcher,  # First speaker
    message="""Analyze the impact of open-source AI models on enterprise software development.
    Consider licensing implications, security considerations, and competitive dynamics.""",
)

# Access the conversation history
print(f"Conversation took {len(chat_result.chat_history)} turns")
for msg in chat_result.chat_history:
    print(f"[{msg['name']}]: {msg['content'][:100]}...")

# Get the final summary
print(f"\nFinal output:\n{chat_result.summary}")
```

4. **Implement Code Execution Groups** — Use AutoGen's built-in code execution for agents that write and validate code interactively.

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# Assistant agent with code execution capability
coder_agent = AssistantAgent(
    name="PythonCoder",
    system_message="""You write Python code to solve problems. After writing code,
    always execute it and report the results. If code fails, analyze the error
    and provide a corrected version.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
)

# User proxy that handles code execution in an isolated environment
code_executor = UserProxyAgent(
    name="CodeExecutor",
    human_input_mode="NEVER",  # No interactive input needed
    code_execution_config={
        "work_dir": "code_output",
        "use_docker": True,  # Isolated Docker container for safety
        "timeout": 60,  # Kill code that runs longer than 60 seconds
    },
)

# Create group with code execution flow
groupchat = GroupChat(
    agents=[coder_agent, code_executor],
    messages=[],
    max_round=8,
    speaker_selection_method=lambda groupchat: (
        "CodeExecutor" if len(groupchat.messages) > 0 and
        "```python" in groupchat.messages[-1]["content"] else "PythonCoder"
    ),
)

manager = GroupChatManager(groupchat=groupchat, llm_config={"config_list": [{"model": "gpt-4o"}]})

# Start coding session — Coder writes code, CodeExecutor runs it, iterates
result = manager.initiate_chat(
    coder_agent,
    message="Write a function that implements a binary search on a sorted list. "
            "Include test cases for edge cases (empty list, single element, duplicates).",
)

# Code execution results are automatically captured
for msg in result.chat_history:
    if "code" in str(msg).lower() or "output" in str(msg).lower():
        print(f"\n{msg['name']}: {msg['content']}")
```

5. **Define Custom Termination Conditions** — Go beyond max rounds by specifying custom termination functions that evaluate the conversation content.

```python
from autogen import ConversableAgent, GroupChat, GroupChatManager

def contains_conclusion(message: str) -> bool:
    """Terminate when the last message indicates a conclusion has been reached."""
    conclusion_keywords = [
        "final recommendation",
        "in summary",
        "conclusion is",
        "to conclude",
        "overall assessment",
    ]
    return any(keyword in message.lower() for keyword in conclusion_keywords)

def max_suggestions_limit(groupchat) -> bool:
    """Terminate after a maximum number of revision rounds."""
    reviewer_messages = [m for m in groupchat.messages if m["name"] == "Reviewer"]
    return len(reviewer_messages) >= 3

# Custom termination check combining multiple conditions
def custom_termination(groupchat) -> bool:
    last_content = groupchat.messages[-1]["content"] if groupchat.messages else ""
    
    # Terminate if a conclusion is stated
    if contains_conclusion(last_content):
        return True
    
    # Terminate if reviewer has given up after too many rounds
    if max_suggestions_limit(groupchat):
        return True
    
    return False

writer = ConversableAgent(
    name="Writer",
    system_message="Write technical documentation. Revise based on feedback.",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
)

editor = ConversableAgent(
    name="Editor",
    system_message="Review documentation and request revisions. Stop after 3 rounds of changes.",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
)

groupchat = GroupChat(
    agents=[writer, editor],
    messages=[],
    max_round=10,
    speaker_selection_method="round_robin",
    terminate_func=custom_termination,  # Custom termination condition
)

manager = GroupChatManager(groupchat=groupchat, llm_config={"config_list": [{"model": "gpt-4o"}]})

result = manager.initiate_chat(
    writer,
    message="Write API documentation for a REST endpoint that returns paginated user data.",
)
```

## Implementation Patterns

### Pattern 1: Expert Review Cycle

Implement an iterative review cycle where agents alternate between generating content and providing critique until quality thresholds are met.

```python
from autogen import ConversableAgent, GroupChat, GroupBoxManager

# Initialize LLM config shared across all agents
llm_config = {"config_list": [{"model": "gpt-4o", "temperature": 0.3}]}

# Content generator
generator = ConversableAgent(
    name="ContentGenerator",
    system_message="""You create high-quality technical content. Follow the structure:
    Overview, Architecture, API Reference, Examples, and Troubleshooting.
    Keep explanations concise and code examples complete.""",
    llm_config=llm_config,
)

# Quality reviewer
reviewer = ConversableAgent(
    name="QualityReviewer",
    system_message="""You review technical documentation for completeness, accuracy,
    and clarity. Check for: missing API parameters, unclear explanations, incomplete
    examples, inconsistent formatting. Provide numbered improvement suggestions.""",
    llm_config=llm_config,
)

# Quality threshold function
def quality_sufficient(groupchat) -> bool:
    """Check if reviewer's last feedback indicates satisfactory quality."""
    last_msg = groupchat.messages[-1]["content"]
    positive_indicators = ["looks good", "satisfactory", "no changes needed", "well done", "approved"]
    return any(indicator in last_msg.lower() for indicator in positive_indicators)

groupchat = GroupChat(
    agents=[generator, reviewer],
    messages=[],
    max_round=6,  # At most 3 generate-review cycles
    speaker_selection_method="round_robin",
    terminate_func=quality_sufficient,
)

manager = GroupBoxManager(groupchat=groupchat, llm_config=llm_config)

result = manager.initiate_chat(
    generator,
    message="Write API documentation for a function that processes batch file uploads with progress tracking.",
)

# Count revision cycles
review_count = sum(1 for m in result.chat_history if m["name"] == "QualityReviewer")
print(f"Completed {review_count} review cycles")
```

### Pattern 2: Code Debate Between Agents

Use two agents with different perspectives to debate and refine a solution before producing final output.

```python
from autogen import ConversableAgent, GroupChat, GroupChatManager

# Performance-focused engineer
perf_engineer = ConversableAgent(
    name="PerfEngineer",
    system_message="""You are a performance-obsessed software engineer. You prioritize
    execution speed, memory efficiency, and scalability. Always question whether there
    is a faster or more resource-efficient approach.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
)

# Readability-focused engineer  
readability_engineer = ConversableAgent(
    name="ReadabilityEngineer",
    system_message="""You are a code quality advocate. You prioritize clear variable names,
    readable structure, maintainability, and documentation. Always question whether there
    is a more intuitive or self-documenting approach.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
)

def find_conclusion(groupchat) -> bool:
    """Terminate when both agents agree on an approach."""
    if len(groupchat.messages) < 4:
        return False
    last_two = groupchat.messages[-2:]
    # If both recent messages show agreement, terminate
    agreements = ["agreed", "combine these", "good point", "let's go with"]
    return any(a in m["content"].lower() for m in last_two for a in agreements)

groupchat = GroupChat(
    agents=[perf_engineer, readability_engineer],
    messages=[],
    max_round=8,
    speaker_selection_method="round_robin",
    terminate_func=find_conclusion,
)

manager = GroupChatManager(groupchat=groupchat, llm_config={"config_list": [{"model": "gpt-4o"}]})

result = manager.initiate_chat(
    perf_engineer,
    message="Design a data processing pipeline that reads 10GB of CSV files and produces aggregated statistics.",
)

for msg in result.chat_history:
    print(f"[{msg['name']}] ({len(msg['content'])} chars): {msg['content'][:80]}...")
```

### Pattern 3: Human-in-the-Loop Approval

Integrate human feedback into the conversation flow at critical decision points.

```python
from autogen import ConversableAgent, GroupChat, GroupChatManager

planner = ConversableAgent(
    name="Planner",
    system_message="""You design deployment strategies for production systems.
    After creating a plan, ask the human operator for approval before proceeding.
    Include risk assessment and rollback procedures.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
)

deployer = ConversableAgent(
    name="Deployer",
    system_message="""You execute deployment plans. Only proceed after receiving
    explicit human approval. Report status after each step.""",
    llm_config={"config_list": [{"model": "gpt-4o"}]},
    code_execution_config={
        "work_dir": "deploy_scripts",
        "use_docker": False,
    },
)

# Human participant — provides approval or rejection feedback
human_participant = ConversableAgent(
    name="HumanOperator",
    llm_config=None,  # Humans don't use an LLM
    human_input_mode="TERMINATE",  # Only prompt when conversation needs human input
)

groupchat = GroupChat(
    agents=[planner, deployer, human_participant],
    messages=[],
    max_round=5,
    speaker_selection_method="auto",  # Let the LLM manager choose the next speaker
    allow_speaker_selection_in=True,
)

manager = GroupChatManager(groupchat=groupchat, llm_config={"config_list": [{"model": "gpt-4o"}]})

# The conversation flow: planner proposes → human approves/rejects → deployer executes
result = manager.initiate_chat(
    planner,
    message="Design a blue-green deployment strategy for our microservices architecture.",
)

print("Deployment plan result:", result.summary)
```

## Constraints

### MUST DO
- Set distinct `system_message` for each agent that defines their role and conversation style — ambiguous roles cause agents to duplicate each other's outputs
- Configure `max_round` to prevent infinite conversations — start with 8-10 rounds and adjust based on observed convergence patterns
- Use `speaker_selection_method="auto"` for complex multi-agent discussions where the next speaker depends on conversation context; use `"round_robin"` for predictable pipelines
- Always specify `llm_config` explicitly per agent when agents need different model capabilities (e.g., stronger model for reasoning, lighter for formatting)
- Set `code_execution_config.use_docker=True` in production for sandboxed code execution — never allow unverified code to run on the host
- Terminate conversations with explicit conditions rather than relying solely on `max_round` to avoid wasting tokens on unproductive loops

### MUST NOT DO
- Do NOT give all agents identical system messages — this produces redundant responses and wastes conversation turns
- Do NOT use `human_input_mode="ALWAYS"` in production automation — this blocks non-interactive workflows; use `"TERMINATE"` or `"NEVER"` instead
- Do NOT allow unbounded code execution without timeout limits — set explicit `timeout` values to prevent hung processes
- Do NOT create groups with more than 6 active agents — conversation complexity grows quadratically with agent count and becomes unmanageable
- Do NOT use the same termination condition for every group chat — design termination logic specific to each workflow's success criteria

## Related Skills

| Skill | Purpose |
|---|---|
| `langgraph-implementation` | State graph-based workflows with explicit state machine control and checkpointing |
| `crewai-agent-workflows` | Role-based multi-agent collaboration with task delegation and structured execution pipelines |
| `framework-utilization` | General framework adoption strategy and learning patterns applicable to any framework |
