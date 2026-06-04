---




name: knowledge-transfer-methods
description: Implements structured knowledge transfer workflows using Feynman technique, spaced repetition scheduling, active recall exercises, and teach-back protocols to achieve deep framework mastery and team-wide competency.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: knowledge transfer, teach back, Feynman technique, spaced repetition, active recall, how do i retain what I learned, team knowledge sharing, learning methodology
  archetypes:
    - educational
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-application-methodology, extensible-framework-design




---





# Knowledge Transfer Methods

Makes the model implement structured knowledge transfer workflows that convert superficial familiarity into deep framework mastery. When loaded, this skill enforces evidence-based learning techniques — Feynman explanation drafting, spaced repetition scheduling using the SM-2 algorithm, active recall quiz generation, and peer validation through structured teach-back sessions — to ensure engineering teams retain and correctly apply newly learned frameworks.

## TL;DR Checklist

- [ ] Draft a Feynman explanation of the framework in plain language, avoiding jargon
- [ ] Compare the explanation against official documentation to identify knowledge gaps
- [ ] Re-learn each identified gap using primary sources (source code, official docs)
- [ ] Generate active recall quizzes with progressive difficulty for self-testing
- [ ] Schedule spaced repetition reviews using SM-2 intervals (1d, 3d, 7d, 21d, 60d)
- [ ] Conduct a peer teach-back session where another engineer audits the explanation

---

## When to Use

Use this skill when:

- A team member has learned a new framework and needs to transfer that knowledge to colleagues through structured teaching
- Onboarding engineers onto a newly adopted framework — replace documentation reading with active Feynman-style learning
- Preparing for a framework migration where multiple engineers must reach proficiency within a fixed timeline
- Verifying that a senior engineer's understanding of a framework is deep enough to mentor others
- Building institutional knowledge so framework expertise survives team turnover

---

## When NOT to Use

Avoid this skill for:

- **One-time learning with no transfer requirement** — If only one person needs the framework and won't teach others, self-study suffices
- **Trivial APIs** — A simple utility library with 3 functions doesn't need a structured knowledge transfer protocol
- **Emergency triage situations** — Debugging a production outage requires direct source code inspection, not pedagogical methods

---

## Core Workflow

### 1. Feynman Explanation Drafting — Write in Plain Language Without Jargon

The learner produces a written explanation of the framework as if teaching it to a competent developer who has never seen it. Every technical term must be defined inline. No hand-waving, no "as you know" references. The goal is clarity that survives translation to someone unfamiliar with the domain.

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JargonTerm:
    """Represents a technical term that requires inline definition in Feynman explanations.

    Attributes:
        term: The technical term as it appears in the explanation.
        required_definition: Expected minimum length for the inline definition (in characters).
        domain: The domain this term belongs to, used for disambiguation.
    """
    term: str
    required_definition_length: int = 30
    domain: str = "general"


class FeynmanExplanationDraft:
    """Manages the creation and refinement of a Feynman-style framework explanation.

    Tracks jargon usage, structure completeness, and provides structured
    feedback for improving clarity and depth.

    Attributes:
        topic: The framework or concept being explained.
        content: The full text of the draft explanation.
        sections: Ordered list of section headings found in the explanation.
        jargon_terms: List of technical terms detected that need inline definitions.
    """

    COMMON_JARGON: list[JargonTerm] = [
        JargonTerm("abstraction", 30, "software design"),
        JargonTerm("dependency injection", 30, "software architecture"),
        JargonTerm("lifecycle", 30, "runtime behavior"),
        JargonTerm("middleware", 30, "request processing"),
        JargonTerm("pipeline", 30, "data transformation"),
        JargonTerm("singleton", 30, "object creation pattern"),
        JargonTerm("interface", 30, "type contract"),
        JargonTerm("concurrency", 30, "parallel execution"),
    ]

    def __init__(self, topic: str) -> None:
        self.topic = topic
        self.content: str = ""
        self.sections: list[str] = []
        self.jargon_terms: list[JargonTerm] = []

    def add_section(self, heading: str, content: str) -> None:
        """Append a named section to the explanation.

        Args:
            heading: The section title (will be included in sections list).
            content: The explanatory text for this section.
        """
        self.sections.append(heading)
        if self.content:
            self.content += "\n\n"
        self.content += f"## {heading}\n\n{content}"

    def analyze_jargon(self) -> list[JargonTerm]:
        """Scan the explanation for technical terms requiring inline definitions.

        Returns:
            List of JargonTerm objects found in the content that lack clear definitions.
        """
        self.jargon_terms = []
        text_lower = self.content.lower()

        for jargon in self.COMMON_JARGON:
            if jargon.term.lower() in text_lower:
                # Check if the term is defined nearby (within 200 characters)
                term_pos = text_lower.find(jargon.term.lower())
                context_before = self.content[max(0, term_pos - 200):term_pos].lower()
                context_after = self.content[term_pos:term_pos + 200].lower()

                # A definition is present if terms like "means", "is", "refers to" appear near it
                definition_indicators = ["means ", "is ", "refers to ", "defined as ", "describes "]
                has_definition = any(indicator in context_after for indicator in definition_indicators)

                if not has_definition:
                    self.jargon_terms.append(jargon)

        return self.jargon_terms

    def evaluate_clarity_score(self) -> dict[str, Any]:
        """Produce a clarity assessment of the explanation.

        Returns:
            Dictionary with scores and actionable feedback items.
        """
        score = 100
        issues: list[str] = []

        # Check for jargon without definitions
        jargon = self.analyze_jargon()
        if jargon:
            penalty = len(jargon) * 8
            score -= penalty
            issues.append(f"{len(jargon)} technical terms lack inline definitions")

        # Check section structure
        if len(self.sections) < 3:
            score -= 10
            issues.append("Explanation should have at least 3 sections (what, why, how)")

        # Check for concrete examples
        example_count = self.content.lower().count("example:") + self.content.lower().count("for instance")
        if example_count == 0:
            score -= 15
            issues.append("Add at least one concrete code example to ground the explanation")

        # Check length minimum
        word_count = len(self.content.split())
        if word_count < 200:
            score -= 10
            issues.append(f"Explanation is too brief ({word_count} words) — aim for 300+ words with depth")

        score = max(0, min(100, score))

        return {
            "clarity_score": score,
            "jargon_issues": jargon,
            "word_count": word_count,
            "section_count": len(self.sections),
            "example_count": example_count,
            "issues": issues,
            "recommendation": "revise" if score < 70 else ("improve" if score < 85 else "approve"),
        }

    def as_markdown(self) -> str:
        """Render the explanation as formatted Markdown."""
        if not self.sections:
            return f"# {self.topic}\n\n*(No sections defined yet)*"
        return f"# {self.topic}\n\n{self.content}"


# --- Usage Example ---

if __name__ == "__main__":
    draft = FeynmanExplanationDraft("FastAPI Framework")
    draft.add_section(
        "What is FastAPI?",
        "FastAPI is a modern web framework for building APIs in Python. "
        "It uses type hints and Pydantic for data validation."
    )
    draft.add_section(
        "How Does It Work?",
        "When you define a function with path decorators like @app.get(), "
        "FastAPI reads the type annotations to automatically generate the OpenAPI schema. "
        "Middleware can intercept requests before they reach your handler functions."
    )

    assessment = draft.evaluate_clarity_score()
    print(f"Clarity Score: {assessment['clarity_score']}/100")
    for issue in assessment['issues']:
        print(f"  - {issue}")
```

**Checkpoint:** The explanation has a clarity score of at least 75/100, all jargon terms are either defined inline or removed in favor of plain language, and the word count exceeds 200 words with at least 3 sections covering what, why, and how.

---

### 2. Gap Identification — Compare Explanation Against Official Documentation

Take the drafted explanation and systematically compare it against the framework's official documentation, source code, and API reference. Identify every concept that is missing, inaccurate, or oversimplified. Quantify gaps by severity: missing concepts are "critical," inaccuracies are "high," and missing examples are "medium."

```python
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from enum import Enum


class GapSeverity(Enum):
    CRITICAL = "critical"     # Missing core concept — explanation is wrong without this
    HIGH = "high"             # Inaccurate description — needs correction
    MEDIUM = "medium"         # Oversimplified or missing example — good to add
    LOW = "low"               # Nice-to-have detail — optional improvement


@dataclass(frozen=True)
class KnowledgeGap:
    """Represents a single knowledge gap identified between an explanation and source material.

    Attributes:
        topic: The concept or feature that is missing or inaccurate.
        severity: How important it is to address this gap.
        explanation_text: What the learner currently believes (from their draft).
        correct_description: The accurate description from official sources.
        suggested_source: Where to find authoritative information about this topic.
    """
    topic: str
    severity: GapSeverity
    explanation_text: str
    correct_description: str
    suggested_source: str


class GapDetector:
    """Identifies knowledge gaps by comparing a learner's explanation against source material.

    Uses both textual similarity analysis and structured concept extraction to find
    missing or inaccurate information. The detector categorizes gaps by severity
    so the learner can prioritize corrections.

    Attributes:
        reference_docs: List of strings representing official documentation excerpts.
        glossary: Set of framework-specific terms that must appear with correct definitions.
    """

    def __init__(self) -> None:
        self.reference_docs: list[str] = []
        self.glossary: dict[str, str] = {}

    def add_reference_document(self, content: str) -> None:
        """Add an excerpt from official framework documentation.

        Args:
            content: Text from the framework's official docs, README, or source comments.
        """
        self.reference_docs.append(content.strip())

    def add_glossary_term(self, term: str, definition: str) -> None:
        """Register a framework-specific term with its canonical definition.

        Args:
            term: The technical term as it appears in documentation.
            definition: The authoritative definition to compare against.
        """
        self.glossary[term.lower()] = definition.strip()

    def detect_gaps(
        self, explanation: str, concepts_to_check: list[str] | None = None
    ) -> list[KnowledgeGap]:
        """Identify knowledge gaps between the learner's explanation and reference material.

        Performs three checks:
        1. Missing concepts — are key framework features absent from the explanation?
        2. Inaccuracy detection — does the explanation contradict documented behavior?
        3. Glossary compliance — are technical terms used with correct definitions?

        Args:
            explanation: The learner's Feynman-style draft explanation.
            concepts_to_check: Optional list of specific concept names to verify.

        Returns:
            List of KnowledgeGap objects sorted by severity (critical first).
        """
        gaps: list[KnowledgeGap] = []
        explanation_lower = explanation.lower()

        # Check 1: Glossary term definitions
        for term, correct_def in self.glossary.items():
            if term in explanation_lower:
                # Find the context around this term in the explanation
                pattern = re.compile(re.escape(term) + r'\s+(.*?)(?:\.|\n|$)', re.IGNORECASE | re.DOTALL)
                matches = pattern.findall(explanation)
                if matches:
                    learner_def = matches[0].strip()
                    # Simple semantic comparison — check for major keyword differences
                    correct_keywords = set(correct_def.lower().split()) & {"request", "response", "route", "middleware",
                                                                          "endpoint", "handler", "validation",
                                                                          "pydantic", "async", "uvicorn", "openapi"}
                    learner_keywords = set(learner_def.lower().split()) & correct_keywords

                    if not correct_keywords.issubset(learner_keywords | {"the", "a", "an", "is", "uses", "for"}):
                        gaps.append(KnowledgeGap(
                            topic=term,
                            severity=GapSeverity.HIGH,
                            explanation_text=f"Learner defines '{term}' as: {learner_def[:100]}",
                            correct_description=correct_def[:200],
                            suggested_source="Framework official documentation"
                        ))

        # Check 2: Reference document coverage
        if concepts_to_check:
            for concept in concepts_to_check:
                concept_lower = concept.lower()
                if concept_lower not in explanation_lower:
                    # Search reference docs for this concept to build a correct description
                    relevant_doc = self._find_relevant_document(concept)
                    gaps.append(KnowledgeGap(
                        topic=concept,
                        severity=GapSeverity.CRITICAL if any(kw in concept_lower for kw in
                            ("middleware", "lifecycle", "dependency injection", "routing", "validation"))
                        else GapSeverity.MEDIUM,
                        explanation_text=f"Concept '{concept}' not mentioned in explanation",
                        correct_description=relevant_doc[:200] if relevant_doc else "Refer to official documentation",
                        suggested_source="Framework docs — search for '" + concept + "'"
                    ))

        # Check 3: Similarity-based gap detection
        gaps.sort(key=lambda g: list(GapSeverity).index(g.severity))
        return gaps

    def _find_relevant_document(self, concept: str) -> str:
        """Find the most relevant reference document for a given concept."""
        best_match = ""
        best_ratio = 0.0

        for doc in self.reference_docs:
            ratio = difflib.SequenceMatcher(None, concept.lower(), doc[:50].lower()).ratio()
            if ratio > best_ratio and ratio < 1.0:  # Exact matches are not gaps
                best_match = doc
                best_ratio = ratio

        return best_match


# --- Usage Example ---

if __name__ == "__main__":
    detector = GapDetector()
    detector.add_reference_document(
        "FastAPI uses Pydantic for data validation. Every parameter annotated with a Pydantic model "
        "is automatically validated against the schema defined by that model's fields."
    )
    detector.add_glossary_term(
        "endpoint",
        "A function decorated with @app.get() or similar decorators that handles HTTP requests"
    )
    detector.add_glossary_term(
        "middleware",
        "Functions that wrap the request-response cycle, executing code before and after each request"
    )

    learner_explanation = (
        "FastAPI is a web framework for Python. It has endpoints that handle requests. "
        "You can use middleware to process data."
    )

    concepts = ["pydantic validation", "dependency injection", "async handlers", "OpenAPI generation"]
    gaps = detector.detect_gaps(learner_explanation, concepts)

    for gap in gaps:
        print(f"[{gap.severity.value.upper()}] {gap.topic}")
        print(f"  Current: {gap.explanation_text}")
        print(f"  Should be: {gap.correct_description[:120]}...")
        print()
```

**Checkpoint:** Every identified gap has a severity classification and a specific suggested source. Critical gaps must be resolved before the learner proceeds to teach-back — they indicate fundamental misunderstandings that would mislead colleagues.

---

### 3. Targeted Re-Learning — Study Each Gap Using Primary Sources

For every critical and high-severity gap, the learner revisits the framework's primary sources: source code, official documentation, and test suites. The re-learning must produce a corrected explanation segment that addresses the specific gap, documented with citation links to the authoritative source.

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ReLearningRecord:
    """Records one instance of targeted re-learning for a knowledge gap.

    Attributes:
        gap_topic: The concept being re-learned.
        source_type: Category of primary source consulted.
        source_path: File path or URL of the source document.
        key_finding: The corrected understanding produced by this study session.
        confidence: Learner's self-assessed confidence in this correction (0.0–1.0).
    """
    gap_topic: str
    source_type: str  # "source_code", "documentation", "test_suite", "issue_tracker"
    source_path: str
    key_finding: str
    confidence: float = 0.5


class ReLearningTracker:
    """Tracks and manages the re-learning process for identified knowledge gaps.

    Each gap from the GapDetector produces a required re-learning task.
    The tracker records what was studied, where, and with what confidence level.
    Confidence below 0.7 on any critical gap requires additional study.

    Attributes:
        records: List of re-learning sessions completed so far.
        pending_gaps: Gaps that haven't been addressed yet.
    """

    def __init__(self) -> None:
        self.records: list[ReLearningRecord] = []
        self.pending_gaps: list[tuple[str, str]] = []  # (topic, severity)

    def add_pending_gap(self, topic: str, severity: str) -> None:
        """Queue a gap for re-learning.

        Args:
            topic: The concept to study.
            severity: GapSeverity string value ("critical", "high", "medium", "low").
        """
        self.pending_gaps.append((topic, severity))

    def record_session(
        self, gap_topic: str, source_type: str, source_path: str,
        key_finding: str, confidence: float = 0.5
    ) -> None:
        """Log a completed re-learning session.

        Args:
            gap_topic: Which gap this session addresses.
            source_type: What kind of primary source was consulted.
            source_path: File path or URL where the information was found.
            key_finding: The corrected understanding produced.
            confidence: Self-assessed confidence (0.0–1.0) in the correction.
        """
        self.records.append(ReLearningRecord(
            gap_topic=gap_topic,
            source_type=source_type,
            source_path=source_path,
            key_finding=key_finding,
            confidence=max(0.0, min(1.0, confidence))
        ))

    def get_unresolved_critical_gaps(self) -> list[tuple[str, str]]:
        """Return gaps that are critical/high severity and have no re-learning record with confidence >= 0.7."""
        resolved_topics = {r.gap_topic for r in self.records if r.confidence >= 0.7}
        unresolved = []

        for topic, severity in self.pending_gaps:
            if severity in ("critical", "high") and topic not in resolved_topics:
                unresolved.append((topic, severity))

        return unresolved

    def get_mastery_score(self) -> float:
        """Compute overall mastery score based on re-learning completion.

        Score = (gaps with confidence >= 0.7) / (total gaps), weighted by severity.
        Critical gaps count 3x, high 2x, medium 1x, low 0.5x.
        """
        if not self.pending_gaps:
            return 1.0

        severity_weights = {"critical": 3.0, "high": 2.0, "medium": 1.0, "low": 0.5}
        total_weight = 0.0
        resolved_weight = 0.0

        for topic, severity in self.pending_gaps:
            weight = severity_weights.get(severity, 1.0)
            total_weight += weight

            if any(r.gap_topic == topic and r.confidence >= 0.7 for r in self.records):
                resolved_weight += weight

        return resolved_weight / total_weight if total_weight > 0 else 1.0

    def generate_study_plan(self) -> str:
        """Generate a prioritized study plan based on unresolved critical gaps.

        Returns:
            Markdown-formatted study plan with sources and confidence targets.
        """
        unresolved = self.get_unresolved_critical_gaps()

        lines = ["## Re-Learning Study Plan", ""]
        for i, (topic, severity) in enumerate(unresolved, 1):
            weight = {"critical": "🔴 HIGH", "high": "🟠 MEDIUM"}.get(severity, f"{severity.upper()}")
            lines.append(f"**{i}. {topic}** [{weight}]")
            lines.append(f"   - Target confidence: ≥ 0.7")

            # Suggest sources based on gap topic keywords
            if any(kw in topic.lower() for kw in ("middleware", "lifecycle")):
                lines.append("   - Source: Framework source code (search for 'class.*Middleware')")
            elif "validation" in topic.lower():
                lines.append("   - Source: Pydantic documentation and framework test cases")
            else:
                lines.append("   - Source: Official framework documentation — search for exact concept name")

            lines.append("")

        if not unresolved:
            lines.append("All critical gaps resolved. Mastery score: {:.0%}".format(self.get_mastery_score()))

        return "\n".join(lines)


# --- Usage Example ---

if __name__ == "__main__":
    tracker = ReLearningTracker()

    # Simulate detected gaps
    tracker.add_pending_gap("Pydantic validation", "critical")
    tracker.add_pending_gap("Dependency injection", "high")
    tracker.add_pending_gap("OpenAPI schema generation", "medium")
    tracker.add_pending_gap("Async/await support", "low")

    # Record some re-learning sessions
    tracker.record_session(
        gap_topic="Pydantic validation",
        source_type="source_code",
        source_path="fastapi/dependencies/utils.py#L245",
        key_finding="FastAPI calls pydantic's model_validate() on request bodies, not just validates individual parameters.",
        confidence=0.9
    )
    tracker.record_session(
        gap_topic="Dependency injection",
        source_type="documentation",
        source_path="https://fastapi.tiangolo.com/tutorial/dependencies/",
        key_finding="FastAPI uses function parameter annotations as dependency declarations; dependencies are resolved via a DI container.",
        confidence=0.6  # Below threshold — still unresolved
    )

    unresolved = tracker.get_unresolved_critical_gaps()
    print(f"Unresolved critical/high gaps: {len(unresolved)}")
    for topic, sev in unresolved:
        print(f"  - [{sev}] {topic}")

    print(f"\nMastery Score: {tracker.get_mastery_score():.0%}")
    print("\n" + tracker.generate_study_plan())
```

**Checkpoint:** Every critical and high-severity gap has at least one re-learning record with confidence ≥ 0.7. The mastery score is above 80% before proceeding to quiz creation — below that threshold, return to Step 2 for more gap detection.

---

### 4. Active Recall Quiz Creation — Generate Progressive Difficulty Tests

Build a self-test quiz where questions progress from basic recall (define X) to application (given scenario Y, what happens?). Each question must have an answer key with the exact phrasing expected and a citation to the authoritative source. Avoid multiple choice — use short-answer format that forces genuine recall rather than recognition.

```python
from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass(frozen=True)
class QuizQuestion:
    """Represents a single active recall question in the knowledge transfer quiz.

    Attributes:
        id: Unique identifier for this question.
        text: The question as presented to the learner.
        expected_answer: The correct answer (for grading).
        difficulty: Question difficulty level (1=easiest, 3=hardest).
        topic: The framework concept being tested.
        source_citation: Where the correct answer can be verified.
        hint: A subtle hint to nudge recall without giving away the answer.
    """
    id: str
    text: str
    expected_answer: str
    difficulty: int = 1  # 1, 2, or 3
    topic: str = ""
    source_citation: str = "Official documentation"
    hint: str = ""


@dataclass(frozen=True)
class QuizResult:
    """Results from completing a quiz.

    Attributes:
        questions: List of (question_id, user_answer, is_correct) tuples.
        total_score: Number of correct answers out of total.
        topic_scores: Per-topic accuracy breakdown.
    """
    questions: list[tuple[str, str, bool]] = field(default_factory=list)

    @property
    def total_score(self) -> int:
        return sum(1 for _, _, correct in self.questions if correct)

    @property
    def topic_scores(self) -> dict[str, tuple[int, int]]:
        """Return {topic: (correct_count, total_count)} for each topic."""
        scores: dict[str, list[bool]] = {}
        for qid, _, correct in self.questions:
            # Topic is embedded in the question's expected_answer metadata via quiz builder
            pass  # Populated by QuizBuilder
        return scores


class QuizBuilder:
    """Generates active recall quizzes from knowledge transfer topics.

    Creates questions at three difficulty levels:
    Level 1 — Recall: "What does X do?" (definition-level)
    Level 2 — Application: "Given scenario Y, what is the outcome?" (scenario-based)
    Level 3 — Synthesis: "How would you combine X and Y to solve Z?" (integration-based)

    Attributes:
        topics: Framework concepts with their canonical definitions.
        questions: Generated quiz questions.
    """

    def __init__(self, framework_name: str) -> None:
        self.framework_name = framework_name
        self.topics: dict[str, dict[str, str]] = {}  # topic → {definition, example, common_mistake}
        self.questions: list[QuizQuestion] = []
        self._question_counter = 0

    def add_topic(self, name: str, definition: str, example: str, common_mistake: str = "") -> None:
        """Register a framework concept for quiz generation.

        Args:
            name: The concept name (e.g., "middleware", "dependency injection").
            definition: Canonical definition from official docs.
            example: A concrete code example demonstrating the concept.
            common_mistake: Typical misunderstanding to test against.
        """
        self.topics[name] = {
            "definition": definition,
            "example": example,
            "common_mistake": common_mistake,
        }

    def build_quiz(self, target_questions: int = 12) -> list[QuizQuestion]:
        """Generate a balanced quiz across difficulty levels and topics.

        Distributes questions as: 40% level-1 (recall), 35% level-2 (application), 25% level-3 (synthesis).

        Args:
            target_questions: Total number of questions to generate.

        Returns:
            List of QuizQuestion objects ordered by difficulty (ascending).
        """
        self.questions = []
        self._question_counter = 0

        topic_names = list(self.topics.keys())
        if not topic_names:
            return []

        # Calculate distribution
        level1_count = int(target_questions * 0.4)
        level2_count = int(target_questions * 0.35)
        level3_count = target_questions - level1_count - level2_count

        for level, count in [(1, level1_count), (2, level2_count), (3, level3_count)]:
            for _ in range(count):
                topic = random.choice(topic_names)
                question = self._generate_question(topic, level)
                if question:
                    self.questions.append(question)

        # Shuffle within each difficulty band, then sort by overall difficulty
        self.questions.sort(key=lambda q: (q.difficulty, q.id))
        return self.questions

    def _next_id(self) -> str:
        self._question_counter += 1
        return f"Q{self._question_counter:03d}"

    def _generate_question(self, topic: str, level: int) -> QuizQuestion | None:
        """Create a single question at the specified difficulty level for a given topic."""
        info = self.topics[topic]
        qid = self._next_id()

        if level == 1:
            # Recall question — test basic definition
            return QuizQuestion(
                id=qid,
                text=f"What does the '{topic}' concept do in {self.framework_name}? Explain in one sentence.",
                expected_answer=info["definition"],
                difficulty=1,
                topic=topic,
                source_citation="Official documentation",
                hint="Think about what happens when you use this feature in your code."
            )

        elif level == 2:
            # Application question — scenario-based
            return QuizQuestion(
                id=qid,
                text=(
                    f"In {self.framework_name}, what happens if you apply '{topic}' "
                    f"to a function that accepts keyword arguments? Consider the framework's default behavior."
                ),
                expected_answer=info["definition"],
                difficulty=2,
                topic=topic,
                source_citation=f"{self.framework_name} docs — {topic} section",
                hint="Consider both the normal case and edge cases with invalid input."
            )

        else:  # level == 3
            # Synthesis question — integration challenge
            other_topics = [t for t in self.topics if t != topic]
            if not other_topics:
                return None
            other = random.choice(other_topics)
            return QuizQuestion(
                id=qid,
                text=(
                    f"How would you combine '{topic}' with '{other}' in {self.framework_name} "
                    f"to handle authenticated API requests that need input validation?"
                ),
                expected_answer=f"{info['definition']} works alongside {self.topics[other]['definition']}. "
                                f"Typically, {topic} runs first as a dependency, then validation occurs.",
                difficulty=3,
                topic=topic,
                source_citation="Integration patterns in framework documentation",
                hint=f"Common mistake: '{info.get('common_mistake', 'Order matters — check the execution sequence.')}'"
            )

    def grade_answer(self, question_id: str, user_answer: str) -> bool:
        """Grade a single answer against the expected answer.

        Uses keyword overlap scoring (not exact match) to account for paraphrasing.

        Args:
            question_id: The ID of the question being graded.
            user_answer: The learner's submitted answer.

        Returns:
            True if the answer contains enough key concepts from the expected answer.
        """
        question = next((q for q in self.questions if q.id == question_id), None)
        if not question:
            return False

        user_words = set(user_answer.lower().split())
        expected_words = set(question.expected_answer.lower().split())

        # Remove common stop words
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
                      "of", "and", "or", "but", "if", "it", "this", "that", "with", "by", "as"}
        user_words -= stop_words
        expected_words -= stop_words

        # Require at least 40% keyword overlap for a correct answer
        if not expected_words:
            return len(user_words) > 5  # Free-form answers need some content

        overlap = len(user_words & expected_words) / len(expected_words)
        return overlap >= 0.4


# --- Usage Example ---

if __name__ == "__main__":
    builder = QuizBuilder("FastAPI")
    builder.add_topic(
        "middleware",
        "Functions that wrap the request-response cycle, executing code before and after each request.",
        "async def middleware(request, call_next): response = await call_next(request); return response",
        "Middleware runs AFTER route handlers by default"
    )
    builder.add_topic(
        "dependency injection",
        "FastAPI resolves function parameters as dependencies automatically using type annotations.",
        "def get_db() -> Session: return Session()",
        "Dependencies are called for every request, not cached between requests"
    )
    builder.add_topic(
        "pydantic validation",
        "Pydantic models define request/response schemas and validate data at runtime.",
        "class User(BaseModel): name: str; age: int",
        "Validation happens on the entire model, not individual fields separately"
    )

    quiz = builder.build_quiz(target_questions=9)
    print(f"Generated {len(quiz)} questions:")
    for q in quiz:
        print(f"\n  [{q.difficulty}] {q.text[:80]}...")
```

**Checkpoint:** The quiz covers at least 3 distinct framework concepts with a balanced distribution of difficulty levels. Each question has an expected answer and source citation — no ambiguous or open-ended questions without grading criteria.

---

### 5. Spaced Repetition Scheduling — Calculate Review Intervals Using SM-2 Algorithm

Implement the SM-2 (SuperMemo-2) algorithm to schedule knowledge review sessions at optimally spaced intervals. Each concept gets its own review queue with an ease factor and interval that adapt based on self-rated recall performance. Integrate with calendar or task management tools for automated reminders.

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class SM2Card:
    """Represents a single flashcard in the spaced repetition system.

    Implements the SuperMemo-2 algorithm for calculating review intervals
    based on self-rated recall quality (0–5 scale).

    Attributes:
        concept: The framework concept being reviewed.
        question_text: The active recall question to answer.
        next_review_date: Date when this card should be reviewed.
        interval_days: Days between current and next review (0 for new cards).
        ease_factor: Card's stability factor, starts at 2.5, adjusts with performance.
        repetition_count: Number of consecutive successful reviews.
        last_rating: Quality rating from the last review (0–5 scale).
    """
    concept: str
    question_text: str
    next_review_date: datetime
    interval_days: int = 0
    ease_factor: float = 2.5
    repetition_count: int = 0
    last_rating: float = 0.0

    def is_due(self, now: datetime | None = None) -> bool:
        """Check if this card is due for review."""
        check_time = now or datetime.now()
        return check_time >= self.next_review_date


class SM2Scheduler:
    """Implements the SM-2 spaced repetition algorithm for framework knowledge review.

    Each concept starts as a new card (interval 0) and progresses through the learning curve
    based on self-rated recall quality. The ease factor converges toward a stable value
    that determines optimal review intervals.

    Attributes:
        cards: The deck of flashcards being managed.
        history: Log of all review sessions for audit and analysis.
    """

    # SM-2 parameters
    MIN_EASE_FACTOR = 1.3
    QUALITY_THRESHOLDS = {
        0: "completely forgotten — interval resets to 0",
        1: "answered with major difficulty — reduce ease by 0.2",
        2: "answered correctly but slowly — reduce ease by 0.1",
        3: "correct answer after hesitation",
        4: "correct answer with ease",
        5: "perfect recall — increase ease by 0.15",
    }

    def __init__(self, cards_file: Path | None = None) -> None:
        self.cards: list[SM2Card] = []
        self.history: list[dict[str, Any]] = []
        if cards_file and cards_file.exists():
            self._load(cards_file)

    def add_card(self, concept: str, question_text: str, initial_date: datetime | None = None) -> SM2Card:
        """Create a new flashcard for a framework concept.

        Args:
            concept: Name of the concept to review.
            question_text: The active recall question.
            initial_date: First review date (defaults to now).

        Returns:
            The created card object.
        """
        card = SM2Card(
            concept=concept,
            question_text=question_text,
            next_review_date=initial_date or datetime.now(),
        )
        self.cards.append(card)
        return card

    def review_card(self, card_id: int, quality: float, now: datetime | None = None) -> SM2Card:
        """Process a review of a card using the SM-2 algorithm.

        The quality rating (0–5) determines how the interval and ease factor change:
        - 0–1: Card is reset to new state (interval becomes 0)
        - 2: Small interval increase, ease decreases slightly
        - 3: Standard interval progression
        - 4: Larger interval increase
        - 5: Maximum interval increase and slight ease boost

        Args:
            card_id: Index of the card in self.cards to review.
            quality: Self-rated recall quality (0–5, where 0=none, 5=perfect).
            now: Current timestamp for calculating next review date.

        Returns:
            The updated card with new interval and ease factor.
        """
        if now is None:
            now = datetime.now()

        card = self.cards[card_id]
        quality = max(0.0, min(5.0, quality))  # Clamp to valid range

        # Record review history
        self.history.append({
            "card_id": card_id,
            "concept": card.concept,
            "quality": quality,
            "interval_before": card.interval_days,
            "ease_factor_before": card.ease_factor,
            "timestamp": now.isoformat(),
        })

        # SM-2 algorithm core
        if quality < 3:
            # Failed review — reset to beginning
            card.repetition_count = 0
            card.interval_days = 1  # Review again tomorrow
        else:
            # Successful review — apply interval update formula
            if card.repetition_count == 0:
                card.interval_days = 1
            elif card.repetition_count == 1:
                card.interval_days = 6
            else:
                card.interval_days = max(
                    int(card.interval_days * card.ease_factor), 1
                )

            card.repetition_count += 1

            # Adjust ease factor
            ease_change = (0.0 if quality >= 3 else -0.15 if quality == 2 else -0.2) + (0.15 if quality == 5 else 0)
            card.ease_factor = max(self.MIN_EASE_FACTOR, card.ease_factor + ease_change)

        # Calculate next review date
        card.next_review_date = now + timedelta(days=card.interval_days)
        card.last_rating = quality

        return card

    def get_due_cards(self, now: datetime | None = None) -> list[tuple[int, SM2Card]]:
        """Return all cards that are due for review, sorted by next_review_date ascending.

        Args:
            now: Current timestamp (defaults to now).

        Returns:
            List of (index, card) tuples for cards due today or earlier.
        """
        check_time = now or datetime.now()
        due_cards = []

        for idx, card in enumerate(self.cards):
            if card.is_due(check_time):
                due_cards.append((idx, card))

        return sorted(due_cards, key=lambda x: x[1].next_review_date)

    def get_upcoming_schedule(self, days_ahead: int = 30) -> dict[str, list[tuple[str, str]]]:
        """Generate a calendar view of upcoming review sessions.

        Args:
            days_ahead: Number of future days to project.

        Returns:
            Mapping of date string → list of (concept, card_id) tuples for that day.
        """
        now = datetime.now()
        schedule: dict[str, list[tuple[str, int]]] = {}

        projected_cards = [SM2Card(
            concept=card.concept, question_text=card.question_text,
            next_review_date=now + timedelta(days=card.interval_days),
            interval_days=card.interval_days, ease_factor=card.ease_factor,
            repetition_count=card.repetition_count
        ) for card in self.cards]

        # Simulate future reviews by projecting intervals forward
        while projected_cards:
            upcoming = sorted(projected_cards, key=lambda c: c.next_review_date)
            next_due = upcoming[0].next_review_date

            if next_due > now + timedelta(days=days_ahead):
                break

            date_str = next_due.strftime("%Y-%m-%d")
            schedule.setdefault(date_str, []).append((upcoming[0].concept, 0))
            projected_cards.remove(upcoming[0])

        return dict(sorted(schedule.items()))

    def save(self, path: Path) -> None:
        """Serialize the card deck to JSON for persistence.

        Args:
            path: File path where the deck will be saved.
        """
        data = {
            "cards": [
                {
                    "concept": c.concept,
                    "question_text": c.question_text,
                    "next_review_date": c.next_review_date.isoformat(),
                    "interval_days": c.interval_days,
                    "ease_factor": c.ease_factor,
                    "repetition_count": c.repetition_count,
                    "last_rating": c.last_rating,
                }
                for c in self.cards
            ],
            "history": self.history,
        }
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _load(self, path: Path) -> None:
        """Load a previously saved deck from JSON."""
        data = json.loads(path.read_text(encoding="utf-8"))
        for card_data in data.get("cards", []):
            self.cards.append(SM2Card(
                concept=card_data["concept"],
                question_text=card_data["question_text"],
                next_review_date=datetime.fromisoformat(card_data["next_review_date"]),
                interval_days=card_data["interval_days"],
                ease_factor=card_data["ease_factor"],
                repetition_count=card_data["repetition_count"],
                last_rating=card_data.get("last_rating", 0.0),
            ))
        self.history = data.get("history", [])


# --- Usage Example ---

if __name__ == "__main__":
    scheduler = SM2Scheduler()

    # Create cards for framework concepts
    concepts_to_review = [
        ("FastAPI dependency injection", "How does FastAPI resolve function parameters as dependencies?"),
        ("Pydantic validation", "What is the difference between model_validate and model_validate_json?"),
        ("Middleware execution order", "In what order do multiple middleware functions execute in FastAPI?"),
    ]

    for concept, question in concepts_to_review:
        scheduler.add_card(concept, question)

    # Simulate reviews
    due = scheduler.get_due_cards()
    print("Due cards:")
    for idx, card in due:
        print(f"  [{idx}] {card.concept}")

    print("\nReviewing first card (quality=4, good recall)...")
    updated = scheduler.review_card(0, quality=4.0)
    print(f"  New interval: {updated.interval_days} days | Ease: {updated.ease_factor:.2f}")

    # Show projected schedule
    schedule = scheduler.get_upcoming_schedule(days_ahead=60)
    print("\nUpcoming reviews (next 60 days):")
    for date, items in sorted(schedule.items()):
        concepts_list = ", ".join(item[0] for item in items)
        print(f"  {date}: {concepts_list}")
```

**Checkpoint:** Every framework concept has at least one card in the SM-2 deck with a valid `next_review_date`. The initial intervals follow the standard SM-2 progression (1 day, 6 days, then ease_factor × current interval). Cards are exported to JSON for persistence and cross-device synchronization.

---

### 6. Peer Validation Through Teach-Back — Structured Evaluation by Another Engineer

The learner presents their Feynman explanation to a peer who has not recently studied the framework. The peer evaluates using a structured rubric: accuracy (is everything correct?), completeness (are all key concepts covered?), and clarity (can a third party understand it?). Record scores, note remaining gaps, and require re-teaching until all scores exceed 4/5.

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from pathlib import Path
from typing import Any


class EvaluationDimension(Enum):
    ACCURACY = "accuracy"        # Are the facts correct?
    COMPLETENESS = "completeness"  # Are all key concepts covered?
    CLARITY = "clarity"          # Is it understandable to a competent peer?


@dataclass(frozen=True)
class PeerEvaluation:
    """Results of one peer teach-back evaluation session.

    Attributes:
        evaluator: Name/identifier of the evaluating peer.
        date: Date of the evaluation session.
        dimension_scores: Per-dimension rating (1–5 scale).
        detailed_notes: Free-text feedback from the evaluator.
        remaining_gaps: List of concepts the learner still misunderstands.
        passed: Whether all dimensions scored ≥ 4/5.
    """
    evaluator: str
    date: str  # ISO format date string
    dimension_scores: dict[str, float] = field(default_factory=dict)
    detailed_notes: str = ""
    remaining_gaps: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(score >= 4.0 for score in self.dimension_scores.values())

    @property
    def average_score(self) -> float:
        if not self.dimension_scores:
            return 0.0
        return sum(self.dimension_scores.values()) / len(self.dimension_scores)


class TeachBackEvaluator:
    """Structured evaluation system for peer teach-back sessions.

    The evaluator uses a calibrated rubric with explicit criteria for each dimension,
    ensuring consistent and actionable feedback across multiple evaluation sessions.

    Attributes:
        evaluation_history: Record of all past evaluation sessions.
        framework_topic: The framework or concept being evaluated.
    """

    RUBRIC = {
        "accuracy": {
            "5": "All facts are correct; no misleading statements",
            "4": "Minor inaccuracies that don't change overall understanding",
            "3": "Several inaccuracies present but core concepts are right",
            "2": "Major factual errors in multiple concepts",
            "1": "Mostly incorrect — significant re-learning needed",
        },
        "completeness": {
            "5": "Covers all key concepts: what, why, how, limitations",
            "4": "Covers most key concepts; one minor concept missing",
            "3": "Covers about half of key concepts adequately",
            "2": "Only covers superficial aspects; misses deeper mechanics",
            "1": "Major concepts omitted entirely",
        },
        "clarity": {
            "5": "Any competent engineer could follow without asking questions",
            "4": "Mostly clear; one or two points need elaboration",
            "3": "Understandable but requires occasional re-reading",
            "2": "Frequently unclear; relies on undefined jargon",
            "1": "Confusing — cannot follow the explanation at all",
        },
    }

    def __init__(self, framework_topic: str) -> None:
        self.framework_topic = framework_topic
        self.evaluation_history: list[PeerEvaluation] = []

    def evaluate(
        self,
        evaluator_name: str,
        dimension_scores: dict[str, float],
        detailed_notes: str = "",
        remaining_gaps: list[str] | None = None,
    ) -> PeerEvaluation:
        """Record a peer evaluation of the learner's teach-back session.

        Validates scores against the rubric and ensures all three dimensions are present.

        Args:
            evaluator_name: Name or identifier of the evaluating peer.
            dimension_scores: Dict mapping dimension name → score (1.0–5.0).
            detailed_notes: Free-text feedback from the evaluator.
            remaining_gaps: List of concept names that need further study.

        Returns:
            The recorded PeerEvaluation object.
        """
        # Validate dimensions
        for dim in EvaluationDimension:
            if dim.value not in dimension_scores:
                raise ValueError(f"Missing evaluation dimension: '{dim.value}'")

        # Clamp scores to valid range
        validated_scores = {k: max(1.0, min(5.0, v)) for k, v in dimension_scores.items()}

        evaluation = PeerEvaluation(
            evaluator=evaluator_name,
            date=date.today().isoformat(),
            dimension_scores=validated_scores,
            detailed_notes=detailed_notes,
            remaining_gaps=remaining_gaps or [],
        )

        self.evaluation_history.append(evaluation)
        return evaluation

    def get_mastery_progress(self) -> dict[str, Any]:
        """Compute overall mastery progress based on the evaluation history.

        Returns:
            Dictionary with pass count, average scores per dimension, and recommendation.
        """
        if not self.evaluation_history:
            return {
                "evaluations_count": 0,
                "recommendation": "No evaluations recorded yet — schedule a teach-back session",
            }

        passed = sum(1 for e in self.evaluation_history if e.passed)
        total = len(self.evaluation_history)

        # Average scores per dimension across all evaluations
        dim_sums: dict[str, float] = {}
        dim_counts: dict[str, int] = {}
        for eval_ in self.evaluation_history:
            for dim, score in eval_.dimension_scores.items():
                dim_sums[dim] = dim_sums.get(dim, 0.0) + score
                dim_counts[dim] = dim_counts.get(dim, 0) + 1

        avg_scores = {dim: dim_sums[dim] / dim_counts[dim] for dim in dim_sums}

        if passed == total and total >= 2:
            recommendation = "Mastery achieved — learner can confidently teach this framework to others"
        elif passed >= total * 0.5:
            recommendation = f"Good progress ({passed}/{total} evaluations passed). Focus on remaining gaps."
        else:
            recommendation = "Needs additional study and another teaching attempt before peer sign-off."

        return {
            "evaluations_count": total,
            "passes": passed,
            "average_scores": avg_scores,
            "latest_evaluation": self.evaluation_history[-1].as_json() if hasattr(self.evaluation_history[-1], 'as_json') else {},
            "recommendation": recommendation,
        }


    def save_report(self, path: Path) -> None:
        """Save the complete evaluation history as JSON.

        Args:
            path: Output file path for the report.
        """
        report = {
            "framework_topic": self.framework_topic,
            "total_evaluations": len(self.evaluation_history),
            "progress": self.get_mastery_progress(),
            "evaluations": [e.dimension_scores | {"notes": e.detailed_notes} for e in self.evaluation_history],
        }
        path.write_text(json.dumps(report, indent=2), encoding="utf-8")


# --- Usage Example ---

if __name__ == "__main__":
    evaluator = TeachBackEvaluator("FastAPI Framework")

    # Session 1: Initial teach-back (not yet mastered)
    eval1 = evaluator.evaluate(
        evaluator_name="alice_senior",
        dimension_scores={
            "accuracy": 4.0,
            "completeness": 3.5,
            "clarity": 4.5,
        },
        detailed_notes="Good overall understanding. Missing details about async/await support in route handlers and the difference between @app.get() vs @router.get().",
        remaining_gaps=["async route handlers", "router vs app decorators"],
    )

    # Session 2: Second attempt after addressing gaps
    eval2 = evaluator.evaluate(
        evaluator_name="alice_senior",
        dimension_scores={
            "accuracy": 4.5,
            "completeness": 4.0,
            "clarity": 4.5,
        },
        detailed_notes="Resolved the async handler gap. Still could elaborate more on dependency lifecycle (singleton vs per-request).",
        remaining_gaps=["dependency lifecycle"],
    )

    # Session 3: Final evaluation (passed)
    eval3 = evaluator.evaluate(
        evaluator_name="bob_lead",
        dimension_scores={
            "accuracy": 5.0,
            "completeness": 4.5,
            "clarity": 5.0,
        },
        detailed_notes="Excellent mastery demonstrated. Can answer follow-up questions confidently and provide practical examples.",
        remaining_gaps=[],
    )

    progress = evaluator.get_mastery_progress()
    print(f"Evaluations: {progress['evaluations_count']}")
    print(f"Passes: {progress['passes']}/{progress['evaluations_count']}")
    print(f"Avg Scores: {progress['average_scores']}")
    print(f"Recommendation: {progress['recommendation']}")

    evaluator.save_report(Path("teach-back-report.json"))
```

**Checkpoint:** The learner passes at least 2 consecutive evaluations with all dimensions scoring ≥ 4/5. Remaining gaps are explicitly documented and must be ≤ 2 after the final evaluation — any more indicates insufficient mastery for peer teaching.

---

## Implementation Patterns

### Pattern 1: Knowledge Transfer Dashboard — Track Team-Wide Framework Competency

Aggregate individual progress across all three workflow stages into a team dashboard showing who has completed each stage, their quiz scores, SM-2 adherence, and peer evaluation results. This enables managers to identify knowledge bottlenecks and allocate study time effectively.

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, date
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class TeamMemberProgress:
    """Tracks one engineer's progress through the knowledge transfer workflow.

    Attributes:
        name: Engineer's identifier.
        framework_topic: The framework being studied.
        stages_completed: Ordered list of completed stage names.
        quiz_score: Score from the active recall quiz (0–100).
        mastery_score: SM-2 system mastery score (0.0–1.0).
        peer_evaluations_passed: Number of passed peer evaluations.
        peer_evaluations_total: Total number of evaluations conducted.
        last_activity: ISO timestamp of most recent activity.
    """
    name: str
    framework_topic: str
    stages_completed: list[str] = field(default_factory=list)
    quiz_score: float = 0.0
    mastery_score: float = 0.0
    peer_evaluations_passed: int = 0
    peer_evaluations_total: int = 0
    last_activity: str = ""

    @property
    def stage_count(self) -> int:
        return len(self.stages_completed)

    @property
    def is_complete(self) -> bool:
        return self.stage_count >= 6 and self.quiz_score >= 70 and self.mastery_score >= 0.8


class KnowledgeTransferDashboard:
    """Aggregates individual progress into a team-wide competency view.

    Provides filtering, sorting, and bottleneck analysis to help engineering
    managers identify knowledge gaps across the team and allocate resources.
    """

    STAGE_ORDER = [
        "feynman_explanation",
        "gap_identification",
        "targeted_relearning",
        "quiz_completion",
        "spaced_repetition_setup",
        "peer_validation",
    ]

    def __init__(self) -> None:
        self.members: dict[str, TeamMemberProgress] = {}  # name → progress

    def update_member(
        self, name: str, framework_topic: str,
        stages_completed: list[str], quiz_score: float = 0.0,
        mastery_score: float = 0.0, peer_evaluations_passed: int = 0,
        peer_evaluations_total: int = 0
    ) -> TeamMemberProgress:
        """Update a team member's progress record.

        Args:
            name: Engineer identifier.
            framework_topic: Framework being studied.
            stages_completed: List of completed stage names from STAGE_ORDER.
            quiz_score: Quiz completion score (0–100).
            mastery_score: SM-2 mastery score (0.0–1.0).
            peer_evaluations_passed: Count of passed evaluations.
            peer_evaluations_total: Total evaluations conducted.

        Returns:
            The updated TeamMemberProgress object.
        """
        progress = TeamMemberProgress(
            name=name,
            framework_topic=framework_topic,
            stages_completed=[s for s in stages_completed if s in self.STAGE_ORDER],
            quiz_score=max(0.0, min(100.0, quiz_score)),
            mastery_score=max(0.0, min(1.0, mastery_score)),
            peer_evaluations_passed=peer_evaluations_passed,
            peer_evaluations_total=peer_evaluations_total,
            last_activity=datetime.now().isoformat(),
        )
        self.members[name] = progress
        return progress

    def get_bottleneck_analysis(self) -> dict[str, Any]:
        """Identify the most common stage where team members get stuck.

        Returns:
            Dictionary with bottleneck stage, count of stuck members, and recommendation.
        """
        if not self.members:
            return {"bottleneck": None, "stuck_count": 0, "recommendation": "No data available"}

        stage_counts: dict[str, int] = {}
        for member in self.members.values():
            if len(member.stages_completed) < len(self.STAGE_ORDER):
                # Find the first incomplete stage
                for stage in self.STAGE_ORDER:
                    if stage not in member.stages_completed:
                        stage_counts[stage] = stage_counts.get(stage, 0) + 1
                        break

        if not stage_counts:
            return {"bottleneck": "none", "stuck_count": 0, "recommendation": "All team members are on track"}

        bottleneck_stage = max(stage_counts, key=stage_counts.get)
        stuck_count = stage_counts[bottleneck_stage]

        recommendations = {
            "feynman_explanation": "Provide a template Feynman explanation structure with examples",
            "gap_identification": "Pair learners with documentation experts for guided gap analysis",
            "targeted_relearning": "Create curated reading lists mapped to each framework concept",
            "quiz_completion": "Share quiz question bank so learners can practice beforehand",
            "spaced_repetition_setup": "Run a workshop on configuring the SM-2 scheduler tool",
            "peer_validation": "Schedule group teach-back sessions with rotating evaluators",
        }

        return {
            "bottleneck": bottleneck_stage,
            "stuck_count": stuck_count,
            "total_members": len(self.members),
            "recommendation": recommendations.get(bottleneck_stage, "Review curriculum for this stage"),
        }

    def get_team_readiness_report(self) -> dict[str, Any]:
        """Generate a report on team readiness to deploy/migrate with the new framework.

        Returns:
            Dictionary with completion percentages and readiness verdict.
        """
        if not self.members:
            return {"verdict": "no_data", "completed_count": 0, "total_count": 0}

        total = len(self.members)
        completed = sum(1 for m in self.members.values() if m.is_complete)
        quiz_pass_rate = sum(m.quiz_score for m in self.members.values()) / total if total > 0 else 0
        avg_mastery = sum(m.mastery_score for m in self.members.values()) / total if total > 0 else 0

        if completed >= total * 0.8:
            verdict = "ready"
        elif completed >= total * 0.5:
            verdict = "partial_readiness"
        else:
            verdict = "needs_more_training"

        return {
            "verdict": verdict,
            "completed_count": completed,
            "total_count": total,
            "completion_rate": f"{(completed / total * 100):.0f}%" if total > 0 else "0%",
            "average_quiz_score": f"{quiz_pass_rate:.0f}/100",
            "average_mastery_score": f"{avg_mastery:.0%}",
        }

    def export_report(self, path: Path) -> None:
        """Save the dashboard data as JSON for sharing with management.

        Args:
            path: Output file path.
        """
        report = {
            "team_readiness": self.get_team_readiness_report(),
            "bottleneck_analysis": self.get_bottleneck_analysis(),
            "members": {
                name: {
                    "framework": m.framework_topic,
                    "stages_completed": len(m.stages_completed),
                    "total_stages": len(self.STAGE_ORDER),
                    "quiz_score": m.quiz_score,
                    "mastery_score": m.mastery_score,
                    "peer_evals": f"{m.peer_evaluations_passed}/{m.peer_evaluations_total}",
                    "is_complete": m.is_complete,
                }
                for name, m in self.members.items()
            },
        }
        path.write_text(json.dumps(report, indent=2), encoding="utf-8")


# --- Usage Example ---

if __name__ == "__main__":
    dashboard = KnowledgeTransferDashboard()

    # Simulate team members at various stages
    dashboard.update_member(
        "alice", "FastAPI",
        stages_completed=["feynman_explanation", "gap_identification", "targeted_relearning", "quiz_completion"],
        quiz_score=78.0, mastery_score=0.75, peer_evaluations_passed=1, peer_evaluations_total=2
    )
    dashboard.update_member(
        "bob", "FastAPI",
        stages_completed=["feynman_explanation", "gap_identification", "targeted_relearning", "quiz_completion",
                         "spaced_repetition_setup", "peer_validation"],
        quiz_score=92.0, mastery_score=0.91, peer_evaluations_passed=2, peer_evaluations_total=2
    )
    dashboard.update_member(
        "charlie", "FastAPI",
        stages_completed=["feynman_explanation"],
        quiz_score=0.0, mastery_score=0.0, peer_evaluations_passed=0, peer_evaluations_total=0
    )

    print("Team Readiness:", json.dumps(dashboard.get_team_readiness_report(), indent=2))
    print("\nBottleneck Analysis:", json.dumps(dashboard.get_bottleneck_analysis(), indent=2))
```

**Checkpoint:** The dashboard shows per-member progress with clear completion markers. Bottleneck analysis identifies the stage where most team members are stuck, and the readiness report provides a binary verdict (ready / partial / needs training) for deployment planning decisions.

---

## Constraints

### MUST DO
- Always draft the Feynman explanation before creating quizzes — understanding precedes assessment
- Use self-rating of 0–5 on the SM-2 scale honestly; overrating destroys the algorithm's effectiveness
- Require at least 2 passing peer evaluations with all dimensions ≥ 4/5 for mastery certification
- Record every knowledge gap with its severity classification and suggested source before re-learning
- Share quiz question banks within the team so active recall practice is consistent across members

### MUST NOT DO
- Never skip the Feynman explanation step — jumping straight to quizzes measures recognition, not understanding
- Rate self-assessment higher than genuine recall ability — inflating scores creates false confidence that fails in production
- Use multiple-choice questions for active recall — forced recall (short answer) is what builds durable memory traces
- Let a single peer evaluation determine mastery — require independent evaluations from at least 2 different peers
- Ignore the spaced repetition schedule after initial setup — review adherence is the primary predictor of long-term retention

---

## Output Template

When this skill is active, model output must contain:

1. **Feynman Explanation Draft** — Structured explanation with section headings, inline definitions, and a clarity score
2. **Gap Analysis Report** — Table of knowledge gaps with severity, current belief, correct description, and source references
3. **Re-Learning Study Plan** — Prioritized list of concepts to study with sources and confidence targets
4. **Active Recall Quiz** — Progressive difficulty questions (12+ items) with expected answers and grading criteria
5. **Spaced Repetition Schedule** — SM-2 card deck with review dates for the next 60 days
6. **Peer Evaluation Summary** — Rubric scores across all dimensions, pass/fail verdict, and remaining gap list

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `framework-application-methodology` | Learn a new framework systematically before transferring knowledge to your team |
| `extensible-framework-design` | Design extensible frameworks — the knowledge transfer skill helps teams master them |
| `coding-knowledge-transfer-methods` | This skill provides structured methods for framework mastery and competency building |
