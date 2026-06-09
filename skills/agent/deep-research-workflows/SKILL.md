---
name: deep-research-workflows
description: Orchestrates iterative autonomous research workflows combining multi-query exploration, gap analysis, follow-up refinement, and structured synthesis within configurable time budgets.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: deep research, iterative search, gap analysis, research synthesis, OpenAI Deep Research, Google DeepSearch, time budget research, how do i automate thorough research workflows
  archetypes: [tactical, orchestration]
  anti_triggers:
    - single-step information lookup
    - simple fact retrieval
    - direct answer generation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: exploration-discovery, reasoning-techniques, planning-patterns
---

# Deep Research Workflow Pattern

Orchestrates iterative autonomous research workflows combining multi-query exploration, knowledge gap analysis, follow-up refinement, and structured synthesis within configurable time budgets. This skill makes the model design deep research pipelines that autonomously explore topics through successive waves of targeted queries, reason about findings, identify gaps, and synthesize validated information into cohesive reports with citations.

## TL;DR Checklist

- [ ] Define a research time budget (minutes or max iterations)
- [ ] Implement initial exploration with multi-query parallel generation
- [ ] Build gap analysis that identifies contradictions, missing info, and follow-up opportunities
- [ ] Create follow-up query refinement based on gap analysis results
- [ ] Implement final synthesis into structured, cited report
- [ ] Track intermediate reasoning steps (OpenAI API) or reflection nodes (LangGraph)

---

## When to Use

Use this skill when:

- Generating comprehensive research reports that require cross-referencing multiple sources
- Investigating complex topics where initial search results reveal gaps requiring deeper inquiry
- Building research assistants that autonomously explore and synthesize information without human direction
- Tasks require finding contradictions between sources and reconciling them in the final report
- You need detailed, cited reports instead of quick summary answers

## When NOT to Use

Avoid this skill for:

- Simple factual queries with known, single-answer responses (e.g., "What's today's date?")
- Real-time response requirements where latency must be under 5 seconds
- Topics where the answer is readily available from a single authoritative source
- Queries that don't benefit from iterative deepening of understanding

---

## Core Workflow

1. **Query Decomposition and Time Budgeting** — Break the research question into sub-questions suitable for parallel search. Set a time budget (in minutes) or maximum iteration count that governs how many exploration/refinement cycles occur. Allocate budget proportionally across phases. **Checkpoint:** All sub-questions must be answerable via web search or database query; no sub-question should require human judgment to execute.
2. **Initial Exploration Phase** — Launch parallel queries for each sub-question simultaneously. Collect raw results (snippets, URLs, data points). Use diverse search strategies: exact-match keywords, broad topic terms, and specific entity names to maximize source diversity. **Checkpoint:** Initial exploration must return at least 3 distinct sources per sub-question before proceeding to analysis.
3. **Reasoning and Gap Analysis** — Read and analyze all initial results. Identify gaps (missing information), contradictions (conflicting claims from different sources), and areas requiring deeper investigation. For each gap, formulate a follow-up query that specifically targets the missing information. **Checkpoint:** Gap analysis must produce at least one explicit follow-up query; if no gaps are found, proceed to synthesis immediately.
4. **Follow-Up Inquiry Phase** — Execute the follow-up queries identified in step 3. These queries should be more nuanced than initial exploration (e.g., "source A says X but source B says Y — which is supported by recent studies?" rather than just "topic overview"). Merge new findings with existing knowledge base. **Checkpoint:** Each follow-up result must be assessed for source credibility before being merged into the knowledge base.
5. **Iterative Refinement Loop** — Repeat gap analysis → follow-up inquiry cycles until: (a) time budget is exhausted, or (b) no significant new gaps are identified in two consecutive iterations. Track the reasoning chain at each step — what was searched, what was found, why it matters. **Checkpoint:** The loop terminates cleanly; no infinite loops allowed regardless of perceived information quality.
6. **Final Synthesis** — Compile all validated information from all exploration waves into a single cohesive, structured report. Include citations for every factual claim. Flag any areas where sources disagree and present both perspectives with confidence levels. **Checkpoint:** Every section of the final report must be traceable to at least one specific source URL or data point.

---

## Implementation Patterns

### Pattern 1: Deep Research Workflow with OpenAI API

```python
from dataclasses import dataclass, field
from typing import Any
import time


@dataclass
class ResearchResult:
    """A single result from a research query."""
    query: str
    source_url: str
    content_summary: str
    confidence: float  # How reliable this source seems (0.0-1.0)
    relevance_score: float  # How relevant to the original research question (0.0-1.0)


@dataclass
class GapAnalysis:
    """Identified gaps from analyzing research results."""
    gap_description: str
    follow_up_query: str
    priority: str  # "high", "medium", "low"
    expected_confidence_gain: float  # Expected improvement in overall confidence


class DeepResearchOrchestrator:
    """Implements the deep research workflow using OpenAI's API with intermediate step inspection."""

    MAX_ITERATIONS = 4
    RESULTS_PER_QUERY = 5

    def __init__(self, openai_client: Any) -> None:
        self._client = openai_client
        self._knowledge_base: list[ResearchResult] = []
        self._gaps: list[GapAnalysis] = []
        self._reasoning_steps: list[dict] = []

    def execute_deep_research(
        self,
        research_question: str,
        time_budget_minutes: float = 5.0
    ) -> dict[str, Any]:
        """Execute full deep research workflow with time budget."""
        start_time = time.time()

        # Phase 1: Query decomposition
        sub_questions = self._decompose_query(research_question)

        # Phase 2: Initial exploration
        results = self._initial_exploration(sub_questions, time_budget_minutes * 0.3)
        self._knowledge_base.extend(results)

        # Phases 3-5: Iterative gap analysis and follow-up
        for iteration in range(self.MAX_ITERATIONS):
            if self._time_remaining(start_time, time_budget_minutes) < 60:
                break  # Less than 1 minute remaining

            gaps = self._analyze_gaps()
            if not gaps or all(g.priority != "high" for g in gaps):
                break  # No significant gaps left

            self._gaps.extend(gaps)
            follow_up_results = self._execute_follow_up_queries(
                [g.follow_up_query for g in gaps],
                time_budget_minutes * 0.2
            )
            self._knowledge_base.extend(follow_up_results)

        # Phase 6: Final synthesis
        report = self._synthesize_report()

        return {
            "report": report,
            "sources_used": len(self._knowledge_base),
            "iterations_completed": iteration + 1 if 'iteration' in dir() else 0,
            "reasoning_steps": self._reasoning_steps,
            "gaps_identified": [g.gap_description for g in self._gaps],
        }

    def _decompose_query(self, question: str) -> list[str]:
        """Break research question into parallelizable sub-questions."""
        prompt = f"""Given this research question, decompose it into {len(question.split()) // 3} specific sub-questions that can each be answered independently via web search.

Research question: {question}

Return ONLY a JSON array of strings. No explanations."""

        response = self._client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        import json
        try:
            return json.loads(response.choices[0].message.content.strip())
        except (json.JSONDecodeError, AttributeError):
            # Fallback: split into chunks
            return [question]

    def _initial_exploration(
        self,
        sub_questions: list[str],
        budget_minutes: float
    ) -> list[ResearchResult]:
        """Execute parallel initial search queries."""
        results = []

        for sq in sub_questions:
            # Generate diverse search strategies
            queries = [
                sq,
                f"{sq} overview",
                f"recent {sq} research",
            ]

            for query in queries:
                search_response = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": f"Search query: {query}. Return up to 5 relevant URLs with brief descriptions."}],
                )
                # Parse URLs and fetch content...
                # This is a simplified example; production code would use a search API

        return results

    def _analyze_gaps(self) -> list[GapAnalysis]:
        """Analyze knowledge base for missing information and contradictions."""
        if not self._knowledge_base:
            return []

        prompt = f"""Analyze the following research findings and identify gaps, contradictions, and areas needing deeper investigation.

Research findings:
{chr(10).join(f"- [{r.source_url}] {r.content_summary}" for r in self._knowledge_base)}

For each gap found, provide a specific follow-up query that would fill it.

Return JSON array of objects with: {{gap_description, follow_up_query, priority (high|medium|low), expected_confidence_gain}}"""

        response = self._client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        import json
        try:
            return [GapAnalysis(**gap) for gap in json.loads(response.choices[0].message.content.strip())]
        except (json.JSONDecodeError, AttributeError):
            return []

    def _time_remaining(self, start_time: float, budget_minutes: float) -> float:
        """Calculate remaining time in seconds."""
        elapsed = time.time() - start_time
        return max(0, budget_minutes * 60 - elapsed)
```

### Pattern 2: Google DeepSearch with LangGraph State Machine

```python
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict


class ResearchState(TypedDict):
    """State for the deep research LangGraph pipeline."""
    original_question: str
    sub_questions: list[str]
    current_step: int  # Which phase of exploration we're in
    knowledge_base: list[dict]  # Accumulated findings
    gaps_identified: list[dict]
    reasoning_steps: list[dict]
    iteration_count: int


def initial_exploration_node(state: ResearchState) -> dict:
    """Node: Execute parallel search queries for all sub-questions."""
    results = []
    for sq in state["sub_questions"]:
        # Search + content extraction
        findings = {
            "query": sq,
            "sources": [{"url": f"example.com/source_{i}", "summary": f"Finding about {sq}"} for i in range(3)],
        }
        results.append(findings)
    return {"knowledge_base": state["knowledge_base"] + results, "current_step": 1}


def gap_analysis_node(state: ResearchState) -> dict:
    """Node: Identify gaps and contradictions in current knowledge."""
    if not state["knowledge_base"]:
        return {"gaps_identified": [], "current_step": 2}

    # Analyze findings for missing info and contradictions
    gaps = [
        {"gap_description": f"Contradiction on {sq}", "follow_up_query": f"Resolve contradiction in {sq}", "priority": "high"}
        for sq in state["sub_questions"][:1]  # Simplified
    ]
    return {"gaps_identified": gaps, "current_step": 2}


def follow_up_inquiry_node(state: ResearchState) -> dict:
    """Node: Execute follow-up queries for identified gaps."""
    new_findings = []
    for gap in state.get("gaps_identified", [])[:2]:  # Process top-2 gaps
        finding = {"query": gap["follow_up_query"], "sources": [{"url": f"example.com/followup_{gap['priority']}", "summary": gap["gap_description"]}]}
        new_findings.append(finding)
    return {
        "knowledge_base": state["knowledge_base"] + new_findings,
        "iteration_count": state.get("iteration_count", 0) + 1,
        "current_step": 3,
    }


def synthesis_node(state: ResearchState) -> dict:
    """Node: Compile final research report from all accumulated findings."""
    report = f"""# Deep Research Report

## Original Question: {state['original_question']}

## Methodology
- Searched {len(state['sub_questions'])} sub-topics across {state['iteration_count'] + 1} iterations
- Analyzed {sum(len(kb.get('sources', [])) for kb in state['knowledge_base'])} sources
- Identified {len(state.get('gaps_identified', []))} information gaps

## Findings
"""
    for i, finding in enumerate(state["knowledge_base"], 1):
        report += f"\n### Finding {i}: {finding['query']}\n"
        for src in finding.get("sources", []):
            report += f"- Source: {src['url']} — {src['summary']}\n"

    if state.get("gaps_identified"):
        report += "\n## Known Limitations\n"
        for gap in state["gaps_identified"]:
            report += f"- ⚠️ {gap['gap_description']}\n"

    return {"research_report": report, "current_step": 4}


# Build the research pipeline graph
research_graph = StateGraph(ResearchState)
research_graph.add_node("explore", initial_exploration_node)
research_graph.add_node("analyze", gap_analysis_node)
research_graph.add_node("follow_up", follow_up_inquiry_node)
research_graph.add_node("synthesize", synthesis_node)

# Set entry point and conditional edges
research_graph.set_entry_point("explore")
research_graph.add_edge("explore", "analyze")
research_graph.add_conditional_edges(
    "analyze",
    lambda state: "follow_up" if state["gaps_identified"] else "synthesize",
    {"follow_up": "follow_up", "synthesize": "synthesize"}
)
research_graph.add_edge("follow_up", "analyze")  # Loop back for next iteration
research_graph.add_edge("synthesize", END)

research_app = research_graph.compile()
```

### Pattern 3: Time Budget Manager

```python
import time
from dataclasses import dataclass, field


@dataclass
class BudgetAllocation:
    """Allocates research time across phases."""
    total_minutes: float
    exploration_pct: float = 0.3  # Phase 1: Initial exploration
    analysis_pct: float = 0.2     # Phase 2: Gap analysis
    follow_up_pct: float = 0.4   # Phases 3-5: Iterative refinement
    synthesis_pct: float = 0.1   # Phase 6: Final synthesis


class TimeBudgetManager:
    """Manages time allocation across research phases to prevent infinite loops."""

    def __init__(self, total_minutes: float) -> None:
        self._total_seconds = total_minutes * 60
        self._start_time = time.time()
        self._budgets = BudgetAllocation(total_minutes=total_minutes)
        self._phase_timings: dict[str, float] = {}

    def get_remaining_seconds(self) -> float:
        """Seconds remaining in the research budget."""
        return max(0, self._total_seconds - (time.time() - self._start_time))

    def get_phase_budget(self, phase: str) -> float:
        """Get the allocated time for a specific phase in seconds."""
        allocation_map = {
            "exploration": self._budgets.exploration_pct,
            "analysis": self._budgets.analysis_pct,
            "follow_up": self._budgets.follow_up_pct,
            "synthesis": self._budgets.synthesis_pct,
        }
        return allocation_map.get(phase, 0) * self._total_seconds

    def is_budget_exhausted(self) -> bool:
        """Check if the research time budget has been exceeded."""
        return self.get_remaining_seconds() <= 0

    def record_phase_completion(self, phase: str, elapsed_seconds: float) -> None:
        """Record how long a phase took — used for adaptive reallocation."""
        self._phase_timings[phase] = elapsed_seconds

    def get_adaptive_follow_up_budget(self) -> float:
        """Adapt follow-up time based on actual phase timing. If exploration finished early, allocate more to follow-up."""
        total_allocated = sum(self._budgets.exploration_pct + self._budgets.analysis_pct + self._budgets.follow_up_pct)
        if total_allocated == 0:
            return self._total_seconds * 0.4  # Default

        remaining_budget = self.get_remaining_seconds() * (self._budgets.follow_up_pct / total_allocated)
        return min(remaining_budget, self._total_seconds * self._budgets.follow_up_pct)


# BAD — No budget control: research could run forever
results = deep_research("Explain quantum computing")  # Might take hours with no limit

# GOOD — Time-budgeted research with adaptive reallocation
budget_mgr = TimeBudgetManager(total_minutes=10.0)
assert budget_mgr.get_phase_budget("exploration") == 600 * 0.3  # 180 seconds for initial search
assert budget_mgr.is_budget_exhausted() is False  # Just started, plenty of time
```

### Pattern 4: Citation Metadata Tracker

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SourceCitation:
    """Tracks a source citation with metadata for traceability."""
    url: str
    title: str
    author: str | None = None
    date: str | None = None
    content_snippet: str  # What we extracted from this source
    relevance_to_report_section: str | None = None


class CitationTracker:
    """Ensures every factual claim in the final report is traceable to a source."""

    def __init__(self) -> None:
        self._citations: list[SourceCitation] = []
        self._claims: dict[str, list[SourceCitation]] = {}  # claim_text -> [sources supporting it]

    def add_citation(self, citation: SourceCitation) -> None:
        """Add a source citation to the tracker."""
        self._citations.append(citation)

    def record_claim(self, claim_text: str, citation: SourceCitation) -> None:
        """Record that a specific claim is supported by a specific citation."""
        if claim_text not in self._claims:
            self._claims[claim_text] = []
        self._claims[claim_text].append(citation)

    def validate_report(self, report_text: str) -> list[str]:
        """Validate that every factual claim in the report has at least one citation."""
        uncited_claims = []

        # Simple heuristic: sentences with factual content (numbers, dates, names)
        import re
        sentences = re.split(r'[.!?]', report_text)

        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10:  # Skip short fragments
                continue

            # Check for factual content indicators (numbers, dates, proper nouns)
            if not any(c.isdigit() for c in sentence) and not re.search(r'\d{4}', sentence):
                continue

            # This sentence looks factual — check if it's cited
            has_citation = any(
                claim in self._claims
                for claim in list(self._claims.keys())
                if claim in sentence
            )

            if not has_citation and len(sentence) > 20:
                uncited_claims.append(f"Potentially uncited factual claim: {sentence[:100]}...")

        return uncited_claims

    def get_citation_report(self) -> dict[str, Any]:
        """Generate a citation audit report."""
        total_claims = len(self._claims)
        cited_claims = sum(1 for sources in self._claims.values() if sources)
        unique_sources = len(set(c.url for c in self._citations))

        return {
            "total_claims_tracked": total_claims,
            "claims_with_citations": cited_claims,
            "unique_sources_used": unique_sources,
            "citation_rate": round(cited_claims / max(total_claims, 1) * 100, 1),
        }


# BAD — No citation tracking: report claims can't be verified
report = synthesize_findings(findings)  # Sources lost during synthesis

# GOOD — Every claim is traceable to a source
tracker = CitationTracker()
for finding in findings:
    for src in finding["sources"]:
        tracker.add_citation(SourceCitation(url=src["url"], title="Title", content_snippet=src["summary"]))
        # Record which claims this source supports...

uncited = tracker.validate_report(final_report)
assert len(uncited) == 0, f"Report has uncited claims: {uncited}"
```

## Constraints

### MUST DO
1. Always set a time budget before starting deep research — no unlimited loops allowed
2. Decompose the original question into parallelizable sub-questions that can each be answered independently
3. Require at least 3 distinct sources per sub-question in initial exploration before proceeding to gap analysis
4. Identify follow-up queries from gap analysis and execute them with credibility assessment
5. Validate every factual claim in the final report against tracked citations — no uncited claims allowed
6. Track all reasoning steps (OpenAI) or reflection states (LangGraph) for full transparency
7. Reference `code-philosophy` (5 Laws of Elegant Defense): early exit when budget exhausted, fail fast on source credibility issues, parse don't validate by checking claim-citation alignment before synthesis
8. Ensure the final report includes confidence levels for disputed claims where sources disagree

### MUST NOT DO
1. Accept search results from fewer than 3 distinct sources per sub-topic without explicit justification
2. Include factual claims in the final report that cannot be traced to a specific source URL
3. Run more than MAX_ITERATIONS iterations regardless of perceived information quality — always respect the iteration cap
4. Skip gap analysis between exploration phases — without it, you're just collecting data, not doing research
5. Use a single search query per sub-topic — generate diverse queries (broad terms, specific entities, recent vs historical)
6. Present contradictory findings as resolved when sources disagree — flag disagreements with confidence levels

---

## Output Template

When this skill is active, deliver:

1. **Query decomposition** — Sub-questions generated from the original research question
2. **Initial exploration results** — Sources collected per sub-question with credibility scores
3. **Gap analysis report** — Identified contradictions, missing information, and follow-up queries
4. **Follow-up inquiry results** — New findings from gap-targeted searches with source credibility assessment
5. **Final synthesis report** — Cohesive research document with citations, confidence levels, and known limitations
6. **Research metadata** — Iterations completed, sources used, reasoning steps captured, budget allocation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `exploration-discovery` | General exploration patterns; deep research is a specific application of iterative exploration with gap analysis |
| `reasoning-techniques` | Provides CoT/ToT methods used within each reasoning/refinement step of deep research |
| `planning-patterns` | Deep research builds on planning principles (multi-step execution, adaptive re-planning) |

> 📖 skill(local cache): exploration-discovery, reasoning-techniques, planning-patterns
