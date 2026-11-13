---
name: ste-code-commenting
description: Apply Simplified Technical English (STE) principles to inline code comments and docstrings, implementing safety-critical documentation standards in source code across Python, Go, Java, and C/C++ with term control, passive voice rules, and abbreviation standards.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: STE code comments, documentation strings, docstring standards, how do i document code, aviation code documentation, safety-critical code, code clarity
  related-skills: ste-terminology-reference, ste-documentation-checklist
  archetypes: tactical, enforcement
  anti_triggers: brainstorming, exploratory code, learning tutorials, how to learn
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# STE Code Commenting

Implements Simplified Technical English (STE) principles in inline code comments and docstrings. When loaded, this skill makes the model document code using STE-compliant terminology, sentence structure, and verb restrictions. Applies to aviation, aerospace, maritime, and medical device software where code documentation must meet international safety standards and regulatory requirements (FAA, EASA, FDA).

## TL;DR Checklist

- [ ] **No gerunds in docstrings:** Use "Computes X" not "Computing X" as the primary action description
- [ ] **Passive voice for safety-critical logic:** "The altitude must be set above 10,000 feet" (safety); "Calculate the descent rate" (procedure)
- [ ] **Abbreviations STE-formatted:** "AC" not "A.C."; "DC" not "D.C."; full form at first use ("Alternating Current (AC)")
- [ ] **Sentence length ≤20 words:** Break long explanations into multiple sentences
- [ ] **Specific nouns, avoid generics:** "Hydraulic pressure" not "system pressure"; "fuel quantity" not "amount"
- [ ] **No prohibited verbs in comments:** Replace "fix," "check," "handle," "work on" with specific STE verbs
- [ ] **Acronyms defined at first use:** Every code comment that introduces an acronym must explain it once per file/function
- [ ] **Parameter and return descriptions complete:** Every parameter and return value has a one-sentence STE-compliant explanation
- [ ] **Constraints documented:** Safety limits, mandatory conditions, and forbidden operations explicitly stated

---

## When to Use

Use this skill when:

- Writing comments for safety-critical code in aviation, aerospace, or maritime systems
- Documenting code that must pass FAA, EASA, FDA, or equivalent regulatory review
- Creating docstrings for functions that control physical systems or make safety decisions
- Reviewing code comments for compliance with organizational documentation standards
- Preparing source code for international certification or cross-organization collaboration
- Documenting algorithms that handle altitude, pressure, velocity, or other safety-critical parameters
- Building automated documentation generators that must produce STE-compliant content

---

## When NOT to Use

Avoid this skill when:

- Writing comments for internal, non-safety-critical software (use standard comment practices instead)
- The codebase does not require regulatory compliance or safety certification
- Comments are intended for marketing, tutoring, or general explanation (not safety-critical)
- Your organization has not adopted STE documentation standards
- Documentation is for consumer-facing applications without safety implications

---

## Core Workflow

### 1. Function Signature Analysis — Identify Parameters and Return Types

**Action:** For each function, extract:
- Function name
- Parameter names and types
- Return type
- Any constraints or preconditions (e.g., "altitude must be > 10,000 feet")

**Checkpoint:** All parameters and return value are identified and their safety impact is understood.

---

### 2. Write Function-Level Docstring — One-Sentence Purpose, Then Details

**Action:** Write the docstring starting with a single-sentence purpose statement using STE verb forms:

| Action Type | STE Verb Form | Example |
|---|---|---|
| Computation | "Computes X from Y" | "Computes descent rate based on altitude change" |
| Retrieval | "Returns X when Y" | "Returns fuel quantity when requested" |
| Modification | "Sets X to Y" | "Sets throttle position to the input value" |
| Validation | "Verifies X meets Y" | "Verifies altitude is within safe operating range" |
| Prohibition/Safety | "Must not perform X" (passive) | "Must not activate fuel pump when pressure exceeds limit" |

**Checkpoint:** Purpose statement is exactly one sentence, ≤20 words, uses STE-approved verb, no gerund ("-ing" form).

---

### 3. Parameter Documentation — Type, Meaning, and Constraints

**Action:** For each parameter, write one sentence documenting:
- **Type:** (provided by language, confirm in docstring)
- **Meaning:** What physical quantity or state does it represent?
- **Constraints:** Min/max values, forbidden states, required conditions

**Pattern:**
```
param_name (type): [Concrete noun]. [One-sentence constraint or meaning].
```

**Checkpoint:** Each parameter has exactly one sentence explanation; constraints are specific and testable.

---

### 4. Return Value Documentation — Type, Meaning, and Interpretation

**Action:** Document the return value with the same structure as parameters:
- **Type:** (provided by language, confirm in docstring)
- **Meaning:** What does the return value represent?
- **Interpretation:** How should the caller use this value?

**Pattern:**
```
Returns: [Concrete noun of return type]. [One-sentence explanation]. [One-sentence constraint or interpretation].
```

**Checkpoint:** Return value meaning is clear and unambiguous; any special return values (e.g., -1 for error) are explained.

---

### 5. Write Inline Comments for Control Flow — STE-Compliant Explanations

**Action:** For complex control flow, safety-critical conditionals, or non-obvious logic, add inline comments:
- Before the code: Explain what the code does and why
- Passive voice for safety statements: "The value must be within range"
- Active voice for procedure: "Calculate the rate" (if inside a function that performs calculation)

**Pattern:**
```python
# The altitude must be above ground level before descent.
if altitude <= MIN_ALTITUDE:
    activate_warning()
```

**Checkpoint:** Each complex control block has a comment explaining the condition in STE terms; safety constraints are explicit.

---

### 6. Document Exceptions and Error Paths — Specify When and Why Errors Occur

**Action:** For try/except blocks or error handling, document:
- **When the error occurs:** What condition triggers this exception?
- **Why it occurs:** Is it a safety violation, a system failure, or invalid input?
- **How it is handled:** What recovery or notification happens?

**Pattern:**
```python
try:
    # Attempt to read pressure from sensor.
except SensorError:
    # The pressure sensor is not responding.
    # This is a critical failure. Log and alert immediately.
    log_critical("Sensor failure")
```

**Checkpoint:** All exceptions have STE-compliant comment explaining condition and consequence.

---

### 7. Abbreviation Introduction — Define at First Use in Each File

**Action:** When an abbreviation appears in a comment for the first time in a file, include its full form:

**Pattern:**
```
# Alternate Current (AC) power supply is disconnected.
```

In subsequent uses in the same file, the abbreviation can be used alone:
```
# AC power is restored.
```

**Checkpoint:** Every abbreviation has a full form at its first use; format is STE-standard (capitals, no periods).

---

### 8. Constraints Section — Document Mandatory and Forbidden Operations

**Action:** For functions with safety-critical constraints, add a "Constraints" or "Preconditions" section listing:
- **MUST:** Mandatory conditions that must be true before calling
- **MUST NOT:** Forbidden operations or states

**Pattern:**
```python
def lower_landing_gear(aircraft):
    """
    Lowers the landing gear for landing.
    
    MUST: Airspeed must be below 250 knots before activation.
    MUST: Landing gear must not be partially deployed.
    MUST NOT: Disable landing gear extension if weight is on wheels.
    """
```

**Checkpoint:** All MUST and MUST NOT constraints are testable conditions, not abstract principles.

---

## Implementation Patterns

### Pattern 1: Safety-Critical Function with STE Compliance (Python)

**BAD Example (Non-STE):**
```python
def check_altitude(alt, min_alt):
    # Checks if altitude is OK
    # Makes sure we're above the ground
    if alt < min_alt:
        return False
    return True
```

**Issues:**
- "Checks" is vague (use "Verifies")
- "OK" is informal (use specific term)
- "Makes sure" is non-STE (use "Verifies" passive voice)
- Comment doesn't explain safety implication
- Parameter descriptions missing

**GOOD Example (STE-Compliant):**
```python
def verify_minimum_altitude(altitude, minimum_altitude):
    """
    Verifies that altitude meets the minimum safe operating threshold.
    
    Args:
        altitude (float): The current altitude in feet above ground level.
        minimum_altitude (float): The minimum safe altitude in feet above ground level.
    
    Returns:
        bool: True if altitude is at or above minimum_altitude. False if below.
    
    MUST: Altitude must be at or above minimum_altitude before continuing flight operations.
    MUST NOT: Return True if altitude is below minimum_altitude.
    """
    # The altitude must be at or above the minimum safe altitude.
    # If the altitude is below minimum, a warning must be generated.
    if altitude < minimum_altitude:
        return False
    return True
```

**Why STE-Compliant:**
- Verb "Verifies" (STE-approved for validation)
- Purpose is one sentence, ≤20 words
- Each parameter has type, meaning, and context
- Return value is explained clearly
- Safety constraint ("MUST") is explicit and testable
- Inline comments explain the control flow with passive voice ("must be," "must be generated")
- No gerunds, no vague language

---

### Pattern 2: Complex Algorithm with STE Docstring (Go)

**BAD Example (Non-STE):**
```go
// Calculate descent rate given current and target altitude
// Returns descent rate in feet per minute
// This makes sure the aircraft descends properly
func ComputeDescentRate(currentAlt, targetAlt, timeRemaining float64) float64 {
    // Get the altitude difference
    diff := currentAlt - targetAlt
    
    // Make the descent rate safe
    rate := diff / timeRemaining
    
    // Check if rate is within limits
    if rate > MaxDescentRate {
        rate = MaxDescentRate
    }
    return rate
}
```

**Issues:**
- "Calculate" not "Computes"
- "Makes sure" is non-STE
- Comments use forbidden verbs: "Get," "Make," "Check"
- Error handling missing for edge cases (division by zero)
- Safety constraints not documented

**GOOD Example (STE-Compliant):**
```go
// ComputeDescentRate computes the descent rate for a safe descent profile.
// Args:
//   currentAlt: The current altitude in feet above sea level.
//   targetAlt: The target altitude in feet above sea level.
//   timeRemaining: The time available for descent in minutes.
//
// Returns: The required descent rate in feet per minute.
//
// MUST: timeRemaining must be greater than zero.
// MUST: The descent rate must not exceed MaxDescentRate feet per minute.
// MUST NOT: Activate descent if timeRemaining is zero or negative.
func ComputeDescentRate(currentAlt, targetAlt, timeRemaining float64) float64 {
    // Verify that time remaining is valid.
    if timeRemaining <= 0 {
        // Time is not available for descent. Return zero descent rate.
        return 0
    }
    
    // The altitude difference determines the required descent.
    altitudeDifference := currentAlt - targetAlt
    
    // Compute the descent rate in feet per minute.
    descentRate := altitudeDifference / timeRemaining
    
    // The descent rate must not exceed the maximum safe rate.
    // If the computed rate exceeds the limit, set rate to the maximum.
    if descentRate > MaxDescentRate {
        descentRate = MaxDescentRate
    }
    
    return descentRate
}
```

**Why STE-Compliant:**
- Purpose: "computes" (STE verb) + single subject (descent rate)
- Parameters explained with concrete nouns (altitude, time, rate)
- Safety constraints explicit and testable (MUST, MUST NOT)
- Inline comments explain each step with active verbs (Verify, Compute, Check → passive voice where safety-critical: "must not exceed")
- Error handling documented (time <= 0)
- No gerunds, no vague language

---

### Pattern 3: Sensor Reading with Error Handling (C/C++)

**BAD Example (Non-STE):**
```cpp
// Read the pressure sensor
// Returns the pressure value or -1 if something goes wrong
int read_pressure_sensor() {
    // Try to get the pressure
    int val = sensor_interface->read();
    
    // Check if we got a good reading
    if (val < 0) {
        // Something is wrong with the sensor
        return -1;
    }
    
    return val;
}
```

**Issues:**
- "Read" (too generic; does not indicate what is being measured)
- "Something goes wrong" (vague; should specify what failure)
- "Try to get" (non-STE, informal)
- "Check if we got a good reading" (we; unclear; "good" is vague)
- Return value -1 not explained in STE terms

**GOOD Example (STE-Compliant):**
```cpp
// ReadPressureSensor reads the pressure sensor and returns the pressure value in PSI.
//
// Returns: Pressure in Pounds Per Square Inch (PSI) on success.
//          Returns -1 if the pressure sensor is not responding or the reading is invalid.
//
// MUST: Pressure reading must be between 0 and MaxPressure PSI.
// MUST NOT: Return an invalid reading without logging the sensor failure.
int ReadPressureSensor() {
    // Read the current pressure value from the Pressure Sensor Module (PSM).
    int pressureValue = sensor_interface->read();
    
    // The pressure value must be validated.
    // A value of -1 indicates that the pressure sensor is not responding.
    if (pressureValue < 0) {
        // The pressure sensor has failed. Log the failure immediately.
        log_error("Pressure sensor failure: unable to read");
        return -1;  // Sensor failure signal
    }
    
    // Verify that the pressure value is within the valid operating range.
    if (pressureValue > MaxPressure) {
        // The pressure reading is outside the valid range. Log the out-of-range condition.
        log_warning("Pressure out of range: %d PSI", pressureValue);
        // Return the out-of-range value for higher-level handling.
    }
    
    return pressureValue;
}
```

**Why STE-Compliant:**
- Purpose: "reads" + specific subject (pressure sensor)
- Return value documented with explicit meaning: success condition and error code (-1)
- Safety constraint documented: pressure must be in valid range
- Error handling commented with explanation of what went wrong and why
- Abbreviations explained at first use: "PSM" for Pressure Sensor Module
- Passive voice for validation statements ("must be validated," "must be logged")
- Specific nouns: "Pressure Sensor Module," "Pounds Per Square Inch (PSI)" instead of "sensor," "value"

---

## Constraints

### MUST DO

- **Use STE-approved verbs in docstring purposes:** "Computes," "Verifies," "Returns," "Sets," "Validates" are approved. "Checks," "Gets," "Does," "Handles," "Works on" are forbidden.
- **Explain every parameter and return value:** No parameter may be documented as "[type]" without meaning. Every return value must have a one-sentence explanation.
- **Document safety constraints explicitly:** Use "MUST:" and "MUST NOT:" sections for safety-critical functions. These must be testable conditions, not abstract principles.
- **Write comments in complete sentences:** Comments must follow STE sentence structure rules: subject, verb, object; ≤20 words. Avoid fragments like "// Gets the pressure" (rewrite as "// Read the current pressure from the sensor module").
- **Define abbreviations at first use:** Every time a new abbreviation appears in comments, include the full form on first use: "Alternating Current (AC) power supply."
- **Use passive voice for safety statements:** Safety-critical logic: "The altitude must be above 10,000 feet" (passive). Procedure logic: "Read the pressure gauge" (active).
- **Specify error conditions and recovery:** When documenting exception handling, explain what condition triggered the error and what recovery action is taken.

### MUST NOT DO

- **Never use gerunds as the main verb in docstring purpose:** "Computing the descent rate" ❌ → "Computes the descent rate" ✓
- **Never abbreviate without defining:** Do not assume the reader knows that "AC" means "Alternating Current." Explain it at first use.
- **Never use informal language in safety-critical comments:** "Makes sure the pressure is OK" ❌ → "Verifies that pressure is within the valid operating range" ✓
- **Never omit error handling documentation:** If a function can fail (sensor error, invalid input, out-of-range value), comment the error path and explain what recovery action occurs.
- **Never mix British and American terminology in the same function:** Choose "ground" (US) or "earth" (UK) and use it consistently throughout the file.
- **Never use "you," "we," or first-person pronouns:** Comments must be impersonal and objective. "You must verify the altitude" ❌ → "The altitude must be verified" ✓
- **Never leave parameter types uncommented:** Every parameter must have a one-sentence explanation of what it represents, even if the type is self-evident from its name.

---

## Output Template: Documented Function Checklist

When documenting a function, verify:

```
FUNCTION DOCUMENTATION CHECKLIST
Function: [function_name]
Language: [Python/Go/C++/Java/etc.]

PURPOSE STATEMENT
[ ] Single sentence? ✓
[ ] ≤20 words? ✓
[ ] Uses STE verb (Computes, Verifies, Returns, Sets)? ✓
[ ] No gerund ("-ing" form)? ✓

PARAMETER DOCUMENTATION
[ ] Parameter 1: [name] — type, meaning, constraint documented? ✓
[ ] Parameter 2: [name] — type, meaning, constraint documented? ✓
[ ] [... repeat for all parameters]

RETURN VALUE DOCUMENTATION
[ ] Return type documented? ✓
[ ] Return meaning explained (what does the value represent)? ✓
[ ] Any special return values explained (e.g., -1 for error)? ✓

SAFETY CONSTRAINTS
[ ] MUST conditions listed (mandatory preconditions)? ✓
[ ] MUST NOT conditions listed (forbidden operations)? ✓
[ ] All constraints are testable (not abstract)? ✓

INLINE COMMENTS
[ ] Complex control flow explained? ✓
[ ] Error handling explained? ✓
[ ] Safety statements use passive voice? ✓
[ ] All comments are complete sentences? ✓
[ ] Abbreviations defined at first use? ✓

FINAL VALIDATION
[ ] No prohibited verbs (Check, Get, Make, Do, Fix, Handle)? ✓
[ ] No gerunds as main subjects? ✓
[ ] No informal language or pronouns (you, we, I)? ✓
[ ] All STE abbreviations use capital letters and no periods? ✓
[ ] No double negatives or weak negations? ✓

STATUS: [APPROVED / NEEDS REVISION]
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `ste-terminology-reference` | Consult this reference to verify that nouns and verbs in your comments are STE-approved. If a term is not in the reference, replace it with an STE-approved equivalent or define it. |
| `ste-documentation-checklist` | Use this checklist to audit comments for STE compliance (sentence length, vocabulary, abbreviations, passive voice). The checklist applies to code comments as well as documentation. |

