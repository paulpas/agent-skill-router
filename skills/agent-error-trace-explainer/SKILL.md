---
name: agent-error-trace-explainer
description: Explains error traces and exceptions by analyzing stack traces, error
  messages, and context to provide human-understandable error explanations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: diagnosis
  scope: error analysis
  output-format: explanation
  triggers: error trace explainer, error-trace-explainer, errors, exceptions, explains,
    traces
---


# Error Trace Explainer (Agent Error Analysis and Explanation)

> **Load this skill** when designing or modifying agent systems that explain error traces and exceptions by analyzing stack traces, error messages, and execution context to provide human-understandable error explanations.

## TL;DR Checklist

When explaining error traces:

- [ ] Parse trace format into structured representation
- [ ] Extract error type, message, and stack frame details
- [ ] Analyze error causality and root cause
- [ ] Generate human-readable explanation
- [ ] Suggest potential fixes and workarounds
- [ ] Handle multiple trace formats (Python, JavaScript, etc.)
- [ ] Preserve context across nested exceptions
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Error Trace Explainer when:

- Analyzing error logs from production systems
- Explaining test failures to developers
- Building error reporting dashboards
- Creating intelligent error handling agents
- Implementing error pattern recognition
- Building debugging assistants
- Processing error reports from users

---

## When NOT to Use

Avoid using this skill for:

- Error prevention (use code correctness verifier)
- Performance issue diagnosis (use profiler)
- Security vulnerability analysis (use security scanner)
- Memory leak analysis (use memory profiler)
- Log aggregation (use log processor)

---

## Core Concepts

### Error Trace Structure

A typical error trace consists of:

```
Error Trace
├── Error Type: ClassNotFoundException, TypeError, etc.
├── Error Message: Descriptive error message
├── Stack Frames: Ordered list of function calls
│   ├── Frame 1: Most recent call
│   ├── Frame 2: Caller of frame 1
│   └── Frame N: Root caller
└── Cause Chain: Nested exceptions (if any)
```

### Trace Format Examples

#### Python Trace

```python
Traceback (most recent call last):
  File "app.py", line 42, in main
    result = process_data(data)
  File "processor.py", line 15, in process_data
    return parse_input(raw_input)
  File "parser.py", line 8, in parse_input
    raise ValueError(f"Invalid input: {raw_input}")
ValueError: Invalid input: None
```

#### JavaScript Trace

```javascript
Error: Invalid input: null
    at parseInput (parser.js:8:11)
    at processData (processor.js:15:22)
    at main (app.js:42:15)
```

### Error Analysis Dimensions

1. **Syntactic**: Parse trace format correctly
2. **Semantic**: Understand error meaning
3. **Causal**: Identify root cause
4. **Contextual**: Preserve execution context
5. **Actionable**: Suggest fixes and workarounds

---

## Implementation Patterns

### Pattern 1: Multi-Language Trace Parsing

Parse traces from multiple languages:

```python
from apex.agents.error import TraceParser
from apex.agents.error.formats import PythonTraceFormat, JavaScriptTraceFormat


def parse_error_trace(trace_text: str, language: str = None) -> ParsedTrace:
    """Parse error trace from any supported language."""
    
    parser = TraceParser()
    
    # Auto-detect language or use provided
    if language is None:
        language = detect_trace_language(trace_text)
    
    # Parse trace based on language
    if language == "python":
        format_parser = PythonTraceFormat()
    elif language == "javascript":
        format_parser = JavaScriptTraceFormat()
    else:
        format_parser = GenericTraceFormat()
    
    return parser.parse(trace_text, format_parser)
```

### Pattern 2: Root Cause Analysis

Analyze stack traces to find root cause:

```python
def find_root_cause(trace: ParsedTrace) -> StackFrame:
    """Find the root cause frame in a stack trace."""
    
    # Start from the bottom of the stack
    for frame in reversed(trace.frames):
        # Skip framework/library frames for application errors
        if frame.is_application_frame:
            # This is likely in user code
            if frame.is_error_origin:
                return frame
    
    # If no application frame found, return last frame
    return trace.frames[-1]
```

### Pattern 3: Error Type Classification

Classify errors by type and severity:

```python
def classify_error(trace: ParsedTrace) -> ErrorClassification:
    """Classify error by type and severity."""
    
    error_type = trace.error_type
    
    # Type-based classification
    if error_type in ["ValueError", "TypeError"]:
        return ErrorClassification(
            category="input_validation",
            severity="medium",
            message="Invalid input provided to function"
        )
    elif error_type in ["ConnectionError", "TimeoutError"]:
        return ErrorClassification(
            category="external_dependency",
            severity="high",
            message="Failed to connect to external service"
        )
    elif error_type in ["MemoryError", "ResourceWarning"]:
        return ErrorClassification(
            category="resource_exhaustion",
            severity="critical",
            message="System resource exhausted"
        )
    else:
        return ErrorClassification(
            category="unknown",
            severity="medium",
            message="Unexpected error occurred"
        )
```

### Pattern 4: Explanation Generation

Generate human-readable explanations:

```python
def generate_explanation(parsed_trace: ParsedTrace) -> ErrorExplanation:
    """Generate human-readable error explanation."""
    
    root_frame = find_root_cause(parsed_trace)
    classification = classify_error(parsed_trace)
    
    # Build explanation components
    summary = f"{classification.category}: {parsed_trace.error_message}"
    
    # Add context from stack trace
    context = []
    for frame in parsed_trace.frames[-3:]:  # Last 3 frames
        context.append(f"  at {frame.function} ({frame.file}:{frame.line})")
    
    # Suggest potential fixes
    fixes = generate_fix_suggestions(parsed_trace, classification)
    
    return ErrorExplanation(
        summary=summary,
        context="\n".join(context),
        root_cause=root_frame,
        classification=classification,
        fixes=fixes,
        confidence=calculate_explanation_confidence(parsed_trace)
    )
```

### Pattern 5: Pattern Recognition

Recognize common error patterns:

```python
class ErrorPatternMatcher:
    def __init__(self):
        self.patterns: list[ErrorPattern] = []
        self._load_patterns()
    
    def _load_patterns(self):
        """Load known error patterns."""
        self.patterns.extend([
            self._load_null_pointer_pattern(),
            self._load_connection_timeout_pattern(),
            self._load_type_mismatch_pattern(),
        ])
    
    def match(self, parsed_trace: ParsedTrace) -> list[MatchedPattern]:
        """Match error trace to known patterns."""
        matches = []
        
        for pattern in self.patterns:
            if pattern.matches(parsed_trace):
                matches.append(MatchedPattern(
                    pattern=pattern,
                    confidence=pattern.calculate_confidence(parsed_trace)
                ))
        
        return sorted(matches, key=lambda m: m.confidence, reverse=True)
```

---

## Common Patterns

### Pattern 1: Error Message Parsing

Parse structured error messages:

```python
def parse_error_message(message: str) -> MessageComponents:
    """Parse error message into components."""
    
    # Common patterns
    patterns = [
        (r"(\w+): (.+)", {"type": "colon_separated"}),
        (r"(\w+\.?\w+) in ([\w/]+): (.+)", {"type": "file_line"}),
        (r"Error (?:in )?(\w+): (.+)", {"type": "error_detail"}),
    ]
    
    for pattern, info in patterns:
        match = re.match(pattern, message)
        if match:
            groups = match.groups()
            return MessageComponents(
                error_type=groups[0] if len(groups) > 0 else "Unknown",
                description=groups[1] if len(groups) > 1 else message,
                location=groups[2] if len(groups) > 2 else None,
                pattern_used=info["type"]
            )
    
    return MessageComponents(
        error_type="Unknown",
        description=message,
        location=None,
        pattern_used="none"
    )
```

### Pattern 2: Explanation Confidence Scoring

Score explanation quality:

```python
def calculate_explanation_confidence(parsed_trace: ParsedTrace) -> float:
    """Calculate confidence score for error explanation."""
    
    if not parsed_trace.frames:
        return 0.3
    
    # Base confidence from trace completeness
    confidence = 0.5
    
    # Bonus for application frames
    application_frames = sum(1 for f in parsed_trace.frames if f.is_application_frame)
    confidence += 0.1 * (application_frames / len(parsed_trace.frames))
    
    # Bonus for clear error message
    if len(parsed_trace.error_message) > 10:
        confidence += 0.2
    
    # Bonus for specific error type
    if parsed_trace.error_type not in ["Exception", "Error"]:
        confidence += 0.2
    
    return min(1.0, confidence)
```

---

## Common Mistakes

### Mistake 1: Not Handling Partial Traces

**Wrong:**
```python
# ❌ Crashes on incomplete traces
def parse_trace(trace_text: str) -> ParsedTrace:
    lines = trace_text.split("\n")
    # Crashes if first line doesn't match expected format
    error_line = lines[0]
```

**Correct:**
```python
# ✅ Handles incomplete/malformed traces
def parse_trace(trace_text: str) -> ParsedTrace:
    lines = trace_text.strip().split("\n")
    
    if not lines:
        return ParsedTrace(
            error_type="Unknown",
            error_message="Empty trace",
            frames=[]
        )
```

### Mistake 2: Ignoring Nested Exceptions

**Wrong:**
```python
# ❌ Only analyzes top-level exception
def analyze_trace(trace: ParsedTrace):
    # Only looks at first exception
    root_cause = trace.frames[-1]
```

**Correct:**
```python
# ✅ Analyzes full exception chain
def analyze_trace(trace: ParsedTrace):
    # Analyze full exception chain
    all_exceptions = [trace]
    while trace.cause:
        all_exceptions.append(trace.cause)
        trace = trace.cause
    
    # Find root cause
    root_cause = all_exceptions[-1]
```

### Mistake 3: Not Distinguishing between Error Types

**Wrong:**
```python
# ❌ Treating all errors the same
def explain_error(trace: ParsedTrace) -> str:
    return "An error occurred"  # ❌ No type-specific explanation
```

**Correct:**
```python
# ✅ Type-specific explanations
def explain_error(trace: ParsedTrace) -> str:
    if trace.error_type == "ValueError":
        return f"Invalid value provided: {trace.error_message}"
    elif trace.error_type == "ConnectionError":
        return f"Failed to connect: {trace.error_message}"
    else:
        return f"{trace.error_type}: {trace.error_message}"
```

### Mistake 4: Over-Prioritizing Framework Frames

**Wrong:**
```python
# ❌ Always skips framework frames
def get_user_frame(frames: list[StackFrame]) -> StackFrame:
    # ❌ Skips too many frames, loses context
    return frames[-10]  # Arbitrary offset
```

**Correct:**
```python
# ✅ Smart frame selection
def get_user_frame(frames: list[StackFrame]) -> StackFrame:
    # Find first frame from application code
    for frame in reversed(frames):
        if frame.is_application_frame:
            return frame
    
    # Fall back to last frame if no application frames
    return frames[-1]
```

### Mistake 5: No Explanatory Power Assessment

**Wrong:**
```python
# ❌ Always provides explanation regardless of quality
def explain(trace: ParsedTrace) -> str:
    # Generates explanation even with minimal trace info
    return "An error occurred in the code"  # ❌ Very low information
```

**Correct:**
```python
# ✅ Assess explanatory power
def explain(trace: ParsedTrace) -> str:
    confidence = calculate_explanation_confidence(trace)
    
    if confidence < 0.5:
        return f"Insufficient trace information to explain error. " \
               f"Type: {trace.error_type}. Message: {trace.error_message}"
    else:
        # Generate detailed explanation
        return detailed_explanation(trace)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of parsing functions
- [ ] **Parsed State:** Traces parsed into structured format
- [ ] **Purity:** Analysis functions are stateless
- [ ] **Fail Fast:** Invalid trace format throws clear errors
- [ ] **Readability:** Explanation logic reads as English

### Testing

- [ ] Unit tests for trace parsing
- [ ] Integration tests for multi-language support
- [ ] Edge case tests for malformed traces
- [ ] Pattern recognition tests
- [ ] Explanation quality tests

### Security

- [ ] Trace inputs sanitized before parsing
- [ ] Parser configurations validated
- [ ] Resource limits on parsing runs
- [ ] No arbitrary code execution
- [ ] Input length limits enforced

### Performance

- [ ] Trace parsing optimized for large traces
- [ ] Pattern matching optimized
- [ ] Caching for repeated trace analysis
- [ ] Memory usage bounded for complex traces
- [ ] Timeout protection for slow parsing

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-stacktrace-root-cause` | Root cause analysis |
| `agent-code-correctness-verifier` | Verify code correctness |
| `agent-diff-quality-analyzer` | Analyze code changes |
| `agent-runtime-log-analyzer` | Analyze runtime logs |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Trace Parser:** Parse trace formats
- **Pattern Matcher:** Match error patterns
- **Explanation Generator:** Generate human-readable explanations
- **Classifier:** Classify errors by type
- **Confidence Scorer:** Assess explanation quality

### External Resources

- [Stack Trace Analysis](https://example.com/stack-trace-analysis) - Trace parsing
- [Error Pattern Recognition](https://example.com/error-patterns) - Common error patterns
- [Debugging Principles](https://example.com/debugging-book) - Debugging techniques

---

## Implementation Tracking

### Agent Error Trace Explainer - Core Patterns

| Task | Status |
|------|--------|
| Multi-language trace parsing | ✅ Complete |
| Root cause analysis | ✅ Complete |
| Error type classification | ✅ Complete |
| Explanation generation | ✅ Complete |
| Pattern recognition | ✅ Complete |
| Confidence scoring | ✅ Complete |
| Nested exception handling | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Multi-language trace parsing
- Root cause analysis
- Error type classification
- Explanation generation
- Pattern recognition

### 1.1.0 (Planned)
- Custom pattern configuration
- Performance profiling
- ML-based pattern matching
- Explanation quality optimization

### 2.0.0 (Future)
- Historical error correlation
- Predictive error classification
- Interactive debugging suggestions
- Multi-modal error analysis

---

## Implementation Prompt (Execution Layer)

When implementing the Error Trace Explainer, use this prompt for code generation:

```
Create an Error Trace Explainer implementation following these requirements:

1. Core Class: `ErrorTraceExplainer`
   - Parse traces from multiple languages
   - Analyze error causality
   - Generate human-readable explanations
   - Match known error patterns

2. Key Methods:
   - `parse(trace_text, language)`: Parse error trace
   - `analyze(trace)`: Analyze error cause
   - `explain(trace)`: Generate explanation
   - `match_patterns(trace)`: Pattern matching
   - `calculate_confidence(trace)`: Explain quality score

3. Trace Parsing:
   - Python traceback format
   - JavaScript error format
   - Java stack trace format
   - Generic trace format
   - Auto-detection support

4. Error Classification:
   - Input validation errors
   - External dependency errors
   - Resource exhaustion errors
   - Logic errors
   - Unknown errors

5. Explanation Components:
   - Summary: High-level error description
   - Context: Stack frame context
   - Root Cause: Where error originated
   - Fixes: Potential solutions
   - Confidence: Explanation quality score

6. Pattern Matching:
   - Null pointer patterns
   - Connection timeout patterns
   - Type mismatch patterns
   - Memory error patterns
   - Custom pattern support

7. Output Structure:
   - `is_explained`: Whether explanation generated
   - `explanation`: Human-readable explanation
   - `confidence`: Explanation confidence (0.0-1.0)
   - `classification`: Error classification
   - `suggestions`: Fix suggestions

8. Multi-Language Support:
   - Python, JavaScript, Java, TypeScript
   - Custom language extensions
   - Language-agnostic parsing

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse traces at boundary
- Pure analysis functions
- Fail fast on invalid trace
- Clear names for all components
```
