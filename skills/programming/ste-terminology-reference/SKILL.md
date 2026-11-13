---
name: ste-terminology-reference
description: Comprehensive reference of Simplified Technical English (STE) standardized vocabulary, term definitions, abbreviation mappings, and controlled language rules used in aviation, aerospace, maritime, and technical documentation standards.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: programming
  role: reference
  scope: implementation
  output-format: report
  triggers: STE, simplified technical english, aviation terminology, technical documentation language, how do i document code, controlled vocabulary, aerospace documentation
  related-skills: ste-documentation-checklist, ste-code-commenting
  archetypes: reference, enforcement
  anti_triggers: learning tutorials, how to learn, brainstorming, creative writing
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Simplified Technical English (STE) Terminology Reference

Provides authoritative STE term definitions, controlled vocabulary mappings, and standardized abbreviations used across aviation, aerospace, and maritime technical documentation. This is a living reference documenting the 3,500+ approved terms and 1,500+ approved abbreviations in the STE standard, enabling consistent documentation across international safety-critical systems.

## TL;DR Checklist

- [ ] Use only STE-approved terms from this reference (no synonyms or variations)
- [ ] Match exact abbreviation forms (e.g., "AC" not "A/C" for alternating current)
- [ ] Replace prohibited synonyms with approved equivalents (e.g., "repair" not "fix")
- [ ] Verify noun forms are "approved nouns" — STE restricts noun usage (no gerunds as nouns)
- [ ] Check passive voice compliance — STE requires specific passive constructions
- [ ] Confirm articles follow STE rules (mandatory "the" in certain contexts, forbidden in others)
- [ ] Validate acronyms against the approved STE acronym list before first use

---

## When to Use

Use this skill when:

- Writing or reviewing technical documentation for aviation, aerospace, or maritime systems
- Converting legacy documentation to STE-compliant terminology
- Defining approved term lists for domain-specific technical writing standards
- Training documentation teams on controlled vocabulary and term consistency
- Validating that uncommon terms are either STE-approved or must be defined at first use
- Building automated compliance checkers that validate terminology against approved lists

---

## When NOT to Use

Avoid this skill when:

- Writing marketing or promotional content (STE is for technical documentation only)
- Creating user-facing help text or tutorials (STE applies to maintenance and safety documents)
- Documenting consumer software without safety-critical implications
- The documentation scope is internal-only and does not require international standardization
- Working with documentation that predates STE adoption and uses legacy terminology (consult style guides instead)

---

## Core Reference: STE Approved Terminology

### Structural Terms (Aviation/Aerospace)

| Term | Definition | STE Approved Abbreviation | Prohibited Synonyms |
|------|------------|--------------------------|---------------------|
| **Fuselage** | The main body of an aircraft or spacecraft. | FUS | body, frame, hull (in aviation context) |
| **Skin** | The outer surface of an aircraft or aerospace vehicle. | N/A | covering, exterior, outer shell |
| **Rivet** | A short metal pin used to join metal sheets together. | N/A | fastener (generic), fixing (too vague) |
| **Aileron** | A moving surface on a wing that controls aircraft roll. | AIL | flap (ambiguous), control surface (generic) |
| **Empennage** | The tail assembly of an aircraft. | EMP | tail (too informal), tail section (acceptable alternate) |
| **Lubricate** | To apply a liquid substance to reduce friction. | LUB | grease (refers to a specific type), oil (too specific), apply lube to (non-STE phrasing) |
| **Fastener** | An object that joins two or more components together. | N/A | bolt, rivet, screw, pin (use specific term instead) |
| **Corrosion** | The chemical or electrochemical decay of a material. | CORR | rust (specific type only), degradation (too generic) |
| **Fatigue** | Metal weakening from repeated stress cycles. | FAT | metal fatigue (redundant), damage from repeated load |
| **Cavity** | An enclosed space or indentation in a component. | CAV | hole (too informal), void (less technical) |

### Maintenance and Operational Terms

| Term | Definition | STE Approved Abbreviation | Prohibited Synonyms |
|------|------------|--------------------------|---------------------|
| **Maintenance** | Work done to keep equipment in good condition or repair it. | MAINT | upkeep (informal), servicing (less formal), work on (non-technical), fix (informal), repair (use specific term instead) |
| **Inspection** | Visual or instrumental examination to find problems. | INSP | check (too informal), look at (non-technical), examine (too vague) |
| **Replace** | To take out something and put in something else. | N/A | change (ambiguous), swap (informal), substitute (formal but avoid), remove and install (too wordy) |
| **Remove** | To take something away or disconnect something. | REM | take out (too informal), extract (acceptable alternate) |
| **Install** | To put something in place and make it ready for use. | INST | put in (too informal), attach (too specific), fit (ambiguous) |
| **Adjust** | To change something slightly to make it correct. | ADJ | modify (too broad), change (too vague), tune (informal) |
| **Functional Check** | A test to confirm that equipment works correctly. | FC | system test (less specific), operational test (generic), verification test |
| **Malfunction** | A failure of equipment to work correctly. | MAL | failure (acceptable alternate), problem (too informal), defect (implies design fault) |
| **Redundancy** | The provision of duplicate components for safety. | RED | backup (acceptable alternate), failsafe (not identical meaning) |

### Electrical and Systems Terms

| Term | Definition | STE Approved Abbreviation | Prohibited Synonyms |
|------|------------|--------------------------|---------------------|
| **Alternating Current** | Electric current that reverses direction periodically. | AC | A/C (non-standard abbreviation in STE), alternating voltage |
| **Direct Current** | Electric current flowing in one direction. | DC | D.C. (non-standard abbreviation in STE), direct voltage |
| **Circuit Breaker** | A device that stops current flow when overload occurs. | CB | breaker (too short), cutout (too informal), protection device (generic) |
| **Relay** | An electromagnetic switch controlled by a small current. | RLY | switch (too generic), electromagnetic device (too vague) |
| **Ground** | An electrical connection to the earth or a common return path. | GND or EARTH | earth (use in UK documentation), reference (too vague), return (ambiguous) |
| **Voltage** | The electrical potential difference between two points. | V | electrical pressure (non-technical), potential (ambiguous) |
| **Amperage** | The measure of electric current flow. | AMP or A | current strength (less formal), electrical flow (vague) |
| **Watt** | The unit of electrical power. | W | power rating (acceptable alternate), kilowatt, megawatt (different units) |
| **Conductor** | A material that allows electricity to flow. | N/A | wire (specific type), cable (specific type), electrical path (generic) |
| **Insulator** | A material that prevents electricity from flowing. | N/A | non-conductor (acceptable alternate), dielectric (more technical) |

### Environmental and Condition Terms

| Term | Definition | STE Approved Abbreviation | Prohibited Synonyms |
|------|------------|--------------------------|---------------------|
| **Temperature** | The measure of heat or cold. | TEMP | heat (too specific), cold (too informal), thermal condition (wordy) |
| **Pressure** | The force applied over an area. | PRES or PSI | load (too vague), stress (different meaning in materials), force (broader term) |
| **Altitude** | The height above ground or sea level. | ALT | height (acceptable alternate but STE-preferred is altitude), elevation (acceptable in geographic context) |
| **Humidity** | The amount of water vapor in air. | HUM or RH | moisture (less technical), water content (vague) |
| **Vibration** | Rapid, repeated movement back and forth. | VIB | shaking (informal), oscillation (more technical but accepted), movement (too broad) |
| **Thermal** | Related to heat. | THERM | heat-related (non-technical phrasing), temperature-related (use thermal instead) |
| **Contamination** | The presence of unwanted substances. | CONT | dirt (too informal), particles (too specific), pollution (different context) |
| **Degrade** | To become worse in condition or performance. | N/A | deteriorate (acceptable alternate), decline (acceptable alternate), wear down (informal) |
| **Ambient** | Surrounding environmental conditions. | AMB | surrounding (acceptable alternate), environmental (more generic) |

---

## STE Noun Usage Rules

STE strictly controls which words may be used as nouns. This prevents ambiguity in safety-critical contexts.

### APPROVED NOUNS (May be used as primary subjects)

| Noun | Example STE Sentence | Why Approved |
|------|---------------------|-------------|
| **Maintenance** | "Maintenance is required every 100 flight hours." | Concrete activity; tangible deliverable |
| **Inspection** | "Inspection reveals cracks in the fuselage skin." | Concrete process; produces measurable results |
| **Flight** | "This aircraft completed 5,000 flights." | Concrete, countable event |
| **System** | "The hydraulic system supplies power to the landing gear." | Concrete, identifiable component |
| **Component** | "Replace damaged components before flight." | Concrete, physical object |
| **Operation** | "Engine operation at maximum RPM requires monitoring." | Concrete process with definable state |
| **Configuration** | "The electrical configuration meets safety requirements." | Concrete, verifiable arrangement |
| **Procedure** | "Follow the maintenance procedure exactly." | Concrete, documented steps |

### PROHIBITED NOUNS (Must be reworded)

| Prohibited Noun | Reason | STE Correction |
|-----------------|--------|-----------------|
| **Testing** (gerund form) | STE forbids gerunds as primary nouns — creates ambiguity about action vs. object. | "Test the system" (verb form) OR "Test activities" (concrete noun) |
| **Calibrating** | Gerund; action unclear without context. | "Calibrate the instrument" OR "Calibration procedure" (concrete noun) |
| **Removing** | Gerund; references undefined action without subject. | "Remove the cover" OR "Removal process" (concrete noun) |
| **Having** | Too informal and vague. | Restate with concrete relationship: "The aircraft has landing gear" → "Landing gear is installed on the aircraft" |
| **Making** | Too vague; does not specify action. | Use specific verb: "Make an adjustment" → "Adjust the throttle" |
| **Getting** | Informal; unclear result. | Use specific verb: "Get information" → "Read the pressure gauge" |
| **Fixing** | Informal and ambiguous. | Use specific verb: "Fix the engine" → "Repair the fuel injector" |
| **Doing** | Non-specific verb noun. | Use specific action: "Doing maintenance" → "Perform the 100-hour inspection" |

### Collective Noun Restrictions

STE permits collective nouns only when the group acts as a single unit:

| Allowed | Not Allowed | Reason |
|---------|------------|--------|
| "The crew is briefed" (acts as one unit) | "The crew are checking components" (implies individual action) | STE treats collectives as singular units; individual actions require singular nouns |
| "The system is functioning" (acts as one unit) | "The systems are connecting" (implies separate connection events) | Specify "The control systems" if plurality is necessary |
| "A group of fasteners is required" | "A group of fasteners are being installed" (vague action) | STE avoids gerund-form verbs in group descriptions |

---

## STE Abbreviation Rules

STE defines exact formatting for abbreviations to eliminate confusion in safety documentation.

### Format Standards

| Rule | Example | Non-STE (Forbidden) |
|------|---------|-------------------|
| **No periods in abbreviations** | AC, DC, RPM, PRES | A.C., D.C., R.P.M., P.R.E.S. |
| **Capital letters only** | ALT, INSP, FC | alt, Insp, Fc |
| **No slash notation** | AC (alternating current) | A/C (creates ambiguity) |
| **Full form at first use** | "Alternating Current (AC) powers the system" | Undefined abbreviation at start of document |
| **Latin abbreviations prohibited** | "for example:" (write it out) | "e.g.:" (non-English) |
| **No ampersand** | "and" (write word) | "&" (forbidden in formal STE) |

### Common Approved Abbreviations (Exact Forms)

| Abbreviation | Full Form | Context |
|--------------|-----------|---------|
| AC | Alternating Current | Electrical systems |
| DC | Direct Current | Electrical systems |
| RH | Relative Humidity | Environmental conditions |
| RPM | Revolutions Per Minute | Engine/rotor speeds |
| PSI | Pounds Per Square Inch | Pressure systems |
| GPH | Gallons Per Hour | Fuel flow rates |
| FT | Foot / Feet | Altitude, dimensions |
| LB or LBS | Pound / Pounds | Weight, thrust |
| NM | Nautical Mile | Distance (aviation) |
| FL | Flight Level | Altitude (in 100 ft increments) |
| QFE | Altimeter Setting | Ground-relative altitude |
| QNH | Altimeter Setting | Sea-level-relative altitude |
| AOA | Angle of Attack | Aerodynamic parameter |
| CG | Center of Gravity | Weight distribution |
| SOP | Standard Operating Procedure | Operations |
| MEL | Minimum Equipment List | Aircraft configuration |
| CDL | Component Defect List | Maintenance tracking |
| AD | Airworthiness Directive | Regulatory compliance |

---

## Passive Voice Requirements in STE

STE mandates specific passive voice constructions to ensure clarity and uniform responsibility assignment.

### Rule: Passive Voice Required for Safety-Critical Actions

| Action Type | STE Requirement | Example (Correct) | Example (Non-STE) |
|-------------|-----------------|-------------------|-------------------|
| **Mandatory Action** | Use passive: "must be done" | "The engine must be shut down before refueling." | "You must shut down the engine before refueling." |
| **Prohibition** | Use passive: "must not be done" | "The switch must not be activated during flight." | "Do not activate the switch during flight." |
| **Permission** | Use passive: "may be done" | "The fuel tank may be drained for maintenance." | "You may drain the fuel tank for maintenance." |
| **Causal Process** | Use passive: "is caused by" or "is produced by" | "Corrosion is caused by exposure to salt water." | "Salt water causes corrosion." |
| **Discovered State** | Use passive: "is found" or "is observed" | "Cracks are found in the wing skin." | "We found cracks in the wing skin." |
| **Inspection Result** | Use passive: "is inspected" or "is checked" | "The landing gear is inspected for corrosion." | "Inspect the landing gear for corrosion." (Use imperative only in procedure steps) |

### Rule: RESTRICTED Passive Voice (Use Active Instead)

| Scenario | STE Instruction | Example (Correct) | Example (Non-STE) |
|----------|-----------------|-------------------|-------------------|
| **Procedure Step** | Active verb (direct instruction) | "Remove the access panel." | "The access panel is removed." (in procedure step) |
| **Agent Unknown / Irrelevant** | Use active "one" or agent implied | "One removes the cap and inspects the nozzle." or "Remove the cap and inspect the nozzle." | "The cap is removed and the nozzle is inspected." (when procedure step) |
| **Ambiguous Responsibility** | Active voice to clarify responsibility | "The mechanic adjusts the brake pressure." | "The brake pressure is adjusted." (unclear who does it) |

---

## Constraints

### MUST DO

- **Always verify term approval:** Check this reference or the official STE Term Database (AIA NAS 1100.14) before using any technical term. If not in the approved list, define it at first use.
- **Use exact noun forms:** "Maintenance" (noun) is approved; "Maintaining" (gerund) is prohibited. Check the Approved Nouns table before nominalizing verbs.
- **Match abbreviation formatting precisely:** Write "AC" and "DC" without periods or slashes. First use must include the full form: "Alternating Current (AC) supplies power to the system."
- **Apply passive voice to safety-critical actions:** "The landing gear must be inspected" (safety); "Remove the cover" (procedure step — use active imperative).
- **Define or omit undefined terms:** If a term is not STE-approved and not in the reference, either replace it with an approved synonym or include a definition at first use in brackets: "[The pressure relief valve is a device that opens when pressure exceeds X PSI]."
- **Substitute prohibited synonyms systematically:** If your draft contains "fix," "check," or "problem," replace them with approved terms from the Prohibited Synonyms table before review.

### MUST NOT DO

- **Never use gerunds as primary nouns:** "Testing the system" is non-STE when used as main clause subject. Use "Test the system" (verb) or "System testing activities" (concrete noun).
- **Do not abbreviate the same term multiple ways:** If you write "A/C" on page 1, never write "AC" on page 2. Pick the approved form ("AC") and use it consistently.
- **Avoid vague verbs:** Do not use "make," "get," "do," "go," "have" (casual senses), "put," "handle," or "work on." Replace with specific approved verbs: "Adjust," "Remove," "Install," "Replace," "Inspect."
- **Do not use marketing or informal tone:** "Awesome flight control system" → "Flight control system meets the following requirements..." (formal, technical).
- **Never assume reader knowledge:** Always write "Alternate Current (AC)" at first use in each document section, even if you used it earlier. Reinforce approved terminology every time.
- **Do not mix British and American spelling/terminology within a single document:** Choose one variant (e.g., "earth" (UK) vs. "ground" (US)) and apply it consistently throughout.
- **Do not use symbols in running text:** Write "Degrees Celsius" (not "°C" in narrative). Symbols are permitted in tables, diagrams, or technical specifications only.

---

## Live References

- **Official STE Standard:** AIA NAS 1100.14 — The American Aerospace Standards Association Simplified Technical English Standard. Available from the SAE (Society of Automotive Engineers) and aerospace industry bodies. This is the authoritative source for the complete 3,500+ approved term list.
- **EASA STE Guidance:** European Union Aviation Safety Agency (EASA) provides STE-compliant documentation standards at https://www.easa.europa.eu/. Download STE implementation guides for aerospace documentation.
- **DITA Open Toolkit STE Profile:** OASIS DITA (Darwin Information Typing Architecture) includes an STE profile for structured technical documentation. Applicable to aviation, aerospace, and maritime contexts. See https://www.oasis-open.org/.
- **SAE Aerospace Standards:** The SAE provides the canonical AIA NAS 1100 standard series. STE is formalized in AIA NAS 1100.14. Access at https://www.sae.org/standards/.
- **Approved STE Controlled Vocabulary Lists:** The Simplified Technical English Council (STEC) maintains an approved vocabulary database. Individual organizations (Airbus, Boeing, etc.) maintain domain-specific STE dictionaries and publish them in their technical documentation standards.
- **ISO/IEC 90003:** Quality management and process improvement standards sometimes reference STE for documentation quality in safety-critical software and hardware systems. See https://www.iso.org/ for applicable standards.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `ste-documentation-checklist` | Validation checklist for STE documentation compliance — use this to audit your drafts against STE rules before publication. |
| `ste-code-commenting` | Apply STE principles to code comments and docstrings — document your implementation using STE terminology and verb restrictions. |

