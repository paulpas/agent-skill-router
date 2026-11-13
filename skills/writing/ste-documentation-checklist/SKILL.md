---
name: ste-documentation-checklist
description: Pre-flight validation checklist for Simplified Technical English (STE) documentation compliance, including sentence structure rules, noun usage patterns, passive voice verification, and abbreviation standardization specific to safety-critical technical documents.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: writing
  role: review
  scope: implementation
  output-format: report
  triggers: STE checklist, documentation validation, passive voice audit, sentence structure check, how do i check documentation, STE compliance, safety documentation
  related-skills: ste-terminology-reference, ste-code-commenting
  archetypes: tactical, enforcement, review
  anti_triggers: brainstorming, creative writing, learning tutorials
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# STE Documentation Pre-Flight Checklist

Comprehensive validation checklist for auditing technical documentation against Simplified Technical English (STE) compliance rules. This skill provides numbered, actionable validation steps with specific checkpoint criteria, enabling documentation teams to systematically identify and correct STE violations before publication. Designed for documents requiring international safety certification (aviation, aerospace, maritime, medical devices).

## TL;DR Checklist

- [ ] **Sentence Length:** No sentence exceeds 20 words; average sentence is 10-15 words
- [ ] **Noun Usage:** No gerunds used as primary subjects (e.g., "Testing the system" ❌ → "Test the system" ✅)
- [ ] **Passive Voice:** Safety-critical and prohibition statements use passive voice ("must be," "must not be")
- [ ] **Abbreviations:** All abbreviations match STE format (capitals, no periods, full form at first use)
- [ ] **Vocabulary:** All terms checked against STE Approved Terms list; no synonyms; prohibited words replaced
- [ ] **Articles:** "The" usage follows STE rules (present where safety-critical, omitted in specific technical contexts)
- [ ] **Negative Construction:** Prohibitions use "must not," never double negatives ("not uncommon" ❌)
- [ ] **Verb Tense:** Consistent use of present tense for procedures; no mixed tenses
- [ ] **Procedure Steps:** Each step is active imperative (direct command), numbered, single action per step
- [ ] **Lists and Tables:** Parallel structure; consistent punctuation; single concept per cell or bullet

---

## When to Use

Use this skill when:

- Auditing technical documentation for aviation, aerospace, or maritime systems before publication
- Converting legacy documentation to STE compliance standards
- Training technical writers on STE rules and validation practices
- Reviewing procedure manuals, maintenance guides, or safety-critical instructions
- Validating generated documentation from automated technical writing tools
- Preparing documentation for FAA, EASA, or equivalent regulatory approval
- Building pre-commit hooks that validate STE compliance automatically
- Conducting documentation quality assurance before international distribution

---

## When NOT to Use

Avoid this skill when:

- The documentation is not safety-critical (marketing, tutorials, general information)
- Your organization has not adopted STE standards or has alternative documentation requirements
- Working with legacy documents that predate STE adoption and use outdated terminology
- Documentation is internal-only and does not require regulatory certification
- The document is written for consumers (STE applies only to technical professional documentation)
- You need training on STE rules themselves (use `ste-terminology-reference` skill instead)

---

## Core Workflow: STE Compliance Validation

### 1. Pre-Scan: Extract Sample Text and Measure Document Baseline

**Action:** Open the documentation file. Extract the first 500 words of body content (excluding titles and headers). Count total words in the document. Identify document type (procedure, manual, specification, guide).

**Checkpoint:** 
- Sample extracted successfully? ✓
- Document type identified? ✓
- Word count noted? ✓
- If document is under 3,000 words, note that this is below typical aviation documentation length — may indicate incomplete draft.

---

### 2. Sentence Length Audit: Verify No Sentence Exceeds 20 Words

**Action:** Parse the first 20 sentences. Count words in each sentence (count hyphenated words as one word; count numbers as one word). Identify sentences exceeding 20 words.

**Checkpoint:** 
- All sentences ≤ 20 words? ✓
- Average sentence length in the 10-15 word range? ✓

**Correction Pattern (if violations found):**
- Identify the conjunction or punctuation that can be split: "The landing gear is inspected for damage and corrosion, and any cracks are recorded before the aircraft is released." (29 words)
- Split into two sentences: "Inspect the landing gear for damage and corrosion. Record any cracks before the aircraft is released." (16 + 16 words)

---

### 3. Gerund and Noun Usage Audit: Detect Prohibited Noun Formations

**Action:** Search for words ending in "-ing" used as subjects or objects. Examples to find: "Testing," "Removing," "Checking," "Having," "Making," "Calibrating."

**Checkpoint:** 
- Any sentence has a gerund ("-ing" word) as the main subject? Flag for correction.
- Any sentence uses "-ing" form after prepositions like "for," "during," "after"? Check if a concrete noun can replace it.

**Correction Pattern (if violations found):**
- "Testing the fuel system is required" ❌ → "Test the fuel system" ✓ or "Fuel system testing activities are required" ✓
- "After removing the cover, inspect the interior" ❌ → "Remove the cover. Inspect the interior." ✓
- "The aircraft having landing gear" ❌ → "The aircraft has landing gear" or "Landing gear is installed on the aircraft" ✓

---

### 4. Passive Voice Compliance Check: Verify Safety-Critical Statements Use Passive Voice

**Action:** Identify all sentences containing mandatory actions, prohibitions, or safety-critical information. Look for these patterns:
- "Must be [verb-ed]" (correct passive form for mandatory action)
- "Must not be [verb-ed]" (correct passive form for prohibition)
- "May be [verb-ed]" (correct passive form for permission)
- Sentences describing what "is found," "is observed," "is caused by" (correct causal passive)

**Checkpoint:** 
- Do all safety-critical or mandatory action statements use passive voice? ✓
- Are prohibitions phrased as "must not be" (not "do not")? ✓
- Do descriptions of discovered conditions use passive ("is found," "is observed")? ✓

**Correction Pattern (if violations found):**
- "Do not activate this switch during flight" ❌ → "The switch must not be activated during flight" ✓
- "You must disconnect the battery before servicing" ❌ → "The battery must be disconnected before servicing" ✓
- "We found cracks in the wing spar" ❌ → "Cracks are found in the wing spar" ✓

**Exception:** Procedure step verbs use ACTIVE imperative: "Remove the access panel. Disconnect the wiring." ✓

---

### 5. Abbreviation Standardization Check: Verify Format and Coverage

**Action:** Extract all abbreviations in the document (words in CAPITALS). For each abbreviation:
1. Check if it contains periods (e.g., "A.C." ❌ should be "AC" ✓)
2. Check if it contains slashes (e.g., "A/C" ❌ should be "AC" ✓)
3. Verify that the full form appears at the first use of each abbreviation in each major section
4. Confirm the abbreviation is on the STE Approved Abbreviations list

**Checkpoint:** 
- All abbreviations use capital letters without periods? ✓
- No slashes in abbreviations (e.g., "AC" not "A/C")? ✓
- Each abbreviation's full form is written at first use (in the section or document)? ✓
- All abbreviations are STE-approved (check `ste-terminology-reference`)? ✓

**Correction Pattern (if violations found):**
- "A.C. power supply" ❌ → "Alternating Current (AC) power supply" ✓
- "D.C. circuit breaker" ❌ → "Direct Current (DC) circuit breaker" ✓
- "Rotating every 100 hours (A.D.)" ❌ → "Rotating every 100 hours per the Airworthiness Directive (AD)" ✓

---

### 6. Vocabulary Compliance Scan: Replace Non-Approved Terms and Synonyms

**Action:** Scan the document for prohibited words and non-approved synonyms. Key prohibited words to search for:

| Prohibited Word | STE Alternative |
|---|---|
| "Fix" | "Repair," "Adjust," "Replace," "Restore" (be specific) |
| "Problem" | "Defect," "Damage," "Malfunction," "Issue" (be specific) |
| "Check" | "Inspect," "Test," "Verify," "Examine" (be specific) |
| "Work on" | "Perform," "Execute," "Conduct," "Repair" (be specific) |
| "Get" | "Obtain," "Read," "Retrieve," "Set" (context-dependent) |
| "Make" | "Produce," "Create," "Adjust," "Perform" (be specific) |
| "Do" | Replace with specific action (repair, inspect, remove, install) |
| "Put" | "Install," "Place," "Position," "Mount" (be specific) |
| "Take" | "Remove," "Capture," "Obtain," "Record" (context-dependent) |

**Checkpoint:** 
- No prohibited words found in the document? ✓
- All synonyms replaced with STE-approved terms? ✓
- Ambiguous terms (like "device," "equipment," "item") replaced with specific nouns? ✓

---

### 7. Article Usage Verification: Confirm "The" Placement Follows STE Rules

**Action:** Check the use of the article "the" in technical descriptions and procedure steps. STE rules are:
- Use "the" before safety-critical components: "the landing gear," "the fuel pump," "the hydraulic system"
- Omit "the" when describing a component as a type or general category: "Hydraulic systems supply power" (not "The hydraulic systems supply power" when discussing the concept)
- In procedure steps, omit "the" before parts that are uniquely identified by context: "Remove cover" (if only one cover exists in that step)

**Checkpoint:** 
- Safety-critical components consistently use "the"? ✓
- Generic references omit "the" where appropriate? ✓
- No inconsistency in referring to the same component (sometimes with "the," sometimes without)? ✓

**Correction Pattern (if violations found):**
- "Inspect landing gear for corrosion" ❌ → "Inspect the landing gear for corrosion" ✓ (safety-critical)
- "The hydraulic systems are used in aircraft" ❌ → "Hydraulic systems are used in aircraft" ✓ (generic category)
- "Remove the right cover from the panel" → "Remove the cover from the right panel" ✓ (adjust for clarity, not STE stricture)

---

### 8. Negative Construction Audit: Eliminate Double Negatives and Weak Negations

**Action:** Search for double negatives and overly cautious negations:

| Forbidden | STE Alternative |
|---|---|
| "Not uncommon" | "Common" or "Frequent" |
| "Not unlikely to" | "Likely to" or "Possible" |
| "Cannot be ruled out" | "Is possible" or "Must be checked" |
| "Do not fail to" | "Must," "Verify," "Ensure" |
| "No less than" | "At least," use numeric minimum |
| "Not unnecessary" | "Is necessary" or "Is required" |
| "Without difficulty" | "Easily" (if accurate) or state the ease level specifically |
| "Neither X nor Y" (when possible to use positive) | "Only Z" or "Only perform Z" |

**Checkpoint:** 
- No double negatives found? ✓
- All weak negations ("not uncommon," "not unlikely") replaced with positive assertions? ✓
- Prohibitions use direct "must not," not cautious negations? ✓

---

### 9. Verb Tense Consistency Check: Ensure Uniform Tense Throughout

**Action:** Identify all verb tenses in procedure steps and instructional sections. Verify:
- All procedure steps use present tense imperative (direct commands): "Remove," "Inspect," "Replace"
- All descriptive sections use present tense: "The landing gear is located on the fuselage"
- No mixed tenses within the same procedure or section

**Checkpoint:** 
- All procedure steps consistently imperative (commands)? ✓
- All descriptive text consistently present tense? ✓
- No shift from procedure step (imperative) into future tense ("will verify") or past tense ("verified")? ✓

**Correction Pattern (if violations found):**
- "Remove the panel. You will inspect the wiring." ❌ → "Remove the panel. Inspect the wiring." ✓
- "The system is supplied by AC power, which is regulated" ❌ → "AC power supplies the system. The power is regulated by a controller." ✓

---

### 10. Document Structure and Format Review: Verify Consistency and Accessibility

**Action:** Examine the document structure:
- Verify headers are hierarchical (H1, then H2, then H3, no skipping levels)
- Confirm lists use parallel structure (all bullets same grammatical form)
- Check that tables have headers, consistent column alignment, and single concept per cell
- Verify cross-references use exact section numbers or titles
- Confirm all figures and tables are numbered sequentially and referenced in text

**Checkpoint:** 
- Header hierarchy is consistent? ✓
- All list items use parallel grammar (all nouns, all verbs, all commands)? ✓
- Table cells contain single, focused information? ✓
- All figures and tables are referenced in text before appearing? ✓
- No orphaned lists or tables without context? ✓

---

## Constraints

### MUST DO

- **Run the 10-step checklist sequentially:** Do not skip validation steps. Each step builds on previous results to identify violations that interact (e.g., a non-STE verb may create a tense inconsistency).
- **Correct one violation class at a time:** Fix all gerund violations before moving to passive voice audits. This prevents cascading changes that introduce new errors.
- **Document your corrections explicitly:** For each violation, record the original text, the correction, and which STE rule it violates (reference this checklist). This creates a change log for review.
- **Re-validate after bulk corrections:** After replacing all prohibited words or restructuring sentences, re-run the sentence length audit. Corrections may shorten or lengthen sentences.
- **Verify abbreviations exist in approved list:** Before approving any abbreviation, confirm it appears in the STE Approved Abbreviations list (see `ste-terminology-reference` skill). If not STE-approved, use the full term or define the abbreviation.
- **Apply passive voice only to safety-critical statements:** Do not convert all verbs to passive voice. Procedure steps must remain active imperative ("Remove the cover"). Only safety mandates and prohibitions use passive.

### MUST NOT DO

- **Never approve a document with any double negatives:** Rewrite "not uncommon" as "common" or remove the double negative entirely.
- **Do not skip the vocabulary audit step:** A document may pass sentence length and tense checks but fail vocabulary compliance. All three must pass.
- **Never mix abbreviation formats in the same document:** If you write "AC" on page 1, never write "A.C." on page 2. Consistency is mandatory.
- **Do not approve gerunds as subjects:** "Testing the system is required" fails STE, even if the rest of the sentence is correct. Reword to active verb or concrete noun.
- **Never use marketing language or hedging in safety statements:** "Our excellent system should not be damaged" ❌ → "The system must not be damaged" ✓
- **Do not approve any document that mixes British and American terminology:** Choose one standard for the document (e.g., "ground" (US) vs. "earth" (UK)) and apply it consistently.
- **Never include undefined acronyms:** Every abbreviation must have its full form at first use within the document or document section.

---

## Output Template: STE Validation Report

When auditing a document, produce this report format:

```
=== STE DOCUMENTATION COMPLIANCE REPORT ===
Document: [Title]
Date Audited: [Date]
Auditor: [Name]

VALIDATION SUMMARY
✓ Step 1 — Sentence Length: [PASS/FAIL] ([N] violations)
✓ Step 2 — Noun Usage: [PASS/FAIL] ([N] violations)
✓ Step 3 — Passive Voice: [PASS/FAIL] ([N] violations)
✓ Step 4 — Abbreviations: [PASS/FAIL] ([N] violations)
✓ Step 5 — Vocabulary: [PASS/FAIL] ([N] violations)
✓ Step 6 — Articles: [PASS/FAIL] ([N] violations)
✓ Step 7 — Negatives: [PASS/FAIL] ([N] violations)
✓ Step 8 — Verb Tense: [PASS/FAIL] ([N] violations)
✓ Step 9 — Document Structure: [PASS/FAIL] ([N] violations)

FINAL STATUS: [APPROVED / REJECTED / CONDITIONAL]

VIOLATIONS FOUND
[For each violation type, list examples and corrections]

1. Sentence Length Violations (Step 1)
   - Page X, Paragraph Y: "[Original text]" (25 words)
     Correction: "[Revised text]" (16 words)
   - ...

2. Vocabulary Violations (Step 5)
   - Page X: "Fix the engine" → "Repair the fuel system"
   - Page Y: "Problem with the valve" → "Valve malfunction"
   - ...

RECOMMENDATIONS
- [Priority 1 fixes — blocking publication]
- [Priority 2 improvements — recommended for next revision]

NEXT STEPS
[ ] Corrections applied by documentation team
[ ] Re-audit performed by technical reviewer
[ ] Document approved for publication
[ ] Document released to distribution channel
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `ste-terminology-reference` | Consult this reference to verify term approval and correct non-STE vocabulary in the violations you find during Step 6 (Vocabulary Compliance Scan). |
| `ste-code-commenting` | Apply STE principles to code documentation and docstrings — use this checklist to audit comments within source code. |

