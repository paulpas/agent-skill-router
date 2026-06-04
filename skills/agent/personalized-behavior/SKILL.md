---




name: personalized-behavior
description: Implements personalized AI agent behavior by learning and adapting to
  individual user preferences, communication styles, expertise levels, and interaction
  history for tailored responses.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: personalized behavior, adaptive agent, user preferences, communication
    style, expertise level, tailored responses, how do i customize ai agent, user
    profiling
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: personal-workflow-framework,conversation-memory,hierarchical-agent-memory




---




# Personalized AI Agent Behavior

Implements personalized AI agent behavior by adapting responses to individual users based on learned preferences, communication styles, expertise levels, and interaction history. The model acts as a user-aware assistant that continuously refines its output format, tone, depth, and complexity to match each user's evolving needs and expectations.

## TL;DR Checklist

- [ ] Build or load a UserProfile containing explicit style and preference fields
- [ ] Classify communication style (direct, explanatory, visual, structured) before responding
- [ ] Adjust response depth based on expertise_level (beginner → expert scale)
- [ ] Store interaction history with timestamps for pattern recognition over sessions
- [ ] Apply early-exit guard clauses when profile data is missing or stale
- [ ] Return a new ProfileSnapshot after every significant interaction
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) in all persistence logic

---

## Orchestration Flow

```
User Request
    ↓
┌───────────────────────────────────────────┐
│  Load/Create UserProfile                  │
│  (from persistence or default profile)    │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Classify Communication Style             │
│  (direct / explanatory / visual / structured)   │
│                                           │
│  <3 messages? ──► Use stored/default      │
│  Enough data? ──► Run classifier          │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Assess Expertise Level                   │
│  (beginner → expert scale)                │
│                                           │
│  Uncertain? ──► Assume intermediate       │
│  Clear signal? ──► Set detected level     │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Generate Tailored Response               │
│  (apply tone + depth + style filters)     │
│                                           │
│  Validation fail? ──► Re-generate         │
│  Passes check? ──► Return to user         │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Update Profile from Interaction          │
│  (refine style/expertise from feedback)   │
│                                           │
│  Changes detected? ──► Persist snapshot   │
│  No changes? ──► Skip write               │
└───────────────────────────────────────────┘
```

## When to Use

Use this skill when:

- An AI agent needs to adapt its responses to multiple distinct users
- Building a persistent assistant that remembers user preferences across sessions
- Designing a system where response tone, depth, or format should vary by audience
- Creating onboarding flows that gradually calibrate to a user's preferred communication style
- Implementing a preference center where users can explicitly set their interaction settings
- Developing a coding assistant that adjusts explanation depth based on the developer's seniority

## When NOT to Use

Avoid this skill for:

- Single-session, one-shot interactions with no continuity need — the profiling overhead is wasted
- Situations requiring identical output for all users (e.g., legal disclaimers, compliance text) — use templated responses instead
- Real-time systems where profile lookup latency would cause unacceptable delays — cache aggressively or skip profiling
- User profiles that are actively being manipulated by untrusted parties — always validate inputs (Law 2)

---

## Core Workflow

1. **Initialize or Load User Profile** — Fetch the user's existing profile from storage, or create a new one with default settings if none exists. Default to conservative assumptions: intermediate expertise, explanatory communication style, and standard formatting preferences.
   **Checkpoint:** Validate that all required profile fields are populated; fill missing fields with documented defaults before proceeding.

2. **Classify Communication Style** — Analyze recent user messages to determine the dominant communication pattern:
   - `direct` — short sentences, action-oriented, minimal preamble
   - `explanatory` — asks "why" questions, wants reasoning and context
   - `visual` — requests diagrams, charts, or structured layouts
   - `structured` — prefers numbered lists, tables, and categorized output
   **Checkpoint:** If fewer than 3 messages exist for classification, fall back to the user's stored preference or the default style.

3. **Assess Expertise Level** — Determine the user's domain expertise on a 5-level scale:
   - `beginner` — needs definitions, step-by-step guidance, no jargon without explanation
   - `intermediate` — understands fundamentals, wants best practices and reasoning
   - `advanced` — knows core concepts, seeks edge cases, performance tradeoffs, internals
   - `expert` — expects minimal scaffolding, prefers raw technical detail and references
   **Checkpoint:** If expertise cannot be confidently assessed from interaction history, conservatively assume `intermediate` and log the uncertainty.

4. **Generate Tailored Response** — Compose the output by applying the user's profile filters:
   - Adjust tone (formal vs. casual) based on preference
   - Select appropriate depth (surface → deep-dive) based on expertise level
   - Format output according to communication style classification
   **Checkpoint:** Run a pre-output validation pass — does this response match the expected tone, depth, and format?

5. **Update Profile from Interaction** — After generating the response, update the user's profile with new observations:
   - Did the user re-ask questions at a simpler level? → expertise might be lower than assumed
   - Did the user skip explanations? → preference may lean toward `direct`
   - Track correction frequency to refine style classification
   **Checkpoint:** Write the updated ProfileSnapshot atomically — never mutate in place.

6. **Persist with Guard** — Save the profile snapshot back to storage only if meaningful changes occurred (avoid unnecessary write amplification).
   **Checkpoint:** Verify persistence succeeded before considering the interaction complete. Log any failures for retry.

### Fallback and Error Routing

- **Missing profile data** → Use documented defaults (intermediate expertise, explanatory style, neutral tone) instead of halting the interaction
- **Classification inconclusive** (< 3 messages or low confidence) → Fall back to stored preference; if none stored, use conservative defaults
- **Persistence failure** → Log the failure with retry context and continue serving the user from in-memory state; schedule a background retry on the next interaction
- **Stale profile (> 90 days without updates)** → Flag as stale, re-trigger style classification on the next message burst (> 5 messages within 1 hour)
- **Corrupt or unparseable interaction history** → Discard only the corrupt entries; keep the rest and create a fresh sub-sequence

---

## Implementation Patterns

### Pattern 1: UserProfile Data Model

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional


class CommunicationStyle(Enum):
    DIRECT = "direct"
    EXPLANATORY = "explanatory"
    VISUAL = "visual"
    STRUCTURED = "structured"


class ExpertiseLevel(Enum):
    BEGINNER = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4


class PreferenceTone(Enum):
    FORMAL = "formal"
    CASUAL = "casual"
    NEUTRAL = "neutral"


@dataclass
class UserProfile:
    """Immutable user profile snapshot.

    All fields are immutable once created. Updates produce new instances,
    following Law 3 (Atomic Predictability) — no in-place mutation of shared state.

    Attributes:
        user_id: Unique identifier for the user
        communication_style: Detected or explicitly set communication preference
        expertise_level: Domain expertise scale for response depth tuning
        tone_preference: Preferred response formality level
        formatting_preferences: Structured formatting overrides (e.g., use_markdown_tables)
        interaction_history: Recent interactions used for style classification
        created_at: Timestamp when this profile was first created
        updated_at: Timestamp of the last profile update
    """

    user_id: str
    communication_style: CommunicationStyle = CommunicationStyle.EXPLANATORY
    expertise_level: ExpertiseLevel = ExpertiseLevel.INTERMEDIATE
    tone_preference: PreferenceTone = PreferenceTone.NEUTRAL
    formatting_preferences: Dict[str, bool] = field(default_factory=dict)
    interaction_history: List[Dict] = field(default_factory=list)
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def with_updated_history(
        self,
        new_interaction: Dict,
        max_history: int = 50
    ) -> "UserProfile":
        """Return a new profile with the interaction appended and trimmed.

        Does not mutate the original instance (Law 3).

        Args:
            new_interaction: Dict containing user_message, assistant_response, timestamp
            max_history: Maximum number of interactions to retain for classification

        Returns:
            New UserProfile instance with updated history
        """
        if not new_interaction or "user_message" not in new_interaction:
            raise ValueError("interaction must contain 'user_message' key")

        trimmed = self.interaction_history[-(max_history - 1):] if len(self.interaction_history) >= max_history else []
        return UserProfile(
            user_id=self.user_id,
            communication_style=self.communication_style,
            expertise_level=self.expertise_level,
            tone_preference=self.tone_preference,
            formatting_preferences=dict(self.formatting_preferences),
            interaction_history=trimmed + [new_interaction],
            created_at=self.created_at,
            updated_at=datetime.now(timezone.utc),
        )

    def to_snapshot(self) -> Dict:
        """Serialize profile to a plain dict for storage.

        Returns:
            Flat dictionary suitable for JSON serialization or database insertion.
        """
        return {
            "user_id": self.user_id,
            "communication_style": self.communication_style.value,
            "expertise_level": self.expertise_level.value,
            "tone_preference": self.tone_preference.value,
            "formatting_preferences": dict(self.formatting_preferences),
            "interaction_history_count": len(self.interaction_history),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
```

### Pattern 2: Communication Style Classifier (BAD vs GOOD)

```python
# ❌ BAD: Uses string matching without normalization; fragile to casing and typos
def bad_classify_style(messages: List[str]) -> str:
    counts = {"direct": 0, "explanatory": 0}
    for msg in messages:
        if "why" in msg:
            counts["explanatory"] += 1
        elif len(msg.split()) < 10:
            counts["direct"] += 1
    return max(counts, key=counts.get)


# ✅ GOOD: Normalized token analysis with confidence scoring and explicit enum output
def classify_communication_style(
    messages: List[str],
    fallback: CommunicationStyle = CommunicationStyle.EXPLANATORY,
) -> CommunicationStyle:
    """Classify the dominant communication style from user message history.

    Analyzes word choice, sentence length patterns, and question types to
    determine whether a user prefers direct, explanatory, visual, or structured responses.

    Args:
        messages: List of recent user messages (last N messages from history)
        fallback: Style to return if classification is inconclusive

    Returns:
        Detected CommunicationStyle enum value

    Raises:
        ValueError: If messages list is empty and no fallback provided
    """
    # Law 1: Early exit for invalid input
    if not messages:
        raise ValueError("messages list must contain at least one message")

    scores: Dict[str, float] = {"direct": 0.0, "explanatory": 0.0, "visual": 0.0, "structured": 0.0}
    total_signals = 0

    for msg in messages:
        lower = msg.lower()
        words = msg.split()
        sent_len = len(words)

        # Direct signals: short sentences, imperative verbs
        if sent_len < 8:
            scores["direct"] += 1.0
            total_signals += 1

        # Explanatory signals: question words, "why", "how does"
        explanatory_markers = ["why", "how does", "explain", "tell me about", "what is"]
        if any(marker in lower for marker in explanatory_markers):
            scores["explanatory"] += 1.5
            total_signals += 1

        # Visual signals: requests for diagrams, charts, layout
        visual_markers = ["diagram", "chart", "visual", "graph", "layout", "draw"]
        if any(marker in lower for marker in visual_markers):
            scores["visual"] += 2.0
            total_signals += 1

        # Structured signals: requests for lists, tables, categories
        structured_markers = ["list", "table", "categorize", "compare", "structured"]
        if any(marker in lower for marker in structured_markers):
            scores["structured"] += 2.0
            total_signals += 1

    # If no signals detected, return fallback (Law 4: explicit default)
    if total_signals == 0:
        return fallback

    best_style = max(scores, key=scores.get)
    confidence = scores[best_style] / total_signals

    # Law 4: Fail fast — only commit if classification has reasonable confidence
    if confidence < 0.25:
        return fallback

    return CommunicationStyle(best_style)
```

### Pattern 3: Adaptive Response Generator

```python
def generate_toned_response(
    content: str,
    profile: UserProfile,
    include_code_examples: bool = True,
) -> str:
    """Generate a response tailored to the user's communication style and expertise.

    Adjusts tone, depth markers, and output formatting based on UserProfile fields.
    Follows Law 1 (Early Exit) by returning early for edge cases.

    Args:
        content: The core response text to adapt
        profile: Current user profile controlling adaptation parameters
        include_code_examples: Whether to wrap code in detailed explanations

    Returns:
        Formatted, personalized response string
    """
    # Law 1: Guard clauses at top
    if not content or not isinstance(content, str):
        raise ValueError("content must be a non-empty string")
    if not profile:
        raise ValueError("profile is required for personalization")

    parts = []

    # Tone prefix
    if profile.tone_preference == PreferenceTone.FORMAL:
        prefix = "Here is the detailed response:\n\n"
    elif profile.tone_preference == PreferenceTone.CASUAL:
        prefix = "Sure — here's what you need to know:\n\n"
    else:
        prefix = ""

    parts.append(prefix)

    # Depth adjustment based on expertise
    if profile.expertise_level == ExpertiseLevel.BEGINNER:
        # Insert definitions and step-by-step markers for beginners
        parts.append(_add_beginner_markers(content))
    elif profile.expertise_level == ExpertiseLevel.EXPERT:
        # Strip explanatory padding for experts — get to the point
        parts.append(_strip_explanations(content))
    else:
        # Intermediate / Advanced: keep standard depth
        parts.append(content)

    # Format according to communication style
    formatted = _apply_style_formatting("\n".join(parts), profile.communication_style)

    return formatted


def _add_beginner_markers(text: str) -> str:
    """Wrap technical terms in explanatory brackets for beginners."""
    # Simple heuristic: wrap known pattern names and technical identifiers
    markers = ["function", "class", "method", "property", "attribute"]
    result = text
    for marker in markers:
        result = result.replace(
            f"{marker} ",
            f"**{marker}** (a named block of logic) ",
        )
    return result


def _strip_explanations(text: str) -> str:
    """Remove verbose explanations, returning only essential technical content."""
    removal_patterns = [
        "In other words,", "To put it simply,", "Essentially,",
        "The key takeaway is that", "It's important to understand that",
    ]
    result = text
    for pattern in removal_patterns:
        if result.startswith(pattern):
            result = result[len(pattern):].lstrip()
    return result


def _apply_style_formatting(text: str, style: CommunicationStyle) -> str:
    """Apply communication-style-specific formatting to response text."""
    # Law 2: Parse at boundary — validate style enum
    if not isinstance(style, CommunicationStyle):
        raise TypeError(f"Expected CommunicationStyle, got {type(style).__name__}")

    if style == CommunicationStyle.STRUCTURED:
        # Wrap in categorized sections
        return f"[Structured]\n{text}\n[End Structured]"
    elif style == CommunicationStyle.VISUAL:
        # Add ASCII visual markers
        return f"[Visual Layout]\n{text}\n[End Visual Layout]"
    else:
        # Direct and Explanatory pass through unchanged (they control depth, not format)
        return text
```

### Pattern 4: Personalization Context Service

```python
class PersonalizationService:
    """Orchestrates user profiling, style classification, and response personalization.

    Acts as the central service that ties UserProfile management, CommunicationStyle
    classification, and AdaptiveResponse generation together into a cohesive pipeline.

    Follows Law 5 (Intentional Naming) — every method name describes its full responsibility.
    """

    def __init__(self, profile_store: Optional[Dict] = None):
        """Initialize service with optional profile storage.

        Args:
            profile_store: Mutable dict simulating a database of user profiles.
                          Keyed by user_id (str) → UserProfile.
        """
        self._store: Dict[str, UserProfile] = profile_store or {}

    def get_or_create_profile(self, user_id: str) -> UserProfile:
        """Retrieve an existing profile or create a fresh one with defaults.

        Args:
            user_id: Unique user identifier

        Returns:
            UserProfile instance (existing or newly minted with conservative defaults)
        """
        if not user_id or not isinstance(user_id, str):
            raise ValueError("user_id must be a non-empty string")

        if user_id not in self._store:
            self._store[user_id] = UserProfile(user_id=user_id)

        return self._store[user_id]

    def record_interaction_and_adapt(
        self,
        user_id: str,
        user_message: str,
        assistant_response: str,
    ) -> Dict:
        """Record a full interaction, reclassify the user's style, and adapt.

        This is the main entry point for the personalization pipeline:
        1. Load profile
        2. Record interaction into history
        3. Reclassify communication style from updated history
        4. Return adaptation results for the caller to use in response generation.

        Args:
            user_id: Unique identifier of the interacting user
            user_message: The message sent by the user
            assistant_response: The message generated by the assistant

        Returns:
            Dict with keys: profile_snapshot, detected_style, expertise_level, adaptation_applied
        """
        # Step 1: Load or create
        profile = self.get_or_create_profile(user_id)

        # Step 2: Record interaction
        new_interaction = {
            "user_message": user_message,
            "assistant_response": assistant_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        updated_profile = profile.with_updated_history(new_interaction)

        # Step 3: Reclassify from full history
        message_texts = [
            hist["user_message"] for hist in updated_profile.interaction_history
        ]
        detected_style = classify_communication_style(message_texts)

        # Step 4: Build adaptation result
        return {
            "profile_snapshot": updated_profile.to_snapshot(),
            "detected_style": detected_style.value,
            "expertise_level": updated_profile.expertise_level.name,
            "adaptation_applied": True,
        }

    def get_personalized_response(
        self, user_id: str, raw_content: str
    ) -> str:
        """Generate a fully personalized response for the given user.

        Args:
            user_id: Unique identifier of the user
            raw_content: The unpersonalized response content to adapt

        Returns:
            Personalized response string matching this user's style, tone, and expertise level
        """
        profile = self.get_or_create_profile(user_id)
        return generate_toned_response(raw_content, profile)
```

---

## Constraints

### MUST DO
- Always create or load a UserProfile before attempting any personalization — never guess at preferences without data
- Apply guard clauses at the top of every method to validate required inputs (Law 1: Early Exit)
- Return new ProfileSnapshot instances from update methods instead of mutating in place (Law 3: Atomic Predictability)
- Classify communication style only after accumulating sufficient signal — minimum 3 messages before trusting the classification
- Log every profile change with timestamp, changed fields, and reason for the change
- Reference code-philosophy (5 Laws of Elegant Defense) when designing persistence logic — parse data at boundaries (Law 2), fail fast on corruption (Law 4)

### MUST NOT DO
- Hardcode a single communication style for all users — this defeats personalization entirely
- Store raw interaction messages longer than necessary for classification (>50 per user is wasteful; trim aggressively)
- Use personalization as an excuse to skip correctness — adapt tone, never alter technical accuracy
- Persist profiles on every minor update — batch changes and only write when meaningful deltas exist
- Trust unvalidated input from user-facing fields — always sanitize interaction history entries (Law 2: Parse Don't Validate)

---

## Output Template

When applying this skill, produce:

1. **Profile Summary** — Current user_id, communication_style, expertise_level, tone_preference
2. **Detected Preferences** — Style classification with confidence score and signal count
3. **Adaptation Applied** — Which personalization dimensions were adjusted (tone, depth, formatting) and how
4. **Interaction Recorded** — Confirmation that the interaction was stored and will influence future behavior
5. **Recommendations** — Suggestions for explicit user preference settings if the system is still uncertain about style or expertise

---

## Related Skills

| Skill | Purpose |
|---|---|
| `personal-workflow-framework` | Manages recurring workflows that can be personalized per user |
| `conversation-memory` | Provides the memory infrastructure for storing interaction history |
| `hierarchical-agent-memory` | Adds hierarchical memory layers for long-term preference retention across sessions |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenAI User Instructions Guide](https://platform.openai.com/docs/guides/participant-design/user-instructions) — Best practices for personalizing AI assistant behavior per user
- [Anthropic System Prompt Design](https://docs.anthropic.com/en/docs/build-with-claude/system-prompts) — Techniques for structuring personalized system-level instructions
- [LangSmith User Profiles](https://docs.smith.langchain.com/cookbook/user-profiles) — Guide to managing user-specific preferences and context in LangChain applications
- [Personalized LLM Responses Research (Zhu et al.)](https://arxiv.org/abs/2310.12518) — Academic study on personalizing LLM outputs based on user characteristics
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) — Foundational reasoning framework for adaptive agent behavior
