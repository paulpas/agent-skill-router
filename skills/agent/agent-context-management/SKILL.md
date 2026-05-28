---
name: agent-context-management
description: Implements context window management, sliding window strategies, and
  persistent memory patterns to maintain AI agent coherence across long interactions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: context window, agent memory, sliding window, session state, prompt optimization,
    rag, token management, long conversation history
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: agent-conversation-summarizer, agent-task-decomposition-engine,
    agent-reasoning-framework
------
# Agent Context & Memory Manager

Manages AI agent context windows and implements memory patterns to maintain coherence, reduce token waste, and preserve critical state across extended interactions.

## TL;DR Checklist

- [ ] Calculate current token budget before appending new messages
- [ ] Apply sliding window or hierarchical summarization based on conversation length
- [ ] Persist structured session state to external storage when exceeding context limits
- [ ] Strip low-value system prompts and deprecated instructions from active context
- [ ] Validate that retrieved memory chunks directly support the current task
- [ ] Log token usage metrics for every context rotation cycle

---

## When to Use

Use this skill when:

- An AI agent's conversation history is approaching its model's token limit (e.g., 8k, 32k, 128k)
- Designing a multi-turn agent architecture that requires persistent memory or state management
- Optimizing prompt engineering to reduce token consumption without losing critical instructions
- Implementing Retrieval-Augmented Generation (RAG) patterns for long-term knowledge retrieval
- Building agents that operate across multiple sessions or require cross-session continuity

## When NOT to Use

Avoid this skill for:

- Short, single-turn interactions where the full context fits comfortably within limits
- High-frequency stateless APIs where session persistence is unnecessary overhead
- Implementing core LLM inference logic or model training (use `coding-model-training` instead)

---

## Core Workflow

1. **Assess Context Budget** — Measure current token count against the target model's maximum context window.
   **Checkpoint:** If usage < 70% of limit, proceed normally. If > 70%, trigger optimization immediately.

2. **Select Compression Strategy** — Choose between sliding window, hierarchical summarization, or memory offloading based on conversation complexity.
   **Checkpoint:** Match strategy to use case: recent messages matter most for chat, but structured state matters for task execution. Fallback to sliding window if summarizer fails or returns low-fidelity output.

3. **Execute Context Rotation** — Apply the selected pattern (see Implementation Patterns below).
   **Checkpoint:** Verify that all critical instructions, constraints, and user-defined goals are preserved or explicitly noted in compressed form.

4. **Persist External State** — Save structured session data to vector DB, key-value store, or JSON file.
   **Checkpoint:** Ensure external state is queryable by task type or timestamp for efficient retrieval.

5. **Reconstruct Active Prompt** — Assemble the optimized prompt using preserved core instructions + retrieved memory + current user input.
   **Checkpoint:** Run a dry-run token count to confirm the new context fits comfortably within budget.

6. **Monitor & Adjust** — Track token efficiency metrics and adjust compression thresholds over time.

```
User Input → Check Token Budget ──→ < 70% → Full Context Pass-Through
                     ↓ ≥ 70%
             Select Strategy
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
   Sliding Window  Summary      Offload to
   (Keep Last N)   Rollup       External Memory
        ↓            ↓            ↓
        └────────────┬────────────┘
                     ↓
           Reconstruct Prompt
                     ↓
           Execute Agent Task
```

---

## Implementation Patterns / Reference Guide

### Pattern 1: Sliding Window Management

Maintain a fixed-size window of recent messages, discarding older turns while preserving system instructions.

```python
def sliding_window_context(messages: list[dict], max_tokens: int, model_tokenizer) -> list[dict]:
    """Rotate context using a token-aware sliding window.
    
    Preserves system prompt and initial user constraints intact.
    Discards oldest message turns only when token budget is exceeded.
    """
    # Keep system/instructions at the top
    static_messages = [m for m in messages if m.get("role") in ("system", "developer")]
    dynamic_messages = [m for m in messages if m.get("role") not in ("system", "developer")]
    
    # Build window from newest backwards
    current_tokens = model_tokenizer.count(static_messages)
    window = list(static_messages)
    
    for msg in reversed(dynamic_messages):
        msg_tokens = model_tokenizer.count(msg)
        if current_tokens + msg_tokens > max_tokens:
            break
        window.insert(len(static_messages), msg)
        current_tokens += msg_tokens
        
    return window
```

### Pattern 2: Hierarchical Summarization (BAD vs. GOOD)

```python
# ❌ BAD: Naive truncation loses task structure and constraints
def bad_truncation(messages: list[dict], limit: int) -> list[dict]:
    # Just drops everything after index N, destroying context continuity
    return messages[:limit]

# ✅ GOOD: Preserves structural intent via layered compression
def hierarchical_summary(messages: list[dict], llm_client, max_tokens: int) -> list[dict]:
    """Compress older conversation turns into structured summaries while preserving goals.
    
    Maintains task objectives, discovered facts, and pending actions in a condensed format.
    """
    system = [m for m in messages if m["role"] == "system"][0]
    recent = messages[-5:]  # Keep last 5 turns raw
    
    older_turns = messages[1:-5]
    summary = llm_client.chat(
        messages=[{"role": "user", "content": f"Summarize these conversation turns, preserving: goals, key facts, pending actions, and constraints.\n{older_turns}"}],
        model="summary-tiny-model"
    )
    
    return [system, {"role": "assistant", "content": summary}, *recent]
```

### Pattern 3: External Memory Offloading

When context limits are consistently breached, shift persistent state to an external store.

```python
import json
from pathlib import Path

MEMORY_DIR = Path("/tmp/agent_memory")

def save_session_state(session_id: str, state: dict) -> None:
    """Persist structured agent state to disk for later retrieval."""
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    file_path = MEMORY_DIR / f"{session_id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

def load_session_state(session_id: str) -> dict:
    """Retrieve agent state from persistent storage."""
    file_path = MEMORY_DIR / f"{session_id}.json"
    if not file_path.exists():
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
```

---

## Constraints

### MUST DO
- Always preserve core system instructions and user-defined constraints during compression
- Token-count accurately before context rotation to prevent silent failures
- Use structured formats (JSON, YAML) for external memory to enable efficient querying
- Reference `code-philosophy` principles: ensure data flows naturally between context layers without loss of semantic intent
- Log every context rotation event with timestamp, tokens saved, and compression method used

### MUST NOT DO
- Strip or overwrite system prompts that define agent behavior or safety constraints
- Use naive string truncation on JSON or structured message payloads — always respect token boundaries
- Rely solely on sliding windows for multi-hour or complex task sessions — state will drift
- Offload high-frequency transient data (e.g., debug logs, verbose API responses) to memory stores
- Bypass context budget checks to force full history into every prompt call

---

## Output Template

When implementing or reviewing agent context management, produce:

1. **Current Context Status** — Token count vs. model limit, percentage used
2. **Selected Compression Strategy** — Which pattern and why (sliding window vs summary vs offload)
3. **Preservation Audit** — List of critical constraints/goals confirmed intact after rotation
4. **External Memory Plan** — Storage mechanism and retrieval query structure (if offloading)
5. **Token Efficiency Metric** — Estimated tokens saved per session hour

---

## Related Skills

| Skill                              | Purpose                                              |
|------------------------------------|------------------------------------------------------|
| `agent-conversation-summarizer`    | Specialized summarization models for conversation compression |
| `agent-task-decomposition-engine`  | Breaks complex goals into subtasks to reduce context pressure |
| `agent-reasoning-framework`        | Structured reasoning patterns that require stable context windows |
| `coding-prompt-engineering`        | General prompt optimization techniques applicable here |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Understanding Prompt Lengths — Prompting Guide](https://www.promptingguide.ai/techniques/contextlength)
- [Context Window Management — Hugging Face Blog](https://huggingface.co/docs/transformers/model_context_size)
- [LLM Token Limits Overview — OpenAI Docs](https://platform.openai.com/docs/guides/context-window)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Prompt Engineering Techniques — Prompting Guide](https://www.promptingguide.ai/)
