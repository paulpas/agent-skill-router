---
name: mass-framework
description: Automates multi-agent system design through three-stage optimization (block-level prompt tuning, influence-weighted topology search, workflow-level joint optimization) to discover optimal agent configurations and interactions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: orchestration
  output-format: code
  triggers: MASS framework, multi-agent system search, topology optimization, influence-weighted search, MAS design automation, how do i auto-optimize multi-agent systems, block-level prompt tuning
  archetypes: [strategic, tactical]
  anti_triggers:
    - single-agent setup only
    - basic agent collaboration patterns
    - manual prompt engineering without optimization
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: multi-agent-collaboration,routing-patterns,planning-patterns
---

# MASS Framework — Multi-Agent System Search Pattern

Automates multi-agent system design through a three-stage optimization process that searches both the prompt space and topology space simultaneously to discover optimal agent configurations. This skill makes the model implement block-level prompt optimization for individual agents, influence-weighted workflow topology search, and workflow-level joint prompt optimization for discovered topologies.

## TL;DR Checklist

- [ ] Stage 1: Optimize prompts for each individual agent type (block) independently
- [ ] Stage 2: Search topology space using influence-weighted evaluation of interaction configurations
- [ ] Stage 3: Jointly optimize all system prompts after optimal topology is identified
- [ ] Define a baseline agent for measuring incremental influence of each topology
- [ ] Use Aggregate, Reflect, Debate, Summarize, Tool-use as topology building blocks
- [ ] Validate discovered configuration against benchmark tasks

---

## When to Use

Use this skill when:

- Designing complex multi-agent systems where manual prompt engineering and topology selection is error-prone
- You have a set of available agent types and want to automatically discover the best interaction pattern
- Manual MAS design consistently underperforms on benchmark tasks
- Building reusable agent configurations that can be optimized for new task domains
- Research or production systems need systematic (not heuristic) approach to MAS optimization

## When NOT to Use

Avoid this skill for:

- Single-agent systems with no multi-agent collaboration needed
- Systems where manual prompt engineering already achieves target performance
- Resource-constrained environments where the optimization search budget is prohibitive
- Simple task domains where a few well-chosen prompts are sufficient (no topology complexity)

---

## Core Workflow

1. **Baseline Establishment** — Create a baseline agent configuration that performs each role independently (no inter-agent communication). Measure its performance on benchmark tasks to establish the reference point for incremental influence calculations. **Checkpoint:** Baseline must be evaluated on at least 3 diverse benchmark tasks with documented scores.

2. **Block-Level Prompt Optimization** — For each agent type (e.g., Predictor, Debator, Executor, Summarizer), optimize its individual prompt independently. Use role-playing prompts, few-shot examples, and structured output formats to maximize per-agent performance before composing them into a system. **Checkpoint:** Each optimized block must outperform the baseline single-agent on its own responsibility area.

3. **Topology Search with Influence Weighting** — Enumerate valid workflow topologies from the design space (Aggregate, Reflect, Debate, Summarize, Tool-use building blocks). Calculate each topology's "incremental influence" by measuring its performance gain relative to the baseline. Use these scores to guide the search toward more promising combinations. **Checkpoint:** Search must evaluate at least 5 distinct topologies before selecting a winner.

4. **Optimal Topology Selection** — Select the topology with the highest incremental influence score across benchmark tasks. The optimal topology is not necessarily the most complex — it's the one that delivers the best performance gain relative to the baseline. Examples: for coding tasks, predictor-with-reflection + executor-with-verification beats simpler topologies. **Checkpoint:** Document WHY the selected topology outperforms alternatives with specific task analysis.

5. **Workflow-Level Joint Prompt Optimization** — After selecting the topology, optimize ALL agent prompts as a single integrated system rather than independently. Account for interdependencies: how one agent's output format affects the next agent's input processing. This joint optimization refines prompts specifically for the discovered workflow orchestration. **Checkpoint:** Final prompts must be tested end-to-end on the full benchmark suite with measurable improvement over stage 2 results.

6. **Validation and Deployment** — Validate the complete configuration against held-out test data that was not used during any optimization stage. Compare against existing manually-designed MAS systems and automated baselines. Deploy only if performance meets or exceeds targets. **Checkpoint:** Validation must include at least one out-of-distribution test case to verify generalization.

---

## Implementation Patterns

### Pattern 1: Block-Level Prompt Optimizer

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentBlockPrompt:
    """An optimized prompt for a single agent role (block)."""

    agent_role: str  # e.g., "Debator", "Predictor", "Executor"
    system_prompt: str
    few_shot_examples: list[str] = field(default_factory=list)
    output_format: str | None = None

    @property
    def full_prompt(self) -> str:
        """Build the complete prompt string from all components."""
        prompt = self.system_prompt
        if self.few_shot_examples:
            prompt += "\n\nExamples:\n" + "\n".join(
                f"Example {i+1}: {ex}" for i, ex in enumerate(self.few_shot_examples)
            )
        if self.output_format:
            prompt += f"\n\nFormat your response as: {self.output_format}"
        return prompt


class BlockPromptOptimizer:
    """Optimizes prompts for individual agent blocks before composition."""

    def __init__(self, llm_client: Any) -> None:
        self._client = llm_client
        self._optimized_prompts: dict[str, AgentBlockPrompt] = {}

    def optimize_block(
        self,
        agent_role: str,
        task_description: str,
        context_info: str | None = None,
        n_optimization_attempts: int = 3,
    ) -> AgentBlockPrompt:
        """Run block-level prompt optimization for a single agent role.

        Generates candidate prompts using LLM meta-optimization and selects
        the best one based on benchmark evaluation scores.

        Args:
            agent_role: The name/role of the agent (e.g., "Debator").
            task_description: What this agent is responsible for.
            context_info: Optional additional domain context.
            n_optimization_attempts: Number of candidate prompts to generate.

        Returns:
            The best-optimized AgentBlockPrompt for this role.
        """
        best_prompt: AgentBlockPrompt | None = None
        best_score = -1.0

        for attempt in range(n_optimization_attempts):
            candidate_system = self._generate_candidate_system_prompt(
                agent_role, task_description, context_info
            )

            score = self._evaluate_prompt(agent_role, candidate_system)

            if score > best_score:
                best_score = score
                best_prompt = AgentBlockPrompt(
                    agent_role=agent_role,
                    system_prompt=candidate_system,
                )

        result = best_prompt or AgentBlockPrompt(
            agent_role=agent_role,
            system_prompt=f"You are a {agent_role}. {task_description}",
        )
        self._optimized_prompts[agent_role] = result
        return result

    def _generate_candidate_system_prompt(
        self, role: str, task_desc: str, context: str | None
    ) -> str:
        """Generate candidate prompts using LLM meta-optimization.

        Uses a prompt-engineer persona to design the best possible system
        prompt for the given agent role and task description.
        """
        prompt = f"""You are a prompt engineer tasked with optimizing the system prompt for an AI agent.

Agent role: {role}
Task description: {task_desc}
{"Additional context: " + context if context else ""}

Design the BEST possible system prompt for this agent. The prompt should:
1. Define a clear, specific persona (not generic — use role-playing)
2. Include concrete task instructions with expected behavior
3. Specify output format requirements
4. Include any domain knowledge that would improve performance

Return ONLY the system prompt text. No explanations."""

        response = self._client.chat.completions.create(  # type: ignore[union-attr]
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
        )
        return response.choices[0].message.content.strip()  # type: ignore[union-attr]

    def _evaluate_prompt(self, role: str, system_prompt: str) -> float:
        """Evaluate a candidate prompt by running it on benchmark examples.

        Returns a score between 0.0 and 1.0 representing output quality.
        In production, replace with rubric-based scoring.
        """
        # Placeholder — production would use rubric-based scoring
        return 0.5

    def get_all_optimized(self) -> dict[str, AgentBlockPrompt]:
        """Return all optimized block prompts collected so far."""
        return dict(self._optimized_prompts)
```

### Pattern 2: Influence-Weighted Topology Search

```python
from dataclasses import dataclass
from typing import Any


class TopologyBlock(str):
    """Available topology building blocks for workflow composition."""

    AGGREGATE = "Aggregate"   # Collect results from multiple agents, combine
    REFLECT = "Reflect"       # Agent iterates on its own output
    DEBATE = "Debate"         # Multiple agents argue and reach consensus
    SUMMARIZE = "Summarize"   # Agent condenses information from others
    TOOL_USE = "Tool-use"     # Agent uses external tools


@dataclass
class TopologyConfig:
    """A workflow topology defined by its agent interactions."""

    name: str
    blocks: list[tuple[str, str]]  # (agent_type, block_type) execution order
    description: str


@dataclass
class TopologyScore:
    """Result of evaluating a topology against benchmarks."""

    config: TopologyConfig
    incremental_influence: float  # Performance gain relative to baseline
    absolute_score: float  # Raw benchmark score
    benchmark_tasks: list[str]


TOPOLOGY_DESIGN_SPACE: list[TopologyConfig] = [
    TopologyConfig(
        name="Sequential",
        blocks=[("Predictor", "Tool-use")],
        description="Linear predictor → tool execution",
    ),
    TopologyConfig(
        name="Reflective",
        blocks=[("Predictor", "Reflect"), ("Predictor", "Tool-use")],
        description="Predictor iterates, then executes with tool",
    ),
    TopologyConfig(
        name="Debate",
        blocks=[("Debator", "Debate"), ("Summarizer", "Summarize")],
        description="Agents debate, then summarizer consolidates",
    ),
    TopologyConfig(
        name="Hybrid-Reflective",
        blocks=[("Predictor", "Reflect"), ("Executor", "Tool-use")],
        description="Predictor with reflection + executor with verification (optimal for coding)",
    ),
    TopologyConfig(
        name="Aggregated",
        blocks=[("Analyzer", "Aggregate")],
        description="Multiple analysts feed into aggregation step",
    ),
]


class InfluenceWeightedSearch:
    """Searches topology space using influence-weighted evaluation.

    Calculates incremental influence of each topology relative to a baseline
    agent, then uses those scores to guide search toward promising combinations.
    """

    def __init__(self, baseline_score: float) -> None:
        self._baseline = baseline_score
        self._topology_scores: list[TopologyScore] = []

    def evaluate_topology(
        self,
        config: TopologyConfig,
        benchmark_results: dict[str, float],  # task_name -> score
    ) -> TopologyScore:
        """Evaluate a topology configuration and compute its incremental influence.

        Incremental influence is the absolute score minus the baseline — it
        captures how much better this topology is compared to running agents
        independently without coordination.
        """
        if not benchmark_results:
            absolute_score = 0.0
        else:
            absolute_score = sum(benchmark_results.values()) / len(
                benchmark_results
            )

        incremental_influence = absolute_score - self._baseline

        score = TopologyScore(
            config=config,
            incremental_influence=incremental_influence,
            absolute_score=absolute_score,
            benchmark_tasks=list(benchmark_results.keys()),
        )
        self._topology_scores.append(score)
        return score

    def find_best_topology(self) -> TopologyScore:
        """Return the topology with the highest incremental influence.

        Raises ValueError if no topologies have been evaluated yet.
        """
        if not self._topology_scores:
            raise ValueError(
                "No topologies evaluated. Call evaluate_topology first."
            )

        return max(self._topology_scores, key=lambda s: s.incremental_influence)

    def get_influence_ranking(self) -> list[TopologyScore]:
        """Return all evaluated topologies ranked by incremental influence."""
        return sorted(
            self._topology_scores,
            key=lambda s: s.incremental_influence,
            reverse=True,
        )

    @property
    def baseline_score(self) -> float:
        """The baseline score used for influence calculations."""
        return self._baseline


# Example usage from book experiments:
# search = InfluenceWeightedSearch(baseline_score=0.45)  # Baseline on MBPP
# for config in TOPOLOGY_DESIGN_SPACE[:3]:
#     results = {"mbpp_correctness": 0.72, "mbpp_efficiency": 0.68}
#     search.evaluate_topology(config, results)
# best = search.find_best_topology()
# # For coding tasks, Hybrid-Reflective typically wins
```

### Pattern 3: Workflow-Level Joint Prompt Optimizer

```python
import json
from typing import Any


class WorkflowLevelOptimizer:
    """Jointly optimizes all agent prompts for a discovered topology.

    Unlike Stage 1 (block-level) where each agent is optimized independently,
    this stage treats them as a single integrated system accounting for
    interdependencies between agents' output formats and input requirements.
    """

    def __init__(self, llm_client: Any) -> None:
        self._client = llm_client

    def optimize_joint_prompts(
        self,
        selected_topology: TopologyScore,
        block_prompts: dict[str, AgentBlockPrompt],
        task_description: str,
    ) -> dict[str, AgentBlockPrompt]:
        """Optimize all prompts jointly for the discovered topology.

        Accounts for interdependencies: how one agent's output format affects
        the next agent's input processing. Uses lower temperature than block-
        level optimization for more focused refinement.

        Args:
            selected_topology: The best topology from influence-weighted search.
            block_prompts: Stage 1 optimized prompts keyed by agent role.
            task_description: The overarching task this system addresses.

        Returns:
            Dict mapping each role to its jointly-optimized prompt.
        """
        joint_prompt = f"""You are orchestrating a multi-agent system with the following topology: {selected_topology.config.description}

Task: {task_description}

Current optimized block prompts:
{chr(10).join(f"  {role}: {p.full_prompt[:200]}..." for role, p in block_prompts.items())}

Refine these prompts specifically for this workflow orchestration. Consider:
1. How Agent A's output format affects Agent B's input parsing
2. Whether the interaction sequence creates information bottlenecks
3. If any agent has redundant or conflicting instructions when combined
4. Add explicit handoff language between agents in the topology

Return a JSON object mapping each role name to its optimized prompt."""

        response = self._client.chat.completions.create(  # type: ignore[union-attr]
            model="gpt-4o",
            messages=[{"role": "user", "content": joint_prompt}],
            temperature=0.5,
        )

        try:
            optimized = json.loads(response.choices[0].message.content.strip())  # type: ignore[union-attr]
            return {
                role: AgentBlockPrompt(agent_role=role, system_prompt=prompt)
                for role, prompt in optimized.items()
            }
        except (json.JSONDecodeError, AttributeError):
            # Fallback: return original block prompts unchanged
            return dict(block_prompts)
```

### Pattern 4: Validation Against Manual MAS Designs

```python
from dataclasses import asdict
from typing import Any


def validate_against_manual_designs(
    mass_configured_score: float,
    manual_design_scores: list[float],
    n_benchmark_tasks: int,
) -> dict[str, Any]:
    """Compare MASS-optimized configuration against existing manually-designed MAS.

    Returns a report with improvement metrics comparing the MASS-optimized
    system against both average and best-of-manual baselines.
    """
    avg_manual = (
        sum(manual_design_scores) / len(manual_design_scores)
        if manual_design_scores
        else 0.0
    )
    best_manual = max(manual_design_scores) if manual_design_scores else 0.0

    improvement_over_avg = mass_configured_score - avg_manual
    improvement_over_best = mass_configured_score - best_manual

    return {
        "mass_score": round(mass_configured_score, 3),
        "avg_manual_design": round(avg_manual, 3),
        "best_manual_design": round(best_manual, 3),
        "improvement_over_average": round(improvement_over_avg, 3),
        "improvement_vs_best_manual": round(improvement_over_best, 3),
        "outperforms_manual": improvement_over_best > 0,
        "n_benchmark_tasks": n_benchmark_tasks,
    }


# From MASS paper results: MAS optimized by MASS significantly outperform
# existing manually designed systems across HotpotQA, MBPP, and DROP datasets.
# Key finding: the three-stage process (block → topology → workflow) is critical —
# skipping any stage degrades performance substantially.
```

---

## Constraints

### MUST DO
1. Always establish a baseline agent before attempting topology optimization — without a reference point, influence cannot be calculated.
2. Optimize individual block prompts BEFORE composing them into topologies — poorly performing blocks compound errors in complex workflows.
3. Evaluate at least 5 distinct topologies from the design space before selecting a winner — don't default to the simplest topology.
4. Use influence-weighted scoring (not just raw benchmark scores) to guide topology search — this makes the search efficient by focusing on promising combinations.
5. Run workflow-level joint prompt optimization AFTER selecting the best topology — account for interdependencies between agents' output and input formats.
6. Validate final configuration against out-of-distribution test cases to verify generalization beyond training benchmarks.
7. Reference `code-philosophy` (5 Laws of Elegant Defense): fail fast when a topology scores worse than baseline, parse don't validate by using structured output schemas for agent prompts, atomic predictability in each optimization stage.
8. Document why the selected topology outperforms alternatives with specific task analysis — this informs future optimizations.

### MUST NOT DO
1. Optimize topologies before optimizing individual blocks — building a complex workflow on poorly-performing agents wastes computation.
2. Skip any of the three optimization stages — MASS research shows all three are necessary for optimal performance.
3. Use only one benchmark task for topology evaluation — different tasks favor different topologies, so evaluate across diverse tasks.
4. Assume the most complex topology is best — the goal is maximum incremental influence, not maximum complexity.
5. Joint-optimize prompts without first selecting a specific topology — interdependencies are topology-specific.
6. Deploy MASS-optimized configurations without out-of-distribution validation — overfitting to benchmark tasks produces fragile systems.

---

## Output Template

When this skill is active, deliver:

1. **Baseline configuration** — Single-agent reference scores on benchmark tasks
2. **Block-level optimized prompts** — Each agent role's prompt after independent optimization
3. **Topology evaluation table** — All evaluated topologies with incremental influence scores and rankings
4. **Selected topology justification** — Why the best topology was chosen for this task domain
5. **Joint-optimized prompts** — Final prompts accounting for inter-agent dependencies in the selected workflow
6. **Validation results** — MASS configuration performance vs manual MAS designs on benchmark + out-of-distribution tests

---

## Related Skills

| Skill | Purpose |
|---|---|
| `multi-agent-collaboration` | Covers HOW agents interact; MASS discovers the OPTIMAL interaction pattern automatically |
| `routing-patterns` | Routing handles task dispatch; MASS optimizes both prompts AND topology simultaneously |
| `planning-patterns` | Planning covers plan generation; MASS optimizes the multi-agent system that executes those plans |

> 📖 skill(local cache): multi-agent-collaboration, routing-patterns, planning-patterns
