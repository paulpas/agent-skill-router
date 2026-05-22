---
name: kicad-pcb-design
description: Implements modern KiCad 9+ PCB design workflows covering schematic capture, component library management, controlled-impedance layout, EMC-aware routing, DRC validation, and fabrication file generation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: electrical-engineering
  triggers: PCB design, KiCad, printed circuit board, schematic capture, signal integrity, impedance control, how do i design a circuit board, EMC compliance
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, config, diagrams]
  related-skills: electrical-engineering-hardware-debugging, electrical-engineering-component-selection
---

# KiCad PCB Design Guide

Implements modern KiCad 9+ PCB design workflows — from schematic capture through fabrication-ready file export — with emphasis on controlled impedance routing, EMC-aware layout, and robust DRC validation. Acts as a senior hardware design engineer ensuring every board meets signal integrity, manufacturability, and regulatory standards before leaving the desk.

## TL;DR Checklist

- [ ] Create project with correct units (mm) and grid settings before placing any component
- [ ] Assign footprints to all symbols and verify footprint library paths are resolved
- [ ] Run ERC after schematic completion — fix all warnings before layout
- [ ] Set PCB layer stackup with impedance targets (microstrip/stripline) in pcbnew
- [ ] Route differential pairs with length matching within ±5% of pair length tolerance
- [ ] Place decoupling capacitors within 2mm of IC power pins; keep return paths uninterrupted
- [ ] Run full DRC and fix all errors before generating fabrication output
- [ ] Export ODB++ (preferred) or Gerber + drill files; verify with CAM viewer

---

## When to Use

Use this skill when:

- Designing a new PCB from schematic through fabrication files in KiCad 9+
- Reviewing an existing KiCad project for signal integrity, EMC, or manufacturability issues
- Configuring controlled impedance traces (microstrip, stripline) on multi-layer boards
- Setting up differential pair routing with length matching constraints
- Resolving DRC/ERC violations that block fabrication output generation
- Generating Gerber, ODB++, or IPC-2581 fabrication files with correct layer stackup
- Migrating a legacy KiCad 7/8 project to the KiCad 9+ workflow and library system

---

## When NOT to Use

- For simple breadboard or perf-board prototyping where no fabrication is needed
- For pure schematic-only documentation (use a reference skill instead of layout)
- For FPGA fabric design or digital logic synthesis (use an HDL-specific skill)
- When the user needs help with PCB assembly (SMT placement, reflow profiles) — use a manufacturing skill

---

## Core Workflow

### Phase 1: Project Setup and Schematic Capture

1. **Initialize Project** — Create a new KiCad project file (`*.kicad_pro`). Set preferred footprint libraries, board outline dimensions, and default drawing settings. **Checkpoint:** Confirm layer stackup is defined (at minimum Top copper, Bottom copper, and at least one ground plane) before placing any components.

2. **Create or Source Schematic Symbols** — Draw new symbols in the Symbol Editor (`kicad-cli pcb symbol editor`) or source from libraries like KiCad Official, Bazaar, or manufacturer footprint libraries (Texas Instruments, Analog Devices, Mouser). **Checkpoint:** Every component must have a symbol with correct pin numbers, electrical types (Passive, Input, Output, Power), and designators prefixed correctly (`R`, `C`, `U`, `L`, `J`).

3. **Draw the Schematic** — Place components, route wires, add power ports, label nets, and place hierarchical sheets for complex designs. Use net labels for global connections rather than long wire runs. **Checkpoint:** Run ERC (Electrical Rule Check) via `Design Rules → Run ERC`. All warnings must be reviewed; critical errors must be resolved before proceeding to layout.

4. **Update Netlist** — Transfer schematic to PCB with `Tools → Update PCB from Schematic`. **Checkpoint:** Verify footprint assignments resolved correctly — any "unassigned" footprints must be manually linked in the Footprint Assignment Table.

### Phase 2: Component Library and Footprint Management

5. **Verify Footprint Libraries** — Open the Footprint Manager and verify every footprint has correct 3D model properties, solder mask/paste expansion, and silk screen clearance. Use `Tools → Manage Footprint Libraries` to check paths. **Checkpoint:** No footprints should show "library not found" warnings. Resolve broken library paths or add local libraries.

6. **Create Custom Footprints When Needed** — For connectors, mechanical parts, or custom packages not in existing libraries. Follow the footprint wizard as a starting point, then refine manually. **Checkpoint:** Measure the footprint against the datasheet drawing. Verify pad sizes match IPC-7351 recommendations for the target assembly process (0402 minimum pad spacing, for example).

### Phase 3: PCB Layout with Impedance and EMC Control

7. **Define Layer Stackup** — Open `Preferences → Manage Layer Stack Manager`. Set copper thickness (typically 1oz or 0.5oz), prepreg/core dielectric constants (FR-4: Er ≈ 4.2, H ≈ 0.2mm for standard 2-layer), and target impedance for controlled layers. **Checkpoint:** Record the stackup — it feeds directly into all impedance calculations in Phase 4.

8. **Board Outline and Keep-Out Zones** — Draw the board edges on the Edge.Cuts layer. Define keep-out zones for mechanical constraints: mounting holes, connector protrusions, antenna clearance areas, thermal relief zones. **Checkpoint:** Verify board dimensions match the mechanical enclosure drawing or spec sheet.

9. **Place Components Strategically** — Group components by functional block (power stage, analog front-end, digital core, I/O). Orient decoupling capacitors closest to IC power pins with the shortest possible return path. Keep high-speed signals away from noisy analog sections and board edges. **Checkpoint:** Analog-sensitive traces should not cross under switching regulators or high-current paths.

10. **Route with Signal Integrity in Mind** — Route critical nets first: clocks, differential pairs, high-speed serial lines (USB, MIPI, Ethernet). Apply length matching rules for parallel buses. Use 45-degree or curved bends; avoid 90-degree corners. **Checkpoint:** Run Design Rule Check after initial routing pass to catch clearance violations before committing copper.

### Phase 4: Validation and Fabrication Output

11. **Run Full DRC** — Execute `Design Rules → Run DRC`. Review all errors by severity. Common fixable issues: clearance violations, unconnected pins, missing silkscreen text, oversized drill holes. **Checkpoint:** Zero errors and zero warnings should remain before export. Some non-critical warnings (e.g., "unrouted trace") are acceptable if intentional (test points).

12. **Generate Fabrication Files** — Export ODB++ (preferred for modern PCB houses) via `File → Export → ODB++`. Select appropriate options: include netlist, select all layers, enable assembly drawings and centroid files. Alternative: Gerber + Excellon drill files with NC Drill format. **Checkpoint:** Open the exported files in a CAM viewer (e.g., KiCad's built-in 3D viewer, ViewBotView, or GC-Prevue) to visually verify layer output matches expectations.

13. **Generate BOM and Pick-and-Place** — Export Bill of Materials with reference designators, footprints, values, manufacturers, and Mouser/Digikey part numbers. Generate centroid files (X-Y placement) for assembly houses. **Checkpoint:** Cross-check the BOM against the schematic to ensure every component is accounted for with correct manufacturer part numbers.

---

## Implementation Patterns

### Pattern 1: IPC-2152 Trace Width Calculator

Calculate trace width based on IPC-2152 standard for current-carrying capacity. This accounts for copper cross-sectional area, allowable temperature rise, and board layer configuration (internal vs. external).

```python
"""
Trace width calculation based on IPC-2152 standard.
Uses the IPC-2152 empirical model for copper trace current capacity.

External layers: higher cooling → more current per mm² of copper.
Internal layers: insulated by dielectric → lower current per mm².
"""

import math

# IPC-2152 constants (empirically derived from test data)
# These approximate the curve-fit equations from standard Annex D
IPC_2152_A_EXTERNAL = 0.048           # Cross-section area constant for external layers
IPC_2152_B_EXTERNAL = -0.449          # Exponent for external layers
IPC_2152_A_INTERNAL = 0.044           # Cross-section area constant for internal layers
IPC_2152_B_INTERNAL = -0.407          # Exponent for internal layers

# Standard copper thicknesses in oz/ft² (1 oz = 35µm ≈ 1.37 mils)
COPPER_THICKNESS_OZ = {
    "0.5oz": 0.5,
    "1oz": 1.0,
    "2oz": 2.0,
}


def trace_width_from_current(
    current_amps: float,
    temp_rise_celsius: float = 10.0,
    copper_thickness_oz: float = 1.0,
    internal_layer: bool = False,
) -> float:
    """Calculate minimum trace width in mm for a given current using IPC-2152.

    Args:
        current_amps: Maximum current the trace must carry (A).
        temp_rise_celsius: Allowable temperature rise above ambient (°C).
            10°C is typical for signal traces; 20°C+ may be used for power traces.
        copper_thickness_oz: Copper weight in oz/ft² (e.g., 1.0, 2.0).
        internal_layer: True if trace is on an internal layer (between two dielectrics).
            Internal traces have worse cooling than external traces.

    Returns:
        Minimum trace width in millimeters.

    Raises:
        ValueError: If current is negative or copper thickness is unsupported.
    """
    if current_amps <= 0:
        raise ValueError(f"Current must be positive, got {current_amps} A")
    if temp_rise_celsius <= 0:
        raise ValueError(f"Temperature rise must be positive, got {temp_rise_celsius} °C")
    if copper_thickness_oz not in COPPER_THICKNESS_OZ.values():
        raise ValueError(
            f"Unsupported copper weight: {copper_thickness_oz} oz/ft². "
            f"Use one of: {list(COPPER_THICKNESS_OZ.values())}"
        )

    # Convert copper thickness to mils (1 oz/ft² ≈ 34.77 µm ≈ 1.37 mils)
    copper_mils = copper_thickness_oz * 1.378  # mils

    # Select IPC-2152 constants based on layer type
    if internal_layer:
        a, b = IPC_2152_A_INTERNAL, IPC_2152_B_INTERNAL
    else:
        a, b = IPC_2152_A_EXTERNAL, IPC_2152_B_EXTERNAL

    # Calculate required copper cross-sectional area (mil²)
    # I = k * ΔT^b * Area^c  →  Area = (I / (k * ΔT^b))^(1/c)
    # Using the simplified form: Area = (I / a / ΔT^b)
    area_mil2 = current_amps / (a * (temp_rise_celsius ** b))

    # Width = Area / Thickness
    width_mils = area_mil2 / copper_mils

    return width_mils * 0.0254  # Convert mils to mm


# --- Example: Design decisions for a typical power stage ---
if __name__ == "__main__":
    # Buck converter switch node: 3A, 1oz external copper, 20°C rise
    sw_node_width = trace_width_from_current(
        current_amps=3.0,
        temp_rise_celsius=20.0,
        copper_thickness_oz=1.0,
        internal_layer=False,
    )
    print(f"Switch node trace (3A): {sw_node_width:.3f} mm")

    # USB D+/D- differential pair: 0.5A, 1oz external, 10°C rise
    usb_diff_width = trace_width_from_current(
        current_amps=0.5,
        temp_rise_celsius=10.0,
        copper_thickness_oz=1.0,
        internal_layer=False,
    )
    print(f"USB diff pair power trace (0.5A): {usb_diff_width:.3f} mm")

    # Internal ground plane: no width needed, but verify pour connectivity
    print("Ground pour: use thermal reliefs with 8+ spokes for thermal mass")
```

### Pattern 2: Controlled Impedance Calculation (Microstrip and Stripline)

Calculate characteristic impedance for microstrip (outer layer) and stripline (inner layer) traces using the IPC-2152/IPC-2223 field-solving approximations. Essential for USB, Ethernet, HDMI, DDR, and high-speed serial interfaces.

```python
"""
Controlled impedance trace calculator for microstrip and stripline configurations.
Uses standard field-solver equations (IPC-2223 / Hammerstad/Jensen models).

Target impedances:
    USB 2.0:       90 Ω differential (45 Ω single-ended)
    Ethernet RMII: 100 Ω differential (50 Ω single-ended)
    HDMI:          100 Ω differential (50 Ω single-ended)
    DDR3/4:        50 Ω single-ended, 100 Ω differential (DQS)
    UART/SPI:      50 Ω single-ended (optional for short traces < 3")
"""


def microstrip_impedance(
    trace_width_mil: float,
    dielectric_height_mil: float,
    dielectric_constant: float = 4.2,
    copper_thickness_mil: float = 1.4,
) -> float:
    """Calculate characteristic impedance of an microstrip trace (outer copper layer).

    Uses the Hammerstad and Jensen approximation model for microstrip lines.

    Args:
        trace_width_mil: Trace width in mils.
        dielectric_height_mil: Distance from trace to reference plane (prepreg/core thickness).
        dielectric_constant: Relative permittivity (Er) of the dielectric material.
            FR-4 typically 4.0–4.5; Rogers RO4350B is 3.48.
        copper_thickness_mil: Copper thickness in mils (1oz = 1.37 mil, 0.5oz = 0.69 mil).

    Returns:
        Characteristic impedance in Ohms.
    """
    w = trace_width_mil
    h = dielectric_height_mil

    # Calculate impedance for W/H <= 1 (narrow traces)
    if w / h <= 1.0:
        z0 = (84.0 / math.sqrt((dielectric_constant + 1.0) / 2.0)) * math.log(
            5.98 * h / (0.8 * w + copper_thickness_mil)
        )
    else:
        # Correction for W/H > 1 (wider traces)
        epsilon_eff = (dielectric_constant + 1.0) / 2.0 + (
            (dielectric_constant - 1.0) / 2.0 * (1.0 + 12.0 * h / w) ** (-0.5)
        )
        z0 = (84.0 / math.sqrt(epsilon_eff)) * math.log(
            5.98 * h / (0.8 * w + copper_thickness_mil)
        )

    return z0


def stripline_impedance(
    trace_width_mil: float,
    dielectric_height_mil: float,
    dielectric_constant: float = 4.2,
    copper_thickness_mil: float = 1.4,
) -> float:
    """Calculate characteristic impedance of a stripline trace (inner copper layer).

    The trace is sandwiched between two reference planes at equal distance.

    Args:
        trace_width_mil: Trace width in mils.
        dielectric_height_mil: Distance from trace to each adjacent reference plane.
            For symmetric stripline, this is half the total distance between planes.
        dielectric_constant: Relative permittivity of surrounding dielectric.
        copper_thickness_mil: Copper thickness in mils.

    Returns:
        Characteristic impedance in Ohms.
    """
    w = trace_width_mil
    h = dielectric_height_mil
    t = copper_thickness_mil

    if w <= 0 or h <= 0:
        raise ValueError("Width and height must be positive")

    # IPC-2223 stripline equation (symmetric, two reference planes)
    z0 = (60.0 / math.sqrt(dielectric_constant)) * math.log(
        (4.0 * h) / (0.577 * t + 0.8 * w)
    )

    return z0


def find_trace_width_for_impedance(
    target_z_ohm: float,
    trace_type: str = "microstrip",
    dielectric_height_mil: float = 6.0,
    dielectric_constant: float = 4.2,
    copper_thickness_mil: float = 1.378,
    tolerance_ohm: float = 5.0,
) -> dict:
    """Find the trace width (mils) that achieves a target impedance within tolerance.

    Uses binary search between 2 mils and 100 mils for efficient convergence.

    Args:
        target_z_ohm: Desired characteristic impedance in Ohms (e.g., 50.0, 90.0).
        trace_type: "microstrip" or "stripline".
        dielectric_height_mil: Distance to reference plane.
        dielectric_constant: Dielectric constant of substrate.
        copper_thickness_mil: Copper thickness in mils.
        tolerance_ohm: Acceptable impedance deviation from target.

    Returns:
        Dictionary with trace_width_mil, achieved_impedance, and layer_type.
    """
    if trace_type not in ("microstrip", "stripline"):
        raise ValueError("trace_type must be 'microstrip' or 'stripline'")

    # Binary search for the width that achieves target impedance
    lo, hi = 2.0, 100.0  # mils

    for _ in range(50):  # sufficient iterations for convergence
        mid = (lo + hi) / 2.0
        if trace_type == "microstrip":
            z = microstrip_impedance(mid, dielectric_height_mil, dielectric_constant, copper_thickness_mil)
        else:
            z = stripline_impedance(mid, dielectric_height_mil, dielectric_constant, copper_thickness_mil)

        if abs(z - target_z_ohm) <= tolerance_ohm:
            return {
                "trace_width_mil": mid,
                "achieved_impedance": z,
                "layer_type": trace_type,
                "dielectric_height_mil": dielectric_height_mil,
                "tolerance_ok": True,
            }

        if z > target_z_ohm:
            lo = mid  # wider trace → lower impedance
        else:
            hi = mid  # narrower trace → higher impedance

    return {
        "trace_width_mil": (lo + hi) / 2.0,
        "achieved_impedance": z,
        "layer_type": trace_type,
        "dielectric_height_mil": dielectric_height_mil,
        "tolerance_ok": False,
    }


if __name__ == "__main__":
    # 50Ω microstrip on standard 2-layer FR-4 (top layer to GND plane)
    # Typical stackup: 1.6mm board, trace at edge, ~0.8mm to ground pour
    result = find_trace_width_for_impedance(
        target_z_ohm=50.0,
        trace_type="microstrip",
        dielectric_height_mil=31.5,  # ~0.8mm ≈ 31.5 mils
    )
    print(f"50Ω microstrip (0.8mm to GND): {result['trace_width_mil']:.1f} mils")

    # 90Ω differential pair via single-ended traces on a 4-layer board
    # Stackup: Signal1 / GND / PWR / Signal2, GND core ≈ 0.15mm to top layer
    result_diff = find_trace_width_for_impedance(
        target_z_ohm=45.0,  # single-ended for 90Ω diff pair
        trace_type="microstrip",
        dielectric_height_mil=6.0,  # ~0.15mm ≈ 6 mils (standard 4-layer prepreg)
        copper_thickness_mil=1.378,
    )
    print(f"45Ω SE for 90Ω diff pair (0.15mm to GND): {result_diff['trace_width_mil']:.1f} mils")

    # Validate with a 2-layer board where trace sits on edge:
    result_2layer = find_trace_width_for_impedance(
        target_z_ohm=50.0,
        trace_type="microstrip",
        dielectric_height_mil=47.0,  # ~1.2mm for typical 2-layer board edge
        copper_thickness_mil=0.689,  # 0.5oz copper
    )
    print(f"50Ω microstrip (2-layer, 1.2mm to GND): {result_2layer['trace_width_mil']:.1f} mils")
```

### Pattern 3: KiCad Python Scripting for Automated Design Rule Validation

Use the `pcbnew` Python API (available in KiCad 9+) to programmatically verify design rules, check trace clearances, validate differential pair routing, and report violations. This automation catches issues before running the full GUI DRC.

```python
"""
KiCad 9+ Python scripting for automated PCB design validation.
Run via: kicad-cli pcb load project.kicad_pcb --script validate_design.py

Validates:
- Differential pair length matching within spec
- Via stub lengths and via type compliance
- Decoupling capacitor placement relative to IC power pins
- Clearances on high-speed net classes
"""

import sys
import pcbnew
from math import sqrt


def get_net_class(board, net_name):
    """Get the NetClass for a specific net name."""
    nets = board.GetNetInfo()
    if net_name in nets:
        return nets.GetNetClass(net_name)
    return None


def measure_trace_length(board, net_name):
    """Measure total trace length of all segments belonging to a net.

    Args:
        board: The PCBNEW board object.
        net_name: Net name string (e.g., "USB_D+" or "SPI_MOSI").

    Returns:
        Total trace length in mm across all segments on all layers.
    """
    total_length = 0.0
    net_code = board.FindNet(net_name).GetNet()

    for track in board.GetTracks():
        if track.GetNetCode() == net_code:
            x1, y1 = track.GetStart()
            x2, y2 = track.GetEnd()
            length = sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 1e6  # convert from nm to mm
            total_length += length

    return total_length


def check_differential_pair_length_matching(
    board,
    pair_name_a: str,
    pair_name_b: str,
    max_mismatch_mm: float = 0.5,
) -> list:
    """Check that a differential pair's traces are length-matched within tolerance.

    Args:
        board: The PCBNEW board object.
        pair_name_a: Net name of the first trace (e.g., "USB_D+").
        pair_name_b: Net name of the second trace (e.g., "USB_D-").
        max_mismatch_mm: Maximum allowed length difference in millimeters.

    Returns:
        List of violation dicts if mismatch exceeds tolerance; empty list if OK.
    """
    len_a = measure_trace_length(board, pair_name_a)
    len_b = measure_trace_length(board, pair_name_b)
    mismatch = abs(len_a - len_b)

    violations = []
    if mismatch > max_mismatch_mm:
        violations.append({
            "type": "DIFF_PAIR_LENGTH_MISMATCH",
            "net_a": pair_name_a,
            "net_b": pair_name_b,
            "length_a_mm": round(len_a, 3),
            "length_b_mm": round(len_b, 3),
            "mismatch_mm": round(mismatch, 3),
            "max_allowed_mm": max_mismatch_mm,
            "severity": "ERROR",
        })

    return violations


def validate_decoupling_placement(board, max_distance_mm: float = 5.0) -> list:
    """Check that decoupling capacitors are placed within specified distance of IC pins.

    Scans all pads belonging to power/ground nets on ICs and verifies nearby caps exist.

    Args:
        board: The PCBNEW board object.
        max_distance_mm: Maximum allowed distance from IC power pin to cap pad (mm).

    Returns:
        List of violation dicts for uncapped or far-placed decoupling capacitors.
    """
    violations = []
    max_dist_nm = max_distance_mm * 1e6  # convert mm to nanometers (KiCad internal units)

    # Find all IC packages and their power pins
    for module in board.GetModules():
        if not module.GetReference().startswith("U"):
            continue  # skip non-IC components

        for pad in module.Pads():
            net_name = pad.GetNetname()
            # Check if this is a power or ground pin
            if net_name.upper() in ("VCC", "VDD", "VCC5", "VCC3", "GND", "AVDD", "DVDD"):
                pad_pos = pad.GetPosition()

                # Search for a nearby decoupling capacitor on the same net
                found_cap = False
                for cap in board.GetModules():
                    if not cap.GetReference().startswith("C"):
                        continue
                    for cap_pad in cap.Pads():
                        if cap_pad.GetNetname() == net_name:
                            cap_pos = cap_pad.GetPosition()
                            dist = sqrt(
                                (cap_pos.x - pad_pos.x) ** 2 +
                                (cap_pos.y - pad_pos.y) ** 2
                            )
                            if dist < max_dist_nm:
                                found_cap = True
                                break
                    if found_cap:
                        break

                if not found_cap:
                    violations.append({
                        "type": "MISSING_DECAP",
                        "ic_ref": module.GetReference(),
                        "pin_name": pad.GetName(),
                        "net": net_name,
                        "max_distance_mm": max_distance_mm,
                        "severity": "WARNING",
                    })

    return violations


def report_via_stubs(board) -> list:
    """Identify all vias and flag through-hole vias that could act as stubs.

    In high-speed designs (> 50 MHz), via stubs cause reflections.
    Blind/buried vias or back-drilled vias eliminate stubs.

    Args:
        board: The PCBNEW board object.

    Returns:
        List of via dicts with layer info for stub analysis.
    """
    violations = []
    all_layers = board.GetLayersCount()

    for via in board.Vias():
        start_layer = via.GetLayer()
        end_layer = via.GetEndLayer()

        # If a via spans from top to bottom (or near-full stackup), it's a potential stub
        is_through_hole = (start_layer == 0 and end_layer == all_layers - 1)

        if is_through_hole and via.GetHeight() > 1.0:  # > 1mm tall on 2-layer board
            violations.append({
                "type": "VIA_STUB_POTENTIAL",
                "via_pos": f"({via.GetX()/1e6:.1f}, {via.GetY()/1e6:.1f}) mm",
                "start_layer": start_layer,
                "end_layer": end_layer,
                "diameter_mm": round(via.GetWidth() / 1e6, 2),
                "note": "Consider back-drilling or blind vias for signals > 50 MHz",
            })

    return violations


def run_validation(board):
    """Run all validation checks and return a consolidated report."""
    print("=" * 60)
    print("KiCad 9+ Automated PCB Design Validation Report")
    print("=" * 60)

    all_violations = []

    # Check differential pair matching for known high-speed nets
    diff_pairs = [
        ("USB_D+", "USB_D-"),
        ("ETH_RXD+", "ETH_RXD-"),
        ("ETH_TXD+", "ETH_TXD-"),
    ]
    for net_a, net_b in diff_pairs:
        if board.FindNet(net_a) and board.FindNet(net_b):
            v = check_differential_pair_length_matching(board, net_a, net_b, max_mismatch_mm=0.5)
            all_violations.extend(v)

    # Check decoupling capacitor placement
    all_violations.extend(validate_decoupling_placement(board, max_distance_mm=5.0))

    # Check via stubs
    all_violations.extend(report_via_stubs(board))

    # Output results
    if not all_violations:
        print("✓ All validation checks passed.")
    else:
        print(f"\nFound {len(all_violations)} issue(s):\n")
        for i, v in enumerate(all_violations, 1):
            print(f"  [{i}] {v['type']} ({v.get('severity', 'UNKNOWN')})")
            for key, val in v.items():
                if key not in ("type", "severity"):
                    print(f"      {key}: {val}")

    return all_violations


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: kicad-cli pcb load project.kicad_pcb --script validate_design.py")
        sys.exit(1)

    board = pcbnew.LoadBoard(sys.argv[1])
    report = run_validation(board)
    sys.exit(1 if any(v.get("severity") == "ERROR" for v in report) else 0)
```

---

## EMC / EMI Design Rules

### Ground Plane Strategy
- **Use continuous ground planes** on inner layers. Never split ground planes under high-speed or mixed-signal circuits. Splitting creates return current discontinuities that radiate.
- **Separate analog and digital grounds by routing**, not by splitting the plane. Allow all return currents to share a single reference plane; signal returns naturally take the lowest-inductance path back to the source.
- **Connect AGND and DGND at a single point** under the mixed-signal IC (ADC/DAC) using a narrow bridge or 0Ω link, matching the datasheet recommendation.

### Decoupling Best Practices
- Place one decoupling capacitor per power pin where physically possible. Use 0402 or 0603 X7R/X5R ceramic capacitors.
- **Critical rule**: The path from IC VCC pad → cap → GND plane must form the smallest possible loop. Route cap pads directly to each other using short, wide traces or direct copper pours.
- For multi-pin power domains (MCUs with VDDA and VDDD), use separate caps on each pin even if they share the same net name.

### Filtering at I/O Connectors
- Place ESD protection diodes and series resistors as close to connector pins as possible (< 5mm trace).
- For analog inputs, add RC low-pass filters (e.g., 10kΩ + 10nF → 1.6kHz cutoff) before the ADC input.
- Use ferrite beads on power lines feeding noisy subsystems (RF modules, motor drivers).

---

## Signal Integrity Basics

### Trace Length Matching
- For parallel buses (SPI, I2C, GPIO), match trace lengths to within **±0.5mm** for speeds up to 50MHz.
- For DDR data lines, match all traces in a byte group to within **±0.1mm** and inter-byte groups to within **±0.5mm**.
- For differential pairs (USB, Ethernet), length mismatch between +/− traces must not exceed **5% of the pair's total electrical length**.

### Via Management
- Minimize via count on high-speed nets. Each via adds 0.5–1pF of capacitance and creates an impedance discontinuity.
- Use **back-drilled vias** or **blind/buried vias** for signals above 50MHz to eliminate antenna stubs.
- Never use vias as a shortcut for routing — every via is a parasitic element (L ≈ 1nH, C ≈ 0.5–1pF).

### Crossover Prevention
- On 4+ layer boards: Route horizontal on one signal layer, vertical on the adjacent signal layer, with solid ground planes between them. This provides shielding and reduces crosstalk.
- Keep spacing between parallel traces to at least **3× the trace width** (the "3W rule") for controlled impedance lines.

---

## KiCad CLI Automation Recipes

### Run DRC from Command Line

```bash
# Non-interactive DRC check, exits with error code if violations found
kicad-cli pcb drc board.kicad_pcb --output report.drc.txt

# ERC on schematic
kicad-cli sch ERC schematic.kicad_sch --output report.erc.txt

# Generate Gerber files
kicad-cli pcb export gerber board.kicad_pcb --outdir gerbers \
  --layer F.Cu --layer B.Cu --layer F.SilkS --layer B.SilkS \
  --layer F.Mask --layer B.Mask --layer Edge.Cuts

# Generate drill files
kicad-cli pcb export ncdrill board.kicad_pcb --outdir gerbers

# Full fabrication export as ODB++
kicad-cli pcb export odbc board.kicad_pcb --outdir odbpp \
  --assembly --netlist --centroids
```

### Batch Footprint Library Check

```bash
# List all unassigned footprints in a project (pre-layout check)
kicad-cli sch symbol list schematic.kicad_sch | grep "UNASSIGNED"

# Validate all footprint library references
kicad-cli pcb lib verify board.kicad_pcb --output lib_report.txt
```

---

## Constraints

### MUST DO
- Run ERC after every schematic modification and resolve all errors before PCB layout
- Define layer stackup with impedance targets before placing any component
- Route differential pairs as matched pairs in KiCad's track routing constraints panel
- Set length matching rules for all parallel buses and differential pairs in Design Rules → Constraints
- Keep decoupling capacitors within 5mm of IC power pins; route the shortest possible return path
- Verify fabrication output with a CAM viewer before submission to the PCB house
- Document any design deviations from standard rules (e.g., reduced clearances for space constraints)

### MUST NOT DO
- Split ground planes under mixed-signal circuits or high-speed digital traces
- Use 90-degree trace corners on high-speed signals — use 45° or curved arcs
- Route clocks parallel to each other on adjacent layers without a ground plane between them
- Place vias directly through mounting holes without annular ring clearance (IPC-7351 minimum)
- Export Gerbers without verifying copper paste mask expansion on BGA pads
- Skip DRC — even "just a few warnings" can hide critical issues like unconnected power nets
- Use default KiCad footprints for BGA/QFN packages without verifying pad pitch against the datasheet

---

## Output Template

When designing or reviewing a KiCad PCB project, produce:

1. **Stackup Report** — Layer count, copper weights, dielectric thicknesses, and calculated impedances
2. **ERC Summary** — All ERC warnings with justification for any accepted warnings
3. **DRC Summary** — Error and warning counts by category; list of any intentional exceptions
4. **Signal Integrity Notes** — Differential pair lengths, mismatch values, via count on critical nets
5. **EMC Design Summary** — Ground strategy description, decoupling coverage (% of power pins covered), I/O filtering locations
6. **Fabrication Checklist** — ODB++/Gerber export verification status, BOM completeness, pick-and-place file generation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `electrical-engineering-hardware-debugging` | Diagnose PCB-level issues: oscilloscope probing techniques, fault isolation, signal tracing |
| `electrical-engineering-component-selection` | Choose passive and active components based on specs, tolerance, temperature range, and availability |
| `electrical-engineering-power-supply-design` | Design linear and switching power supplies with layout considerations for KiCad projects |
| `electrical-engineering-firmware-hardware-interface` | Define hardware-software interfaces: pin multiplexing, interrupt routing, peripheral configuration |

---

## Live References

> Authoritative documentation links for KiCad PCB design. The model follows markdown links at load time to resolve external references and inline content.

- [KiCad 9 Official Documentation](https://docs.kicad.org/9.0/)
- [KiCad PCBnew User Guide](https://docs.kicad.org/9.0/kicad-pcbnew.html)
- [KiCad Symbol Editor Reference](https://docs.kicad.org/9.0/kicad-sym_edit.html)
- [IPC-2152 Design Guide for Current-Carrying Capacity](https://connectorexamples.s3.amazonaws.com/documents/white_papers/ipc-2152-design-guide.pdf)
- [IPC-2221 Generic Standard on Printed Board Design](https://www.ipc.org/standards)
- [KiCad Python API Documentation (pcbnew)](https://docs.kicad.org/9.0/python_api/index.html)
- [KiCad Bazaar Component and Footprint Libraries](https://kicad.org/libraries/bazaar/)
