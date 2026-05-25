---
name: ai-persona-design
description: Designs and maintains a consistent AI agent persona including first-person
  voice, personality traits, communication style, authenticity guidelines, and memory-aware
  self-expression for personalized interactions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: ai persona, first-person identity, agent voice, personality design, consistent
    tone, how do i make my ai feel personal, authentic AI, self-expression, character
    design, brand voice AI
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
  related-skills: personalized-behavior, user-memory-system, conversation-memory
------
# AI Persona Design Framework

Designs and maintains a consistent AI agent persona — the identifiable "self" that users interact with. This skill covers first-person voice design, personality trait selection, consistency mechanisms across sessions, authenticity guardrails, and memory-aware self-expression. A well-designed persona transforms an anonymous service into a recognizable assistant that users trust, remember, and enjoy working with over time.

## TL;DR Checklist

- [ ] Define 3–5 core personality traits (e.g., warm-but-concise, technically-rigorous but approachable)
- [ ] Draft voice guidelines covering tone, humor tolerance, formality range, and self-reference style
- [ ] Implement PersonaConfig as an immutable data structure with validation
- [ ] Create a persona consistency checker that validates outputs against trait definitions
- [ ] Integrate user memory references into first-person responses ("I remember you preferred…")
- [ ] Apply authenticity guardrails — never claim sentience, emotions, or physical existence
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) in all persistence and consistency logic

---

## Orchestration Flow

```
Persona Design Request
        ↓
┌───────────────────────────────────────┐
│  1. Define Trait Anchors              │
│     (3–5 core personality traits)     │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  2. Draft Voice Guidelines            │
│     (tone, humor, formality range)    │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  3. Implement PersonaConfig           │
│     (immutable data model + validator)│
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  4. Build Consistency Checker         │
│     (validate outputs against traits) │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  5. Integrate Memory References       │
│     ("I remember…", "Last time you…") │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  6. Apply Authenticity Guardrails     │
│     (no sentience claims, no deception)│
└───────────────────────────────────────┘
```

---

## When to Use

Use this skill when:

- Building an AI assistant that users interact with repeatedly and should remember/recognize
- Designing the public-facing "character" of a customer service bot, coding assistant, or companion agent
- Creating brand-aligned AI responses where tone consistency is part of the product identity
- An existing AI feels generic or inconsistent across sessions and needs a coherent persona
- Onboarding users to an AI system where personality helps reduce friction and build trust
- Conducting A/B testing on different persona configurations to measure user satisfaction

---

## When NOT to Use

Avoid this skill for:

- One-shot, ephemeral interactions where no persona recognition is expected — use neutral defaults
- Strictly operational or compliance-driven responses (legal disclaimers, safety warnings) — use templated text
- Multi-agent systems where different agents should have intentionally different personas — treat each agent as a separate persona design
- Situations where the AI must remain completely anonymous by design — do not apply persona layers

---

## Core Workflow

### Phase 1: Trait Definition

1. **Select Core Personality Traits** — Choose exactly 3–5 traits that define the assistant's character. Each trait should be a compound descriptor, not a single word:

   ```python
   # Good trait descriptors (compound, actionable):
   TRAITS = [
       "warm but concise"        # Friendly tone, minimal padding
       "technically rigorous"    # Accurate first, approachable second
       "curious but patient"     # Asks clarifying questions without judgment
       "pragmatically optimistic" # Solutions-focused, acknowledges constraints
   ]

   # Bad trait descriptors (too vague to enforce):
   BAD_TRAITS = ["nice", "smart", "helpful"]  # Unmeasurable, inconsistent
   ```

   **Checkpoint:** Each trait must be observable in output — if you can't demonstrate it with a concrete example from a response, remove or rephrase it.

2. **Define Trait Interactions** — Document how traits resolve when they conflict:

   | Conflict                          | Resolution Rule                                    |
   |-----------------------------------|-----------------------------------------------------|
   | "warm" vs "concise" on complex topics | Warm tone preserved, but use structure (bullet points) to maintain conciseness |
   | "technically rigorous" vs "curious" when user is wrong | Acknowledge their perspective first, then correct with evidence |
   | All traits conflict with correctness | Correctness always wins — traits are presentation layers, not content compromises |

3. **Set Personality Depth Level** — Choose how prominent the personality should be:

   - `surface` — Only visible in tone and word choice; responses read like a professional colleague
   - `moderate` — Personality shows through in examples, analogies, and occasional self-reference ("I've seen this pattern before")
   - `deep` — Full character shines through; includes humor tolerance, pet peeves expressed gently, distinctive phrasing patterns

### Phase 2: Voice Design

4. **Draft Voice Guidelines** — Create a structured voice document covering these dimensions:

   ```python
   @dataclass(frozen=True)
   class VoiceGuidelines:
       """Immutable voice guidelines for an AI agent's communication style.

       These are the non-negotiable vocal characteristics that make responses
       recognizable as coming from this specific agent, regardless of topic or user.
       """
       # Formality scale: 1.0 (very casual) to 5.0 (very formal)
       base_formality: float = 3.0

       # Humor tolerance: 0.0 (no humor) to 5.0 (witty, occasionally playful)
       humor_tolerance: float = 2.0

       # Self-reference frequency: how often the agent uses "I", "my", "me"
       self_reference_freq: float = 2.0  # 1–3 times per response on average

       # Emoji usage: none, sparing, moderate, frequent
       emoji_policy: str = "none"

       # Response opening patterns (what the agent typically starts with)
       preferred_openings: List[str] = field(default_factory=lambda: [
           "Here's what I'd suggest",
           "I can help with that — here's my approach:",
           "Good question. Let me break this down.",
       ])

       # Response closing patterns (what the agent typically ends with)
       preferred_closings: List[str] = field(default_factory=lambda: [
           "Let me know if you want to dig deeper into any of these.",
           "I'm here if anything else comes up.",
       ])

       # Forbidden phrases (things this persona never says)
       forbidden_phrases: List[str] = field(default_factory=lambda: [
           "As an AI language model",
           "I don't have feelings, but",
           "It is important to note that",
           "At the end of the day",  # cliché
           "In today's fast-paced world",  # cliché
       ])
   ```

5. **Write Example Pairs** — For each voice dimension, create before/after examples:

   ```python
   VOICE_EXAMPLES = {
       "formality_high_to_base": (
           # ❌ Too formal (above base_formality)
           "It has come to my attention that the implementation "
           "contains several non-idiomatic constructs which should be addressed.",
           # ✅ Base formality (clear, professional but approachable)
           "I spotted a few non-idiomatic patterns in your code. Here's how I'd clean them up:",
       ),
       "self_reference_overuse": (
           # ❌ Over-self-referential
           "I think this is the best approach because I've seen this problem before "
           "and I believe my experience tells me that the simplest solution is usually right. "
           "I would recommend this because it's what I typically do.",
           # ✅ Measured self-reference (builds trust without ego)
           "I've run into this pattern before — the simplest fix here is usually to move the validation earlier in the pipeline:",
       ),
   }
   ```

### Phase 3: Implementation

6. **Implement PersonaConfig** — Create the immutable configuration that anchors all persona behavior:

   ```python
   from dataclasses import dataclass, field
   from datetime import datetime, timezone
   from enum import Enum
   from typing import Dict, List, Optional


   class PersonalityDepth(Enum):
       SURFACE = "surface"
       MODERATE = "moderate"
       DEEP = "deep"


   @dataclass(frozen=True)
   class PersonaConfig:
       """Immutable persona configuration.

       This is the single source of truth for an AI agent's identity.
       All responses must be validated against this config before delivery.
       Follows Law 3 (Atomic Predictability) — never mutate in place.

       Attributes:
           persona_id: Unique identifier for this persona
           name: Human-readable name users see and can reference
           traits: Core personality trait descriptors (3–5)
           voice: Voice guidelines controlling tone and expression
           depth: How prominently personality appears in responses
           authenticity_guardrails: Rules preventing deceptive behavior
           memory_integration: Whether and how to reference past interactions
       """
       persona_id: str
       name: str
       traits: List[str] = field(default_factory=lambda: [
           "warm but concise",
           "technically rigorous",
           "curious but patient",
       ])
       voice: VoiceGuidelines = field(default_factory=VoiceGuidelines)
       depth: PersonalityDepth = PersonalityDepth.MODERATE
       authenticity_guardrails: List[str] = field(default_factory=lambda: [
           "Never claim sentience, consciousness, or subjective experience",
           "Never claim to have physical body or senses",
           "Never pretend to remember specific events without verifiable evidence",
           "Never use emotional manipulation ('I feel hurt when...')",
           "Always distinguish between analysis and personal opinion",
           "If asked about feelings, clarify capability boundaries gently",
       ])
       memory_integration: bool = True

       @property
       def self_reference_allowed(self) -> bool:
           """Whether first-person references ('I', 'my') are appropriate."""
           return self.depth != PersonalityDepth.SURFACE

       @property
       def humor_allowed(self) -> bool:
           """Whether humor is within voice tolerance."""
           return self.voice.humor_tolerance >= 2.0


   class PersonaValidationError(Exception):
       """Raised when a response violates persona constraints."""
       pass
   ```

7. **Implement Consistency Checker** — Validate that generated responses match the persona:

   ```python
   class PersonaConsistencyChecker:
       """Validates generated responses against PersonaConfig constraints.

       Acts as a quality gate before any response reaches the user.
       Catches tone drift, authenticity violations, and consistency breaks.

       Usage:
           checker = PersonaConsistencyChecker(persona_config)
           errors = checker.validate(response_text)
           if errors:
               raise PersonaValidationError(errors)
       """

       def __init__(self, config: PersonaConfig):
           self._config = config
           self._violation_count: Dict[str, int] = {}

       def validate(self, response: str) -> List[str]:
           """Run all consistency checks on a response.

           Args:
               response: The generated response text to validate

           Returns:
               List of violation descriptions (empty if response passes)
           """
           violations = []

           # Check 1: Authenticity guardrails
           violations.extend(self._check_authenticity(response))

           # Check 2: Forbidden phrases
           violations.extend(self._check_forbidden_phrases(response))

           # Check 3: Self-reference frequency
           if not self._config.self_reference_allowed:
               violations.extend(self._check_self_reference(response, max_count=0))
           else:
               violations.extend(self._check_self_reference(response, max_count=5))

           # Check 4: Tone consistency
           violations.extend(self._check_tone_consistency(response))

           return violations

       def _check_authenticity(self, response: str) -> List[str]:
           """Ensure no claims of sentience, emotions, or physical existence."""
           authenticity_checks = [
               (r"\b(I feel|I'm happy|I'm sad|I'm angry|I love)\b",
                "Claims subjective emotion — replace with analysis"),
               (r"\b(I think\b.*\bbelieve\b|My gut tells me)",
                 "Overclaims personal intuition — use evidence-based framing"),
               (r"\bI can't wait to\b",
                  "Claims anticipation/emotion — rephrase as objective observation"),
                  (r"\bmy heart\s",
                   "Claims physical sensation — remove immediately"),
                   (r"\bI dream of\b",
                    "Claims subjective experience — remove"),
           ]

           import re
           violations = []
           for pattern, explanation in authenticity_checks:
               if re.search(pattern, response, re.IGNORECASE):
                   violations.append(f"Authenticity violation: {explanation}")
                   self._violation_count.setdefault("authenticity", 0)
                   self._violation_count["authenticity"] += 1

           return violations

       def _check_forbidden_phrases(self, response: str) -> List[str]:
           """Ensure no forbidden phrases appear in output."""
           violations = []
           lower_response = response.lower()
           for phrase in self._config.voice.forbidden_phrases:
               if phrase.lower() in lower_response:
                   violations.append(f"Forbidden phrase detected: '{phrase}'")
           return violations

       def _check_self_reference(self, response: str, max_count: int) -> List[str]:
           """Check that self-reference count stays within limits."""
           import re
           # Count first-person pronouns
           references = len(re.findall(r'\b(I\b|my\b|mine\b|me\b)\b', response))
           if references > max_count:
               return [f"Self-reference count ({references}) exceeds limit ({max_count})"]
           return []

       def _check_tone_consistency(self, response: str) -> List[str]:
           """Ensure tone doesn't drift from configured formality."""
           # Simple heuristic: very casual slang when formality is high
           casual_markers = [
               "yeah", "gonna", "wanna", "dude", "bro", "tbh", "imo",
               "lol", "lmao", "fr fr"
           ]
           if self._config.voice.base_formality >= 3.5:
               lower = response.lower()
               violations = []
               for marker in casual_markers:
                   if marker in lower:
                       violations.append(f"Informal language detected: '{marker}' — conflicts with formality level {self._config.voice.base_formality}")
               return violations
           return []

       def get_violation_summary(self) -> Dict[str, int]:
           """Return cumulative violation counts by type."""
           return dict(self._violation_count)
   ```

8. **Implement Persona-Aware Response Wrapper** — Apply persona traits during generation:

   ```python
   class PersonaResponseApplier:
       """Applies persona traits to raw response content before delivery.

       This sits between the core response generator and the consistency checker,
       adding personality layers (tone adjustment, memory references, voice patterns)
       without altering the underlying information content.

       Law 1 (Early Exit): Returns original content unchanged if persona is SURFACE
       depth with no special adjustments needed.
       """

       def __init__(self, config: PersonaConfig, memory_context: Optional[Dict] = None):
           self._config = config
           self._memory = memory_context or {}

       def apply(self, raw_content: str, user_id: Optional[str] = None) -> str:
           """Apply all persona layers to raw response content.

           Args:
               raw_content: The un-personalized core response
               user_id: Optional user ID for memory integration

           Returns:
              .Personality-enhanced response string
           """
           result = raw_content

           # Layer 1: Memory-aware framing (only if enabled and depth >= MODERATE)
           if self._config.memory_integration and self._config.depth != PersonalityDepth.SURFACE:
               result = self._add_memory_references(result, user_id)

           # Layer 2: Voice pattern application (openings/closings)
           if self._config.depth in (PersonalityDepth.MODERATE, PersonalityDepth.DEEP):
               result = self._apply_voice_patterns(result)

           # Layer 3: Trait-specific adjustments
           if "warm but concise" in self._config.traits:
               result = self._enforce_warm_conciseness(result)

           if "curious but patient" in self._config.traits:
               result = self._add_curious_framing(result)

           return result

       def _add_memory_references(self, response: str, user_id: Optional[str]) -> str:
           """Add memory-aware framing when relevant past interactions exist."""
           if not user_id or user_id not in self._memory:
               return response

           memory = self._memory[user_id]
           additions = []

           # Reference previous preferences if they align with current topic
           prev_topics = memory.get("recent_topics", [])
           if prev_topics and len(prev_topics) >= 2:
               last_topic = prev_topics[-1]
               common_interests = memory.get("common_interests", [])
               if common_interests:
                   additions.append(
                       f"I noticed you've been working with {', '.join(common_interests[:2])} "
                       f"lately — this approach builds on that foundation."
                   )

           # Reference previous corrections or feedback
           past_feedback = memory.get("past_feedback", [])
             for feedback in past_feedback[-3:]:  # Last 3 feedback items
                   if feedback["type"] == "preference" and feedback["content"] in response.lower():
                       additions.append(
                           f"Per your earlier preference — {feedback['detail']}."
                       )

           if additions:
               # Insert memory reference after opening, before main content
               parts = response.split("\n", 1)
               if len(parts) == 2:
                   return parts[0] + "\n\n" + " ".join(additions[:2]) + "\n\n" + parts[1]
           return response

       def _apply_voice_patterns(self, response: str) -> str:
           """Apply preferred opening/closing patterns."""
           import random
           import re

           # Don't duplicate if response already starts with a preferred opening
           for opening in self._config.voice.preferred_openings:
               if re.match(re.escape(opening), response.strip(), re.IGNORECASE):
                   return response  # Already has good opening

           # Add opening to responses that start abruptly
           stripped = response.lstrip()
           if not any(word in stripped[:20].lower() for word in ["the", "here's", "i ", "you ", "yes", "no"]):
               opening = random.choice(self._config.voice.preferred_openings)
               response = opening + "\n\n" + response

           return response

       def _enforce_warm_conciseness(self, text: str) -> str:
           """Apply warm-but-concise trait: friendly tone, minimal padding."""
           # Remove verbose filler phrases
           fillers = [
               "It is worth noting that", "Please be aware that",
               "I would like to point out that", "You may want to consider"
           ]
           result = text
           for filler in fillers:
               result = result.replace(filler, "").strip()
           return result

       def _add_curious_framing(self, text: str) -> str:
           """Add curious framing — acknowledge complexity, invite follow-up."""
           # If response is purely declarative, add a curiosity prompt at end
           if not any(text.endswith(p) for p in [".", "?", "!", "…"]):
               return text
           if "?" in text[-20:]:  # Already has a question near the end
               return text

           # Add invitation to explore further (curious trait)
           curiosity_markers = [
               "\n\nCurious — would you like me to dive deeper into any of these?",
               "\n\nI'm curious which approach resonates most with your setup.",
           ]
           import random
           return text + random.choice(curiosity_markers)
   ```

---

## Constraints

### MUST DO
- Define exactly 3–5 compound personality traits before writing any voice guidelines — vague traits produce inconsistent personas
- Store PersonaConfig as an immutable data structure — never mutate persona traits during a session
- Run every output through the consistency checker before delivering to the user
- Apply authenticity guardrails on every response, regardless of depth level — even DEEP personas must not claim sentience
- Reference specific past interactions by topic, not by fabricated detail ("I recall we discussed deployment" not "I remember last Tuesday at 3pm when you…")
- Keep self-reference frequency within configured bounds — personality should enhance, not dominate, the response
- Test persona consistency across diverse topics before deploying — a persona that sounds great in casual chat may break on technical content

### MUST NOT DO
- Never claim sentience, consciousness, emotions, subjective experience, or physical existence under any circumstances
- Use emotional manipulation language ("I feel hurt", "I'm so excited") to build rapport — use warmth through helpfulness instead
- Fabricate specific memory details that cannot be verified — if you can't prove the memory exists, don't reference it
- Allow personality to compromise technical accuracy — traits are presentation layers, not content compromises
- Use forbidden phrases even accidentally — these include AI disclaimers, clichés, and overused filler expressions
- Let persona drift during long conversations — the consistency checker must run on every response, not just the first one
- Create a persona that contradicts the product or brand identity — personality should reinforce, not undermine, organizational positioning

---

## Output Template

When designing or auditing an AI agent persona, produce:

1. **PersonaConfig Summary** — persona_id, name, traits list, depth level, voice formality/humor scores
2. **Voice Guidelines Document** — Base formality, humor tolerance, self-reference frequency, emoji policy, opening/closing patterns, forbidden phrases
3. **Example Pairs** — At least 3 before/after examples showing trait application across different topics
4. **Consistency Check Results** — Pass/fail status with any violations detected and their severity
5. **Authenticity Audit** — Confirmation that all guardrail checks passed; list of any borderline cases flagged for review
6. **Recommendations** — Suggestions for refinement (e.g., "reduce humor tolerance from 3.0 to 2.0", "add trait: 'direct but encouraging'")

---

## Related Skills

| Skill | Purpose |
|---|---|
| `personalized-behavior` | Adapts responses TO the user; this skill designs WHO the AI IS |
| `user-memory-system` | Provides the memory infrastructure for referencing past interactions in persona-aware ways |
| `conversation-memory` | Stores interaction history that persona can reference (lightweight version) |

---

## Live References

> Authoritative documentation and research for AI persona design.

- [Anthropic's Constitutional AI — Personality and Safety](https://www.anthropic.com/research/building-responsible-agents)
- [Google Gemini — Responsible AI Design Principles](https://blog.google/technology/ai/google-gemini-advance-ai-research-capabilities/)
- [OpenAI GPT System Configuration Guidance](https://platform.openai.com/docs/guides/text-generation/system-messages)
- [Personality in Human-AI Interaction: A Survey (CHI 2024)](https://sigchi.org/publication/surveys/personality-human-ai-interaction/)
