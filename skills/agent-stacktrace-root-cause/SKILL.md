---
name: agent-stacktrace-root-cause
description: Performs stacktrace root cause analysis by examining stack frames, identifying
  failure chains, and determining the underlying cause of errors and exceptions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: diagnosis
  scope: root cause analysis
  output-format: analysis
  triggers: analyzes, failures, root cause, stacktrace root cause, stacktrace-root-cause, stacktraces
  related-skills: agent-code-correctness-verifier, agent-confidence-based-selector, agent-error-trace-explainer, agent-k8s-debugger, agent-multi-skill-executor
---


# Stacktrace Root Cause (Agent Failure Diagnosis)

> **Load this skill** when designing or modifying agent systems that perform stacktrace root cause analysis by examining stack frames, identifying failure chains, and determining the underlying cause of errors and exceptions.

## TL;DR Checklist

When performing stacktrace root cause analysis:

- [ ] Parse stacktrace into structured frame representation
- [ ] Identify the root cause frame (first failure origin)
- [ ] Trace the failure chain through stack frames
- [ ] Correlate error messages with stack frames
- [ ] Identify patterns in root cause locations
- [ ] Generate actionable root cause analysis
- [ ] Support multi-exception root cause determination
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Stacktrace Root Cause when:

- Investigating error causes in production systems
- Analyzing test failures and debugging
- Building intelligent debugging assistants
- Creating error pattern recognition systems
- Implementing automated incident response
- Building failure analysis dashboards
- Learning from historical failures

---

## When NOT to Use

Avoid using this skill for:

- Error prevention (use code correctness verifier)
- Error explanation (use error trace explainer)
- Performance profiling (use profiler)
- Security vulnerability analysis (use security scanner)
- Code quality checks (use quality analyzer)

---

## Core Concepts

### Root Cause Analysis Dimensions

Root cause analysis operates across multiple dimensions:

```
Stacktrace
├── Frame Analysis
│   ├── Application Frames: User code frames
│   ├── Library Frames: Third-party library frames
│   ├── Framework Frames: Framework frames
│   └── Native Frames: Native/system frames
├── Failure Chain
│   ├── Primary Exception: Initial failure
│   ├── Secondary Exceptions: Cascading failures
│   └── Root Cause: First point of failure
├── Context Analysis
│   ├── Method Parameters: Input values
│   ├── Variable States: Variable values
│   └── Execution State: Program state
└── Pattern Analysis
    ├── Common Patterns: Known failure patterns
    ├── Recurrence Patterns: Historical patterns
    └── Correlation Patterns: Related failures
```

### Stack Frame Types

1. **Application Frame**: User code in application
2. **Library Frame**: Third-party library code
3. **Framework Frame**: Framework framework code
4. **System Frame**: System/native code
5. **Unknown Frame**: Cannot identify source

### Root Cause Identification

The root cause is typically:
- The first frame in the stack trace
- The frame with the actual error origin
- The frame outside libraries/frameworks
- The frame with the most specific error context

---

## Implementation Patterns

### Pattern 1: Stacktrace Parsing

Parse stacktrace into structured format:

```python
from apex.agents.stacktrace import StacktraceParser
from apex.agents.stacktrace.models import StackFrame, ExceptionChain


def parse_stacktrace(stacktrace_text: str, language: str) -> ExceptionChain:
    """Parse stacktrace into structured format."""
    
    parser = StacktraceParser()
    
    if language == "python":
        format_parser = PythonStacktraceFormat()
    elif language == "javascript":
        format_parser = JavaScriptStacktraceFormat()
    else:
        format_parser = GenericStacktraceFormat()
    
    # Parse exception and stack frames
    exception_chain = parser.parse(stacktrace_text, format_parser)
    
    return exception_chain
```

### Pattern 2: Root Cause Identification

Identify the root cause frame:

```python
def identify_root_cause(exception_chain: ExceptionChain) -> StackFrame:
    """Identify the root cause frame in an exception chain."""
    
    # Start from the primary exception
    primary_exception = exception_chain.primary
    
    # Find the first application frame
    for frame in primary_exception.frames:
        if frame.is_application_frame:
            # This is likely the root cause
            return frame
    
    # If no application frame, return the first frame
    if primary_exception.frames:
        return primary_exception.frames[-1]
    
    # No frames found
    return None
```

### Pattern 3: Failure Chain Analysis

Analyze the full failure chain:

```python
def analyze_failure_chain(exception_chain: ExceptionChain) -> FailureChainAnalysis:
    """Analyze the full failure chain."""
    
    analysis = {
        "primary_exception": {
            "type": exception_chain.primary.exception_type,
            "message": exception_chain.primary.message,
            "frames": exception_chain.primary.frames
        },
        "causes": []
    }
    
    # Analyze cause chain
    current_exception = exception_chain.primary
    while current_exception.cause:
        current_exception = current_exception.cause
        
        cause_analysis = {
            "type": current_exception.exception_type,
            "message": current_exception.message,
            "frames": current_exception.frames,
            "direct_cause": current_exception.direct_cause
        }
        
        analysis["causes"].append(cause_analysis)
    
    return FailureChainAnalysis(**analysis)
```

### Pattern 4: Root Cause Classification

Classify root causes by type:

```python
def classify_root_cause(
    root_frame: StackFrame,
    exception_type: str,
    exception_message: str
) -> RootCauseClassification:
    """Classify root cause by type."""
    
    # Check for common root cause patterns
    if exception_type in ["ValueError", "TypeError"]:
        classification = RootCauseClassification(
            category="input_validation",
            severity="medium",
            message="Invalid input value",
            recommended_fix="Validate input before use"
        )
    
    elif exception_type in ["ConnectionError", "TimeoutError"]:
        classification = RootCauseClassification(
            category="external_dependency",
            severity="high",
            message="Failed to connect to external service",
            recommended_fix="Check service availability and credentials"
        )
    
    elif exception_type in ["AttributeError", "KeyError"]:
        classification = RootCauseClassification(
            category="missing_data",
            severity="medium",
            message="Expected data not found",
            recommended_fix="Add null checks or default values"
        )
    
    elif exception_type in ["OutOfMemoryError", "MemoryError"]:
        classification = RootCauseClassification(
            category="resource_exhaustion",
            severity="critical",
            message="System resource exhausted",
            recommended_fix="Increase resource limits or optimize usage"
        )
    
    else:
        classification = RootCauseClassification(
            category="unknown",
            severity="medium",
            message="Unexpected error occurred",
            recommended_fix="Review stacktrace and input data"
        )
    
    return classification
```

### Pattern 5: Pattern-Based Root Cause Detection

Detect common root cause patterns:

```python
class RootCausePatternMatcher:
    def __init__(self):
        self.patterns: list[RootCausePattern] = []
        self._load_patterns()
    
    def _load_patterns(self):
        """Load known root cause patterns."""
        self.patterns.extend([
            self._load_null_reference_pattern(),
            self._load_index_out_of_bounds_pattern(),
            self._load_connection_failure_pattern(),
            self._load_type_conversion_pattern()
        ])
    
    def match(self, exception_chain: ExceptionChain) -> list[MatchedPattern]:
        """Match exception chain to known patterns."""
        matches = []
        
        for pattern in self.patterns:
            if pattern.matches(exception_chain):
                match = MatchedPattern(
                    pattern=pattern,
                    confidence=pattern.calculate_confidence(exception_chain)
                )
                matches.append(match)
        
        return sorted(matches, key=lambda m: m.confidence, reverse=True)
```

---

## Common Patterns

### Pattern 1: Frame Type Classification

Classify stack frames by type:

```python
def classify_frame(frame: StackFrame) -> FrameType:
    """Classify a stack frame by its type."""
    
    # Check for application frames
    if frame.package.startswith("your_app"):
        return FrameType.APPLICATION
    
    # Check for library frames
    if any(lib in frame.package for lib in ["requests", "numpy", "pandas"]):
        return FrameType.LIBRARY
    
    # Check for framework frames
    if any(fw in frame.package for fw in ["django", "flask", "react", "express"]):
        return FrameType.FRAMEWORK
    
    # Default to system frame
    return FrameType.SYSTEM
```

### Pattern 2: Root Cause Confidence Scoring

Score root cause identification confidence:

```python
def calculate_root_cause_confidence(
    root_frame: StackFrame,
    exception_type: str
) -> float:
    """Calculate confidence score for root cause identification."""
    
    confidence = 0.5  # Base confidence
    
    # Bonus for application frame
    if root_frame.is_application_frame:
        confidence += 0.3
    
    # Bonus for specific exception type
    if exception_type not in ["Exception", "Error"]:
        confidence += 0.1
    
    # Bonus for application frame with line number
    if root_frame.is_application_frame and root_frame.line_number:
        confidence += 0.1
    
    return min(1.0, confidence)
```

---

## Common Mistakes

### Mistake 1: Confusing Exception with Root Cause

**Wrong:**
```python
# ❌ Taking first exception as root cause
def get_root_cause(exception_chain):
    return exception_chain.primary  # ❌ Not necessarily root cause
```

**Correct:**
```python
# ✅ Finding first application frame
def get_root_cause(exception_chain):
    primary = exception_chain.primary
    
    # Find first application frame
    for frame in primary.frames:
        if frame.is_application_frame:
            return frame
    
    # Fall back to first frame
    return primary.frames[-1] if primary.frames else None
```

### Mistake 2: Ignoring Nested Exceptions

**Wrong:**
```python
# ❌ Only analyzing primary exception
def analyze_stacktrace(stacktrace):
    primary = stacktrace.primary  # ❌ Ignores nested exceptions
```

**Correct:**
```python
# ✅ Analyzing full exception chain
def analyze_stacktrace(stacktrace):
    analysis = {
        "primary": stacktrace.primary
    }
    
    # Follow cause chain
    current = stacktrace.primary
    chain = []
    while current.cause:
        chain.append(current.cause)
        current = current.cause
    
    analysis["cause_chain"] = chain
    return analysis
```

### Mistake 3: Not Distinguishing Between Frame Types

**Wrong:**
```python
# ❌ Treating all frames equally
def get_root_cause(frames):
    return frames[-1]  # ❌ May be framework/library frame
```

**Correct:**
```python
# ✅ Prioritize application frames
def get_root_cause(frames):
    for frame in reversed(frames):
        if frame.is_application_frame:
            return frame  # ✅ Application frame
    
    return frames[-1]  # Fallback
```

### Mistake 4: Over-Prioritizing Framework Frames

**Wrong:**
```python
# ❌ Always using last framework frame
def get_root_cause(frames):
    framework_frames = [f for f in frames if f.is_framework]
    return framework_frames[-1]  # ❌ May not be user code
```

**Correct:**
```python
# ✅ Prioritize application over framework
def get_root_cause(frames):
    # Try application first
    for frame in frames:
        if frame.is_application:
            return frame
    
    # Then library
    for frame in frames:
        if frame.is_library:
            return frame
    
    # Then framework
    for frame in frames:
        if frame.is_framework:
            return frame
    
    return frames[-1]  # Last resort
```

### Mistake 5: No Confidence Assessment

**Wrong:**
```python
# ❌ Always assuming confidence is 100%
def get_root_cause(stacktrace):
    return identify_root_cause(stacktrace)  # ❌ No confidence score
```

**Correct:**
```python
# ✅ Assess confidence
def get_root_cause(stacktrace):
    root = identify_root_cause(stacktrace)
    
    if not root:
        return None
    
    confidence = calculate_confidence(root, stacktrace.primary.exception_type)
    
    return RootCause(
        frame=root,
        confidence=confidence,
        notes=get_notes(confidence)
    )
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of parsing functions
- [ ] **Parsed State:** Stacktraces parsed into structured format
- [ ] **Purity:** Analysis functions are stateless
- [ ] **Fail Fast:** Invalid stacktrace throws clear errors
- [ ] **Readability:** Analysis logic reads as English

### Testing

- [ ] Unit tests for stacktrace parsing
- [ ] Integration tests for multi-exception chains
- [ ] Edge case tests for malformed stacktraces
- [ ] Pattern matching tests
- [ ] Confidence scoring tests

### Security

- [ ] Stacktrace inputs sanitized before parsing
- [ ] Parser configurations validated
- [ ] Resource limits on parsing runs
- [ ] No arbitrary code execution
- [ ] Input length limits enforced

### Performance

- [ ] Stacktrace parsing optimized for large traces
- [ ] Pattern matching optimized
- [ ] Caching for repeated analysis
- [ ] Memory usage bounded for complex traces
- [ ] Timeout protection for slow parsing

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-error-trace-explainer` | Explain error traces |
| `agent-code-correctness-verifier` | Verify code correctness |
| `agent-diff-quality-analyzer` | Analyze code changes |
| `agent-failure-mode-analysis` | Failure mode analysis |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Stacktrace Parser:** Parse stacktrace formats
- **Frame Classifier:** Classify frame types
- **Root Cause Identifier:** Identify failure origin
- **Pattern Matcher:** Match known patterns
- **Confidence Scorer:** Assess identification quality

### External Resources

- [Stacktrace Analysis](https://example.com/stacktrace-analysis) - Trace parsing
- [Root Cause Analysis](https://example.com/rca-methodology) - RCA techniques
- [Debugging Principles](https://example.com/debugging-book) - Debugging techniques

---

## Implementation Tracking

### Agent Stacktrace Root Cause - Core Patterns

| Task | Status |
|------|--------|
| Stacktrace parsing | ✅ Complete |
| Root cause identification | ✅ Complete |
| Failure chain analysis | ✅ Complete |
| Root cause classification | ✅ Complete |
| Pattern-based detection | ✅ Complete |
| Confidence scoring | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Stacktrace parsing for multiple languages
- Root cause identification
- Failure chain analysis
- Root cause classification
- Pattern-based detection

### 1.1.0 (Planned)
- Custom pattern configuration
- Performance profiling integration
- ML-based pattern matching
- Confidence optimization

### 2.0.0 (Future)
- Historical failure correlation
- Predictive failure classification
- Automated fix suggestions
- Multi-modal analysis

---

## Implementation Prompt (Execution Layer)

When implementing the Stacktrace Root Cause, use this prompt for code generation:

```
Create a Stacktrace Root Cause implementation following these requirements:

1. Core Class: `StacktraceRootCauseAnalyzer`
   - Parse stacktraces from multiple languages
   - Identify root cause frames
   - Analyze failure chains
   - Classify root causes by type
   - Match known root cause patterns

2. Key Methods:
   - `parse(stacktrace, language)`: Parse stacktrace
   - `identify_root_cause(exception_chain)`: Find root cause
   - `analyze_failure_chain(exception_chain)`: Analyze full chain
   - `classify_root_cause(root_frame, exception)`: Classify root cause
   - `match_patterns(exception_chain)`: Match known patterns

3. Stacktrace Parsing:
   - Python traceback format
   - JavaScript error format
   - Java stack trace format
   - Generic trace format
   - Auto-detection support

4. Root Cause Dimensions:
   - Frame type: Application/library/framework/system
   - Exception type: Value error, type error, etc.
   - Exception message: Error description
   - Stack depth: Number of frames
   - Application frames: User code presence

5. Classification Categories:
   - Input validation errors
   - External dependency errors
   - Resource exhaustion errors
   - Logic errors
   - Unknown errors

6. Output Structure:
   - `root_cause`: Root cause frame
   - `exception_chain`: Full exception chain
   - `classification`: Root cause classification
   - `patterns_matched`: Matched patterns
   - `confidence`: Root cause confidence (0.0-1.0)

7. Pattern Matching:
   - Null reference patterns
   - Index out of bounds patterns
   - Connection failure patterns
   - Type conversion patterns
   - Custom pattern support

8. Confidence Scoring:
   - Frame type weighting
   - Exception specificity
   - Message clarity
   - Pattern match strength
   - Historical accuracy

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse stacktrace at boundary
- Pure analysis functions
- Fail fast on invalid trace
- Clear names for all components
```
