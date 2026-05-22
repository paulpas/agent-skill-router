---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Detects and removes AI writing patterns to produce natural human writing through two-pass editing process
license: MIT
maturity: stable
metadata:
  domain: writing
  output-format: analysis
  related-skills: code-review, markdown-best-practices
  role: review
  scope: review
  triggers: humanize text, remove AI writing, edit for natural, avoid AI patterns, write like human, writing edit, text review,
    code documentation, comments, technical writing, readability, code clarity
  version: 1.0.0
name: humanizer
---
# Humanizer: Remove AI Writing Patterns

Detects AI-generated writing patterns and transforms them into natural, human-style writing through a systematic two-pass editing process.

## When to Use

Use this skill when:

- Editing AI-generated content to appear more human-written
- Preparing technical documentation for human audience
- Reviewing automated content for natural writing style
- Editing marketing copy to avoid AI detection
- Refining chatbot or LLM responses for more conversational tone
- Preparing user-facing messages that should sound human-written
- Editing any text that exhibits AI writing patterns

## When NOT to Use

Avoid this skill for:

- Technical code comments that require precise terminology
- Legal or regulatory documents that need formal language
- Machine-readable output (JSON, YAML, configuration files)
- Code that intentionally uses AI patterns for clarity
- Technical specifications where formal tone is required
- Content that must maintain specific brand voice regardless of AI detection

---

## Core Workflow

The humanizer implements a two-pass editing process to systematically identify and replace AI patterns with natural alternatives.

### Pass 1: Pattern Detection and Analysis

1. **Load Reference Catalog** — Read the complete pattern catalog from `references/patterns.md`.
   **Checkpoint:** All 24 patterns must be loaded with their signal words, categories, and examples.

2. **Scan Text for Patterns** — Systematically check the input text against all pattern signal words.
   **Checkpoint:** Generate a list of all detected pattern occurrences with positions and context.

3. **Categorize Patterns** — Group detected patterns by category (Content, Language, Style, Communication).
   **Checkpoint:** Ensure each pattern is classified correctly before proposing replacements.

4. **Assess Context** — For each detected pattern, analyze surrounding context to determine appropriate replacement.
   **Checkpoint:** Verify replacement maintains original meaning while sounding more natural.

### Pass 2: Replacement and Validation

1. **Propose Replacements** — Generate natural alternatives for each detected pattern.
   **Checkpoint:** Each replacement must preserve meaning and improve naturalness.

2. **Apply Edits** — Replace AI patterns with human alternatives.
   **Checkpoint:** Track all changes with original and replacement text for audit trail.

3. **Review Results** — Read the humanized text aloud or to a colleague for feedback.
   **Checkpoint:** Ensure the result reads naturally and doesn't sound forced.

4. **Final Validation** — Run the humanized text through an AI detection tool to verify effectiveness.
   **Checkpoint:** AI detection score should drop below threshold (typically < 30%).

---

## Implementation Patterns

### Pattern Detection Function (Python)

A practical implementation for detecting AI writing patterns in text:

```python
import re
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class PatternMatch:
    """Represents a detected AI writing pattern."""
    pattern_id: int
    pattern_name: str
    signal_word: str
    context: str
    position: int

class AIPatternDetector:
    """Detects AI writing patterns in text."""
    
    def __init__(self, catalog: Dict[str, List[str]]):
        """Initialize detector with pattern catalog.
        
        Args:
            catalog: Dictionary mapping category to list of signal words
        """
        self.catalog = catalog
        self.patterns = self._build_patterns()
    
    def _build_patterns(self) -> List[Tuple[str, str]]:
        """Build regex patterns from catalog."""
        all_patterns = []
        for category, words in self.catalog.items():
            for word in words:
                # Create case-insensitive word boundary pattern
                pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
                all_patterns.append((pattern, category, word))
        return all_patterns
    
    def detect(self, text: str) -> List[PatternMatch]:
        """Scan text for AI writing patterns.
        
        Args:
            text: Input text to analyze
            
        Returns:
            List of detected pattern matches with context
        """
        matches = []
        for pattern, category, signal_word in self.patterns:
            for match in pattern.finditer(text):
                # Extract surrounding context (50 chars before and after)
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end].strip()
                
                matches.append(PatternMatch(
                    pattern_id=hash(signal_word) % 1000,
                    pattern_name=signal_word,
                    signal_word=signal_word,
                    context=context,
                    position=match.start()
                ))
        
        # Sort by position in text
        return sorted(matches, key=lambda m: m.position)
    
    def categorize(self, matches: List[PatternMatch]) -> Dict[str, List[PatternMatch]]:
        """Categorize detected patterns by category."""
        categories = {}
        for match in matches:
            # Get category from pattern lookup
            category = self._get_category(match.signal_word)
            if category not in categories:
                categories[category] = []
            categories[category].append(match)
        return categories
    
    def _get_category(self, signal_word: str) -> str:
        """Look up category for a signal word."""
        for category, words in self.catalog.items():
            if signal_word.lower() in [w.lower() for w in words]:
                return category
        return "unknown"
```

### Pattern Replacement Function (Python)

A practical implementation for replacing AI patterns with human alternatives:

```python
from typing import List, Dict, Tuple
import re

class AIPatternReplacer:
    """Replaces AI patterns with natural human alternatives."""
    
    def __init__(self, replacements: Dict[str, str]):
        """Initialize replacer with replacement mappings.
        
        Args:
            replacements: Dictionary mapping signal words to human alternatives
        """
        self.replacements = replacements
        # Build reverse lookup for faster matching
        self.patterns = self._build_replacement_patterns()
    
    def _build_replacement_patterns(self) -> List[Tuple[re.Pattern, str]]:
        """Build compiled regex patterns for replacements."""
        patterns = []
        for word, replacement in self.replacements.items():
            pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
            patterns.append((pattern, replacement))
        return patterns
    
    def replace(self, text: str, matches: List[PatternMatch]) -> Tuple[str, List[Dict]]:
        """Replace AI patterns with human alternatives.
        
        Args:
            text: Original text
            matches: Detected pattern matches to replace
            
        Returns:
            Tuple of (humanized text, change log)
        """
        # Sort matches by position in reverse order to replace from end to start
        sorted_matches = sorted(matches, key=lambda m: m.position, reverse=True)
        
        change_log = []
        result_text = text
        
        for match in sorted_matches:
            signal_word = match.signal_word
            # Look up replacement (use pattern name as key if exact match not found)
            replacement = self.replacements.get(signal_word.lower())
            
            if replacement:
                # Build replacement pattern
                pattern = re.compile(r'\b' + re.escape(signal_word) + r'\b', re.IGNORECASE)
                
                # Apply replacement
                new_text, count = pattern.subn(replacement, result_text, count=1)
                if count > 0:
                    change_log.append({
                        'original': signal_word,
                        'replacement': replacement,
                        'position': match.position,
                        'context': match.context
                    })
                    result_text = new_text
        
        return result_text, change_log
    
    def batch_replace(self, text: str) -> Tuple[str, List[Dict]]:
        """Replace all known patterns in text.
        
        Args:
            text: Input text
            
        Returns:
            Tuple of (humanized text, change log)
        """
        matches = []  # Would use detector to find matches first
        return self.replace(text, matches)
```

### Example Usage

```python
# Example usage of the humanizer

# Define pattern catalog (simplified)
catalog = {
    "Content": ["landmark", "pivotal", "monumental", "groundbreaking"],
    "Language": ["additionally", "crucially", "significantly", "utilize"],
    "Style": ["em dash", "passive voice", "overly long"],
    "Communication": ["over-explain", "defending obvious", "hedging"]
}

# Define replacement mappings
replacements = {
    "landmark": "important",
    "pivotal": "key",
    "monumental": "significant",
    "groundbreaking": "innovative",
    "additionally": "also",
    "crucially": "importantly",
    "significantly": "notably",
    "utilize": "use"
}

# Initialize components
detector = AIPatternDetector(catalog)
replacer = AIPatternReplacer(replacements)

# Process text
text = "This discovery is a landmark testament to years of dedicated research."
matches = detector.detect(text)
print(f"Detected {len(matches)} patterns:")
for match in matches:
    print(f"  - {match.signal_word} at position {match.position}")

# Apply replacements
humanized_text, changes = replacer.replace(text, matches)
print(f"\nHumanized: {humanized_text}")
print(f"Changes made: {len(changes)}")
for change in changes:
    print(f"  '{change['original']}' → '{change['replacement']}'")
```

### Key Pattern Categories

1. **Content Patterns** (6 patterns) — Overuse of certain words and concepts
2. **Language Patterns** (6 patterns) — Words and phrases that sound robotic
3. **Style Patterns** (6 patterns) — Structural and formatting issues
4. **Communication Patterns** (6 patterns) — How ideas are expressed

For detailed pattern definitions, examples, and replacement strategies, see the [pattern catalog](references/patterns.md).

---

## Constraints

### MUST DO

- Always use the two-pass workflow (detection first, then replacement)
- Reference the complete pattern catalog for all pattern definitions
- Preserve original meaning in all replacements
- Track changes with original and replacement text for auditability
- Validate results with AI detection tools when possible
- Read results aloud to verify naturalness
- Consider context when choosing replacements (same meaning, better style)

### MUST NOT DO

- Replace patterns that don't sound artificial in context
- Change technical terminology to sound more human
- Remove precision for the sake of naturalness
- Apply patterns mechanically without considering context
- Disable or bypass the two-pass process for "speed"
- Replace patterns that are intentional for brand voice
- Use the same replacement for every occurrence of a pattern

---

## Output Template

When applying this skill, produce:

1. **Pattern Detection Report**
   - List of all detected patterns with positions
   - Category classification for each pattern
   - Context for each detection

2. **Replacement Proposals**
   - Original text for each pattern occurrence
   - Proposed human alternative
   - Reason for the replacement

3. **Humanized Text**
   - Complete text with all replacements applied
   - Change log with original → replacement mappings

4. **Validation Results**
   - AI detection score before/after
   - Readability assessment
   - Any remaining patterns or concerns

5. **Recommendations**
   - Additional patterns to watch for
   - Style improvements for future writing
   - Words or phrases to avoid

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | Comprehensive code review with quality and security focus |
| `markdown-best-practices` | Markdown syntax rules and documentation practices for OpenCode skills |

---

*This skill helps transform AI-generated text into natural, human-style writing by systematically detecting and replacing common AI writing patterns.*
