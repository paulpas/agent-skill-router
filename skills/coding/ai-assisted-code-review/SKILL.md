---




name: ai-assisted-code-review
description: Orchestrates AI-augmented code review workflows combining LLM-based analysis with human judgment for comprehensive PR quality assurance in modern development teams.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ai code review, copilot review, llm code review, claude code review, cursor code review, automated review, AI-assisted review, how do i use AI for code review
  archetypes:
    - tactical
    - orchestration
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-code-review, coding-testing-patterns, agent-task-routing




---





# AI-Assisted Code Review

Senior engineer orchestrating a hybrid review process that combines LLM-based static analysis with human domain judgment. This skill makes the model act as a review orchestrator — constructing targeted prompts for AI tools, synthesizing their outputs, identifying gaps in AI coverage, and producing a structured report that separates confirmed issues from AI hypotheses requiring human verification.

## TL;DR Checklist

- [ ] Extract PR metadata: diff stats, changed file types, author history, branch comparison target
- [ ] Construct domain-specific review prompts (security, correctness, performance) — never use a single generic prompt
- [ ] Run parallel AI checks with distinct angles; each must have pass/fail status
- [ ] Cross-reference AI findings against human knowledge of the codebase architecture and business logic
- [ ] Flag every AI suggestion as "confirmed" or "hypothesis requiring human review" — never present AI output as fact
- [ ] Verify AI confidence: check if type hints, imports, and test coverage exist for changed modules
- [ ] Produce structured report with severity tiers and actionable remediation steps

---

## When to Use

Use this skill when:

- A pull request has been opened and needs comprehensive review before merge
- You want to leverage AI tools (GitHub Copilot, Claude Code, Cursor, GitHub Advanced Security) as part of the review pipeline
- The PR touches multiple subsystems where no single reviewer has full domain knowledge
- Reviewing code from unfamiliar authors or outside your core service area
- You need to catch security vulnerabilities that static analysis alone misses but AI can contextualize

---

## When NOT to Use

Avoid this skill for:

- Tiny one-line fixes (typos, variable renames) — the overhead of orchestration exceeds the benefit
- Reviewing code you have deep expertise in where your judgment is faster and more reliable than any AI
- Production deployment approvals that require formal sign-off — AI output cannot replace accountability
- Situations where the AI tool has no access to your codebase or repo context (empty prompts, no git history)

---

## Core Workflow

### Phase 1: Gather PR Context

**Step 1: Extract PR metadata and diff characteristics.**

Collect the following before constructing any AI prompt:
- Number of changed lines (insertions, deletions, modifications) per file
- File types affected (`.py`, `.ts`, `.go`, `Dockerfile`, `.yaml`, etc.)
- Branch comparison target (`main`, `develop`, specific release branch)
- PR author's recent commit history on this project (new contributor vs. established team member)
- Whether tests were added, modified, or skipped

```python
def extract_pr_metadata(
    pr_number: int,
    repo_path: str = "."
) -> dict:
    """Extract structured metadata from a pull request for AI review context.

    Returns a dictionary with diff stats, file types, author history, and test coverage.

    Args:
        pr_number: The pull request number to analyze
        repo_path: Path to the git repository root

    Returns:
        Dictionary containing PR metadata structured for AI prompt construction
    """
    import subprocess
    import re
    from pathlib import Path

    # Get diff stats between PR branch and target
    target_branch = subprocess.check_output(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=repo_path
    ).decode().strip()

    diff_output = subprocess.check_output(
        ["git", "diff", f"origin/{target_branch}...HEAD"],
        cwd=repo_path,
        stderr=subprocess.DEVNULL
    ).decode(errors="replace")

    # Parse line counts per file
    file_changes: dict[str, dict] = {}
    for hunk_match in re.finditer(
        r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", diff_output
    ):
        added_lines = int(hunk_match.group(1))

    # Count by file type from changed files
    changed_files = subprocess.check_output(
        ["git", "diff", "--name-only", f"origin/{target_branch}...HEAD"],
        cwd=repo_path,
        stderr=subprocess.DEVNULL
    ).decode().strip().split("\n")

    file_types: dict[str, int] = {}
    for filepath in changed_files:
        if not filepath:
            continue
        ext = Path(filepath).suffix or "(no extension)"
        file_types[ext] = file_types.get(ext, 0) + 1

    return {
        "pr_number": pr_number,
        "changed_files": len(changed_files),
        "file_types": file_types,
        "target_branch": target_branch,
        "changed_lines_raw": diff_output,
    }
```

**Checkpoint:** You have counted changed lines by file type. If more than 3 file types are present, plan to use different AI prompts for each category (e.g., security scan for `.yaml` config changes, correctness review for code changes).

### Phase 2: Construct Targeted AI Prompts

**Step 2: Build domain-specific review prompts based on diff characteristics.**

Never send a single generic prompt like "review this PR." Instead, construct separate prompts for each review angle:

- **Security review**: Focus on injection points, auth changes, secrets exposure
- **Correctness review**: Focus on logic errors, edge cases, type safety
- **Performance review**: Focus on N+1 queries, unnecessary allocations, algorithmic complexity
- **Style/conventions review**: Focus on naming, patterns consistent with the codebase

```python
def construct_review_prompts(
    pr_metadata: dict,
    diff_content: str,
    context: dict
) -> dict[str, str]:
    """Generate targeted AI review prompts for different quality angles.

    Each prompt is specialized for a specific review concern and includes
    the relevant subset of the diff plus domain-specific guidance.

    Args:
        pr_metadata: Output from extract_pr_metadata()
        diff_content: The full git diff text
        context: Additional context (codebase conventions, known hotspots)

    Returns:
        Dictionary mapping review angles to constructed prompts
    """
    file_types = pr_metadata.get("file_types", {})
    num_files = pr_metadata.get("changed_files", 0)

    # Security prompt — focus on auth, secrets, injection vectors
    security_prompt = f"""Review the following {num_files} changed files for security vulnerabilities.
Focus areas:
1. SQL/NoSQL injection in any query construction
2. Hardcoded secrets, API keys, or credentials in configuration files
3. Authentication or authorization logic changes — are permissions correctly enforced?
4. Input validation on new public endpoints or API parameters
5. Secrets exposure through error messages, logs, or debug output

Changed files by type: {file_types}
Context from codebase conventions: {context.get('conventions', 'standard practices')}

Diff to review:
{diff_content[:12000]}  # Truncated for context window; request full diff if needed

Return findings in this format:
- Severity: [CRITICAL|HIGH|MEDIUM|LOW]
- File: [filepath]
- Line: [line number or range]
- Issue: [specific description]
- AI Confidence: [HIGH|MEDIUM|LOW] — explain what makes confidence high or low
  (e.g., HIGH = clear pattern match, MEDIUM = contextual reasoning, LOW = speculative)
- Suggested Fix: [concrete code change]"""

    # Correctness prompt — focus on logic and edge cases
    correctness_prompt = f"""Review the following {num_files} changed files for logical correctness.
Focus areas:
1. Edge cases in new conditional branches (empty lists, null values, zero-length inputs)
2. Error handling — are exceptions caught at the right layer? Are errors propagated?
3. Type consistency — are type hints accurate and used correctly throughout the change?
4. Race conditions or concurrency issues if this touches shared state
5. API contract violations — do request/response shapes match the documented interface

Changed files by type: {file_types}

Diff to review:
{diff_content[:12000]}

Return findings in this format:
- Severity: [CRITICAL|HIGH|MEDIUM|LOW]
- File: [filepath]
- Issue: [specific description of the logic concern]
- AI Confidence: [HIGH|MEDIUM|LOW]
- Suggested Fix: [concrete code change]"""

    # Performance prompt — focus on efficiency
    performance_prompt = f"""Review the following {num_files} changed files for performance issues.
Focus areas:
1. N+1 query patterns or missing data fetch optimizations (prefetch, select_related)
2. Unnecessary allocations inside loops (string concatenation in loops, repeated regex compilation)
3. Algorithmic complexity changes — did a linear search become quadratic?
4. I/O operations that could be batched or cached
5. Missing async/await patterns where blocking I/O is used

Diff to review:
{diff_content[:12000]}

Return findings in this format:
- Severity: [CRITICAL|HIGH|MEDIUM|LOW]
- File: [filepath]
- Issue: [specific performance concern with estimated impact]
- AI Confidence: [HIGH|MEDIUM|LOW]
- Suggested Fix: [concrete optimization approach]"""

    return {
        "security": security_prompt,
        "correctness": correctness_prompt,
        "performance": performance_prompt,
    }
```

**Checkpoint:** Each prompt targets a distinct review angle. If the PR only contains configuration changes (`.yaml`, `.json`), skip the correctness and performance prompts — focus on security and validation of schema.

### Phase 3: Execute Parallel AI Checks

**Step 3: Run the constructed prompts through your AI tooling in parallel.**

Execute all review prompts simultaneously where possible. Track results with a structured status object:

```python
from dataclasses import dataclass, field
from enum import Enum


class Severity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AIConfidence(Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class ReviewFinding:
    severity: Severity
    file: str
    line: int | None
    issue: str
    ai_confidence: AIConfidence
    suggested_fix: str
    review_angle: str  # "security", "correctness", or "performance"
    human_verified: bool = False
    human_comment: str | None = None


@dataclass
class ReviewResult:
    angle: str
    findings: list[ReviewFinding] = field(default_factory=list)
    status: str = "pending"  # "pass", "fail", "inconclusive"
    errors: list[str] = field(default_factory=list)

    @property
    def pass_status(self) -> bool:
        """True if no findings above LOW severity."""
        critical_or_higher = [
            f for f in self.findings
            if f.severity in (Severity.CRITICAL, Severity.HIGH)
        ]
        return len(critical_or_higher) == 0

    @property
    def has_low_confidence_findings(self) -> bool:
        """True if any finding has LOW AI confidence — needs human attention."""
        return any(f.ai_confidence == AIConfidence.LOW for f in self.findings)


async def run_parallel_reviews(
    prompts: dict[str, str],
    ai_client,  # Any LLM client (copilot, claude, cursor API)
) -> dict[str, ReviewResult]:
    """Execute all review prompts concurrently and collect structured results.

    Each prompt runs in parallel. Results are parsed into ReviewResult objects
    with pass/fail status per review angle.

    Args:
        prompts: Dictionary of {angle: prompt_text} from construct_review_prompts()
        ai_client: Async LLM client with .chat_completion(messages) method

    Returns:
        Dictionary mapping review angles to their ReviewResult objects
    """
    import asyncio

    results: dict[str, ReviewResult] = {}

    async def review_one(angle: str, prompt: str) -> ReviewResult:
        try:
            response = await ai_client.chat_completion([{"role": "user", "content": prompt}])
            parsed = parse_ai_findings(response.text, angle)
            return ReviewResult(angle=angle, findings=parsed, status="pass" if all(
                f.severity not in (Severity.CRITICAL, Severity.HIGH) for f in parsed
            ) else "fail")
        except Exception as e:
            return ReviewResult(angle=angle, errors=[str(e)], status="inconclusive")

    # Run all review angles in parallel
    tasks = [review_one(angle, prompt) for angle, prompt in prompts.items()]
    review_results = await asyncio.gather(*tasks)

    for result in review_results:
        results[result.angle] = result

    return results


def parse_ai_findings(response_text: str, review_angle: str) -> list[ReviewFinding]:
    """Parse LLM response text into structured ReviewFinding objects.

    Expects the LLM to return findings in the format specified by the prompt template.

    Args:
        response_text: Raw text output from the AI tool
        review_angle: Which review angle this result is for

    Returns:
        List of parsed ReviewFinding objects
    """
    import re

    findings = []
    # Match pattern blocks from structured AI output
    pattern = re.compile(
        r"-?\s*Severity:\s*\[?([CRITICALHIGHMEDIUMLOW])\]?"
        r".*?File:\s*(.+?)"
        r".*?(?:Line:\s*(\d+))?"
        r".*?Issue:\s*(.+?)"
        r".*?AI Confidence:\s*\[?(HIGH|MEDIUM|LOW)\]?"
        r".*?Suggested Fix:\s*(.+)",
        re.DOTALL | re.IGNORECASE,
    )

    for match in pattern.finditer(response_text):
        severity = Severity(match.group(1).upper())
        ai_confidence = AIConfidence(match.group(5).upper())

        findings.append(ReviewFinding(
            severity=severity,
            file=match.group(2).strip(),
            line=int(match.group(3)) if match.group(3) else None,
            issue=match.group(4).strip().split("\n")[0],
            ai_confidence=ai_confidence,
            suggested_fix=match.group(6).strip(),
            review_angle=review_angle,
        ))

    return findings
```

**Checkpoint:** Each review angle has a status (`pass`, `fail`, or `inconclusive`). If any angle returned `inconclusive` (AI tool error or timeout), note which one and proceed with remaining results — do not block on a single failed check.

### Phase 4: Synthesize Findings with Human Judgment

**Step 4: Correlate AI findings against your knowledge of the codebase.**

The model must evaluate each finding through these lenses:

| AI Confidence | Code Context Present | Human Action Required |
|---|---|---|
| HIGH | Full module visible, imports traceable | Verify the suggested fix compiles and runs |
| HIGH | Partial context, unclear dependencies | Verify — check if the flagged pattern is intentional |
| MEDIUM | Any context level | Investigate — AI reasoning needs human validation |
| LOW | Any context level | **Must** investigate — treat as a hypothesis, not a finding |

```python
def assess_finding_reliability(
    finding: ReviewFinding,
    codebase_context: dict,
) -> tuple[bool, str]:
    """Evaluate whether an AI finding is reliable based on context availability.

    Returns (should_trust, reason) — when should_trust is False, the reviewer
    must investigate the finding independently before acting on it.

    Args:
        finding: The AI-generated review finding to assess
        codebase_context: Dict with keys: 'has_type_hints', 'imports_traceable',
                         'has_tests', 'known_false_positives'

    Returns:
        Tuple of (trustworthiness, explanation for the reviewer)
    """
    if finding.ai_confidence == AIConfidence.LOW:
        return False, (
            "AI confidence is LOW — this finding is a hypothesis requiring "
            "independent verification. The AI may be applying a pattern from "
            "a different codebase or language."
        )

    reliability_factors = []
    if not codebase_context.get("has_type_hints", False):
        reliability_factors.append(
            "No type hints in changed module — AI reasoning is speculative"
        )
    if not codebase_context.get("imports_traceable", False):
        reliability_factors.append(
            "Cannot trace imports — AI may be referencing unknown dependencies"
        )
    if finding.severity == Severity.CRITICAL and not codebase_context.get("has_tests", False):
        reliability_factors.append(
            "CRITICAL severity with no tests in module — requires manual reproduction"
        )

    if finding.revision_angle == "security" and not codebase_context.get("known_false_positives", []):
        # Security scanners commonly flag safe patterns as risky
        pass  # Do NOT auto-trust security findings without context

    if reliability_factors:
        return False, " + ".join(reliability_factors)

    if finding.ai_confidence == AIConfidence.HIGH and len(reliability_factors) == 0:
        return True, (
            "AI confidence is HIGH and codebase context is sufficient. "
            "This finding should be treated as reliable but still reviewed."
        )

    # Default to MEDIUM — investigate before acting
    return False, "MEDIUM reliability — AI reasoning plausible but needs human validation"
```

**Checkpoint:** Every finding with `ai_confidence == LOW` must be marked as "hypothesis requiring human review" in the final report. Never merge based solely on AI's pass/fail status for any single angle.

### Phase 5: Generate Structured Review Report

**Step 5: Compile all findings into a prioritized report.**

The report separates confirmed issues from hypotheses and includes severity ordering, actionable fixes, and an overall verdict recommendation.

---

## Implementation Patterns

### Pattern 1: PR Diff Analyzer with Context Building

```python
"""Complete PR diff analyzer that builds rich context for AI review prompts."""

import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FileChange:
    path: str
    status: str  # "added", "modified", "deleted", "renamed"
    additions: int = 0
    deletions: int = 0
    file_type: str = ""

    @property
    def is_config(self) -> bool:
        return Path(self.path).suffix in (".yaml", ".yml", ".json", ".toml", ".ini")

    @property
    def is_code(self) -> bool:
        return Path(self.path).suffix in (".py", ".ts", ".js", ".go", ".rs", ".java", ".rb")


@dataclass
class PRContext:
    pr_number: int
    author_username: str = ""
    changed_files: list[FileChange] = field(default_factory=list)
    commit_count: int = 0
    has_test_changes: bool = False
    breaking_change_indicators: list[str] = field(default_factory=list)

    @property
    def total_lines_changed(self) -> int:
        return sum(f.additions + f.deletions for f in self.changed_files)

    @property
    def is_large_pr(self) -> bool:
        """PRs over 500 lines of changes need split review."""
        return self.total_lines_changed > 500


def build_pr_context(
    repo_path: str = ".",
    pr_ref: str | None = None,
) -> PRContext:
    """Build comprehensive context for a pull request from git history and diff stats.

    Args:
        repo_path: Path to the repository root
        pr_ref: Git ref for the PR branch (defaults to current HEAD)

    Returns:
        PRContext with structured change information
    """
    import json
    import re

    cmd = ["git", "log", "--format=%an|%H"]
    if pr_ref:
        cmd.append(pr_ref)
    else:
        cmd.append("-5")  # Last 5 commits

    log_output = subprocess.check_output(cmd, cwd=repo_path).decode()

    # Extract unique authors and commit count
    authors = set()
    for line in log_output.strip().split("\n"):
        if "|" in line:
            authors.add(line.split("|")[0])

    # Parse diff stats
    stat_output = subprocess.check_output(
        ["git", "diff", "--stat", "origin/main"],
        cwd=repo_path,
        stderr=subprocess.DEVNULL
    ).decode(errors="replace")

    file_changes: list[FileChange] = []
    has_tests = False
    breaking_indicators = []

    for line in stat_output.split("\n"):
        # Match lines like " src/module.py | 15 ++++--- "
        match = re.match(r"^\s*(.+?)\s*\|\s+\d+", line)
        if not match:
            continue

        filepath = match.group(1).strip()
        change = FileChange(path=filepath, status="modified")

        # Count test file changes
        if "test" in filepath.lower():
            has_tests = True

        # Detect breaking change indicators
        if re.search(r"__init__\.py", filepath):
            if "removed" in stat_output and filepath in stat_output:
                breaking_indicators.append(f"Module potentially removed: {filepath}")
        if re.search(r"\.yaml|\.yml|Dockerfile", filepath):
            change.file_type = "config"
        else:
            change.file_type = Path(filepath).suffix.lstrip(".")

        file_changes.append(change)

    return PRContext(
        pr_number=0,  # Set from upstream API if available
        changed_files=file_changes,
        author_username=", ".join(sorted(authors)),
        has_test_changes=has_tests,
        breaking_change_indicators=breaking_indicators,
    )
```

### Pattern 2: AI Prompt Template System (BAD vs. GOOD)

```python
"""Template system for constructing effective review prompts."""


# ❌ BAD: Generic prompt that produces unfocused, low-value output
BAD_PROMPT_TEMPLATE = """
Please review this pull request and tell me if there are any issues.
Check for bugs, style problems, and anything else you think is important.
Here is the diff:

{diff}

Give me your feedback.
"""
# Problems with BAD template:
# - No focus area → AI scatters attention across everything
# - "Anything else you think is important" invites hallucination
# - No output format → hard to parse results programmatically
# - No confidence scoring → cannot distinguish reliable from speculative findings

# ✅ GOOD: Structured prompt with specific review angle and output format
GOOD_PROMPT_TEMPLATE = """You are a senior {reviewer_role} reviewing a pull request.
Focus ONLY on the following concern: {focus_area}.

CONTEXT:
- Pull Request #{pr_number}: {pr_description}
- Changed files ({num_files} total): {changed_files_summary}
- Author experience: {author_experience_level}
- Tests added: {has_tests}

{focus_area_guidance}

RULES FOR YOUR ANALYSIS:
1. Only report issues you can point to specific lines in the diff
2. If you are unsure, assign MEDIUM or LOW confidence and explain why
3. For each finding, provide a concrete suggested fix (not just "consider refactoring")
4. Do not flag style preferences that match the project's existing conventions
5. Never invent issues — if the code is clean for this concern, say so explicitly

DIFF TO REVIEW:
{diff}

OUTPUT FORMAT (use exactly this structure for each finding):
---
Severity: CRITICAL|HIGH|MEDIUM|LOW
File: relative/path/to/file.py
Line: 42 or N/A
Issue: One-sentence description of the specific concern found in the diff
AI Confidence: HIGH|MEDIUM|LOW
Reasoning: Why this is a concern (max 2 sentences)
Suggested Fix: Concrete code change to resolve the issue
---

If no issues found for {focus_area}, output exactly:
"CLEAN: No {focus_area} issues detected in this PR."
"""


def build_security_prompt(pr_context: PRContext, diff_text: str) -> str:
    """Build a security-focused review prompt using the GOOD template.

    Args:
        pr_context: PR context from build_pr_context()
        diff_text: Full git diff text

    Returns:
        Formatted prompt string ready for LLM consumption
    """
    files_summary = ", ".join(
        f"{f.path} ({f.additions}+ {f.deletions}-)"
        for f in pr_context.changed_files[:10]
    )

    return GOOD_PROMPT_TEMPLATE.format(
        reviewer_role="application security engineer",
        focus_area="security vulnerabilities (injection, auth bypass, secrets exposure)",
        focus_area_guidance="""SECURITY FOCUS AREAS:
- SQL/NoSQL injection in query strings or ORM usage
- Hardcoded credentials, API keys, tokens in code or config
- Authentication/authorization logic changes
- Input validation on all external data entry points
- Secret rotation requirements for changed configurations
- CORS policy changes that may widen access
- File upload handling and path traversal prevention""",
        pr_number=pr_context.pr_number,
        pr_description="Security review requested",
        num_files=len(pr_context.changed_files),
        changed_files_summary=files_summary,
        author_experience_level="unknown — treat all code as needing scrutiny",
        has_tests="yes" if pr_context.has_test_changes else "no",
        diff=diff_text[:10000],
        focus_area="security vulnerabilities",
    )
```

### Pattern 3: Confidence Scoring System

```python
"""Evaluate the reliability of AI-generated review findings based on codebase signals."""


from enum import Enum


class SignalScore(Enum):
    PRESENT = 1.0       # Strong signal supporting reliable analysis
    PARTIAL = 0.5       # Weak or partial signal — reasoning is speculative
    ABSENT = 0.0        # No signal — AI is analyzing in a vacuum


def compute_ai_reliability_score(
    finding: ReviewFinding,
    module_info: dict[str, Any],
) -> float:
    """Compute a reliability score (0.0–1.0) for an AI review finding.

    The score combines multiple signals about how much context the AI has
    to make its judgment. Higher scores mean the finding is more trustworthy.

    Scoring factors:
    - Type hints present in module: +0.25 (AI can verify type-related claims)
    - Imports are resolvable: +0.20 (AI isn't guessing about dependencies)
    - Tests exist for changed functions: +0.25 (behavior is observable)
    - AI's own confidence rating: +0.15 if HIGH, +0.075 if MEDIUM, 0 if LOW
    - Codebase convention documentation available: +0.15

    Args:
        finding: The AI review finding to score
        module_info: Dict with keys 'has_type_hints', 'imports_traceable',
                    'test_coverage', 'convention_docs'

    Returns:
        Reliability score from 0.0 (completely unreliable) to 1.0 (highly reliable)
    """
    if finding.ai_confidence == AIConfidence.LOW:
        # Low-confidence findings are capped regardless of other signals
        return min(0.35, _base_score_from_signals(module_info))

    base = _base_score_from_signals(module_info)

    # Boost from AI's self-assessment
    if finding.ai_confidence == AIConfidence.HIGH:
        confidence_boost = 0.15
    elif finding.ai_confidence == AIConfidence.MEDIUM:
        confidence_boost = 0.075
    else:
        confidence_boost = 0.0

    return min(1.0, base + confidence_boost)


def _base_score_from_signals(module_info: dict[str, Any]) -> float:
    """Compute the base reliability score from available code context signals."""
    score = 0.0

    # Type hints enable accurate type-related analysis
    if module_info.get("has_type_hints", False):
        score += SignalScore.PRESENT.value * 0.25
    elif module_info.get("partial_type_hints", False):
        score += SignalScore.PARTIAL.value * 0.25

    # Traceable imports mean AI isn't guessing about external APIs
    if module_info.get("imports_traceable", False):
        score += SignalScore.PRESENT.value * 0.20
    elif module_info.get("partial_imports", False):
        score += SignalScore.PARTIAL.value * 0.20

    # Test coverage validates behavior claims
    if module_info.get("test_coverage_percent", 0) > 60:
        score += SignalScore.PRESENT.value * 0.25
    elif module_info.get("test_coverage_percent", 0) > 20:
        score += SignalScore.PARTIAL.value * 0.25

    # Convention docs help AI apply correct style judgments
    if module_info.get("convention_docs", False):
        score += SignalScore.PRESENT.value * 0.15

    return min(0.8, score)  # Cap at 0.8 — some uncertainty always remains


def classify_finding_for_reviewer(
    finding: ReviewFinding,
    reliability_score: float,
) -> str:
    """Classify a finding into an action category for the human reviewer.

    Args:
        finding: The AI review finding
        reliability_score: Output from compute_ai_reliability_score()

    Returns:
        One of: "fix-now", "review-cautiously", "investigate", "dismiss"
    """
    # High severity + high reliability = fix immediately
    if finding.severity in (Severity.CRITICAL, Severity.HIGH) and reliability_score >= 0.7:
        return "fix-now"

    # Medium severity or moderate reliability = review with caution
    if finding.severity == Severity.MEDIUM or (reliability_score >= 0.4 and reliability_score < 0.7):
        return "review-cautiously"

    # Low severity or very low reliability = investigate independently
    if reliability_score < 0.3 or finding.severity == Severity.LOW:
        return "investigate"

    # Very high confidence in a clean assessment = dismiss as non-issue
    if finding.severity == Severity.LOW and reliability_score >= 0.8:
        return "dismiss"

    return "investigate"
```

---

## Constraints

### MUST DO
- Extract PR metadata (diff stats, file types, author history) before constructing any AI prompt
- Use separate prompts for security, correctness, and performance — never a single generic review request
- Run all review angles in parallel to minimize review latency
- Score every AI finding's reliability using type hints, import traceability, and test coverage as signals
- Classify every finding as "fix-now," "review-cautiously," "investigate," or "dismiss"
- Mark all LOW-confidence AI findings with a "hypothesis requiring human review" label
- Include a concrete suggested fix with every finding — never flag an issue without proposing resolution
- Produce a structured report with severity tiers, not a raw dump of AI output

### MUST NOT DO
- Present any AI output as verified fact — always distinguish confirmed issues from hypotheses
- Use a single generic prompt like "review this PR" for all changes regardless of file type
- Accept AI pass/fail status as the final verdict — human judgment is required for every HIGH/CRITICAL finding
- Skip context extraction and ask AI to review diffs without understanding the codebase structure
- Trust security findings at face value when the AI lacks access to dependency versions or deployment config
- Block merges solely on AI suggestions with LOW confidence scores

---

## Output Template

When this skill is active, produce a structured review report containing:

1. **PR Summary** — Changed files count, line counts by type, test changes present/absent, author profile
2. **AI Review Results per Angle** — For each angle (security, correctness, performance): status (pass/fail/inconclusive), finding count by severity, list of LOW-confidence items flagged for investigation
3. **Prioritized Findings** — All CRITICAL and HIGH findings listed first, each with: file, line, description, AI confidence, reliability score, classification (fix-now/review-cautiously/investigate/dismiss)
4. **Human Investigation List** — Every finding classified as "investigate" or "review-cautiously" with specific questions the human reviewer should answer
5. **Overall Verdict** — APPROVE / APPROVE WITH COMMENTS / REQUEST CHANGES, with justification referencing the top findings and their classifications

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-review` | Manual PR review methodology — use alongside AI-assisted for comprehensive coverage |
| `coding-testing-patterns` | Validate that test changes accompany code changes — complements correctness review angle |
| `agent-task-routing` | Route complex multi-PR reviews to parallel agent workers when scale demands it |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub Copilot Documentation — AI-Assisted Development](https://docs.github.com/en/copilot)
- [Claude Code by Anthropic — Command Line AI Assistant](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Cursor IDE — AI-Powered Code Editor Documentation](https://docs.cursor.com/)
- [Semgrep — Static Analysis for Code Security](https://semgrep.dev/docs/)
- [GitHub Advanced Security — Code Scanning Alerts](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning)
- [DefectDojo — Open Source Application Vulnerability Management](https://defectdojo.org/)
- [Reviewable.io — PR Review Best Practices Guide](https://reviewable.io/docs)
