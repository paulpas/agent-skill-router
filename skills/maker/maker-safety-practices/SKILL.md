---
name: maker-safety-practices
description: Implements makerspace safety protocols with PPE selection by hazard type,
  machine-specific safe operating procedures (3D printers, laser cutters, CNC, soldering),
  and emergency response.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: maker
  triggers: maker safety, makerspace safety, 3d printer safety, laser cutter safety,
    PPE selection, fume extraction, how do i work safely with tools
  archetypes:
  - educational
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
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: rapid-prototyping-workflow, digital-fabrication
------
# Maker Safety Practices

Implements comprehensive safety protocols for makerspace operations covering hazard assessment, PPE selection by hazard type, machine-specific safe operating procedures for 3D printers/laser cutters/CNC mills/electronics workstations, electrical safety for power tools and battery handling, fume extraction requirements, and emergency response procedures. Safety is not optional — every operation requires a documented risk assessment before the first tool is touched.

## TL;DR Checklist

- [ ] Complete hazard assessment: identify ALL hazard types (thermal, mechanical, chemical, electrical, particulate) present in the workspace
- [ ] Verify PPE matches each identified hazard: ANSI Z87.1 eye protection, N95/respirator for particulates/chemicals, appropriate gloves
- [ ] Confirm emergency stop is accessible and functional — within arm's reach, unobstructed, tested before each session
- [ ] Ensure fire extinguisher of correct class (ABC general, D for metal fires) is present and inspected within last 12 months
- [ ] Verify fume extraction/ventilation is active and functioning BEFORE starting any operation that generates smoke, fumes, or particulates
- [ ] Inspect machine safety features: interlocks on laser cutters, chip guards on CNC, thermal run protection on 3D printers, E-stop wiring intact
- [ ] Maintain a 36-inch clear workspace perimeter around every operating machine; no flammable materials within that radius
- [ ] Confirm first aid kit is accessible within 30 seconds and contains burn dressings, eye wash solution, and trauma supplies
- [ ] Wear NO loose clothing, jewelry, or unrestrained long hair near rotating machinery (CNC mills, drill presses, lathes)
- [ ] Never leave an active laser cutter, CNC mill, or soldering station unattended — 3D printers may run unattended ONLY if thermal runaway protection is confirmed active and room ventilation is adequate

---

## When to Use

Use this skill when:

- Setting up a new workspace, makerspace bay, or electronics bench before any fabrication begins
- Operating any machine tool (CNC mill, lathe, drill press, saw) for the first time or after maintenance
- Working with materials that generate fumes, smoke, or dust (3D printing ABS, soldering lead-free alloys, cutting composites, sanding wood)
- Handling lithium-polymer (LiPo) batteries for charging, discharging, storage, or disposal
- Performing electrical work involving mains voltage (120V/240V AC) or high-current DC systems
- Conducting soldering operations with any heated tool above 200°C (soldering iron, hot air rework station)
- Preparing for a safety audit or onboarding new makerspace users who need structured safety training
- An incident, near-miss, or unsafe condition has been observed and needs formal documentation

---

## When NOT to Use

Avoid this skill for:

- Situations requiring professional safety officer judgment — industrial-scale chemical storage, radiation equipment, high-voltage (>1000V) systems, confined space entry
- Emergency situations already in progress where immediate action is needed — call emergency services (911 or local equivalent) first, then document using this skill's protocols after the situation is controlled
- Legal compliance documentation for regulated industries (medical device manufacturing, aviation maintenance) — these require certified safety programs and licensed professionals

---

## Core Workflow

### Step 1: Assess Hazard Type

Identify every hazard category present in your operation. A single task may involve multiple hazards simultaneously.

**Hazard categories and common sources:**

| Hazard Type | Sources | Primary Risk |
|-------------|---------|--------------|
| **Thermal** | Laser cutter optics, soldering iron (300-450°C), 3D printer hot end (200-260°C), heated bed (60-110°C), CNC spindle friction | Burns, fires from ignition of nearby materials, thermal runaway in printers |
| **Mechanical** | CNC mill rotating tool, drill press chuck, table saw blade, belt drives, conveyor belts | Lacerations, amputation, eye injury from flying debris, entanglement |
| **Chemical** | ABS printer fumes (styrene), solder flux fumes, acetone/Isopropyl alcohol for cleaning, resin printers (uncured photopolymer), spray adhesives | Respiratory irritation, chemical burns, long-term carcinogenic exposure, skin sensitization |
| **Electrical** | Mains-powered tools, LiPo batteries (fire/explosion risk), laser tube high voltage (10-30kV DC), soldering station ground loops | Electric shock, electrocution, arc flash burns, LiPo fire and toxic gas release |
| **Particulate** | Wood dust from CNC/laser cutting, sanding dust, metal shavings from milling, 3D printer ultrafine particles (UFPs) | Respiratory disease (asthma, silicosis from silica-containing materials), eye irritation, surface contamination |

**Checkpoint:** List ALL hazard categories applicable to your specific task. If you can name only one category, you are under-assessing — every operation has at least two hazards.

---

### Step 2: Select Required PPE

Match personal protective equipment to each identified hazard. No single piece of PPE covers all hazards; layer protection appropriately.

**Eye and face protection:**
| Hazard | Required Protection | Standard | Notes |
|--------|--------------------|----------|-------|
| General workshop work (3D printer, soldering bench) | ANSI Z87.1 safety glasses with side shields | ANSI/ANSI Z87.1-2020 | Must have "Z87" or "Z87+" etched into lens |
| CNC milling (flying chips), table saw | Full face shield OVER safety glasses | ANSI Z87.1-2020 + Z87 side shields | Face shield alone is NOT sufficient — secondary eyewear required underneath |
| Laser cutter operation | Interlock enclosure OR laser-rated goggles matched to wavelength | EN 207/EN 206 or equivalent | Goggles must have optical density rating for specific laser wavelength (e.g., OD5+ at 1064nm for fiber lasers) |
| Chemical handling (resin, acetone) | Splash-proof safety goggles (sealed) | ANSI Z87.1-2020 | Regular safety glasses do NOT prevent splash exposure to eyes |

**Hand protection:**
| Hazard | Required Protection | Notes |
|--------|--------------------|-------|
| Chemical handling (resin, acetone, solvents) | Nitrile gloves (minimum 4 mil thickness) | Replace immediately if torn or saturated; latex causes allergic reactions in many people |
| Sharp edges (laser-cut sheet metal, raw stock) | Cut-resistant gloves (ANSI Level A3+) | Must be removed before approaching any rotating machinery — loose material can get caught |
| Hot surfaces (removing prints, handling heated parts) | Heat-resistant gloves (Kevlar or leather, rated to task temperature) | Do NOT use fabric work gloves near rotating tools |
| Electrical work | Class 0 insulated gloves (rated for voltage level) | Must be inspected before each use; rubber inspection certificate required |
| General workshop tasks | NO GLOVES near CNC mill, lathe, drill press, or any rotating tool | Glove entanglement causes severe finger/hand amputation — this is the #1 rule of machine safety |

**Respiratory protection:**
| Exposure | Required Protection | Notes |
|----------|--------------------|-------|
| Wood dust, sanding, general particulates | N95 respirator (NIOSH-approved) | Must fit-seal check performed each wear; replace when breathing becomes difficult or after 8 hours continuous use |
| Solder fumes, light chemical vapors | Activated carbon mask (respirator with organic vapor cartridge) | P100 + OV combination for best protection against both particulates and organics |
| ABS printing fumes (styrene), resin vapor, solvent cleaning | Half-face respirator with P100 + OV cartridges | Nuisance masks and cloth masks provide ZERO protection against chemical vapors |
| Unknown or high-concentration airborne hazards | Supplied-air respirator (SCBA) or immediate evacuation | Do not enter area — call safety officer or emergency services |

**Hearing protection:**
| Noise Level | Required Protection | Notes |
|-------------|--------------------|-------|
| < 75 dB(A) | None required | Normal conversation level |
| 75–85 dB(A) | Recommended but not mandatory | Long-exposure monitoring recommended |
| 85–100 dB(A) | Earplugs (NRR 25+) or earmuffs | CNC milling, table saws, router tables typically in this range |
| > 100 dB(A) | Double protection: earplugs + earmuffs | Chain saws, large industrial saws; limit exposure to < 2 hours/day |

**Checkpoint:** Every identified hazard must have a corresponding PPE requirement listed. If a hazard exists without matched PPE, stop and procure the correct protection before proceeding.

---

### Step 3: Verify Machine Safety Features

Test all safety mechanisms before beginning any fabrication session. A machine with disabled or broken safety features is as dangerous as no machine at all.

**Pre-session safety checklist (repeat for every machine):**

| Check | Action | Pass Criteria |
|-------|--------|---------------|
| **Emergency stop** | Press the E-stop button, verify machine powers down immediately | Machine stops within 1 second of E-stop actuation; must be physically reset to resume operation |
| **E-stop accessibility** | Walk from your normal standing position to the E-stop without moving feet | Path is clear, no cables/tools blocking reach, E-stop is clearly visible and colored red on yellow background |
| **Enclosure/interlock (laser)** | Open the laser cutter door while a job is running (if safe to test) or verify interlock engages when door opens | Laser tube immediately ceases emission; status indicator changes from "LASER ON" to "LASER OFF" |
| **Ventilation/fume extraction** | Verify exhaust fan is running with airflow indicator active; feel for suction at work zone | Airflow gauge shows adequate flow, or paper strip placed near extraction port is drawn toward it |
| **Machine guards (CNC)** | Inspect chip guard is in place, spindle guard intact, axis travel limits functional | Guard covers all exposed rotating tool; limit switches respond when axes reach physical endpoints |
| **Thermal runaway protection (3D printer)** | Verify firmware setting is enabled and heater thermistor reads ambient temperature correctly on cold start | Marlin/Motion/RepRapFirmware: "THERMAL RUNWAY PROTECTION" is defined in Configuration.h; hot end does not exceed 50°C without command |
| **Grounding** | Inspect power cord grounding pin intact, equipment connected to grounded outlet (no adapters) | Outlet tester shows correct wiring (GROUNDED); no cracked or damaged cords visible |
| **Fire suppression readiness** | Fire extinguisher present in room, correct class for hazards, pressure gauge in green zone, inspection tag current | Extinguisher within 30 feet of machine, inspected within last 12 months, type matches workspace hazards (ABC for general) |

---

### Step 4: Set Up Safe Work Environment

Configure the physical workspace before activating any equipment.

**Workspace layout requirements:**
- **36-inch clearance zone:** Maintain a minimum 36-inch (91cm) clear perimeter around every operating machine. No stools, bins, cables, or materials within this zone. This provides escape space and E-stop access.
- **Flammable material buffer zone:** Keep all paper, cardboard, solvents, aerosol cans, and fabric at least 10 feet from laser cutters, soldering stations, and 3D printers with active hot ends.
- **Fire extinguisher placement:** Class ABC fire extinguisher must be visible and accessible within 30 seconds (approximately 75 feet) of any fabrication station. Class D extinguisher required for any metalworking area.
- **First aid kit:** Must be stocked within arm's reach (within 30 seconds walking time) and contain: burn gel/dressings, sterile gauze pads, adhesive bandages, trauma shears, eye wash solution, nitrile gloves, and CPR mask.
- **Lighting:** Minimum 500 lux at the work surface without glare on reflective surfaces (polished metal, laser beam path, mirror-finish prints). Task lamp required for precision soldering or detail sanding.
- **Housekeeping:** Floor free of tripping hazards (cables routed and taped down), spills cleaned immediately, waste bins with lids for chemical-contaminated materials (acetone-soaked rags stored in sealed metal container to prevent spontaneous combustion).

---

### Step 5: Execute Machine-Specific Safety Protocol

Follow the startup, operation, and shutdown sequence for each machine type. Do not deviate from these sequences.

**General startup sequence:**
1. Verify workspace is clear (36-inch perimeter, no flammable materials nearby)
2. Confirm PPE is donned correctly for identified hazards
3. Verify ventilation/fume extraction is ACTIVE before powering on the machine
4. Power on machine, allow warm-up period if specified by manufacturer
5. Run a dry cycle or self-test (no material/workpiece loaded) to confirm normal operation
6. Load material/workpiece using appropriate handling tools — not bare hands when hot or sharp
7. Start fabrication — stay within sight of the machine for the first 10 minutes

**General shutdown sequence:**
1. Allow complete cycle finish — do not abort mid-operation unless an emergency condition exists
2. Wait for all heating elements to cool below safe touch temperature (<50°C)
3. Remove workpiece using appropriate tools (tweezers, pliers, brush — never bare hands on hot parts)
4. Turn off machine power, then disconnect extraction/ventilation after 2 minutes to purge remaining fumes
5. Clean workspace: remove debris, wipe surfaces with appropriate cleaner, store tools in designated locations
6. Log any abnormalities, near-misses, or unusual behavior in the shared incident log

---

## Machine-Specific Protocols

### 3D Printer Safety

**Thermal hazards:**
- Hot ends operate at 200–260°C for PLA/PETG/ABS; up to 300°C for Nylon/PC. Contact causes immediate severe burns.
- Heated beds operate at 60–110°C. Contact above 55°C causes second-degree burns within seconds.
- **Rule:** Never touch a hot end or heated bed without confirming temperature via display or reading <40°C with IR thermometer.

**Fume hazards by material:**
| Material | Fumes Generated | Ventilation Requirement |
|----------|----------------|------------------------|
| PLA | Minimal (lactide — low toxicity) | Basic room ventilation adequate |
| PETG | Glycol-based fumes (low risk) | Room ventilation adequate |
| ABS | **Styrene** (carcinogenic, CNS depressant) | **Mandatory: active extraction or outdoor venting. Never run in unventilated bedroom/home office.** |
| Nylon | Caprolactam fumes (respiratory irritant) | Active extraction required |
| Resin (SLA/DLP) | Uncured photopolymer vapor + UV exposure | **Mandatory: fume extractor, nitrile gloves for handling. Never handle uncured resin with bare skin.** |

**Thermal runaway protection:**
- Must be enabled in printer firmware. Verify before each print session.
- If the hot end temperature exceeds 15°C above the setpoint for more than 10 seconds, thermal runaway should trigger an automatic shutdown and heater disable.
- Test quarterly: disconnect thermistor and verify printer shuts down heaters and alarms within 30 seconds.

---

### Laser Cutter Safety

**CRITICAL — Material Incompatibility List:**

Never cut or engrave the following materials in ANY laser cutter under any circumstances:

| Material | Hazard | Why Forbidden |
|----------|--------|---------------|
| **PVC, vinyl, pleather, "faux leather"** | Chlorine gas release | Produces hydrogen chloride gas — corrodes machine optics, creates toxic cloud, can kill people |
| **Polycarbonate (Lexan)** | Melts, ignites | Does not cut cleanly; catches fire inside enclosure |
| **HDPE / PP plastics** | Melts through, ignites | Low melting point causes material to drip and ignite |
| **Fiberglass** | Silica dust, toxic fumes | Destroys laser mirror and optics with conductive dust |
| **Carbon fiber** | Toxic fumes, electrical conductivity | Carbon dust is conductive — can short laser tube electronics |
| **Materials with halogenated flame retardants** | Unknown toxic gas release | Chemical composition varies by batch — unpredictable hazard |
| **Reflective metals (bare copper, brass, aluminum)** | Laser reflection back into tube | Reflected beam can destroy laser source and create fire |

**Interlock integrity:**
- The enclosure interlock must prevent laser emission whenever the door is open. Test before every session.
- Never bypass or disable an interlock — "I'll just prop it open for this one quick cut" has caused multiple permanent eye injuries in maker spaces.

**Ventilation requirements:**
- CO2 laser cutters (10.6µm wavelength): Active exhaust fan must move minimum 5 CFM per square foot of bed area, with carbon filter stage for odor removal.
- Fiber lasers (1.06µm): Same airflow requirements PLUS spark extraction for metal cutting operations.

---

### CNC Mill Safety

**Tool speed and feed rate verification:**
- Before starting any cut, confirm the displayed RPM matches your calculated requirement (see digital-fabrication skill toolpath calculator). Running a small end mill at excessive RPM causes catastrophic tool failure — the tool shatters at high velocity.
- Verify the tool is properly seated in the collet with correct clamping length and torque. A loose tool becomes a high-speed projectile.

**Workholding security:**
- Vises must be tightened to manufacturer-specified torque before cutting begins.
- Clamps must clear the tool path — verify by jogging the axis manually (low speed) through the full cutting range with the spindle OFF but the light ON for visibility.
- Soft jaws should be used for irregular stock shapes; never rely on friction alone to hold material.

**Chip guard and containment:**
- The chip guard must enclose all exposed rotating tool surfaces during operation.
- Coolant/minimum quantity lubrication (MQL) systems require splash guards — coolant can create slippery floor hazards.

---

### Electronics / Soldering Station Safety

**LiPo battery handling protocol:**
| Operation | Requirement |
|-----------|-------------|
| **Charging** | Charge on non-flammable surface (concrete floor, metal tray). Never charge on wood, fabric, or plastic table top. Use a LiPo fireproof bag or sandbox charging station. Maximum charge current: 1C (where C = battery capacity in Ah). |
| **Storage** | Store at 3.8V per cell (storage voltage). Keep in fireproof container away from flammable materials. Maximum 5 batteries per container in a makerspace environment. |
| **Inspection** | Check every battery before use: no swelling, punctures, or casing damage. A swollen LiPo is CRITICAL — do not charge, do not use. Place in sand bucket and arrange for proper disposal. |
| **Disposal** | Deactivate by submerging in salt water solution (10% NaCl by weight) for 48 hours until voltage reads <1V per cell. Then dispose as electronic waste at certified facility. Never place a LiPo in regular trash or recycling. |
| **Fire response** | A burning LiPo releases toxic gas (HF, CO). Evacuate the area immediately. Use a Class D fire extinguisher if available; otherwise use copious amounts of sand to smother. Do NOT use water on a lithium fire — it can intensify the reaction. Call fire department even for small fires. |

**ESD protection:**
- Wear an ESD wrist strap connected to a common ground point when handling sensitive components (CMOS ICs, FPGA modules, OLED displays).
- Use an ESD-safe mat on the workbench with resistance between 10^6 and 10^9 ohms.
- Store unmounted SMD components in conductive foam or metal containers — antistatic bags are not sufficient for long-term storage.

**Fume extraction during soldering:**
- Active fume extractor with HEPA + activated carbon filter required within 12 inches of soldering iron tip.
- Soldering in a shared workspace without personal fume extraction is unacceptable — flux fumes affect everyone in the room.
- Lead-free solder (SAC305) produces different fume characteristics than leaded solder (63/37 Sn/Pb) — both require extraction; lead requires additional glove and hand-washing protocols.

---

## Implementation Patterns

### Pattern 1: Safety Checklist Generator (Printable Per Machine)

```python
"""
Machine-specific safety checklist generator.

Generates a printable, machine-type-appropriate safety checklist
that can be used for daily pre-session verification or new-user onboarding.
Supports output in plain text, CSV for logging, and structured JSON for digital tracking.
"""

from __future__ import annotations

import json
import csv
import io
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional


class MachineType(Enum):
    FDM_3D_PRINTER = "fdm_3d_printer"
    SLA_RESIN_PRINTER = "sla_resin_printer"
    CO2_LASER_CUTTER = "co2_laser_cutter"
    FIBER_LASER = "fiber_laser"
    CNC_MILL = "cnc_mill"
    DRILL_PRESS = "drill_press"
    TABLE_SAW = "table_saw"
    SOLDERING_STATION = "soldering_station"
    BENCH_GRINDER = "bench_grinder"


@dataclass
class ChecklistItem:
    """A single safety verification item."""
    id: str                          # Unique identifier, e.g., "3DP-01"
    category: str                    # Hazard type: thermal, mechanical, chemical, electrical, particulate
    description: str                 # Human-readable check description
    pass_criteria: str               # What constitutes a passing result
    is_critical: bool = False        # If True, failure stops all operations


MACHINE_CHECKLISTS: dict[MachineType, list[ChecklistItem]] = {
    MachineType.FDM_3D_PRINTER: [
        ChecklistItem("3DP-01", "electrical", "Power cord and grounding pin intact with no visible damage",
                      "No frayed wires, cracked insulation, or missing ground pin", True),
        ChecklistItem("3DP-02", "thermal", "Thermal runaway protection enabled in firmware",
                      "Configuration.h defines THERMAL_RUNAWAY_PROTECTION_HEATER and THERMAL_RUNAWAY_PROTECTION_BED", False),
        ChecklistItem("3DP-03", "thermal", "Hot end thermistor reads ambient temperature correctly when cold",
                      "Display shows room temperature (18-25C) before any heating command", True),
        ChecklistItem("3DP-04", "thermal", "Heated bed thermistor functional and reading ambient",
                      "Bed temperature display matches room temp within 3C before heating", True),
        ChecklistItem("3DP-05", "particulate", "Room ventilation active during print",
                      "Fan running or window open; ABS prints require dedicated extraction", False),
        ChecklistItem("3DP-06", "chemical", "No flammable materials within 10 feet of printer",
                      "Clear zone verified: no paper, cardboard, fabric, or solvent containers nearby", True),
        ChecklistItem("3DP-07", "electrical", "Emergency stop functional and within arm's reach",
                      "Pressing E-stop immediately cuts power to heaters and steppers; reset required to resume", True),
        ChecklistItem("3DP-08", "particulate", "First-layer adhesion verified before leaving print unattended",
                      "Perimeter fully bonded to bed with no lifting corners observed for at least 2 minutes", False),
    ],
    MachineType.SLA_RESIN_PRINTER: [
        ChecklistItem("SLA-01", "chemical", "Nitrile gloves (4+ mil) worn when handling resin or parts",
                      "No bare skin contact with uncured photopolymer resin", True),
        ChecklistItem("SLA-02", "chemical", "Resin bottles sealed when not actively in use",
                      "Caps tightly closed; no open containers on bench overnight", True),
        ChecklistItem("SLA-03", "particulate", "Fume extraction or dedicated ventilation active",
                      "Extractor running or printing in ventilated enclosure with carbon filter", True),
        ChecklistItem("SLA-04", "chemical", "Spill containment kit available (absorbent pads, sealed container for waste)",
                      "Waste resin and isopropyl alcohol contaminated materials stored in sealed metal container", False),
        ChecklistItem("SLA-05", "chemical", "Eye wash solution accessible within 30 seconds of printer",
                      "Safety goggles and eyewash station within arm's reach of work area", True),
        ChecklistItem("SLA-06", "electrical", "UV light shield intact — no direct UV exposure to skin or eyes",
                      "Printer enclosure closes fully; no gaps allowing UV leakage during print", True),
    ],
    MachineType.CO2_LASER_CUTTER: [
        ChecklistItem("LC-01", "mechanical", "Enclosure interlock tested — laser stops when door opens",
                      "Open door while in standby mode; verify laser emission indicator goes OFF immediately", True),
        ChecklistItem("LC-02", "chemical", "Material compatibility verified — no PVC, vinyl, or halogen-containing materials",
                      "Cutting list checked against prohibited materials table (see digital-fabrication skill)", True),
        ChecklistItem("LC-03", "particulate", "Exhaust fan active and airflow indicator showing adequate suction",
                      "Paper strip at extraction port drawn toward vent; CO2 scrubber/charcoal filter in place if used", True),
        ChecklistItem("LC-04", "thermal", "Fire extinguisher (Class ABC) visible within 30 feet with gauge in green zone",
                      "Extinguisher inspected within last 12 months, pressure needle in green band", True),
        ChecklistItem("LC-05", "electrical", "Focus lens clean and mirror alignment verified",
                      "Lens free of debris/scratches; beam path shows even dot on test paper", False),
        ChecklistItem("LC-06", "chemical", "Compressed air duster canisters stored remotely from laser area",
                      "No aerosol cans within 10 feet — propellants are flammable under laser ignition risk", True),
        ChecklistItem("LC-07", "electrical", "Air assist function verified (keeps lens cool and clears debris)",
                      "Compressed air supply connected, regulator set to specified PSI for material type", False),
    ],
    MachineType.CNC_MILL: [
        ChecklistItem("CNC-01", "mechanical", "All PPE removed before machine operation: no gloves, no jewelry, no loose clothing",
                      "Sleeves rolled above elbows; hair secured; rings/watch/necklace removed", True),
        ChecklistItem("CNC-02", "mechanical", "Chip guard in place and spindle guard intact",
                      "Transparent or solid guard covers all exposed tool surfaces during operation", True),
        ChecklistItem("CNC-03", "mechanical", "Tool properly seated in collet with correct clamping length and verified tightness",
                      "Collet nut tightened with torque wrench to manufacturer spec; tool does not spin by hand", True),
        ChecklistItem("CNC-04", "mechanical", "Workholding secured — vise tightened, clamps clear tool path, soft jaws for irregular stock",
                      "Manual jog through full cutting range with spindle OFF confirms no clamp/tool interference", True),
        ChecklistItem("CNC-05", "electrical", "E-stop functional and accessible without moving feet from standing position",
                      "E-stop button pressed — machine halts within 1 second; requires manual reset", True),
        ChecklistItem("CNC-06", "thermal", "Spindle speed confirmed to match tool material specification before startup",
                      "RPM displayed matches calculated value from toolpath calculator; small end mills not over-runned", True),
        ChecklistItem("CNC-07", "particulate", "Fume extraction or dust collection active for the specific material being cut",
                      "Dust shroud connected to collector; airflow confirmed at work zone", False),
        ChecklistItem("CNC-08", "electrical", "Coolant/MQL system operational and splash guards in place if used",
                      "Coolant level adequate; pump running; no slippery floor hazard from leaks", False),
    ],
    MachineType.SOLDERING_STATION: [
        ChecklistItem("SS-01", "thermal", "Soldering iron/tip temperature set to material-appropriate range (300-380C for lead-free)",
                      "Temperature display reads within 5C of setpoint after 5-minute warm-up", True),
        ChecklistItem("SS-02", "chemical", "Fume extractor active within 12 inches of iron tip with HEPA + carbon filter",
                      "Extractor running; airflow indicator active; filter not past replacement date", True),
        ChecklistItem("SS-03", "thermal", "Iron resting securely in holder when not actively soldering",
                      "Never placed on bench surface; stand is heat-resistant and stable", True),
        ChecklistItem("SS-04", "chemical", "Work area free of flammable solvents during active soldering",
                      "Acetone/isopropyl alcohol containers capped and stored at least 3 feet from station", True),
        ChecklistItem("SS-05", "electrical", "Soldering iron ground connection verified — no voltage on tip relative to ground",
                      "Voltmeter reads <1mV AC between hot iron tip and grounded surface; leakage current <0.5mA", False),
    ],
}


def generate_checklist(machine: MachineType, operator_name: str = "", session_date: Optional[str] = None) -> str:
    """Generate a human-readable safety checklist for the specified machine type.

    Args:
        machine: The machine type to generate checks for.
        operator_name: Name of the operator (for audit trail).
        session_date: Date string; defaults to today if not provided.

    Returns:
        Formatted text checklist ready for printing or digital signing.
    """
    import datetime

    if session_date is None:
        session_date = datetime.date.today().isoformat()

    items = MACHINE_CHECKLISTS.get(machine, [])
    lines = [
        "=" * 70,
        f"  MAKERSPACE SAFETY CHECKLIST",
        f"  Machine Type: {machine.value.replace('_', ' ').upper()}",
        f"  Date: {session_date}",
        f"  Operator: {operator_name or '[NOT SPECIFIED]'}",
        "=" * 70,
        "",
        f"{'#':<4} {'CRIT':<5} {'Hazard':<12} {'Check Description':<45} {'Status':<8}",
        "-" * 76,
    ]

    for item in items:
        crit = "YES" if item.is_critical else "   "
        lines.append(f"{item.id:<4} {crit:<5} {item.category:<12} {item.description:<45} [   ]")

    lines.extend([
        "",
        "-" * 76,
        "RESULT:  PASS (all items checked) / FAIL (any CRITICAL item failed — STOP)",
        "",
        "If any CRITICAL item fails, do NOT operate the machine. Report to safety officer.",
        "Non-critical failures should be logged and corrected before next use.",
        "",
        f"Operator Signature: ___________________________  Time: ___________",
        "=" * 70,
    ])

    return "\n".join(lines)


def generate_checklist_json(machine: MachineType) -> str:
    """Generate JSON format checklist for digital tracking and automated PPE recommendation.

    Returns:
        JSON string with machine checks, hazard categories, and required PPE derived from hazards.
    """
    items = MACHINE_CHECKLISTS.get(machine, [])

    # Derive PPE requirements from the hazard categories present in this machine's checklist
    ppe_required: set[str] = set()
    for item in items:
        if "thermal" in item.category:
            ppe_required.add("heat-resistant gloves (for handling hot parts only)")
            ppe_required.add("ANSI Z87.1 safety glasses")
        if "mechanical" in item.category:
            ppe_required.add("ANSI Z87.1 safety glasses with side shields")
            ppe_required.add("No loose clothing, jewelry, or gloves near rotating tools")
        if "chemical" in item.category:
            ppe_required.add("Nitrile gloves (minimum 4 mil)")
            ppe_required.add("Chemical splash goggles OR respirator with OV cartridges")
        if "electrical" in item.category:
            ppe_required.add("Insulated tools appropriate for voltage class")
        if "particulate" in item.category:
            ppe_required.add("N95 respirator (or P100 + activated carbon for chemical fumes)")

    output = {
        "machine_type": machine.value,
        "checklist_items": [asdict(item) for item in items],
        "required_ppe": sorted(ppe_required),
        "total_checks": len(items),
        "critical_count": sum(1 for item in items if item.is_critical),
    }

    return json.dumps(output, indent=2)


if __name__ == "__main__":
    import sys

    machine_name = sys.argv[1] if len(sys.argv) > 1 else "cnc_mill"
    operator = sys.argv[2] if len(sys.argv) > 2 else ""

    # Map string input to enum
    machine_map = {m.value: m for m in MachineType}
    if machine_name not in machine_map:
        available = ", ".join(sorted(machine_map.keys()))
        print(f"Unknown machine type: '{machine_name}'")
        print(f"Available: {available}")
        sys.exit(1)

    machine = machine_map[machine_name]

    # Generate and display text checklist
    text = generate_checklist(machine, operator)
    print(text)

    # Also generate JSON for digital tracking
    json_out = generate_checklist_json(machine)
    with open(f"checklist_{machine.value}.json", "w") as f:
        f.write(json_out)
    print(f"\nJSON version written to: checklist_{machine.value}.json")

    # Print PPE summary
    ppe_data = json.loads(json_out)
    print(f"\nPPE REQUIRED for {machine.value.replace('_', ' ').title()}:")
    for p in ppe_data["required_ppe"]:
        print(f"  - {p}")
```

---

### Pattern 2: Hazard Assessment Matrix with Automated PPE Recommendation

```python
"""
Hazard assessment matrix for makerspace operations.

Analyzes the materials, tools, and processes involved in a planned operation
and produces an automated hazard classification with corresponding PPE,
engineering controls, and emergency procedures.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class HazardCategory(Enum):
    THERMAL = "thermal"
    MECHANICAL = "mechanical"
    CHEMICAL = "chemical"
    ELECTRICAL = "electrical"
    PARTICULATE = "particulate"


class SeverityLevel(Enum):
    LOW = "low"        # Minimal injury risk; first aid sufficient
    MEDIUM = "medium"  # May require medical attention; time off expected
    HIGH = "high"      # Serious injury possible; potential hospitalization
    CRITICAL = "critical"  # Life-threatening; permanent disability or death possible


@dataclass
class HazardEntry:
    """Single identified hazard with severity and mitigation."""
    category: HazardCategory
    description: str
    severity: SeverityLevel
    engineering_controls: list[str] = field(default_factory=list)
    ppe_required: list[str] = field(default_factory=list)
    emergency_procedure: str = ""


@dataclass
class OperationAssessment:
    """Complete hazard assessment for a makerspace operation."""
    operation_name: str
    materials_used: list[str] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    hazards: list[HazardEntry] = field(default_factory=list)
    required_ppe: list[str] = field(default_factory=list)
    engineering_controls: list[str] = field(default_factory=list)
    emergency_contacts: list[dict] = field(default_factory=list)
    risk_level: str = "low"  # Overall composite risk level


def assess_operation(
    operation_name: str,
    materials: Optional[list[str]] = None,
    tools: Optional[list[str]] = None,
    process_notes: Optional[dict] = None,
) -> OperationAssessment:
    """Run automated hazard assessment for a planned makerspace operation.

    Analyzes the combination of materials, tools, and process details to identify
    all applicable hazards and recommend appropriate controls.

    Args:
        operation_name: Human-readable name of the operation (e.g., "CNC milling aluminum bracket").
        materials: List of material names (e.g., ["6061 aluminum", "WD-40 cutting fluid"]).
        tools: List of tool/machine names (e.g., ["Haas VF-2 CNC mill", "compressed air gun"]).
        process_notes: Optional dict with additional context:
            - "heating": bool — whether heating is involved
            - "high_voltage": float — voltage if electrical work >100V
            - "resin_type": str — photopolymer resin type for SLA printing
            - "metal_powder": bool — whether metal powder handling occurs

    Returns:
        OperationAssessment with complete hazard analysis and PPE recommendations.
    """
    assessment = OperationAssessment(
        operation_name=operation_name,
        materials_used=materials or [],
        tools_used=tools or [],
    )

    materials_lower = [m.lower() for m in (materials or [])]
    tools_lower = [t.lower() for t in (tools or [])]
    notes = process_notes or {}

    # --- Tool-based hazard detection ---
    if any(t in ["cnc", "mill", "lathe", "drill press", "saw", "router"] for t in tools_lower):
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.MECHANICAL,
            description="Rotating tool/spindle presents entanglement and projectile hazards",
            severity=SeverityLevel.HIGH,
            engineering_controls=["Chip guard must enclose all exposed rotating surfaces",
                                   "Workholding verified secure before power-on"],
            ppe_required=["ANSI Z87.1 safety glasses with side shields"],
            emergency_procedure="Hit E-stop immediately; do NOT attempt to free caught material while spindle is moving",
        ))

    if any("laser" in t for t in tools_lower):
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.THERMAL,
            description="Laser beam causes instant blindness and skin burns; enclosure interlock mandatory",
            severity=SeverityLevel.CRITICAL,
            engineering_controls=["Enclosure interlock tested before each session",
                                   "Material compatibility checked against prohibited list (no PVC/vinyl)"],
            ppe_required=["Laser-rated goggles for specific wavelength if operating with door open"],
            emergency_procedure="Shut down laser via E-stop; evacuate if smoke/fire detected; use ABC extinguisher",
        ))
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.CHEMICAL,
            description="Laser-material interaction can release toxic fumes (styrene from ABS, chlorine from PVC, HCN from acrylonitrile)",
            severity=SeverityLevel.HIGH,
            engineering_controls=["Active exhaust ventilation with minimum 5 CFM/sq ft of bed area",
                                   "Carbon filter stage for odor removal"],
            ppe_required=["N95 respirator (minimum); P100 + OV cartridge for known toxic materials"],
            emergency_procedure="Stop cut immediately; vent enclosure before opening door; evacuate if fume alarm triggers",
        ))

    if any("3d print" in t or "fdm" in t for t in tools_lower):
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.THERMAL,
            description="Hot end (200-260C+) and heated bed (60-110C) cause severe burns on contact",
            severity=SeverityLevel.HIGH,
            engineering_controls=["Thermal runaway protection enabled in firmware",
                                   "Print bed mounted with secure attachment"],
            ppe_required=["Heat-resistant gloves for removing prints after cooling period"],
            emergency_procedure="Do NOT touch hot components; wait 10 minutes for cooldown; use IR thermometer to verify <50C",
        ))

    if any("resin" in t or "sla" in t or "dlp" in t for t in tools_lower):
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.CHEMICAL,
            description="Uncured photopolymer resin is a skin sensitizer and respiratory irritant; UV exposure risk",
            severity=SeverityLevel.HIGH,
            engineering_controls=["Fume extractor with HEPA + activated carbon filter active",
                                   "UV light shield/enclosure intact"],
            ppe_required=["Nitrile gloves (minimum 4 mil)", "Chemical splash goggles (sealed)",
                           "Long-sleeve lab coat or apron"],
            emergency_procedure="Flush skin contact with water for 15 minutes; remove contaminated clothing; seek medical attention",
        ))

    if any("solder" in t for t in tools_lower):
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.THERMAL,
            description="Soldering iron tip reaches 300-450C; accidental contact causes third-degree burns",
            severity=SeverityLevel.MEDIUM,
            engineering_controls=["Iron always in stand when not actively soldering",
                                   "Dedicated heat-resistant work surface"],
            ppe_required=["No special PPE required if using stand properly; safety glasses for lead-free solder splash"],
            emergency_procedure="Run burn under cool (not ice-cold) running water for 20 minutes; cover with sterile dressing",
        ))
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.CHEMICAL,
            description="Solder flux fumes contain rosin and organic compounds that cause respiratory irritation and asthma",
            severity=SeverityLevel.MEDIUM,
            engineering_controls=["Fume extractor with HEPA + activated carbon within 12 inches of tip",
                                   "Work area ventilated"],
            ppe_required=["No special respirator needed if fume extractor active; N95 if ventilation is inadequate"],
            emergency_procedure="Move to fresh air if experiencing respiratory symptoms; seek medical attention if symptoms persist",
        ))

    # --- Material-based hazard detection ---
    for material in materials_lower:
        if "aluminum" in material or "steel" in material or "brass" in material or "copper" in material:
            assessment.hazards.append(HazardEntry(
                category=HazardCategory.PARTICULATE,
                description=f"Metal dust/shavings from {material} inhalation hazard; metal屑 (swarf) eye injury risk",
                severity=SeverityLevel.MEDIUM,
                engineering_controls=["Dust collection or vacuum at cutting point", "Chip guard on machinery"],
                ppe_required=["ANSI Z87.1 safety glasses with side shields", "N95 respirator for dry machining"],
                emergency_procedure="Flush metal fragments from eyes with clean water; do NOT rub; seek medical attention",
            ))
        if "abs" in material:
            assessment.hazards.append(HazardEntry(
                category=HazardCategory.CHEMICAL,
                description="ABS releases styrene fumes when heated — known carcinogen and CNS depressant",
                severity=SeverityLevel.HIGH,
                engineering_controls=["Mandatory active extraction or outdoor venting for ABS printing",
                                       "NO unventilated bedroom/home office use"],
                ppe_required=["Half-face respirator with P100 + OV cartridges for extended sessions"],
                emergency_procedure="Ventilate area immediately if odor is strong; move to fresh air; styrene exposure requires medical evaluation",
            ))
        if "plywood" in material or "mdf" in material or "particle board" in material:
            assessment.hazards.append(HazardEntry(
                category=HazardCategory.PARTICULATE,
                description="Wood dust (especially MDF with formaldehyde resin) is a respiratory carcinogen",
                severity=SeverityLevel.MEDIUM,
                engineering_controls=["Dust collection system connected and operational", "Enclosed cutting area"],
                ppe_required=["P100 respirator (not just N95) for MDF; N95 minimum for softwood/hardwood"],
                emergency_procedure="Remove to fresh air; rinse eyes if irritated by dust; wash skin after contact",
            ))

    # --- Process-specific hazard detection ---
    if notes.get("high_voltage"):
        voltage = notes["high_voltage"]
        if voltage > 1000:
            severity = SeverityLevel.CRITICAL
            desc = f"Extremely high voltage ({voltage}V) — arc flash and electrocution risk"
        elif voltage > 48:
            severity = SeverityLevel.HIGH
            desc = f"Mains voltage ({voltage}V AC/DC) — electrocution hazard, especially with wet hands or grounded surfaces"
        else:
            severity = SeverityLevel.MEDIUM
            desc = f"Low-voltage electrical work ({voltage}V)"

        assessment.hazards.append(HazardEntry(
            category=HazardCategory.ELECTRICAL,
            description=desc,
            severity=severity,
            engineering_controls=["Work on de-energized circuits whenever possible; lockout/tagout procedure",
                                   "Insulated tools rated for voltage class"],
            ppe_required=["Class 0 insulated gloves (if working live above 50V)", "Non-conductive footwear"],
            emergency_procedure="Do NOT touch the victim if still in contact with energized component; disconnect power first; call emergency services",
        ))

    # --- LiPo battery hazard detection ---
    if any("lipo" in m or "li-ion" in m or "lithium polymer" in m for m in materials_lower):
        assessment.hazards.append(HazardEntry(
            category=HazardCategory.CHEMICAL,
            description="LiPo batteries can vent toxic gas (HF, CO) and ignite if punctured, overcharged, or shorted",
            severity=SeverityLevel.CRITICAL,
            engineering_controls=["Charge on non-flammable surface in fireproof bag/box",
                                   "Maximum charge rate 1C; voltage monitoring during charge"],
            ppe_required=["Nitrile gloves when handling damaged/swollen batteries",
                           "Safety goggles for battery work"],
            emergency_procedure="Evacuate area immediately if burning/popping/smoke detected. Use sand to smother — NOT water. Call fire department.",
        ))

    # --- Compile PPE and engineering controls ---
    all_ppe: set[str] = set()
    all_eng: set[str] = set()
    for h in assessment.hazards:
        all_ppe.update(h.ppe_required)
        all_eng.update(h.engineering_controls)

    assessment.required_ppe = sorted(all_ppe)
    assessment.engineering_controls = sorted(all_eng)

    # --- Determine overall risk level ---
    severity_scores = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    if not assessment.hazards:
        assessment.risk_level = "low"
    else:
        max_score = max(severity_scores[h.severity.value] for h in assessment.hazards)
        # If more than half are medium or above, bump risk level up one tier
        elevated_count = sum(1 for h in assessment.hazards if severity_scores[h.severity.value] >= 2)
        if max_score >= 3 and elevated_count > len(assessment.hazards) / 2:
            assessment.risk_level = "high"
        elif max_score == 4:
            assessment.risk_level = "critical"
        elif max_score >= 3:
            assessment.risk_level = "high"
        elif max_score == 2:
            assessment.risk_level = "medium"
        else:
            assessment.risk_level = "low"

    return assessment


def format_assessment_report(assessment: OperationAssessment) -> str:
    """Format a human-readable safety assessment report."""
    lines = [
        "=" * 70,
        "  MAKERSPACE HAZARD ASSESSMENT REPORT",
        f"  Operation: {assessment.operation_name}",
        f"  Overall Risk Level: {assessment.risk_level.upper()}",
        "=" * 70,
        "",
        "MATERIALS:",
    ]
    for m in assessment.materials_used:
        lines.append(f"  - {m}")

    lines.extend(["", "TOOLS/MACHINES:"])
    for t in assessment.tools_used:
        lines.append(f"  - {t}")

    lines.extend(["", "-" * 70, "IDENTIFIED HAZARDS:", "-" * 70])
    for i, h in enumerate(assessment.hazards, 1):
        lines.extend([
            f"\n  Hazard #{i}",
            f"  Category: {h.category.value.upper()}",
            f"  Severity: {h.severity.value.upper()}",
            f"  Description: {h.description}",
            f"  Engineering Controls:",
        ])
        for ctrl in h.engineering_controls:
            lines.append(f"    * {ctrl}")
        lines.append("  Required PPE:")
        for ppe in h.ppe_required:
            lines.append(f"    * {ppe}")
        if h.emergency_procedure:
            lines.append(f"  Emergency Procedure: {h.emergency_procedure}")

    lines.extend([
        "",
        "-" * 70,
        "AGGREGATE PPE REQUIREMENTS:",
        "-" * 70,
    ])
    for ppe in assessment.required_ppe:
        lines.append(f"  - {ppe}")

    lines.extend([
        "",
        "-" * 70,
        "REQUIRED ENGINEERING CONTROLS:",
        "-" * 70,
    ])
    for ctrl in assessment.engineering_controls:
        lines.append(f"  - {ctrl}")

    if assessment.risk_level in ("high", "critical"):
        lines.extend([
            "",
            "WARNING: HIGH or CRITICAL risk operation. Review with safety officer before proceeding.",
        ])

    lines.extend(["", "=" * 70])
    return "\n".join(lines)


if __name__ == "__main":
    # Example: Assess a CNC milling operation in aluminum
    assessment = assess_operation(
        operation_name="CNC milling aluminum bracket with cutting fluid",
        materials=["6061 aluminum", "WD-40 Machine Tool Cutting Fluid"],
        tools=["Haas VF-2 CNC mill", "compressed air gun for chip removal"],
        process_notes={},
    )

    report = format_assessment_report(assessment)
    print(report)

    # Also output JSON for digital record
    assessment_json = {
        "operation_name": assessment.operation_name,
        "risk_level": assessment.risk_level,
        "materials": assessment.materials_used,
        "tools": assessment.tools_used,
        "hazards": [
            {
                "category": h.category.value,
                "severity": h.severity.value,
                "description": h.description,
                "engineering_controls": h.engineering_controls,
                "ppe_required": h.ppe_required,
                "emergency_procedure": h.emergency_procedure,
            }
            for h in assessment.hazards
        ],
        "aggregate_ppe": assessment.required_ppe,
    }
    with open("hazard_assessment.json", "w") as f:
        json.dump(assessment_json, f, indent=2)
    print(f"\nJSON report written to: hazard_assessment.json")
```

---

### Pattern 3: Emergency Response Quick-Reference Card Generator

```python
"""
Emergency response quick-reference card generator.

Creates printable one-page emergency reference cards tailored to the specific
machines and materials present in a workspace. Cards include step-by-step
procedures for common emergencies, contact numbers, and first aid instructions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class EmergencyProcedure:
    """One emergency scenario with response steps."""
    scenario: str                # e.g., "Fire — burning LiPo battery"
    priority: int                # 1 = most urgent
    immediate_actions: list[str] = field(default_factory=list)
    medical_actions: list[str] = field(default_factory=list)
    equipment_needed: list[str] = field(default_factory=list)


@dataclass
class EmergencyResponseCard:
    """Complete emergency response card for a workspace."""
    facility_name: str
    address: str
    emergency_phone: str = "911"
    internal_safety_officer: str = ""
    safety_officer_phone: str = ""
    nearest_hospital: str = ""
    hospital_address: str = ""
    procedures: list[EmergencyProcedure] = field(default_factory=list)

    def generate_card_text(self) -> str:
        """Generate a formatted one-page emergency reference card."""
        lines = [
            "#" * 72,
            f"#  EMERGENCY RESPONSE CARD — {self.facility_name.upper()}",
            f"#  {self.address}",
            "#" * 72,
            "",
            f"EMERGENCY PHONE:  {self.emergency_phone}",
            f"SAFETY OFFICER:   {self.safety_officer}  |  Phone: {self.safety_officer_phone}",
            f"HOSPITAL:         {self.nearest_hospital}  |  {self.hospital_address}",
            "",
            "#" * 72,
        ]

        # Sort procedures by priority (most urgent first)
        sorted_procedures = sorted(self.procedures, key=lambda p: p.priority)

        for proc in sorted_procedures:
            lines.extend([
                "",
                f">>> {proc.scenario.upper()}",
                "IMMEDIATE ACTIONS:",
            ])
            for i, action in enumerate(proc.immediate_actions, 1):
                lines.append(f"  {i}. {action}")

            if proc.medical_actions:
                lines.append("MEDICAL ACTIONS:")
                for i, action in enumerate(proc.medical_actions, 1):
                    lines.append(f"  {i}. {action}")

            if proc.equipment_needed:
                lines.append("EQUIPMENT NEEDED:")
                for eq in proc.equipment_needed:
                    lines.append(f"  - {eq}")

            lines.extend(["", "-" * 72])

        lines.extend([
            "",
            "# NOTE: Post this card near the workspace entrance and safety officer station.",
            "# Review with all makerspace users during onboarding. Update after any incident.",
            "#" * 72,
        ])

        return "\n".join(lines)


def build_default_emergency_card(
    facility_name: str = "Makerspace Lab",
    address: str = "123 Maker Street",
) -> EmergencyResponseCard:
    """Build a comprehensive emergency response card for a typical makerspace.

    Covers all major hazard scenarios present in shared fabrication spaces.

    Args:
        facility_name: Name of the facility for the card header.
        address: Physical address for emergency services reference.

    Returns:
        EmergencyResponseCard with pre-configured procedures for common makerspace emergencies.
    """
    return EmergencyResponseCard(
        facility_name=facility_name,
        address=address,
        nearest_hospital="General Hospital — Trauma Center",
        hospital_address="456 Medical Drive, 2 miles north on Highway 10",
        procedures=[
            EmergencyProcedure(
                scenario="FIRE — Burning LiPo battery",
                priority=1,
                immediate_actions=[
                    "EVACUATE the room immediately — LiPo fires release toxic gas (HF, CO)",
                    "Close the door to contain smoke and oxygen supply",
                    "Call 911 and state: 'lithium battery fire in makerspace'",
                    "Do NOT attempt to fight the fire if smoke is heavy or you are not trained",
                ],
                medical_actions=[
                    "If exposed to smoke: move to fresh air immediately",
                    "If skin contact with burning battery: flush with water for 20 minutes",
                    "Seek immediate medical attention even for small fires — HF gas exposure can be delayed",
                ],
                equipment_needed=["Class D fire extinguisher (for lithium fires)", "Fireproof sand bucket", "LiPo fire bag"],
            ),
            EmergencyProcedure(
                scenario="FIRE — Electrical/fire near CNC mill or laser cutter",
                priority=2,
                immediate_actions=[
                    "Hit machine E-stop to cut power to the equipment",
                    "If safe to do so, unplug the machine from wall outlet",
                    "Use Class ABC fire extinguisher on electrical fires",
                    "Do NOT use water on electrical fires",
                    "Evacuate if fire cannot be contained within 30 seconds",
                ],
                medical_actions=[
                    "For burns: cool with running water for 20 minutes",
                    "For smoke inhalation: fresh air immediately",
                    "Call 911 for any burn requiring medical attention",
                ],
                equipment_needed=["Class ABC fire extinguisher", "Fire blanket"],
            ),
            EmergencyProcedure(
                scenario="CHEMICAL SPLASH — Resin or solvent in eyes",
                priority=3,
                immediate_actions=[
                    "Go to eyewash station immediately — do not wait",
                    "Hold eyelids open and flush with clean water for minimum 15 minutes",
                    "Remove contact lenses if present (do not delay flushing)",
                    "Call safety officer for guidance on specific chemical involved",
                ],
                medical_actions=[
                    "Continue flushing while being transported to hospital",
                    "Bring the chemical container/SDS sheet to the ER for treatment reference",
                    "Do NOT use neutralizing solutions — plain water is correct",
                ],
                equipment_needed=["Eyewash station (verified functional)", "Safety shower"],
            ),
            EmergencyProcedure(
                scenario="LACERATION — Flying chip or metal fragment from CNC/lathe",
                priority=4,
                immediate_actions=[
                    "Stop the machine immediately",
                    "Apply direct pressure to bleeding wound with clean cloth/gauze",
                    "If object is embedded in skin: do NOT remove it; stabilize with dressing around it",
                    "Elevate injured limb above heart level if possible",
                ],
                medical_actions=[
                    "Seek medical attention for any deep cut, especially near joints or fingers",
                    "Tetanus shot may be needed if wound is contaminated and last shot was >5 years ago",
                    "If finger/nail completely severed: wrap in clean cloth, place in sealed bag on ice (do not touch ice directly)",
                ],
                equipment_needed=["Trauma first aid kit with pressure bandages", "Tourniquet (if available and trained)"],
            ),
            EmergencyProcedure(
                scenario="ELECTRIC SHOCK — Contact with mains voltage or live circuit",
                priority=5,
                immediate_actions=[
                    "DO NOT TOUCH the victim if still in contact with energized component",
                    "Disconnect power at breaker or unplug the equipment FIRST",
                    "Only then approach the victim and check for responsiveness",
                    "If victim is not breathing: begin CPR immediately and call 911",
                ],
                medical_actions=[
                    "Even if victim appears fine, seek medical evaluation — internal burns may not be visible",
                    "Monitor for irregular heartbeat for 24 hours after any significant shock above 50V",
                ],
                equipment_needed=["Non-conductive rescue hook"],
            ),
            EmergencyProcedure(
                scenario="INHALATION — Strong fume exposure (ABS styrene, resin vapor)",
                priority=6,
                immediate_actions=[
                    "Leave the area and move to fresh air immediately",
                    "Open windows/doors for ventilation if safe to do so",
                    "Do NOT re-enter until smell has dissipated and ventilation has been running 15+ minutes",
                ],
                medical_actions=[
                    "If dizziness, nausea, or headache persists after fresh air exposure: seek medical attention",
                    "For severe breathing difficulty: call 911 — state possible chemical inhalation",
                ],
                equipment_needed=["N95/P100 respirator", "Activated carbon respirator (for chemical vapors)"],
            ),
        ],
    )


if __name__ == "__main__":
    card = build_default_emergency_card(
        facility_name="University Makerspace",
        address="Engineering Building, Room 204, 123 Campus Drive",
    )

    text = card.generate_card_text()
    print(text)

    # Save to file for printing
    with open("emergency_response_card.txt", "w") as f:
        f.write(text)
    print("\nEmergency response card written to: emergency_response_card.txt")
```

---

## Constraints

### MUST DO
- Complete a written hazard assessment for every new operation or workspace setup — never assume safety requirements from a previous task apply to the current one
- Test emergency stop functionality at the start of every session, not just once when you arrive
- Keep fire extinguishers inspected annually and replace if pressure gauge reads outside the green zone
- Never bypass safety interlocks on laser cutters, CNC chip guards, or 3D printer thermal runaway protection — disabled safety is unacceptable risk
- Store all chemical solvents (acetone, Isopropyl alcohol, resin) in flame-rated containers with sealed caps when not in active use
- Wear ANSI Z87.1-rated eye protection in the entire workshop area — not just while operating a machine
- Perform a fit-seal check on any respirator each time it is worn; a leaking seal provides zero protection
- Immediately stop work and report to a safety officer if you observe: unusual odors, smoke without visible source, sparks from unexpected locations, structural cracks in machine components, or swollen/damaged batteries

### MUST NOT DO
- **Never** cut PVC, vinyl, or any halogen-containing material in a laser cutter — chlorine gas destroys the machine and creates a health emergency
- **Never** wear loose clothing, jewelry, gloves, or unrestrained long hair near CNC mills, drill presses, lathes, or any rotating tool
- **Never** leave an active soldering iron unattended — place it in its holder immediately after use, even for "just one second"
- **Never** charge LiPo batteries on flammable surfaces (wooden tables, fabric-covered benches) or without a fireproof containment method
- **Never** use compressed air to clean yourself or clothing of metal dust — it embeds particles into skin and can cause long-term health effects
- **Never** mix food and drink areas with chemical storage, solvent handling, or battery charging zones
- **Never** operate machinery while fatigued, under the influence of medication that impairs judgment, or without having read this procedure at minimum once

---

## Output Template

When this skill is active, produce:

1. **Hazard Assessment Matrix** — Tabulated list of all hazard types identified for the specific operation with corresponding risk level (Low/Medium/High/Critical)
2. **PPE Selection Summary** — Required PPE per hazard type with ANSI/NIOSH rating specifications and rationale
3. **Pre-Session Machine Safety Checklist** — Completed checklist for each machine to be operated, including E-stop test result and ventilation status
4. **Workspace Configuration Verification** — Confirmed clearances (36-inch perimeter), fire extinguisher placement, first aid kit location, fume extraction status
5. **Machine-Specific Protocol Confirmation** — Step-by-step startup/operation/shutdown sequence for the selected machine(s) with sign-off points
6. **Emergency Response Quick Reference** — Applicable emergency procedures, nearest exits, E-stop locations, and emergency contact numbers

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `rapid-prototyping-workflow` | Plan the overall prototype workflow — safety protocols apply at every stage from paper sketch to physical fabrication |
| `digital-fabrication` | Machine-specific fabrication methods (3D printing, laser cutting, CNC milling) each have unique safety requirements covered in this skill |
| `maker-safety-practices` | This skill — the comprehensive safety reference covering all makerspace operations and hazards |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [OSHA Electrical Safety Standards](https://www.osha.gov/electrical)
- [ANSI Z87.1 — Occupational Eye & Face Protection](https://www.ansi.org/standards-information/ansi-z87-1/)
- [NFPA 45 — Standard for Fire Prevention in Labs](https://www.nfpa.org/codes-and-standards/nfpa-45)
- [Maker Safety Guidelines (Haxpress)](https://hackaday.com/category/safety/)
- [NIOSH — Particulate Respirator Guide](https://www.cdc.gov/niosh/topics/respirators/)
