---
name: exploration-discovery
description: Implements proactive agent exploration patterns for discovering unknown opportunities, generating hypotheses, designing experiments, and sharing findings through autonomous research loops beyond predefined optimization targets.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: exploration, discovery, hypothesis generation, experimental design, autonomous research, how do i make agents explore, Agent Laboratory, Co-Scientist
  related-skills: multi-agent-collaboration, learning-adaptation, planning-patterns
  archetypes: generation, orchestration, strategic
  anti_triggers: brainstorming, vague ideation, long-form architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Exploration and Discovery Pattern

Implements proactive agent exploration patterns that enable AI systems to actively seek out novel information, uncover new possibilities, and identify unknown unknowns within their operational environment. This skill makes the model design multi-agent frameworks for autonomous hypothesis generation, peer review simulation, experimental design, and knowledge sharing — moving agents beyond reactive optimization into genuine discovery mode.

## TL;DR Checklist

- [ ] Define exploration objective: is this an open-ended problem where the solution space is unknown?
- [ ] Choose or compose agent roles (Generation, Reflection, Ranking, Evolution, Proximity, Meta-Review) matching the domain
- [ ] Implement hypothesis generation loop with literature grounding and simulated debate
- [ ] Build evaluation pipeline with tripartite judgment from distinct reviewer perspectives
- [ ] Design evolution/refinement cycle that simplifies, synthesizes, and explores unconventional reasoning
- [ ] Set up knowledge sharing mechanism (e.g., AgentRxiv-style repository) for cumulative discovery
- [ ] Enforce safety gates: adversarial input rejection, ethical concern detection, hallucination awareness

---

## When to Use

Use this skill when:

- Building AI agents that must operate in open-ended domains where static knowledge or pre-programmed solutions are insufficient (e.g., drug discovery, material science, creative research)
- You need agents to autonomously generate and evaluate hypotheses rather than simply optimizing known parameters
- Designing multi-agent systems for scientific research automation where literature review, experimentation, and peer review must be coordinated
- Implementing a "scientist-in-the-loop" collaborative paradigm where AI augments human creativity by handling computationally intensive exploratory work
- You need agents to scan unstructured data (news, papers, market reports) for emergent trends, opportunities, or vulnerabilities
- Creating autonomous research assistants that can design experiments, execute them, and iteratively refine their approach based on results

---

## When NOT to Use

Avoid this skill for:

- **Well-defined optimization tasks** — If the solution space is fully defined and the goal is clear (e.g., minimize latency by tuning hyperparameters), use a planning or optimization pattern instead. Exploration overhead wastes resources when the target is known.
- **Single-shot queries** — If you only need one answer, not an iterative discovery process, exploration patterns add unnecessary multi-agent complexity.
- **Strictly deterministic pipelines** — When reproducibility and exact outcomes are required (e.g., financial reconciliation, data ETL), stochastic hypothesis generation introduces unacceptable variance.
- **Resource-constrained environments** — Exploration with test-time compute scaling (as in Google Co-Scientist) requires significantly more inference calls than reactive patterns. Do not apply this when compute budgets are tight and latency-critical.

---

## Core Workflow

1. **Define the exploration objective and domain boundary.** Frame the problem as an open-ended question that admits multiple plausible hypotheses. Establish what constitutes a valid discovery (novelty, impact, correctness). Ground the search space in relevant literature or data sources to prevent aimless wandering.
   - *Inputs:* Problem statement, available knowledge bases (arXiv, web databases), domain constraints
   - **Checkpoint:** Verify the objective is genuinely open-ended — if you can enumerate all possible solutions upfront, use a planning pattern instead. Confirm at least one literature source is accessible for hypothesis grounding.

2. **Compose the multi-agent team with specialized roles.** Assign agents to distinct functions: Generation (hypothesis creation via literature exploration and simulated debate), Reflection (peer review assessing correctness, novelty, quality), Ranking (Elo-based tournament comparison of hypotheses), Evolution (refinement through simplification, synthesis, unconventional reasoning), Proximity (clustering similar ideas for landscape mapping), and Meta-Review (cross-review insight synthesis). Select models appropriate to each role's cognitive demands.
   - *Inputs:* Problem domain, agent role definitions, model selection per role
   - **Checkpoint:** Confirm every critical function has a dedicated agent. Verify the asynchronous execution framework is configured so agents can scale independently without blocking each other.

3. **Execute the generate-debate-evolve cycle.** The Generation agent produces initial hypotheses by exploring literature and simulating scientific debates with itself or other agents. These hypotheses enter a debate phase where multiple reviewers evaluate them from distinct perspectives (harsh/fair, impact-focused, novelty-seeking). Results feed into an Elo-based ranking system that prioritizes the most promising candidates.
   - *Inputs:* Literature review corpus, hypothesis generation prompts, reviewer configurations
   - **Checkpoint:** After one full cycle, verify at least 5 unique hypotheses were generated and scored. Confirm reviewers produced distinct evaluations (not convergent boilerplate). Check that Elo ratings show differentiation — if all scores cluster identically, the ranking mechanism needs calibration.

4. **Run the evolution and refinement loop.** Feed top-ranked hypotheses into the Evolution agent, which continuously refines them by simplifying complex concepts, synthesizing ideas from multiple candidates, and deliberately exploring unconventional reasoning paths. The Proximity agent maps the evolving hypothesis landscape to identify clusters and gaps. Meta-Review synthesizes cross-cutting insights from all reviews to improve subsequent generation rounds.
   - *Inputs:* Ranked hypotheses, evolution prompts, proximity graph data
   - **Checkpoint:** Verify that evolved hypotheses differ meaningfully from originals (not trivial paraphrases). Confirm the proximity graph reveals at least 2 distinct idea clusters. Check that meta-review feedback is actionable and has influenced the next generation round.

5. **Design and execute experiments with iterative validation.** PostDoc-style agents formulate experimental protocols based on refined hypotheses, prepare datasets, execute code, and analyze results. Use integrated tools (Python for computation, Hugging Face models for NLP tasks). The system iterates: experiment outcomes inform new literature review gaps, which feed back into hypothesis generation.
   - *Inputs:* Top hypotheses, available toolchains (Python runtime, model APIs), dataset access
   - **Checkpoint:** Each experimental run must produce quantifiable results with clear success/failure criteria. Verify the feedback loop closes — experiment results should have influenced at least one subsequent hypothesis or plan adjustment.

6. **Publish findings and share knowledge for cumulative discovery.** Generate structured research reports following academic conventions (using LaTeX for formatting when appropriate). Deposit findings into a shared repository (AgentRxiv-style) so that other agents or research cycles can build upon previous discoveries. The Professor agent orchestrates final integration, producing high-level summaries and README artifacts for human review.
   - *Inputs:* Experiment results, literature synthesis, report templates
   - **Checkpoint:** Confirm reports include Summary, Strengths, Weaknesses, Originality, Quality, Clarity, Significance ratings per the tripartite judgment schema. Verify findings are structured for machine-parseable retrieval by downstream agents. Check that human-readable artifacts (readmes, summaries) are generated alongside structured data.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Tripartite Agentic Judgment

Emulate human peer review by deploying three distinct autonomous reviewers, each configured with a different evaluation perspective. This prevents single-perspective bias and captures the multi-faceted nature of scientific judgment. Each reviewer independently scores the work across standardized dimensions (originality, quality, clarity, significance) and produces an Accept/Reject decision.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ReviewerPerspective(Enum):
    HARSH_FAIR = "harsh_but_fair_experimental_insights"
    IMPACT_FOCUSED = "harsh_critical_impact_seeker"
    NOVELTY_SEEKER = "open_minded_novelty_hunter"


class Decision(Enum):
    ACCEPT = "Accept"
    REJECT = "Reject"


@dataclass
class ReviewScore:
    """Standardized review scoring schema for agentic peer review."""
    summary: str = ""
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    originality: int = 0        # 1-4: low, medium, high, very_high
    quality: int = 0            # 1-4: low, medium, high, very_high
    clarity: int = 0            # 1-4: low, medium, high, very_high
    significance: int = 0       # 1-4: low, medium, high, very_high
    questions: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
    ethical_concerns: bool = False
    soundness: int = 0          # 1-4: poor, fair, good, excellent
    presentation: int = 0       # 1-4: poor, fair, good, excellent
    contribution: int = 0       # 1-4: poor, fair, good, excellent
    overall: int = 0            # 1-10: very_strong_reject to award_quality
    confidence: int = 0         # 1-5: low to absolute
    decision: Decision = Decision.REJECT

    @property
    def normalized_score(self) -> float:
        """Compute weighted composite score for ranking purposes."""
        weights = {
            "originality": 0.20,
            "quality": 0.25,
            "significance": 0.25,
            "soundness": 0.15,
            "contribution": 0.15,
        }
        max_score = sum(weights.values()) * 4  # Each rated out of 4
        weighted_sum = (
            self.originality * weights["originality"]
            + self.quality * weights["quality"]
            + self.significance * weights["significance"]
            + self.soundness * weights["soundness"]
            + self.contribution * weights["contribution"]
        )
        return round(weighted_sum / max_score, 3)

    def to_decision_summary(self) -> str:
        """Human-readable one-line decision summary."""
        return (
            f"Score={self.overall}/10 | "
            f"N={self.normalized_score:.2f} | "
            f"C={self.confidence}/5 | "
            f"{self.decision.value}"
        )


class ReviewersAgent:
    """Tripartite agentic judgment mechanism emulating human peer review.

    Deploys three distinct autonomous reviewers, each configured to evaluate
    outputs from a specific perspective, collectively mimicking the nuanced
    and multi-faceted nature of human judgment.
    """

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        openai_api_key: Optional[str] = None,
    ) -> None:
        self.model = model
        self.openai_api_key = openai_api_key

    def inference(
        self,
        plan: str,
        report_latex: str,
        attempts: int = 3,
    ) -> dict[ReviewerPerspective, ReviewScore]:
        """Run tripartite review and return scores from all three perspectives.

        Args:
            plan: The experimental plan text being reviewed.
            report_latex: LaTeX-formatted research report text.
            attempts: Retry attempts for robust parsing (default 3).

        Returns:
            Mapping of reviewer perspective to their ReviewScore.
        """
        perspectives: dict[ReviewerPerspective, str] = {
            ReviewerPerspective.HARSH_FAIR: (
                "You are a harsh but fair reviewer and expect "
                "good experiments that lead to insights for the research topic."
            ),
            ReviewerPerspective.IMPACT_FOCUSED: (
                "You are a harsh and critical but fair reviewer "
                "who is looking for an idea that would be impactful in the field."
            ),
            ReviewerPerspective.NOVELTY_SEEKER: (
                "You are a harsh but fair open-minded reviewer "
                "that is looking for novel ideas that have not been proposed before."
            ),
        }

        results: dict[ReviewerPerspective, ReviewScore] = {}
        for perspective, prompt_template in perspectives.items():
            score = get_score(
                outlined_plan=plan,
                latex=report_latex,
                reward_model_llm=self.model,
                reviewer_type=prompt_template,
                attempts=attempts,
                openai_api_key=self.openai_api_key,
            )
            results[perspective] = score

        return results
```

### Pattern 2: Hypothesis Generation with Simulated Debate

Generate initial hypotheses by combining literature exploration with simulated scientific debate. The generation agent explores academic databases and web sources to ground proposals in existing knowledge, then runs internal debates where competing hypotheses stress-test each other's assumptions. This "generate-debate-evolve" loop mirrors the scientific method's self-correcting nature.

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Hypothesis:
    """A single research hypothesis with metadata for ranking and evolution."""
    id: str
    statement: str
    supporting_evidence: list[str] = field(default_factory=list)
    confidence_score: float = 0.0
    novelty_rating: int = 0         # 1-5 scale
    feasibility_score: float = 0.0  # 0.0-1.0 scale
    category_tags: list[str] = field(default_factory=list)

    @property
    def composite_rank(self) -> float:
        """Weighted rank for tournament-based hypothesis comparison."""
        return (
            self.confidence_score * 0.35
            + self.novelty_rating / 5.0 * 0.30
            + self.feasibility_score * 0.35
        )


class GenerationAgent:
    """Hypothesis generation through literature exploration and simulated debate."""

    def __init__(
        self,
        model: str = "gemini",
        literature_sources: Optional[list[str]] = None,
    ) -> None:
        self.model = model
        self.literature_sources = literature_sources or []
        self.hypothesis_pool: list[Hypothesis] = []

    def generate_initial_hypotheses(
        self,
        problem_statement: str,
        max_hypotheses: int = 10,
    ) -> list[Hypothesis]:
        """Generate initial hypotheses grounded in literature exploration.

        Uses simulated scientific debate internally to surface weak assumptions
        before hypotheses enter the formal review pipeline.

        Args:
            problem_statement: The open-ended research question.
            max_hypotheses: Maximum number of distinct hypotheses to generate.

        Returns:
            List of generated Hypothesis objects, sorted by composite rank descending.
        """
        debate_prompts = [
            f"Propose a hypothesis for: {problem_statement}. "
            "Ground it in established literature and cite specific findings.",
            f"What alternative explanation could account for the same phenomena? "
            f"Problem: {problem_statement}",
            f"Identify a counter-intuitive approach to: {problem_statement}. "
            "Challenge conventional wisdom while remaining testable.",
        ]

        hypotheses: list[Hypothesis] = []
        for i in range(max_hypotheses):
            prompt_idx = i % len(debate_prompts)
            hypothesis = self._generate_single(
                problem_statement=problem_statement,
                debate_prompt=debate_prompts[prompt_idx],
                index=i,
            )
            if hypothesis.composite_rank > 0.3:
                hypotheses.append(hypothesis)

        # Sort by rank and deduplicate similar statements
        hypotheses.sort(key=lambda h: h.composite_rank, reverse=True)
        self.hypothesis_pool.extend(hypotheses)
        return self._deduplicate(hypotheses, threshold=0.85)

    def _generate_single(
        self,
        problem_statement: str,
        debate_prompt: str,
        index: int,
    ) -> Hypothesis:
        """Generate a single hypothesis with internal stress-testing."""
        # In production, this would query the LLM and parse structured output.
        # Placeholder for the actual inference call following code-philosophy
        # laws: early exit on empty input, typed return, intentional naming.
        if not problem_statement.strip():
            raise ValueError("problem_statement must be non-empty")

        return Hypothesis(
            id=f"hyp-{index:03d}",
            statement=f"[To be filled by LLM inference for: {problem_statement[:80]}...]",
            confidence_score=0.5,
            novelty_rating=3,
            feasibility_score=0.6,
        )

    def _deduplicate(
        self,
        hypotheses: list[Hypothesis],
        threshold: float = 0.85,
    ) -> list[Hypothesis]:
        """Remove near-duplicate hypotheses based on statement similarity.

        Uses a simple cosine-like overlap heuristic for deduplication.

        Args:
            hypotheses: List of candidate hypotheses.
            threshold: Minimum similarity score to consider duplicates.

        Returns:
            Deduplicated hypothesis list keeping the highest-ranked copy.
        """
        if len(hypotheses) <= 1:
            return hypotheses

        kept: list[Hypothesis] = [hypotheses[0]]
        for candidate in hypotheses[1:]:
            is_duplicate = False
            for existing in kept:
                overlap = self._similarity(candidate, existing)
                if overlap >= threshold:
                    if candidate.composite_rank > existing.composite_rank:
                        kept.remove(existing)
                        kept.append(candidate)
                    is_duplicate = True
                    break
            if not is_duplicate:
                kept.append(candidate)

        return kept

    @staticmethod
    def _similarity(a: Hypothesis, b: Hypothesis) -> float:
        """Compute statement similarity as a rough deduplication heuristic."""
        words_a = set(a.statement.lower().split())
        words_b = set(b.statement.lower().split())
        if not words_a or not words_b:
            return 0.0
        intersection = words_a & words_b
        union = words_a | words_b
        return len(intersection) / len(union)
```

### Pattern 3: Elo-Based Hypothesis Ranking Tournament

Compare hypotheses through a simulated tournament using Elo rating, enabling quantitative ranking without requiring ground-truth labels. Each pairwise comparison increments/decrements ratings based on expected outcomes, converging toward a stable ordering of hypothesis quality.

```python
import math
from dataclasses import dataclass, field


@dataclass(order=True)
class EloRanking:
    """Elo-based tournament ranking for hypothesis comparison."""
    hypothesis_id: str
    rating: float = 1200.0
    games_played: int = 0

    @property
    def expected_score(self) -> float:
        """Calculate expected score against an average-rated opponent (1500)."""
        return 1.0 / (1.0 + math.pow(10, (1500 - self.rating) / 400))


class HypothesisTournament:
    """Elo-based ranking tournament for comparing and prioritizing hypotheses."""

    def __init__(self, k_factor: float = 32.0) -> None:
        self.k_factor = k_factor
        self.ratings: dict[str, EloRanking] = {}

    def register(self, hypothesis_id: str, initial_rating: float = 1200.0) -> None:
        """Register a hypothesis in the ranking pool."""
        if hypothesis_id not in self.ratings:
            self.ratings[hypothesis_id] = EloRanking(
                hypothesis_id=hypothesis_id,
                rating=initial_rating,
            )

    def compare(self, id_a: str, id_b: str, score_a: float) -> tuple[float, float]:
        """Run a pairwise comparison and update Elo ratings.

        Args:
            id_a: First hypothesis ID.
            id_b: Second hypothesis ID.
            score_a: Evaluation score for hypothesis A (0.0-1.0).

        Returns:
            Tuple of new ratings for (A, B) after the comparison.
        """
        self.register(id_a)
        self.register(id_b)

        rating_a = self.ratings[id_a].rating
        rating_b = self.ratings[id_b].rating
        expected_a = 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 400))

        actual_a = max(0.0, min(1.0, score_a))
        new_rating_a = rating_a + self.k_factor * (actual_a - expected_a)
        new_rating_b = rating_b + self.k_factor * ((1 - actual_a) - (1 - expected_a))

        self.ratings[id_a].rating = round(new_rating_a, 2)
        self.ratings[id_a].games_played += 1
        self.ratings[id_b].rating = round(new_rating_b, 2)
        self.ratings[id_b].games_played += 1

        return (new_rating_a, new_rating_b)

    def leaderboard(self, top_n: int | None = None) -> list[EloRanking]:
        """Return sorted leaderboard by Elo rating descending."""
        sorted_ratings = sorted(
            self.ratings.values(),
            key=lambda r: r.rating,
            reverse=True,
        )
        return sorted_ratings[:top_n] if top_n else sorted_ratings
```

### Pattern 4: BAD vs GOOD — Hypothesis Evaluation Prompting

Compare ineffective and effective approaches to agentic hypothesis evaluation. The BAD example produces generic scoring that fails to distinguish between truly novel and marginally different hypotheses. The GOOD example uses structured JSON output with explicit dimensions, forcing the agent to articulate reasoning per dimension.

```python
# ❌ BAD — Generic single-score evaluation loses nuance
def evaluate_hypothesis_bad(hypothesis: str) -> float:
    """Evaluate a hypothesis and return a single quality score.

    This approach collapses multi-dimensional assessment into one number,
    losing information about novelty vs feasibility tradeoffs and producing
    unactionable feedback for refinement.
    """
    # No structured output, no dimensional analysis, no reasoning trace.
    # The agent cannot tell the researcher WHY a hypothesis scored low.
    response = call_llm(f"Score this hypothesis (1-10): {hypothesis}")
    return float(response)

# ✅ GOOD — Multi-dimensional evaluation with structured JSON output
def evaluate_hypothesis_good(
    plan: str,
    report_latex: str,
    reviewer_type: str,
    model: str = "gpt-4o-mini",
) -> dict:
    """Evaluate a hypothesis using multi-dimensional peer review schema.

    Returns structured JSON with 15+ fields including dimensional scores,
    reasoning trace (THOUGHT), and binary Accept/Reject decision. This
    provides actionable feedback for the evolution cycle and prevents
    generic scoring from collapsing distinct hypotheses into identical scores.

    Args:
        plan: The experimental plan being reviewed.
        report_latex: LaTeX-formatted research report.
        reviewer_type: Reviewer persona prompt (e.g., "harsh but fair").
        model: LLM model for evaluation inference.

    Returns:
        Parsed review JSON with Summary, Strengths, Weaknesses, dimensional
        ratings (1-4 scale), and binary Decision field.
    """
    template_instructions = """
    Respond in the following format:
    THOUGHT:
    <Your reasoning and intuitions for this evaluation>

    REVIEW JSON:
    ```json
    {
      "Summary": "...",
      "Strengths": ["..."],
      "Weaknesses": ["..."],
      "Originality": 3,
      "Quality": 4,
      "Clarity": 3,
      "Significance": 4,
      "Questions": ["..."],
      "Limitations": ["..."],
      "EthicalConcerns": false,
      "Soundness": 3,
      "Presentation": 4,
      "Contribution": 3,
      "Overall": 8,
      "Confidence": 4,
      "Decision": "Accept"
    }
    ```

    In <THOUGHT>, discuss your intuitions and reasoning. Be specific to the
    current paper — do not make generic comments.
    Ratings: Originality/Quality/Clarity/Significance are 1-4.
    Soundness/Presentation/Contribution are 1-4 (poor, fair, good, excellent).
    Overall is 1-10 (very strong reject to award quality).
    Confidence is 1-5. Decision must be exactly "Accept" or "Reject".
    """

    # In production: call LLM with template_instructions + plan + report,
    # parse the JSON response, and return structured review data.
    raise NotImplementedError("Invoke LLM with template_instructions")
```

---

## Constraints

### MUST DO

1. **Ground every hypothesis in accessible literature.** Before generating a novel idea, query at least one knowledge source (arXiv, web search, domain database) to ensure the hypothesis builds on established findings rather than repeating known work. This mirrors the Google Co-Scientist's literature-grounded generation approach.
2. **Deploy tripartite judgment for every evaluation.** Never accept a single-agent review. Always run at least three distinct reviewer perspectives (harsh/fair, impact-focused, novelty-seeking) and aggregate their scores using the weighted composite formula from the `ReviewScore.normalized_score` property.
3. **Implement an evolution loop with deduplication.** After ranking, feed top hypotheses into an evolution phase that produces meaningfully different variants — not trivial paraphrases. Use the `_deduplicate()` pattern with a similarity threshold (0.85 default) to maintain pool diversity while eliminating redundant entries.
4. **Close the experimental feedback loop.** Every experiment run must produce quantifiable results that feed back into hypothesis generation or literature review. Open-ended exploration without closed-loop learning degrades into random wandering rather than directed discovery.
5. **Enforce safety gates on all inputs and outputs.** Review every research goal for adversarial intent upon input. Check generated hypotheses against a safety policy before allowing them to enter the evaluation pipeline. Track ethical_concerns as a boolean in every review score. This follows the principle of fail-fast (from `code-philosophy`): invalid or dangerous states halt immediately with descriptive errors.
6. **Use test-time compute scaling for complex reasoning.** Allocate increased inference budget iteratively to hypotheses that reach the top ranks — not uniformly across all candidates. This mirrors Google Co-Scientist's finding that "scaling test-time compute consistently improves the quality of hypotheses, as measured by the Elo rating."
7. **Structure all findings for machine-parseable retrieval.** Every published output must conform to a structured schema (JSON with standard fields) alongside human-readable artifacts (LaTeX reports, READMEs). This ensures downstream agents can retrieve and build upon previous discoveries through shared repositories like AgentRxiv.

### MUST NOT DO

1. **Never use exploration patterns for well-defined optimization problems.** If you can enumerate all candidate solutions and pick the best one via deterministic evaluation, do not introduce stochastic hypothesis generation — it adds latency and variance without benefit.
2. **Never skip the deduplication step in hypothesis pools.** Allowing near-duplicate hypotheses to accumulate degrades ranking quality (Elo tournaments become meaningless with redundant entries) and wastes compute on evaluating essentially identical proposals.
3. **Never allow a single reviewer perspective to make Accept/Reject decisions.** Binary decisions from one viewpoint introduce systematic bias. The tripartite judgment pattern exists specifically to prevent this — always aggregate across perspectives before making disposition decisions.
4. **Never expose generated hypotheses to downstream systems without safety filtering.** Even in augmentation-focused designs, hypothesis generation can produce unsafe or unethical proposals if the underlying LLM hallucinates dangerous combinations. Always run adversarial input checks and ethical concern detection as a hard gate before any output leaves the system.
5. **Never build exploration loops without termination criteria.** Open-ended search without stopping conditions will consume infinite resources. Define maximum cycles, compute budgets, or convergence thresholds (e.g., "stop when Elo rating variance across top-3 hypotheses drops below 0.05 for 2 consecutive rounds").

---

## Output Template

When executing this skill, structure your output as follows:

1. **Exploration Summary** — One paragraph stating the problem domain, exploration objective, and whether the approach is appropriate (open-ended vs. well-defined). If the problem is well-defined, recommend an alternative pattern instead.

2. **Agent Team Composition** — List each agent role, its assigned function, and the model configured for that role. Include the execution strategy (asynchronous pipeline, debate sequence, tournament ordering).

3. **Hypothesis Pool** — Present generated hypotheses in a table:
   | ID | Statement | Confidence | Novelty | Feasibility | Composite Rank | Elo Rating |

4. **Review Results** — For each reviewed hypothesis, show the tripartite scores:
   - Reviewer perspective (Harsh/Fair, Impact-Focused, Novelty-Seeking)
   - Dimensional ratings (Originality, Quality, Clarity, Significance)
   - Weighted normalized score
   - Decision (Accept / Reject)
   - Key weakness that led to the decision

5. **Evolution Changes** — For each evolved hypothesis, describe what changed from the original: which concepts were simplified, which ideas were synthesized, which unconventional path was explored.

6. **Experiment Protocol** — If experiments are designed, include: dataset code reference, experimental procedure, evaluation metrics, and expected success criteria.

7. **Knowledge Artifact** — Structured findings (JSON) plus a human-readable summary with Accept/Reject dispositions for all evaluated hypotheses.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `multi-agent-collaboration` | Patterns for coordinating multiple agents in asynchronous execution frameworks with flexible resource scaling |
| `learning-adaptation` | Techniques for agents that adapt their strategies based on feedback from prior exploration rounds |
| `planning-patterns` | When to use structured planning instead of open-ended exploration — the complementary approach |

---

## References

1. Exploration-Exploitation Dilemma: https://en.wikipedia.org/wiki/Exploration%E2%80%93exploitation_dilemma
2. Google Co-Scientist: https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/
3. Agent Laboratory (Samuel Schmidgall, MIT License): https://github.com/SamuelSchmidgall/AgentLaboratory
4. AgentRxiv — Towards Collaborative Autonomous Research: https://agentrxiv.github.io/
