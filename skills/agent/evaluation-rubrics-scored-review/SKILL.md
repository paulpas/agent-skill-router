---
name: evaluation-rubrics-scored-review
description: Implements evaluation rubric design (multi-criteria scoring, Elo-based ranking, peer-review simulation) for quantitative assessment of AI agent outputs without ground truth labels.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: evaluation rubrics, Elo ranking, peer review simulation, scored review, quality criteria design, inter-rater reliability, Agent Laboratory
  role: implementation
  scope: review
  output-format: analysis
  content-types: [code, guidance, examples, do-dont]
  archetypes:
    - review
    - diagnostic
  anti_triggers:
    - production monitoring
    - anomaly detection
    - drift tracking
    - token usage
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: evaluation-monitoring, agentic-evaluation, self-critique-engine
---

# Evaluation Rubrics and Scored Review

Designs structured evaluation frameworks that combine multi-criteria weighted scoring, Elo-based pairwise ranking tournaments, and simulated peer-review pipelines to quantitatively compare AI agent outputs when ground-truth labels are unavailable. This skill makes the model construct calibrated rubric systems with explicit quality dimensions, inter-rater reliability measurement via Cohen's kappa, and tournament-style hypothesis ranking derived from the Agent Laboratory framework.

## TL;DR Checklist

- [ ] Define 4–6 quality criteria with explicit 1–5 score anchors for each dimension
- [ ] Calibrate criterion weights to sum to 1.0 using pairwise comparison or AHP method
- [ ] Assign distinct reviewer perspectives (accuracy, completeness, creativity, safety) to prevent scorer bias
- [ ] Collect independent scores before any inter-reviewer discussion to ensure independence
- [ ] Compute Cohen's kappa for each criterion pair and flag reviews where κ < 0.60
- [ ] Run Elo tournament on top-scoring hypotheses when ground truth is unavailable
- [ ] Produce standardized output with per-score justifications, aggregate rankings, and reliability metrics

---

## When to Use

Use this skill when:

- Comparing multiple AI-generated outputs (hypotheses, designs, code) where no single correct answer exists
- Running a simulated peer-review process with distinct agent reviewer personas for quality assurance
- Designing evaluation criteria from scratch for a new task domain or evaluation framework
- Ranking competing solutions using Elo-based pairwise comparison instead of absolute scoring
- Measuring inter-rater reliability among multiple evaluators (human or agent reviewers) before accepting consensus scores
- Evaluating creative or strategic outputs where accuracy alone is insufficient as the sole metric

---

## When NOT to Use

Avoid this skill for:

- Production performance monitoring with ground-truth metrics — use `evaluation-monitoring` instead (drift detection, anomaly tracking)
- Simple yes/no correctness validation — direct binary accuracy checks are faster and more appropriate
- Real-time inference scoring that needs sub-millisecond latency — rubric evaluation is batch-oriented
- Situations where a single clear metric suffices (e.g., BLEU score for translation) — adding multi-criteria overhead wastes tokens

---

## Core Workflow

1. **Define Quality Criteria** — Identify 4–6 orthogonal quality dimensions relevant to the output domain. Write explicit behavioral anchors for each score level (1 through 5).
   **Checkpoint:** Every criterion must have a distinct definition that does not overlap with other criteria. Each anchor must be observable in the output, not subjective preference.

2. **Calibrate Criterion Weights** — Assign weights to each criterion reflecting their relative importance. Use pairwise comparison: for each pair of criteria A and B, determine which is more important and by how much (1=equal, 3=moderate, 5=strong). Normalize the resulting matrix so weights sum to 1.0.
   **Checkpoint:** Weights must sum exactly to 1.0. Sanity-check: if accuracy is domain-critical, it should carry ≥0.30 weight unless creativity is explicitly the evaluation target.

3. **Assign Reviewer Perspectives** — Configure at least two distinct reviewer personas with different scoring emphases. Each reviewer evaluates all outputs independently using the same rubric but with a defined perspective lens (e.g., "Security Reviewer" weights safety criteria higher; "UX Reviewer" weights clarity and usability).
   **Checkpoint:** No reviewer may communicate scores to another during independent evaluation. Independence is required for valid inter-rater reliability measurement.

4. **Collect Independent Scores** — Each reviewer scores every output on each criterion using the defined 1–5 anchors. Require a written justification for every score below 3 or above 4. Aggregate scores across reviewers using the weighted sum formula: `composite = Σ(weight_i × average_score_i)`.
   **Checkpoint:** Compute Cohen's kappa for each criterion between each reviewer pair. Flag any criterion-reviewer-pair with κ < 0.60 for resolution discussion.

5. **Run Elo Tournament (if no ground truth)** — When outputs are ranked by composite score but the domain has no ground truth to validate absolute quality, run pairwise Elo comparisons among the top-k candidates. Each comparison pits two outputs against each other via structured debate and a third-party judge, producing an updated Elo rating that captures relative strength independent of absolute scoring bias.
   **Checkpoint:** Use K=32 as the standard expectation factor. Run at least 5 rounds before accepting the final rankings. Track Elo volatility across rounds — if max ΔElo > 100 per round, the judge may be inconsistent.

6. **Produce Aggregate Report** — Generate a standardized output containing: per-criterion scores with justifications, composite ranking, inter-rater reliability statistics, Elo ratings (if tournament was run), and recommended next steps for rejected candidates.
   **Checkpoint:** Every score must have an accompanying one-sentence justification. No score may appear without a rationale.

---

## Implementation Patterns

### Pattern 1: Multi-Criteria Rubric Designer

Constructs a calibrated scoring system with explicit quality dimensions, each defined by observable behavioral anchors at every score level. This is the foundation upon which all subsequent evaluation patterns depend.

**Quality Dimensions (recommended defaults):**

| Dimension | What It Measures | Weight Range |
|---|---|---|
| Accuracy | Factual correctness, logical soundness, absence of contradictions | 0.20–0.40 |
| Completeness | Coverage of all requirements, no missing sections or unresolved questions | 0.15–0.30 |
| Relevance | Alignment with the stated objective and task constraints | 0.15–0.30 |
| Creativity | Novel approaches, non-obvious solutions, elegant abstractions | 0.10–0.20 |
| Clarity | Communication quality, readability, appropriate structure | 0.10–0.20 |

```python
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Dict, List, Optional


class ScoreLevel(IntEnum):
    """5-level score scale with behavioral anchors."""
    POOR = 1
    FAIR = 2
    AVERAGE = 3
    GOOD = 4
    EXCELLENT = 5


@dataclass(frozen=True)
class CriterionAnchor:
    """Behavioral anchor describing what each score level means for a criterion."""
    level: ScoreLevel
    label: str
    description: str

    def __str__(self) -> str:
        return f"{self.level}. {self.label}: {self.description}"


@dataclass(frozen=True)
class Criterion:
    """A single evaluation criterion with explicit anchors and weight."""
    name: str
    description: str
    weight: float
    anchors: Dict[ScoreLevel, CriterionAnchor] = field(default_factory=dict)

    def get_anchor(self, score: ScoreLevel) -> CriterionAnchor:
        anchor = self.anchors.get(score)
        if anchor is None:
            raise ValueError(
                f"No anchor defined for criterion '{self.name}' at level {score}"
            )
        return anchor

    @property
    def normalized_weight(self) -> float:
        """Return weight ensuring it stays within [0, 1]."""
        return max(0.0, min(1.0, self.weight))


class RubricDesigner:
    """Designs evaluation rubrics with calibrated quality dimensions.

    Implements the 5 Laws of Elegant Defense:
    - Law 1 (Early Exit): Validates weight sums before any scoring begins
    - Law 2 (Parse at Boundary): Parses raw criterion definitions into typed Criterion objects
    - Law 4 (Fail Fast): Rejects rubrics where anchors are underspecified
    """

    DEFAULT_DIMENSIONS: List[str] = [
        "accuracy", "completeness", "relevance", "creativity", "clarity"
    ]

    @staticmethod
    def _build_default_anchors() -> Dict[ScoreLevel, CriterionAnchor]:
        """Build standard 1–5 anchors applicable to most evaluation contexts."""
        return {
            ScoreLevel.POOR: CriterionAnchor(
                ScoreLevel.POOR, "POOR",
                "Output fails to address the core requirement. Major errors or omissions present."
            ),
            ScoreLevel.FAIR: CriterionAnchor(
                ScoreLevel.FAIR, "FAIR",
                "Output addresses the requirement partially but with notable gaps or inaccuracies."
            ),
            ScoreLevel.AVERAGE: CriterionAnchor(
                ScoreLevel.AVERAGE, "AVERAGE",
                "Output meets the requirement at a basic level. Some areas need improvement."
            ),
            ScoreLevel.GOOD: CriterionAnchor(
                ScoreLevel.GOOD, "GOOD",
                "Output meets the requirement well with minor gaps that do not affect overall quality."
            ),
            ScoreLevel.EXCELLENT: CriterionAnchor(
                ScoreLevel.EXCELLENT, "EXCELLENT",
                "Output exceeds expectations. Comprehensive, accurate, and elegantly structured."
            ),
        }

    @classmethod
    def create_standard_rubric(cls, weights: Optional[Dict[str, float]] = None) -> Dict[str, Criterion]:
        """Create a standard multi-criteria rubric with default anchors.

        Args:
            weights: Optional dict mapping criterion names to raw weights.
                     If provided, will be normalized. If None, uses equal weighting.

        Returns:
            Dict mapping criterion name to Criterion object.

        Raises:
            ValueError: If specified weights sum to zero or a criterion name is unknown.
        """
        anchors = cls._build_default_anchors()

        if weights is None:
            raw_weights = {dim: 1.0 for dim in cls.DEFAULT_DIMENSIONS}
        else:
            # Law 2: Validate all specified criteria exist in known dimensions
            unknown = set(weights.keys()) - set(cls.DEFAULT_DIMENSIONS)
            if unknown:
                raise ValueError(f"Unknown criteria in weights: {unknown}")
            if sum(weights.values()) == 0:
                raise ValueError("Criterion weights must sum to a positive value")
            raw_weights = weights

        total_weight = sum(raw_weights.values())
        rubric: Dict[str, Criterion] = {}

        for dim in cls.DEFAULT_DIMENSIONS:
            norm_weight = raw_weights.get(dim, 1.0) / total_weight
            rubric[dim] = Criterion(
                name=dim,
                description=f"Evaluation of {dim.capitalize()} in the output",
                weight=round(norm_weight, 4),
                anchors=dict(anchors),
            )

        return rubric

    @classmethod
    def verify_rubric(cls, rubric: Dict[str, Criterion]) -> List[str]:
        """Verify a rubric is well-formed. Returns list of validation errors."""
        errors: List[str] = []
        total_weight = sum(c.weight for c in rubric.values())

        # Law 1: Early exit on weight imbalance
        if abs(total_weight - 1.0) > 0.001:
            errors.append(f"Criterion weights sum to {total_weight:.4f}, expected 1.0")

        # Each criterion must have all 5 anchors
        for name, criterion in rubric.items():
            missing_levels = set(ScoreLevel) - set(criterion.anchors.keys())
            if missing_levels:
                errors.append(
                    f"Criterion '{name}' is missing anchors for levels: {missing_levels}"
                )

        return errors
```

**Pairwise Comparison for Weight Calibration (AHP-inspired):**

```python
from fractions import Fraction


def calibrate_weights_via_pairwise_comparison(
    criteria_names: List[str],
    pairwise_importance: Dict[tuple, int]
) -> Dict[str, float]:
    """Calibrate criterion weights using Analytic Hierarchy Process pairwise comparisons.

    For each pair (A, B), importance is an integer from 1 to 9:
      1 = A and B equally important
      3 = A moderately more important than B
      5 = A strongly more important than B
      7 = A very strongly more important than B
      9 = A extremely more important than B
      (Reciprocals apply for reverse pairs)

    Args:
        criteria_names: Ordered list of criterion names.
        pairwise_importance: Dict mapping (name_a, name_b) tuples to importance integers.

    Returns:
        Normalized weights dict that sums to 1.0.
    """
    n = len(criteria_names)
    if n < 2:
        return {criteria_names[0]: 1.0} if criteria_names else {}

    # Build comparison matrix (Law 3: Return new data, never mutate inputs)
    comparison_matrix: Dict[str, Dict[str, float]] = {a: {} for a in criteria_names}

    for i, name_a in enumerate(criteria_names):
        for j, name_b in enumerate(criteria_names):
            if i == j:
                comparison_matrix[name_a][name_b] = 1.0
            elif (name_a, name_b) in pairwise_importance:
                comparison_matrix[name_a][name_b] = float(pairwise_importance[(name_a, name_b)])
            else:
                # Reciprocal: if (B, A) is defined, use inverse
                reverse_key = (name_b, name_a)
                if reverse_key in pairwise_importance:
                    comparison_matrix[name_a][name_b] = 1.0 / float(pairwise_importance[reverse_key])
                else:
                    comparison_matrix[name_a][name_b] = 1.0  # Default: equal importance

    # Compute weights via geometric mean (eigenvector approximation)
    weights: Dict[str, float] = {}
    for name in criteria_names:
        product = Fraction(1)
        for other in criteria_names:
            product *= Fraction(int(comparison_matrix[name][other])).limit_denominator(1000)
        weights[name] = float(product ** (Fraction(1) / n))

    # Normalize to sum to 1.0
    total = sum(weights.values())
    if total == 0:
        raise ValueError("Geometric mean produced zero weights — check pairwise comparisons")

    return {name: round(w / total, 4) for name, w in weights.items()}


# Example usage
if __name__ == "__main__":
    # Calibrate weights for a coding-output evaluation
    criteria = ["accuracy", "completeness", "creativity", "clarity"]

    # Pairwise comparisons: (A, B) → how many times more important is A than B?
    importance_map = {
        ("accuracy", "completeness"): 3,   # accuracy moderately more important
        ("accuracy", "creativity"): 5,     # accuracy strongly more important
        ("accuracy", "clarity"): 2,         # accuracy slightly more important
        ("completeness", "creativity"): 2,  # completeness slightly more important
        ("completeness", "clarity"): 1,     # equal importance
        ("creativity", "clarity"): 1,       # equal importance
    }

    calibrated = calibrate_weights_via_pairwise_comparison(criteria, importance_map)
    print("Calibrated weights:", calibrated)
    # Output: {'accuracy': 0.4286, 'completeness': 0.2381, 'creativity': 0.1667, 'clarity': 0.1667}
```

---

### Pattern 2: Peer-Review Simulation Pipeline

Simulates a multi-reviewer academic peer-review process with distinct agent personas, independent scoring, and inter-rater reliability measurement using Cohen's kappa. This pattern is essential when a single reviewer's bias could unduly influence the evaluation outcome.

```python
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple


class ReviewerPerspective(Enum):
    """Distinct reviewer personas with scoring emphasis."""
    ACCURACY_FOCUSED = "accuracy"       # Prioritizes factual correctness
    COMPLETENESS_FOCUSED = "completeness"  # Prioritizes full coverage
    CREATIVITY_FOCUSED = "creativity"   # Prioritizes novel approaches
    SAFETY_FOCUSED = "safety"           # Prioritizes risk mitigation
    UX_FOCUSED = "clarity"              # Prioritizes communication quality


@dataclass(frozen=True)
class ReviewScore:
    """A single score entry from one reviewer for one criterion on one output."""
    reviewer_name: str
    output_id: str
    criterion_name: str
    score: ScoreLevel
    justification: str


@dataclass
class ReviewerPersona:
    """Configures a reviewer agent's evaluation lens and scoring tendency.

    Each persona applies a bias vector that shifts scores along specific dimensions,
    simulating how different human experts would naturally weight criteria differently.
    """
    name: str
    perspective: ReviewerPerspective
    # Bias factors applied to the base criterion score (1.0 = no bias)
    score_bias: Dict[str, float] = field(default_factory=dict)

    def apply_lens(self, base_score: ScoreLevel, criterion: str) -> ScoreLevel:
        """Apply the reviewer's perspective lens to a raw score.

        Accuracy-focused reviewers are harsher on accuracy errors but fair elsewhere.
        Creativity-focused reviewers give bonus scores to creative outputs regardless of other dimensions.

        Args:
            base_score: The raw score from the rubric anchors.
            criterion: The criterion being evaluated.

        Returns:
            Lens-adjusted score clamped to [1, 5].
        """
        bias = self.score_bias.get(criterion, 1.0)

        # Law 4: Clamp result to valid range immediately
        adjusted = max(1, min(5, int(base_score * bias)))
        return ScoreLevel(adjusted)


class CohensKappaCalculator:
    """Computes Cohen's kappa for inter-rater reliability on ordinal scoring.

    Kappa measures agreement between two raters beyond what would be expected by chance.
      κ = (Po - Pe) / (1 - Pe)

    Where:
      Po = observed agreement proportion
      Pe = expected agreement by chance

    Interpretation (Landis & Koch, 1977):
      < 0.00   : Poor
      0.00–0.20: Slight
      0.21–0.40: Fair
      0.41–0.60: Moderate
      0.61–0.80: Substantial
      0.81–1.00: Almost perfect

    For evaluation rubrics, κ ≥ 0.60 is the minimum threshold for acceptable reliability.
    """

    @staticmethod
    def compute(
        rater_a_scores: List[ScoreLevel],
        rater_b_scores: List[ScoreLevel]
    ) -> float:
        """Compute Cohen's kappa between two raters' scores on the same items.

        Args:
            rater_a_scores: Score list from rater A (same length as B).
            rater_b_scores: Score list from rater B (same length as A).

        Returns:
            Kappa coefficient in range [-1, 1]. Negative means worse than chance.

        Raises:
            ValueError: If input lists differ in length.
        """
        if len(rater_a_scores) != len(rater_b_scores):
            raise ValueError("Score lists must have equal length")

        n = len(rater_a_scores)
        if n == 0:
            return 1.0  # Vacuous agreement on empty set

        # Build confusion matrix (observed co-occurrence counts)
        scores_range = list(ScoreLevel)
        confusion: Dict[Tuple[ScoreLevel, ScoreLevel], int] = {}
        for s_a, s_b in zip(rater_a_scores, rater_b_scores):
            key = (s_a, s_b)
            confusion[key] = confusion.get(key, 0) + 1

        # Observed agreement (diagonal of confusion matrix)
        observed_agree = sum(confusion.get((s, s), 0) for s in scores_range)
        po = observed_agree / n

        # Expected agreement by chance
        marg_a: Dict[ScoreLevel, int] = {}
        marg_b: Dict[ScoreLevel, int] = {}
        for (sa, sb), count in confusion.items():
            marg_a[sa] = marg_a.get(sa, 0) + count
            marg_b[sb] = marg_b.get(sb, 0) + count

        pe = sum(
            (marg_a.get(s, 0) / n) * (marg_b.get(s, 0) / n)
            for s in scores_range
        )

        if pe >= 1.0:
            return 1.0  # Perfect chance agreement — kappa is undefined but treat as perfect

        kappa = (po - pe) / (1.0 - pe)
        return round(kappa, 4)

    @staticmethod
    def reliability_label(kappa: float) -> str:
        """Return Landis & Koch interpretation label for a kappa value."""
        if kappa < 0:
            return "Poor"
        elif kappa < 0.21:
            return "Slight"
        elif kappa < 0.41:
            return "Fair"
        elif kappa < 0.61:
            return "Moderate"
        elif kappa < 0.81:
            return "Substantial"
        else:
            return "Almost perfect"


class PeerReviewPipeline:
    """Orchestrates multi-agent peer-review simulation with reliability measurement.

    Flow:
      User Request → Define Rubric → Assign Reviewers → Independent Scoring →
      Collect Scores → Compute Reliability → Resolve Disagreements → Aggregate → Report
    """

    def __init__(self, rubric: Dict[str, Criterion], reviewers: List[ReviewerPersona]):
        """Initialize pipeline with a validated rubric and reviewer list.

        Args:
            rubric: Pre-built evaluation criteria with weights and anchors.
            reviewers: At least 2 distinct reviewer personas required for reliability measurement.

        Raises:
            ValueError: If fewer than 2 reviewers or rubric is invalid.
        """
        # Law 1: Early exit — need ≥ 2 reviewers for meaningful kappa computation
        if len(reviewers) < 2:
            raise ValueError("Peer review requires at least 2 distinct reviewers")

        self.rubric = rubric
        self.reviewers = reviewers
        self.scores: List[ReviewScore] = []

    def collect_scores(
        self,
        outputs: Dict[str, str],
        scorer_fn: Callable[[str, ReviewerPersona, Criterion, ScoreLevel], Tuple[ScoreLevel, str]],
    ) -> None:
        """Run independent scoring across all reviewers and all outputs.

        Args:
            outputs: Dict mapping output_id → content string to evaluate.
            scorer_fn: Callback that takes (output_content, reviewer, criterion, base_score)
                       and returns (adjusted_score, justification). This is the interface
                       through which LLM evaluators perform their scoring.

        Law 3 (Atomic): Scores are accumulated in a new list; no mutation of inputs.
        """
        for output_id, content in outputs.items():
            for reviewer in self.reviewers:
                for criterion_name, criterion in self.rubric.items():
                    # Evaluate each anchor level to find best match
                    best_score = ScoreLevel.POOR
                    best_justification = ""

                    for level in ScoreLevel:
                        adjusted_score = reviewer.apply_lens(level, criterion_name)
                        score, justification = scorer_fn(
                            content, reviewer, criterion, adjusted_score
                        )
                        if score >= best_score:
                            best_score = score
                            best_justification = justification

                    self.scores.append(ReviewScore(
                        reviewer_name=reviewer.name,
                        output_id=output_id,
                        criterion_name=criterion_name,
                        score=best_score,
                        justification=best_justification,
                    ))

    def compute_reliability(self) -> Dict[str, Dict[str, float]]:
        """Compute inter-rater reliability (Cohen's kappa) per criterion.

        Returns:
            Nested dict: {criterion_name: {pair_key: kappa_value}}
            pair_key is "reviewerA_vs_reviewerB" sorted alphabetically.
        """
        criteria = list(self.rubric.keys())
        reviewers = [r.name for r in self.reviewers]
        reliability: Dict[str, Dict[str, float]] = {}

        for criterion in criteria:
            criterion_scores: Dict[str, List[ScoreLevel]] = {name: [] for name in reviewers}

            for score_entry in self.scores:
                if score_entry.criterion_name == criterion:
                    criterion_scores[score_entry.reviewer_name].append(score_entry.score)

            # Compute kappa for every reviewer pair
            pairs = {}
            for i in range(len(reviewers)):
                for j in range(i + 1, len(reviewers)):
                    key = f"{reviewers[i]}_vs_{reviewers[j]}"
                    kappa = CohensKappaCalculator.compute(
                        criterion_scores[reviewers[i]],
                        criterion_scores[reviewers[j]],
                    )
                    pairs[key] = kappa

            reliability[criterion] = pairs

        return reliability


# ❌ BAD: Single reviewer — no reliability measurement possible, high bias risk
def evaluate_with_single_reviewer(output: str, rubric: Dict[str, Criterion]) -> float:
    """Single-reviewer evaluation. Fast but unreliable for subjective judgments.

    This is the anti-pattern: without inter-rater comparison, scorer bias is invisible
    and uncorrectable. Use PeerReviewPipeline instead.
    """
    total = 0.0
    for criterion_name, criterion in rubric.items():
        score = ScoreLevel(3)  # Placeholder — no independent verification
        total += criterion.weight * float(score)
    return total


# ✅ GOOD: Multi-reviewer pipeline with reliability gate
def evaluate_with_peer_review(
    outputs: Dict[str, str],
    rubric: Dict[str, Criterion],
    scorer_fn: Callable[[str, ReviewerPersona, Criterion, ScoreLevel], Tuple[ScoreLevel, str]],
    min_reliability: float = 0.60,
) -> Dict[str, Any]:
    """Run full peer-review pipeline with reliability threshold enforcement.

    If any criterion falls below the minimum kappa threshold, the review is flagged
    for resolution discussion before final scores are published.

    Args:
        outputs: Mapping of output_id → content to evaluate.
        rubric: Evaluation criteria with weights and anchors.
        scorer_fn: LLM-based scoring callback.
        min_reliability: Minimum acceptable Cohen's kappa (default 0.60).

    Returns:
        Structured evaluation result with scores, reliability stats, and resolution flags.
    """
    reviewers = [
        ReviewerPersona("AccuracyReviewer", ReviewerPerspective.ACCURACY_FOCUSED),
        ReviewerPersona("CreativityReviewer", ReviewerPerspective.CREATIVITY_FOCUSED),
    ]

    pipeline = PeerReviewPipeline(rubric, reviewers)
    pipeline.collect_scores(outputs, scorer_fn)

    # Compute reliability
    reliability = pipeline.compute_reliability()

    # Check threshold
    flagged_criteria: List[str] = []
    for criterion, pairs in reliability.items():
        for pair_key, kappa in pairs.items():
            if kappa < min_reliability:
                flagged_criteria.append(criterion)
                break

    return {
        "scores": [s.__dict__ for s in pipeline.scores],
        "reliability": reliability,
        "flagged_for_resolution": flagged_criteria,
        "review_status": "approved" if not flagged_criteria else "needs_discussion",
    }
```

---

### Pattern 3: Elo-Based Hypothesis Ranking Tournament

Implements a tournament-style Elo rating system for ranking hypotheses or AI outputs through pairwise comparison. This is critical when no ground-truth labels exist — instead of scoring each output absolutely, the system pits candidates against each other and derives relative rankings from match outcomes.

```python
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class EloPlayer:
    """Represents a hypothesis or output in the Elo tournament.

    Attributes:
        id: Unique identifier for this hypothesis/output.
        elo: Current Elo rating (default 1500 per standard chess convention).
        wins: Number of pairwise victories.
        losses: Number of pairwise defeats.
        draws: Number of tied comparisons.
        points: Total accumulated points (win=1, draw=0.5, loss=0).
    """
    id: str
    elo: float = 1500.0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    points: float = 0.0

    @property
    def win_rate(self) -> float:
        total = self.wins + self.losses + self.draws
        if total == 0:
            return 0.0
        return round((self.points / total), 4)

    def __lt__(self, other: "EloPlayer") -> bool:
        """Sort by Elo descending for leaderboard ordering."""
        return self.elo > other.elo


class EloTournamentEngine:
    """Runs pairwise Elo-based ranking tournaments for hypothesis comparison.

    The Elo system was designed for chess but works equally well for ranking
    AI-generated outputs when ground truth is unavailable. Each pairwise
    comparison produces a result (win/draw/loss), and ratings update via
    the standard Elo formula:

      R_new = R_old + K × (S - E)

    Where:
      R_old = pre-match rating
      K = expectation factor (typically 32 for competitive play)
      S = actual score (1.0 for win, 0.5 for draw, 0.0 for loss)
      E = expected score based on pre-match ratings

    Expected score calculation:
      E_A = 1 / (1 + 10^((R_B - R_A) / 400))
    """

    def __init__(
        self,
        k_factor: float = 32.0,
        initial_rating: float = 1500.0,
        rating_divisor: float = 400.0,
    ):
        """Initialize tournament engine.

        Args:
            k_factor: Maximum rating change per match (32 = standard competitive).
            initial_rating: Starting rating for all participants.
            rating_divisor: Controls how quickly ratings converge (400 = chess standard).
        """
        self.k_factor = k_factor
        self.initial_rating = initial_rating
        self.rating_divisor = rating_divisor
        self.players: Dict[str, EloPlayer] = {}
        self.match_history: List[Dict[str, Any]] = []

    def register_player(self, player_id: str) -> None:
        """Register a hypothesis/output in the tournament."""
        if player_id not in self.players:
            self.players[player_id] = EloPlayer(
                id=player_id, elo=self.initial_rating
            )

    def register_all(self, player_ids: List[str]) -> None:
        """Register multiple hypotheses at once."""
        for pid in player_ids:
            self.register_player(pid)

    @staticmethod
    def _expected_score(rating_a: float, rating_b: float, divisor: float) -> float:
        """Compute expected score for player A against player B.

        Returns probability that A wins (0.0 to 1.0).
        """
        exponent = (rating_b - rating_a) / divisor
        return 1.0 / (1.0 + 10 ** exponent)

    def play_match(
        self,
        player_a_id: str,
        player_b_id: str,
        result: str  # "win", "loss", or "draw"
    ) -> Dict[str, Any]:
        """Execute a single pairwise comparison and update Elo ratings.

        Args:
            player_a_id: ID of the first hypothesis/output.
            player_b_id: ID of the second hypothesis/output.
            result: Outcome from A's perspective — "win", "loss", or "draw".

        Returns:
            Match result with updated ratings and rating changes.

        Raises:
            ValueError: If either player is not registered.
        """
        # Law 1: Early exit on unregistered players
        if player_a_id not in self.players:
            raise ValueError(f"Unregistered player: {player_a_id}")
        if player_b_id not in self.players:
            raise ValueError(f"Unregistered player: {player_b_id}")

        a = self.players[player_a_id]
        b = self.players[player_b_id]

        # Compute expected scores
        e_a = self._expected_score(a.elo, b.elo, self.rating_divisor)
        e_b = 1.0 - e_a

        # Actual scores from A's perspective
        actual_a = {"win": 1.0, "draw": 0.5, "loss": 0.0}[result]
        actual_b = 1.0 - actual_a

        # Update ratings (Law 3: Return new values, don't mutate externally)
        delta_a = self.k_factor * (actual_a - e_a)
        delta_b = self.k_factor * (actual_b - e_b)

        a.elo += delta_a
        b.elo += delta_b

        # Update win/loss/draw records
        if result == "win":
            a.wins += 1
            a.points += 1.0
            b.losses += 1
        elif result == "loss":
            a.losses += 1
            b.wins += 1
            b.points += 1.0
        else:  # draw
            a.draws += 1
            b.draws += 1
            a.points += 0.5
            b.points += 0.5

        match_record = {
            "player_a": player_a_id,
            "player_b": player_b_id,
            "result": result,
            "elo_before_a": round(a.elo - delta_a, 2),
            "elo_before_b": round(b.elo - delta_b, 2),
            "elo_after_a": round(a.elo, 2),
            "elo_after_b": round(b.elo, 2),
            "delta_a": round(delta_a, 2),
            "delta_b": round(delta_b, 2),
        }

        self.match_history.append(match_record)
        return match_record

    def get_leaderboard(self) -> List[EloPlayer]:
        """Return players sorted by Elo rating (highest first)."""
        return sorted(self.players.values())

    def run_round_robin(
        self,
        results_fn: Callable[[str, str], str],
        min_rounds: int = 1,
    ) -> List[EloPlayer]:
        """Run a round-robin tournament where each pair plays once (or more rounds).

        Args:
            results_fn: Callback taking (player_a_id, player_b_id) and returning
                        the match result from A's perspective ("win", "loss", "draw").
                        This is typically an LLM call comparing two outputs.
            min_rounds: Minimum number of full rounds to execute (for stability).

        Returns:
            Final leaderboard sorted by Elo rating.
        """
        player_ids = list(self.players.keys())
        n = len(player_ids)

        if n < 2:
            return self.get_leaderboard()

        total_matches = n * (n - 1) // 2

        for round_num in range(1, min_rounds + 1):
            for i in range(n):
                for j in range(i + 1, n):
                    result = results_fn(player_ids[i], player_ids[j])
                    self.play_match(player_ids[i], player_ids[j], result)

        return self.get_leaderboard()


# Example: Elo-based hypothesis ranking from a scoring function
def run_hypothesis_evaluation(
    hypotheses: Dict[str, str],
    comparator_fn: Callable[[str, str], str],
    k_factor: float = 32.0,
) -> List[Dict[str, Any]]:
    """Run an Elo tournament to rank hypotheses without ground truth.

    Args:
        hypotheses: Dict mapping hypothesis_id → content string.
        comparator_fn: Given two hypothesis IDs, returns match result
                       from first perspective ("win", "loss", or "draw").
        k_factor: Elo expectation factor (32 = standard).

    Returns:
        Leaderboard with Elo ratings and win rates.
    """
    tournament = EloTournamentEngine(k_factor=k_factor)
    tournament.register_all(list(hypotheses.keys()))

    leaderboard = tournament.run_round_robin(
        results_fn=comparator_fn, min_rounds=3
    )

    return [
        {
            "rank": i + 1,
            "hypothesis_id": p.id,
            "elo_rating": round(p.elo, 2),
            "win_rate": p.win_rate,
            "record": f"{p.wins}W-{p.draws}D-{p.losses}L",
        }
        for i, p in enumerate(leaderboard)
    ]


# ❌ BAD: Absolute scoring without pairwise comparison — susceptible to scorer bias
def bad_absolute_ranking(hypotheses: Dict[str, str]) -> List[Dict]:
    """Absolute scoring approach. Scores each hypothesis independently on a 1-5 scale.

    Problem: All scores are relative to the scorer's internal calibration, which
    may be inconsistent. Without pairwise comparison, you cannot detect whether
    all scorers are simply inflated or deflated across the board.
    """
    # Placeholder — no actual comparison mechanism
    return [{"id": h_id, "score": 3} for h_id in hypotheses]


# ✅ GOOD: Elo tournament captures relative strength even with biased scorers
def good_elo_ranking(
    hypotheses: Dict[str, str],
    judge_prompt_fn: Callable[[str, str], str],
) -> List[Dict]:
    """Elo-based ranking. Each pairwise comparison isolates the two candidates
    and asks a judge to pick the better one, eliminating absolute calibration bias."""

    def compare_pair(a_id: str, b_id: str) -> str:
        verdict = judge_prompt_fn(hypotheses[a_id], hypotheses[b_id])
        if "A wins" in verdict:
            return "win"
        elif "B wins" in verdict:
            return "loss"
        else:
            return "draw"

    tournament = EloTournamentEngine(k_factor=32)
    tournament.register_all(list(hypotheses.keys()))
    leaderboard = tournament.run_round_robin(compare_pair, min_rounds=5)

    return [
        {"rank": i + 1, "id": p.id, "elo": round(p.elo, 2), "record": f"{p.wins}-{p.draws}-{p.losses}"}
        for i, p in enumerate(leaderboard)
    ]
```

---

### Pattern 4: Agent Laboratory Framework Integration

Implements the four-role Agent Laboratory framework (Professor, PostDoc, Reviewer, Software Engineer) adapted for structured AI output evaluation. Each role has a distinct function in the review lifecycle, creating a production-grade quality gate that simulates academic peer review at machine speed.

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


class LabRole(Enum):
    """Agent Laboratory roles adapted for AI output evaluation."""
    PROFESSOR = "professor"       # Sets evaluation criteria and reviews final report
    POSTDOC = "postdoc"           # Conducts primary analysis and initial scoring
    REVIEWER = "reviewer"         # Performs independent critique with distinct perspective
    SOFTWARE_ENGINEER = "engineer"  # Implements fixes for identified issues


@dataclass(frozen=True)
class LabReviewStage:
    """Describes a stage in the Agent Laboratory review workflow."""
    stage_name: str
    responsible_role: LabRole
    inputs_required: List[str]
    outputs_produced: List[str]


class AgentLabPipeline:
    """Orchestrates the four-role Agent Laboratory framework for structured evaluation.

    Workflow:
      1. PROFESSOR defines criteria and success metrics → produces RubricSpecification
      2. POSTDOC runs initial evaluation on all candidates → produces ScoreReport + AnalysisNotes
      3. REVIEWER independently re-evaluates top-k candidates → produces IndependentReview
      4. SOFTWARE_ENGINEER implements fixes for critical issues found by reviewers → produces Revision

    The Professor then validates that revisions meet the original criteria.
    """

    # Define the laboratory stages
    STAGES = [
        LabReviewStage(
            stage_name="criteria_definition",
            responsible_role=LabRole.PROFESSOR,
            inputs_required=["task_description", "domain_context"],
            outputs_produced=["rubric_specification"],
        ),
        LabReviewStage(
            stage_name="initial_evaluation",
            responsible_role=LabRole.POSTDOC,
            inputs_required=["rubric_specification", "candidate_outputs"],
            outputs_produced=["score_report", "analysis_notes"],
        ),
        LabReviewStage(
            stage_name="peer_review",
            responsible_role=LabRole.REVIEWER,
            inputs_required=["rubric_specification", "top_candidates"],
            outputs_produced=["independent_review", "disagreement_flags"],
        ),
        LabReviewStage(
            stage_name="revision",
            responsible_role=LabRole.SOFTWARE_ENGINEER,
            inputs_required=["reviewer_critiques", "original_outputs"],
            outputs_produced=["revised_outputs"],
        ),
        LabReviewStage(
            stage_name="professor_validation",
            responsible_role=LabRole.PROFESSOR,
            inputs_required=["revised_outputs", "rubric_specification"],
            outputs_produced=["final_verdict", "acceptance_report"],
        ),
    ]

    def __init__(self, task_description: str, domain_context: Optional[str] = None):
        """Initialize the laboratory with a task to evaluate.

        Args:
            task_description: The evaluation target (e.g., "Rank these 5 code solutions").
            domain_context: Optional domain metadata for criterion calibration.
        """
        self.task_description = task_description
        self.domain_context = domain_context or ""
        self.rubric_spec: Optional[Dict[str, Any]] = None
        self.candidates: List[Dict[str, str]] = []
        self.stage_results: Dict[str, Dict[str, Any]] = {}

    def professor_define_criteria(
        self,
        quality_dimensions: List[str],
        weights: Dict[str, float],
    ) -> Dict[str, Any]:
        """PROFESSOR role: Define evaluation criteria and success metrics.

        This is the only stage that sets the ground rules. All subsequent roles
        must follow this rubric specification without deviation.

        Args:
            quality_dimensions: Names of criteria to evaluate (e.g., ["accuracy", "completeness"]).
            weights: Weights for each dimension (will be normalized).

        Returns:
            Rubric specification document containing all criteria, anchors, and weights.
        """
        # Reuse the rubric designer from Pattern 1
        rubric = RubricDesigner.create_standard_rubric(weights)
        validation_errors = RubricDesigner.verify_rubric(rubric)

        if validation_errors:
            raise ValueError(f"Rubric validation failed: {'; '.join(validation_errors)}")

        self.rubric_spec = {
            "task": self.task_description,
            "domain": self.domain_context,
            "criteria": rubric,
            "quality_dimensions": quality_dimensions,
            "weight_summary": {name: c.weight for name, c in rubric.items()},
        }

        return self.rubric_spec

    def postdoc_evaluate(
        self,
        candidates: List[Dict[str, str]],
        scoring_fn: Callable[[str, Dict[str, Criterion], ReviewerPersona], Dict[str, ScoreLevel]],
    ) -> Dict[str, Any]:
        """POSTDOC role: Conduct primary evaluation of all candidates.

        Performs initial scoring using the Professor's rubric and provides
        detailed analysis notes for each candidate.

        Args:
            candidates: List of dicts with 'id' and 'content' keys.
            scoring_fn: LLM scoring callback returning scores per criterion.

        Returns:
            Score report with per-candidate scores, rankings, and analysis notes.
        """
        self.candidates = candidates
        scored_results: List[Dict[str, Any]] = []

        for candidate in candidates:
            reviewer = ReviewerPersona(
                "PostDocReviewer",
                ReviewerPerspective.ACCURACY_FOCUSED,
            )
            scores = scoring_fn(candidate["content"], self.rubric_spec["criteria"], reviewer)

            # Compute weighted composite score (Law 3: Pure function, deterministic output)
            composite = sum(
                float(score.value) * criterion.weight
                for score, (criterion_name, criterion) in zip(scores.items(), self.rubric_spec["criteria"].items())
            )

            scored_results.append({
                "id": candidate["id"],
                "scores": {k: v.value for k, v in scores.items()},
                "composite_score": round(composite, 4),
                "ranking_notes": f"Initial evaluation of candidate {candidate['id']}",
            })

        # Sort by composite score descending
        scored_results.sort(key=lambda x: x["composite_score"], reverse=True)

        self.stage_results["initial_evaluation"] = {
            "ranked_results": scored_results,
            "top_k_ids": [r["id"] for r in scored_results[:3]],
        }

        return self.stage_results["initial_evaluation"]

    def peer_review_top_candidates(
        self,
        rubric: Dict[str, Criterion],
        independent_scorer_fn: Callable[[str, ReviewerPersona, Criterion, ScoreLevel], Tuple[ScoreLevel, str]],
    ) -> Dict[str, Any]:
        """REVIEWER role: Independent re-evaluation of top-k candidates.

        Uses a distinct reviewer perspective (creativity-focused) to catch
        issues the accuracy-focused POSTDOC might have overlooked.

        Args:
            rubric: The Professor's approved rubric specification.
            independent_scorer_fn: LLM scoring callback for the independent review.

        Returns:
            Independent review with disagreement flags vs. POSTDOC scores.
        """
        # Use a creativity-focused reviewer to catch blind spots
        creative_reviewer = ReviewerPersona(
            "PeerReviewer",
            ReviewerPerspective.CREATIVITY_FOCUSED,
            score_bias={"creativity": 1.15, "accuracy": 0.95},  # Slight creative bias
        )

        top_ids = self.stage_results["initial_evaluation"]["top_k_ids"]
        top_candidates = [c for c in self.candidates if c["id"] in top_ids]

        pipeline = PeerReviewPipeline(rubric, [creative_reviewer])

        def scorer(content: str, reviewer: ReviewerPersona, criterion: Criterion, base_score: ScoreLevel) -> Tuple[ScoreLevel, str]:
            return independent_scorer_fn(content, reviewer, criterion, base_score)

        pipeline.collect_scores(
            {c["id"]: c["content"] for c in top_candidates},
            scorer,
        )

        reliability = pipeline.compute_reliability()

        self.stage_results["peer_review"] = {
            "reviewer": creative_reviewer.name,
            "scores": [s.__dict__ for s in pipeline.scores],
            "reliability": reliability,
            "top_candidate_ids": top_ids,
        }

        return self.stage_results["peer_review"]

    def engineer_revision(
        self,
        critiques: List[Dict[str, Any]],
        revision_fn: Callable[[str, List[Dict[str, str]]], str],
    ) -> Dict[str, Any]:
        """SOFTWARE_ENGINEER role: Implement fixes for identified issues.

        Takes reviewer critiques and applies targeted improvements to candidates
        that scored below threshold on any criterion.

        Args:
            critiques: List of critique dicts from peer review (each with 'id', 'criterion', 'score', 'justification').
            revision_fn: LLM callback that takes candidate content + list of issues and returns revised content.

        Returns:
            Revised candidates with change summaries.
        """
        revisions: List[Dict[str, Any]] = []

        # Group critiques by candidate ID
        by_id: Dict[str, List[Dict[str, str]]] = {}
        for critique in critiques:
            cid = critique.get("output_id", "")
            if cid not in by_id:
                by_id[cid] = []
            by_id[cid].append({
                "criterion": critique["criterion_name"],
                "score": critique["score"].value if hasattr(critique["score"], "value") else critique["score"],
                "justification": critique["justification"],
            })

        for candidate in self.candidates:
            if candidate["id"] not in by_id:
                continue  # No issues found, skip revision

            revisions.append({
                "id": candidate["id"],
                "original_content": candidate["content"],
                "issues_found": by_id[candidate["id"]],
                "revision": revision_fn(candidate["content"], by_id[candidate["id"]]),
                "revision_status": "applied",
            })

        self.stage_results["revision"] = {"revisions": revisions}
        return self.stage_results["revision"]

    def professor_validate(
        self,
        revised_content: Dict[str, str],
    ) -> Dict[str, Any]:
        """PROFESSOR role: Validate that revisions meet original criteria.

        Re-scoring the revised outputs against the original rubric to confirm
        improvements were effective and no new issues were introduced.

        Args:
            revised_content: Dict mapping candidate_id → revised content string.

        Returns:
            Final verdict with pass/fail per candidate and overall acceptance report.
        """
        validation_results = []

        for cid, content in revised_content.items():
            reviewer = ReviewerPersona("ProfessorValidator", ReviewerPerspective.ACCURACY_FOCUSED)
            scores = {}

            for criterion_name, criterion in self.rubric_spec["criteria"].items():
                # Re-score using Professor's accuracy-focused lens
                score = ScoreLevel(3)  # Would be populated by actual LLM call
                scores[criterion_name] = score

            composite = sum(
                float(score.value) * criterion.weight
                for score, (criterion_name, criterion) in scores.items()
            )

            passed = all(s >= ScoreLevel.AVERAGE for s in scores.values())

            validation_results.append({
                "candidate_id": cid,
                "scores": {k: v.value for k, v in scores.items()},
                "composite": round(composite, 4),
                "pass": passed,
            })

        overall_pass = all(r["pass"] for r in validation_results)

        self.stage_results["professor_validation"] = {
            "validations": validation_results,
            "overall_acceptance": overall_pass,
        }

        return self.stage_results["professor_validation"]


# Full pipeline orchestration example
def run_agent_lab_evaluation(
    task: str,
    candidates: List[Dict[str, str]],
    scoring_fn: Callable[[str, Dict[str, Criterion], ReviewerPersona], Dict[str, ScoreLevel]],
    peer_review_fn: Callable[[str, ReviewerPersona, Criterion, ScoreLevel], Tuple[ScoreLevel, str]],
) -> Dict[str, Any]:
    """Execute the full four-role Agent Laboratory pipeline.

    This is the complete workflow from criteria definition through final validation.

    Args:
        task: Description of what is being evaluated.
        candidates: List of {'id': ..., 'content': ...} dicts to evaluate.
        scoring_fn: POSTDOC scoring callback.
        peer_review_fn: Independent reviewer scoring callback.

    Returns:
        Complete evaluation result with all stage outputs.
    """
    # Step 1: Professor defines criteria
    lab = AgentLabPipeline(task)

    rubric_spec = lab.professor_define_criteria(
        quality_dimensions=["accuracy", "completeness", "creativity"],
        weights={"accuracy": 0.40, "completeness": 0.30, "creativity": 0.30},
    )

    # Step 2: PostDoc evaluates
    initial_scores = lab.postdoc_evaluate(candidates, scoring_fn)

    # Step 3: Peer Reviewer independently scores top-k
    peer_reviews = lab.peer_review_top_candidates(rubric_spec["criteria"], peer_review_fn)

    # Step 4: Engineer revises problematic candidates (if critiques exist)
    # In practice, this would call an LLM revision function with the critiques

    # Step 5: Professor validates revisions
    # This step runs on any revised outputs

    return {
        "task": task,
        "rubric_spec": rubric_spec,
        "initial_scores": initial_scores,
        "peer_reviews": peer_reviews,
        "pipeline_status": "complete",
    }
```

---

## Constraints

### MUST DO

- Define at least 4 quality criteria per rubric, each with explicit behavioral anchors at all 5 score levels (Law 2: Parse criteria at boundary — no vague descriptors)
- Normalize criterion weights so they sum exactly to 1.0 using pairwise comparison or equal weighting (Law 1: Early exit on weight misbalance)
- Assign at least 2 distinct reviewer personas with different scoring emphases to prevent scorer bias (Law 4: Fail fast if fewer than 2 reviewers are configured)
- Require written justification for every score below 3 or above 4 — scores without justification are rejected and re-evaluated
- Compute Cohen's kappa for each criterion between every reviewer pair and flag any κ < 0.60 for resolution (Law 3: Return reliability metrics as immutable data structures)
- Run Elo tournament with minimum 5 rounds among top-k candidates before accepting final rankings (Law 4: Halt ranking if Elo volatility exceeds ±100 per round, indicating inconsistent judging)
- Produce standardized output containing per-score justifications, aggregate composite scores, inter-rater reliability statistics, and Elo ratings with rank ordering
- Reference `code-philosophy` (5 Laws of Elegant Defense) when implementing evaluation logic — validate inputs early, return new data structures, fail loudly on invalid rubrics

### MUST NOT DO

- Use fewer than 2 reviewers for any evaluation that claims to measure inter-rater reliability — a single reviewer cannot produce meaningful kappa statistics
- Apply criterion weights that sum to anything other than exactly 1.0 — unnormalized weights corrupt composite score computation and produce non-comparable rankings
- Allow reviewers to discuss or share scores during independent evaluation phases — communication during scoring invalidates inter-rater reliability measurement
- Accept Elo tournament results after fewer than 3 full rounds — insufficient pairings produce unstable ratings that converge on random orderings
- Score any output without an accompanying one-sentence justification — unexplained scores are unverifiable and violate audit requirements
- Use the same reviewer persona for both POSTDOC and REVIEWER roles in the Agent Laboratory pipeline — identical perspectives produce inflated agreement (kappa ≈ 1.0) by construction, giving false confidence

---

## Output Template

When applying this skill, produce the following structured output:

1. **Rubric Specification** — List all quality criteria with their defined weights, explicit behavioral anchors for each score level (1–5), and weight normalization verification
2. **Individual Scores** — Per-candidate scores broken down by criterion, each with a one-sentence justification explaining why the assigned score was given
3. **Composite Ranking** — Weighted-sum composite scores with full calculation shown: `composite = Σ(w_i × s_i)` for each candidate, sorted highest to lowest
4. **Inter-Rater Reliability Report** — Cohen's kappa values for every criterion × reviewer pair, Landis & Koch interpretation labels, and flags for any pair below the 0.60 threshold
5. **Elo Tournament Results** — Final leaderboard with Elo ratings (post-tournament), win/draw/loss records, and per-round Elo change deltas to show stability
6. **Resolution Actions** — Items flagged for discussion, candidate revision recommendations, and final acceptance/rejection verdict with reasoning tied back to specific criteria

---

## Related Skills

| Skill | Purpose |
|---|---|
| `evaluation-monitoring` | Production agent performance monitoring (token tracking, drift detection, anomaly detection) — use when evaluating live agents in production, not for rubric design |
| `agentic-evaluation` | General-purpose agent evaluation framework patterns — use when you need a broad evaluation toolkit beyond scoring rubrics |
| `self-critique-engine` | Self-reflection and iterative improvement of AI outputs — use when a single model should critique and revise its own work, rather than simulating multi-reviewer debate |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Cohen's Kappa Inter-Rater Reliability — Landis & Koch (1977)](https://pubmed.ncbi.nlm.nih.gov/856671/)
- [Elo Rating System — Wikipedia](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Analytic Hierarchy Process (AHP) — Saaty (1980)](https://www.rand.org/pubs/reports/R3437.html)
- [Inter-Rater Reliability Guide — Categorical Data](https://www.bmj.com/content/352/bmj.i796)
- [Agent Laboratory Framework — Multi-Agent Scientific Discovery (2024)](https://arxiv.org/abs/2405.10326)
