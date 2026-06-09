---
name: learning-adaptation
description: Enables agents to improve through experience using reinforcement learning patterns (PPO, DPO, RLHF) and knowledge base RAG for continuous self-improvement and adaptive behavior across sessions.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
  - educational
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: reinforcement learning, PPO, DPO, RLHF, self-improvement, how do i make agents learn, SICA, AlphaEvolve
  related-skills: memory-management, rag-patterns, evaluation-monitoring
---

# Learning and Adaptation Pattern

Enables AI agents to evolve beyond predefined parameters by implementing reinforcement learning, direct preference optimization, and self-modification cycles. This skill makes the model design agents that improve through experience — collecting execution feedback, applying PPO/DPO alignment methods, building RAG-powered knowledge bases of proven solutions, and iterating on their own code using evolutionary patterns inspired by SICA (Self-Improving Coding Agent) and AlphaEvolve. Agents loaded with this skill produce adaptive systems that get measurably better over time without constant manual intervention.

## TL;DR Checklist

- [ ] Select the learning method: PPO for continuous-action environments, DPO for LLM preference alignment, or iterative self-modification (SICA-style)
- [ ] Design a feedback loop that captures execution outcomes as structured reward signals
- [ ] Build a RAG knowledge base of past solutions using vector embedding + similarity retrieval
- [ ] Implement an overseer pattern (asynchronous monitoring agent) to detect loops and stagnation
- [ ] Define performance metrics with weighted scoring (success rate, time, computational cost)
- [ ] Configure context window structure: system prompt → core prompt → assistant messages → archived diffs
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) — guard against catastrophic policy drift via clipped objectives and trust regions

---

## When to Use

Use this skill when:

- Building agents that must operate in dynamic, uncertain, or evolving environments where pre-programmed logic is insufficient
- Designing a trading bot that dynamically adjusts model parameters based on real-time market data
- Creating personalized assistant agents that refine interaction protocols through longitudinal user behavior analysis
- Implementing self-improving coding agents that modify their own codebase across iterations (SICA-style)
- Automating algorithm discovery and optimization using evolutionary frameworks (AlphaEvolve-style)
- Adding RAG-powered knowledge bases so agents store and retrieve proven solutions from past experiences
- Deploying fraud detection or recommendation agents that continuously refine predictive models with new patterns

---

## When NOT to Use

Avoid this skill for:

- Static tasks with fixed inputs/outputs where the solution is known upfront (use `task-decomposition-engine` instead)
- One-off operations where no feedback loop exists or will exist (overhead outweighs benefit)
- Agents that receive no execution data or outcome labels — learning requires signal, not silence
- Safety-critical systems without rigorous oversight (unconstrained self-modification can cause catastrophic failures; use overseer patterns before enabling autonomous modification)
- Environments where the action space is discrete and well-defined with a small number of options (use supervised fine-tuning or rule-based approaches instead of PPO)

---

## Core Workflow

1. **Select Learning Modality** — Choose the appropriate learning method based on the agent's environment: PPO for continuous-action spaces (robotics, game AI), DPO for LLM alignment with human preferences, or iterative self-modification for coding agents that can edit their own source code. If the task involves aligning an LLM to human preferences, prefer DPO over PPO since it skips the separate reward model entirely and directly optimizes on preference data. **Checkpoint:** Verify the chosen method's output format matches your reward/feedback pipeline — PPO produces policy gradients, DPO produces probability-shifted outputs, self-modification produces code diffs.

2. **Design Feedback Loop Architecture** — Define how execution outcomes become learning signals. Collect experience tuples as `(state, action, reward)` for PPO, preference pairs `(preferred_response, disfavored_response)` for DPO, or benchmark scores with performance metadata (success rate, time to complete, computational cost) for SICA-style self-improvement. Store all feedback in a structured archive that the agent can query during its improvement cycle. **Checkpoint:** Every action must map to an evaluable outcome — if you cannot score it, it is not a learning signal.

3. **Build Knowledge Base with RAG** — Create a retrieval-augmented knowledge store of problem descriptions and proven solutions. Use vector embeddings to index successful strategies encountered by the agent. During decision-making, query this knowledge base via similarity search to apply previously successful patterns or avoid known pitfalls. This enables the agent to adapt to new situations by referencing its own history rather than starting from scratch. **Checkpoint:** Ensure the retrieval layer uses a minimum cosine similarity threshold (e.g., ≥ 0.75) before injecting past solutions into context — low-quality recall corrupts decision-making.

4. **Implement Overseer Pattern** — Deploy an asynchronous monitoring agent (another LLM instance) that runs concurrently with the main learning agent. The overseer receives a detailed state report including execution callgraph, event stream of tool calls and responses, and performance metrics. It periodically assesses behavior for pathological deviations: infinite loops, repeated failures on identical inputs, or stagnation where performance plateaus across consecutive iterations. The overseer can intervene by sending corrective notifications or halting execution entirely. **Checkpoint:** The overseer must have authority to terminate the agent — without an off-switch, self-modification becomes a safety hazard.

5. **Structure Context Window for Efficiency** — Organize the LLM's working context in layers mirroring SICA's architecture: (a) System Prompt defining agent goals and tool documentation, (b) Core Prompt containing the current objective with relevant knowledge-base retrievals injected, (c) Assistant Messages recording step-by-step reasoning and tool call records, (d) Archived Diffs storing historical code modifications compactly. This layered structure reduces processing time and costs while maximizing available context for reasoning. **Checkpoint:** Measure token utilization across layers — system prompt should consume < 15%, core prompt < 30%, assistant messages < 45%, leaving > 10% headroom for response generation.

6. **Evaluate with Weighted Performance Score** — Define a composite metric that captures success, efficiency, and resource usage. For coding agents, use: `score = (success_rate × 0.5) + ((1 / time_seconds) × 0.25) + ((1 / tokens_used) × 0.25)`. Select the highest-scoring version as the baseline for the next improvement iteration. Track performance trends across iterations to detect whether learning is progressing, plateauing, or degrading (catastrophic forgetting). **Checkpoint:** If performance does not improve over 3+ consecutive iterations, trigger overseer review — the agent may be stuck in a local optimum and needs a different modification strategy.

---

## Implementation Patterns / Reference Guide

### Pattern 1: PPO Clipping for Stable Policy Updates

PPO (Proximal Policy Optimization) trains agents with continuous action spaces by clipping the policy update ratio to a trust region, preventing catastrophic policy drift. This is critical when fine-tuning agent behavior — a single overly-aggressive update can erase weeks of accumulated knowledge.

```python
import torch
import torch.nn as nn
import numpy as np


def ppo_clip_objective(
    old_action_probs: torch.Tensor,
    new_action_probs: torch.Tensor,
    advantages: torch.Tensor,
    clip_epsilon: float = 0.2,
) -> torch.Tensor:
    """Calculate the clipped PPO objective for stable policy updates.

    The clipping mechanism creates a 'safety zone' around the current policy.
    Updates that would push the new policy more than `clip_epsilon` away
    from the old policy are truncated, acting as a safety brake against
    catastrophic learning steps.

    Args:
        old_action_probs: Probability distribution from the previous policy.
        new_action_probs: Probability distribution from the candidate update.
        advantages: Estimated advantage values (positive = better than average).
        clip_epsilon: Clipping threshold (default 0.2 = 20% max ratio change).

    Returns:
        Clipped surrogate objective value to maximize.
    """
    # Ratio of new policy probability to old policy probability
    ratio = new_action_probs / (old_action_probs + 1e-8)

    # Standard objective without clipping
    unclipped_objective = ratio * advantages

    # Clipped objective — prevents updates outside the trust region
    clipped_ratio = torch.clamp(ratio, 1.0 - clip_epsilon, 1.0 + clip_epsilon)
    clipped_objective = clipped_ratio * advantages

    # Take the minimum to create the conservative (clipped) upper bound
    surrogate_objective = torch.min(unclipped_objective, clipped_objective)

    return surrogate_objective.mean()


def calculate_trust_region_radius(
    old_policy: np.ndarray,
    new_policy: np.ndarray,
) -> float:
    """Calculate KL-divergence-based trust region radius between two policies.

    Returns the KL divergence as a measure of how far the new policy
    has drifted from the old one. If this exceeds a threshold (typically
    0.01-0.03), the update should be rejected or re-scaled.

    Args:
        old_policy: Prior policy probability distribution (numpy array).
        new_policy: Candidate policy probability distribution.

    Returns:
        KL divergence value D_KL(old || new).
    """
    old_policy = np.clip(old_policy, 1e-8, 1.0)
    new_policy = np.clip(new_policy, 1e-8, 1.0)

    kl_divergence = np.sum(
        old_policy * np.log(old_policy / new_policy)
    )

    return float(kl_divergence)
```

**BAD vs GOOD — PPO Clipping:**

```python
# ❌ BAD — No clipping mechanism, policy can collapse in a single update
def naive_policy_update(old_policy, new_policy, advantages):
    ratio = new_policy / old_policy
    return (ratio * advantages).mean()  # Can produce ratios of 10x+


# ✅ GOOD — Clipped objective with trust region enforcement
def robust_policy_update(old_policy, new_policy, advantages):
    ratio = torch.tensor(new_policy) / (torch.tensor(old_policy) + 1e-8)
    clipped_ratio = torch.clamp(ratio, 0.8, 1.2)  # 20% max drift
    unclipped_obj = ratio * advantages
    clipped_obj = clipped_ratio * advantages
    return torch.min(unclipped_obj, clipped_obj).mean()  # Conservative upper bound
```

### Pattern 2: DPO Direct Preference Optimization

DPO (Direct Preference Optimization) aligns LLM agents with human preferences by directly optimizing the policy on preference pairs, eliminating the need for a separate reward model. This is simpler, more stable, and avoids reward hacking where agents game an intermediate reward signal.

```python
import torch
import torch.nn.functional as F


def dpo_loss(
    preferred_logprobs: torch.Tensor,
    disfavored_logprobs: torch.Tensor,
    reference_logprobs: torch.Tensor,
    beta: float = 0.1,
) -> torch.Tensor:
    """Calculate the DPO loss for direct preference optimization.

    Unlike PPO alignment which requires a two-step process (train reward model
    then optimize with PPO), DPO skips the reward model entirely. It directly
    maps preference data to policy updates using a closed-form objective.

    The mathematical insight: the optimal policy for any reward function can be
    expressed as a softmax over the log-ratio of that policy to a reference
    (baseline) policy. DPO leverages this relationship to optimize directly
    from preference pairs without ever training an explicit reward model.

    Args:
        preferred_logprobs: Log-probabilities of generating the preferred response.
        disfavored_logprobs: Log-probabilities of generating the disfavored response.
        reference_logprobs: Log-probabilities under the reference (baseline) policy.
        beta: Temperature controlling deviation from reference policy (lower = tighter).

    Returns:
        Scalar DPO loss to minimize.
    """
    # Compute log-odds ratios relative to the reference policy
    preferred_diff = (preferred_logprobs - reference_logprobs) * beta
    disfavored_diff = (disfavored_logprobs - reference_logprobs) * beta

    # DPO objective: maximize the margin between preferred and disfavored
    # using a negative log-sigmoid formulation
    dpo_margin = preferred_diff - disfavored_diff

    # Negative log-sigmoid gives the loss
    loss = -F.logsigmoid(dpo_margin).mean()

    return loss


def generate_preferred_policy(
    current_logprobs: torch.Tensor,
    reference_logprobs: torch.Tensor,
    preference_signal: float,
    beta: float = 0.1,
) -> torch.Tensor:
    """Generate an updated policy that increases probability of preferred outputs.

    Implements the core DPO principle: 'Increase the probability of generating
    responses like the preferred one and decrease the probability of generating
    ones like the disfavored one.' This is done by shifting log-probabilities
    in the direction indicated by the preference signal.

    Args:
        current_logprobs: Current model log-probability distribution.
        reference_logprobs: Reference (pre-fine-tuned) policy for regularization.
        preference_signal: Positive scalar indicating how strongly to prefer
            this action over alternatives (from human feedback or automated scoring).
        beta: Regularization strength — higher values keep the policy closer
            to the reference, preventing overfitting to limited preferences.

    Returns:
        Updated log-probability distribution shifted toward preferred behavior.
    """
    # Shift log-probs in direction of preference, regularized by reference
    updated_logprobs = (
        current_logprobs
        + beta * preference_signal
        - reference_logprobs  # Reference acts as pull-back anchor
    )

    # Re-normalize via log-sum-exp trick for numerical stability
    max_logprob = updated_logprobs.max()
    normalized = updated_logprobs - max_logprob
    log_sum_exp = torch.logsumexp(normalized, dim=-1, keepdim=True)
    final_logprobs = updated_logprobs - log_sum_exp

    return final_logprobs
```

**BAD vs GOOD — DPO Alignment:**

```python
# ❌ BAD — Two-step PPO alignment with separate reward model (complex, unstable)
def two_step_alignment(llm, reward_model, human_feedback_data):
    # Step 1: Train a reward model on human preferences
    reward_trainer = RewardTrainer(reward_model)
    reward_trainer.train(human_feedback_data)

    # Step 2: Fine-tune LLM with PPO using reward model as judge
    # Problem: LLM can learn to 'hack' the reward model for high scores
    ppo_trainer = PPOTrainer(llm, reward_model.reward_fn)
    return ppo_trainer.train()


# ✅ GOOD — DPO direct optimization (single step, no reward model)
def direct_preference_alignment(
    llm: torch.nn.Module,
    reference_model: torch.nn.Module,
    preference_pairs: list[tuple[str, str]],
    beta: float = 0.1,
) -> torch.nn.Module:
    """Align LLM directly with human preferences — no reward model needed."""
    for preferred_text, disfavored_text in preference_pairs:
        pref_probs = llm.compute_logprobs(preferred_text)
        disf_probs = llm.compute_logprobs(disfavored_text)
        ref_probs = reference_model.compute_logprobs(preferred_text)
        loss = dpo_loss(pref_probs, disf_probs, ref_probs, beta=beta)
        loss.backward()  # Direct optimization — clean and stable
    return llm  # Aligned without intermediate reward model
```

### Pattern 3: SICA-Style Iterative Self-Improvement

The Self-Improving Coding Agent (SICA) modifies its own source code through an iterative cycle of review, analysis, modification, and benchmark testing. It selects the highest-performing version from its archive, identifies improvement opportunities by analyzing past performance, applies targeted modifications using diff-aware editing, and records results for future iteration selection.

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class VersionRecord:
    """Records one iteration of a self-improving agent's code version."""
    version_id: str
    code_snapshot: str
    benchmark_score: float
    success_rate: float
    avg_time_seconds: float
    tokens_consumed: int
    modifications_applied: list[str] = field(default_factory=list)
    timestamp: Optional[float] = None

    @property
    def composite_score(self) -> float:
        """Calculate weighted performance score for version selection.

        Weights mirror SICA's approach: success (50%), speed (25%),
        resource efficiency (25%). This prevents selecting versions
        that are fast but unreliable or correct but impossibly expensive.
        """
        time_score = max(1e-6, 1.0 / self.avg_time_seconds)
        token_score = max(1e-6, 1.0 / self.tokens_consumed)

        return (
            self.success_rate * 0.5
            + time_score * 0.25
            + token_score * 0.25
        )


class SICALearningLoop:
    """Iterative self-improvement loop inspired by the SICA architecture.

    The agent reviews its archive of past versions, selects the highest-scoring
    one, analyzes the archive for improvement opportunities, modifies its own
    codebase, tests against benchmarks, and records results. This cycle repeats
    autonomously, with an overseer monitoring for pathological behaviors.
    """

    def __init__(self, archive: list[VersionRecord], overseer_threshold: float = 3):
        self.archive = sorted(archive, key=lambda v: v.composite_score, reverse=True)
        self.overseer_threshold = overseer_threshold  # Consecutive no-improve iterations to trigger review

    def select_best_version(self) -> VersionRecord:
        """Return the highest-scoring version from the archive as the improvement baseline."""
        if not self.archive:
            raise ValueError("Cannot improve from empty archive — need at least one initial version.")

        best = self.archive[0]
        return best

    def analyze_archive_for_improvements(self, current_version: VersionRecord) -> list[str]:
        """Identify potential improvements by analyzing patterns across all archived versions.

        Scans modification history and performance trends to find: (1) modifications
        that consistently improved scores, (2) recurring failure modes, and (3)
        optimization opportunities based on token/time inefficiencies.

        Args:
            current_version: The version being evaluated for the next improvement cycle.

        Returns:
            Ranked list of suggested modifications, highest-impact first.
        """
        suggestions: list[str] = []

        # Identify consistently improving modification patterns
        successful_modifications: dict[str, int] = {}
        for record in self.archive:
            for mod in record.modifications_applied:
                if mod not in successful_modifications:
                    successful_modifications[mod] = 0
                successful_modifications[mod] += 1

        # Prioritize modifications with highest improvement rate
        for mod, count in sorted(
            successful_modifications.items(), key=lambda x: x[1], reverse=True
        ):
            if count >= 2:  # Must have improved in at least 2 iterations
                suggestions.append(f"Reinforce: {mod} (improved in {count}/len archive versions)")

        # Flag recurring failure modes for targeted fixes
        recent_scores = [r.benchmark_score for r in self.archive[-3:]]
        if len(recent_scores) >= 2 and recent_scores[-1] < recent_scores[0]:
            suggestions.append("Performance regressed — investigate changes since best version")

        return suggestions[:5]  # Top 5 most impactful suggestions

    def run_improvement_cycle(self, max_iterations: int = 100) -> dict:
        """Execute the full self-improvement loop for up to `max_iterations`.

        Each iteration: select best version → analyze archive → apply modification
        → test against benchmarks → record results → check overseer conditions.

        Args:
            max_iterations: Maximum number of improvement cycles before stopping.

        Returns:
            Dictionary containing the final best version and improvement statistics.
        """
        consecutive_no_improve = 0
        previous_best_score = self.archive[0].composite_score if self.archive else 0.0

        for iteration in range(max_iterations):
            # Select baseline
            current_version = self.select_best_version()
            suggestions = self.analyze_archive_for_improvements(current_version)

            if not suggestions:
                consecutive_no_improve += 1
            else:
                # Apply the top suggestion as a code modification
                # In production, this would invoke a coding sub-agent to generate diffs
                pass  # Modification logic delegated to sub-agents

            # Test against benchmarks and record results
            new_score = self._evaluate_modified_version(current_version)

            if new_score > previous_best_score:
                consecutive_no_improve = 0
                previous_best_score = new_score
            else:
                consecutive_no_improve += 1

            # Overseer check: stop if stuck for too long
            if consecutive_no_improve >= self.overseer_threshold:
                return {
                    "status": "stagnation_detected",
                    "iterations_completed": iteration,
                    "best_score": previous_best_score,
                    "consecutive_no_improve": consecutive_no_improve,
                    "action_required": "overseer_review_needed",
                }

        return {
            "status": "max_iterations_reached",
            "iterations_completed": max_iterations,
            "best_score": previous_best_score,
        }

    def _evaluate_modified_version(self, version: VersionRecord) -> float:
        """Evaluate a modified version against benchmarks.

        In the SICA implementation, this runs the agent's coding tools
        against benchmark test suites and aggregates results into a score.
        """
        # Placeholder — real implementation runs benchmark suite
        return version.composite_score
```

### Pattern 4: AlphaEvolve-Style Evolutionary Algorithm Discovery

AlphaEvolve uses an ensemble of LLMs with automated evaluation and evolutionary selection to discover novel, optimized algorithms. The controller orchestrates program sampling, evaluation scoring, and iterative refinement — applying genetic algorithm principles to code evolution.

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class EvaluatedProgram:
    """Represents one candidate program with its evaluation metrics."""
    program_code: str
    metrics: dict[str, float]
    rank: int = 0
    iteration: int = 0

    @property
    def composite_score(self) -> float:
        return sum(self.metrics.values()) / len(self.metrics) if self.metrics else 0.0


class EvolutionaryController:
    """Orchestrates LLM-driven evolutionary optimization of code programs.

    Mirrors OpenEvolve's architecture: a controller manages program sampling,
    evaluation pool execution, and LLM ensemble prompting for iterative
    code improvement across multiple programming languages.

    Key capabilities:
    - Multi-objective optimization (balance accuracy, speed, resource usage)
    - Flexible prompt engineering per target domain
    - Distributed evaluation for parallel benchmarking
    - File-level evolution (not just function-level)
    """

    def __init__(
        self,
        initial_program_path: str,
        evaluation_file: str,
        config_path: Optional[str] = None,
        llm_model: str = "gpt-4",
        max_iterations: int = 1000,
    ):
        self.initial_program_path = initial_program_path
        self.evaluation_file = evaluation_file
        self.config_path = config_path
        self.llm_model = llm_model
        self.max_iterations = max_iterations
        self.population: list[EvaluatedProgram] = []

    def evolve(
        self,
        population_size: int = 10,
        crossover_rate: float = 0.3,
        mutation_rate: float = 0.4,
    ) -> EvaluatedProgram:
        """Run evolutionary optimization loop to find the best program variant.

        Each iteration: (1) sample diverse programs from current population,
        (2) evaluate them against benchmark suite, (3) select top performers,
        (4) generate new variants via LLM-driven crossover and mutation,
        (5) add offspring to population and prune weakest candidates.

        Args:
            population_size: Number of candidate programs in the population.
            crossover_rate: Fraction of population replaced by recombination each iteration.
            mutation_rate: Fraction of population replaced by random variation each iteration.

        Returns:
            The highest-scoring program found across all iterations.
        """
        # Initialize population from initial program and LLM-generated variants
        self._initialize_population(population_size)

        best_program: Optional[EvaluatedProgram] = None

        for iteration in range(self.max_iterations):
            # Evaluate all current candidates
            self.population = [self._evaluate(p, iteration) for p in self.population]

            # Sort by composite score (descending) and track best
            self.population.sort(key=lambda p: p.composite_score, reverse=True)
            current_best = self.population[0]

            if best_program is None or current_best.composite_score > best_program.composite_score:
                best_program = current_best

            # Generate new candidates from top performers
            survivors = self.population[: max(2, int(population_size * 0.3))]
            new_candidates = self._generate_variants(survivors, population_size - len(survivors))

            # Merge and prune to maintain population size
            self.population = survivors + new_candidates
            self.population.sort(key=lambda p: p.composite_score, reverse=True)
            self.population = self.population[:population_size]

        return best_program or EvaluatedProgram(
            program_code="", metrics={}, iteration=self.max_iterations - 1
        )

    def _initialize_population(self, size: int) -> None:
        """Create initial population from the seed program and LLM variations."""
        pass  # Implementation reads initial_program_path and generates variants via LLM

    def _evaluate(self, program: EvaluatedProgram, iteration: int) -> EvaluatedProgram:
        """Run the evaluation suite against a candidate program and score it."""
        pass  # Implementation executes evaluation_file benchmarks and returns scored program

    def _generate_variants(self, survivors: list[EvaluatedProgram], count: int) -> list[EvaluatedProgram]:
        """Generate new program variants using LLM-based crossover and mutation."""
        pass  # Implementation prompts LLM with survivor code + performance feedback
```

---

## Constraints

### MUST DO

1. **Use clipped objectives (PPO) or direct preference loss (DPO)** — Never update agent policy without a stabilization mechanism. Unconstrained updates cause catastrophic forgetting where new learning erases prior capabilities.
2. **Implement an asynchronous overseer** — Deploy a monitoring LLM that evaluates the main agent's callgraph, event stream, and performance metrics in real-time. The overseer must have authority to halt execution when stagnation or pathological patterns are detected.
3. **Store knowledge as retrievable vectors, not raw logs** — Use embedding-based indexing for past solutions so the agent can query relevant experience via similarity search. Raw log dumps waste context windows and yield low-quality retrieval.
4. **Calculate composite performance scores with explicit weights** — Define weighted formulas combining success rate, execution time, and computational cost (e.g., `success × 0.5 + speed × 0.25 + efficiency × 0.25`). Single-metric selection leads to optimization on the wrong axis.
5. **Structure context windows in layered segments** — Mirror SICA's proven architecture: system prompt (agent goals/tools), core prompt (current objective + RAG retrievals), assistant messages (reasoning log), and archived diffs (compact history). This reduces token costs while maximizing available reasoning context.
6. **Track performance trends across iterations to detect catastrophic forgetting** — If a version scores well on new benchmarks but poorly on previously-passed ones, the agent has overfit. Flag this with an overseer review and consider reverting to a checkpoint.
7. **Reference `code-philosophy` (5 Laws of Elegant Defense)** — Parse learning signals at boundaries (validate reward format before processing), fail fast when feedback is missing or ambiguous, never mutate shared state without logging the change, design data flows so policy updates follow natural progression from observation to evaluation to adaptation.
8. **Maintain a reference/base policy for regularization** — Whether using DPO's reference log-probabilities or PPO's trust-region anchor, always compare new policies against the pre-update baseline. This prevents runaway drift and keeps improvements grounded.

### MUST NOT DO

1. **Enable autonomous code modification without an overseer off-switch** — Unconstrained self-modification is the #1 cause of agent failure in production. Every self-improving system must have a monitoring layer that can terminate execution.
2. **Train reward models without adversarial evaluation** — When using PPO with a separate reward model (not DPO), always test whether the policy has learned to game the reward signal rather than improve actual performance. Check for reward hacking by running the optimized agent on held-out test scenarios.
3. **Inject low-confidence RAG retrievals into context** — Retrievals with similarity scores below 0.75 are noise, not knowledge. They corrupt decision-making more than an empty knowledge base. Always enforce a minimum similarity threshold before injection.
4. **Use unweighted single-metric selection for version comparison** — Selecting versions by raw benchmark score alone ignores cost and speed tradeoffs. A solution that takes 10x longer for marginal accuracy gains is worse, not better.
5. **Skip baseline comparison when evaluating improvements** — Every modification must be compared against the previous best version. Without a baseline, you cannot distinguish genuine improvement from random variance or regression.
6. **Let context windows grow unbounded during long improvement cycles** — The SICA architecture demonstrates that structured, bounded context (system prompt + core prompt + assistant messages + compressed diffs) outperforms unbounded append-only histories. Compress old diffs and summarize stale reasoning rather than letting tokens accumulate.

---

## Output Template

When this skill is active, structure your output as follows:

1. **Learning Method Selection** — State which learning modality you recommend (PPO / DPO / SICA-style self-modification / AlphaEvolve evolutionary) and why, based on the agent's environment type and action space characteristics.

2. **Feedback Loop Design** — Provide the exact data structures for capturing `(state, action, reward)` tuples or preference pairs, including field types and validation rules. Include a concrete archive schema with timestamped entries.

3. **Knowledge Base Specification** — Define the vector embedding model, similarity threshold, retrieval parameters (top-k, minimum score), and storage backend (FAISS, Chroma, Qdrant) for the RAG-powered experience store.

4. **Implementation Code** — Provide complete Python implementations with type hints and docstrings for the selected pattern(s). Include BAD vs GOOD examples showing what to avoid.

5. **Overseer Configuration** — Specify the monitoring interval, detection criteria (loop detection threshold, stagnation iteration count), and intervention actions (notification, halt, revert).

6. **Performance Tracking Plan** — Define the weighted scoring formula, baseline comparison strategy, trend tracking methodology, and escalation triggers when performance plateaus or degrades across consecutive iterations.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `memory-management` | Manages agent memory layers (short-term buffers, long-term vector stores, procedural memory) — provides the persistence infrastructure that learning loops feed into |
| `rag-patterns` | Implements retrieval-augmented generation pipelines for knowledge base construction — supplies the vector store backend used by adaptive agents for experience retrieval |
| `evaluation-monitoring` | Sets up continuous evaluation dashboards and metric tracking — monitors the performance trends that trigger overseer intervention in learning loops |

---

## References

1. Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction*. MIT Press.
2. Schulman, J. et al. "Proximal Policy Optimization Algorithms." arXiv:1707.06347.
3. Robeyns, M., Aitchison, L., & Szummer, M. (2025). "A Self-Improving Coding Agent." arXiv:2504.15228v2. https://github.com/MaximeRobeyns/self_improving_coding_agent
4. AlphaEvolve blog. Google DeepMind. https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/
5. OpenEvolve. https://github.com/codelion/openevolve
