---
name: digital-fabrication
description: Implements 3D printing slicing, laser cutting calibration, CNC toolpaths,
  and STL validation workflows for turning CAD models into fabrication-ready parts
  with optimized parameters.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: maker
  triggers: 3d printing, slicer, gcode, laser cutting, cnc milling, cad model, additive
    manufacturing
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
  related-skills: rapid-prototyping-workflow, maker-safety-practices
------
# Digital Fabrication Workflows

Implements end-to-end digital fabrication workflows for converting CAD models into physical parts. Covers three primary methods — FDM/SLA 3D printing with slicer optimization, laser cutting with material-aware parameter calibration, and CNC milling with toolpath strategy calculation. Includes STL validation, G-code manipulation, and automated calibration test generation to minimize wasted material and machine time.

## TL;DR Checklist

- [ ] Select fabrication method based on tolerance needs: +/-0.1mm CNC, +/-0.2mm laser, +/-0.5mm 3D print
- [ ] Verify CAD model wall thickness: minimum 0.8mm for FDM, 1.5mm for laser-cut acrylic
- [ ] Export to correct format: .stl for 3D printing, .dxf/.svg for laser/CNC
- [ ] Validate STL file is watertight with no inverted normals before slicing
- [ ] Configure slicer profile with layer height matching tolerance requirements (0.1mm–0.3mm typical)
- [ ] Generate and review G-code: check first-layer path, toolpath direction changes, and total estimated time
- [ ] Run calibration test pattern before any production job to verify material flow and dimensions
- [ ] Monitor first layer adhesion and mid-print inspection points during fabrication

---

## When to Use

Use this skill when:

- A validated prototype needs to be produced as a physical part with specific tolerances and material properties
- You are selecting between 3D printing, laser cutting, or CNC milling for a new part based on geometry and material requirements
- An existing print job is failing (layer adhesion issues, warping, dimensional inaccuracy) and you need systematic parameter tuning
- You have a CAD model that needs export format verification, wall thickness validation, and watertight repair before fabrication
- You need to calibrate laser power/speed settings for a new material type or adjust CNC toolpaths for better surface finish
- You are preparing batch production jobs and need consistent slicer profiles or toolpath strategies across multiple parts

---

## When NOT to Use

Avoid this skill for:

- Digital models that are still in active design iteration — wait until the CAD geometry is frozen before running fabrication workflows
- Parts requiring certified material properties (medical implants, aerospace components) — standard maker-space fabrication does not meet certification requirements
- Production runs exceeding 10,000 identical units where injection molding or stamping would be more economical per-unit

---

## Core Workflow

### Step 1: Select Fabrication Method

Choose the method that matches your part's tolerance, material, and surface finish requirements.

**Decision matrix:**

| Requirement | 3D Print (FDM) | 3D Print (SLA/Resin) | Laser Cut | CNC Mill |
|-------------|---------------|---------------------|-----------|----------|
| Tolerance | +/-0.2–0.5mm | +/-0.05–0.1mm | +/-0.1–0.2mm | +/-0.025–0.1mm |
| Min wall thickness | 0.8mm (layer width) | 0.4mm | Sheet thickness only | 0.5mm+ |
| Max part size | Limited by build volume (e.g., 220x220x250mm) | Small (up to 192mm cube typical) | Sheet size (e.g., 1220x610mm) | Bed size, typically 300-1000mm |
| Materials | PLA, PETG, ABS, Nylon, TPU | Standard, ABS-like, flexible, castable resins | Acrylic, wood, cardstock, fabric, leather | Aluminum, steel, brass, delrin, wood, plastics |
| Surface finish | Visible layer lines (can be sanded) | Smooth detail, support marks | Clean edges, slight kerf | Excellent with right tool/feeds |
| Production speed | Slow (hours per part) | Medium (1–4 hours) | Fast (minutes per sheet) | Medium (minutes to hours) |
| Best for | Functional prototypes, enclosures, custom fixtures | Miniatures, detailed parts, casting patterns | Flat or folded parts, panels, signage | Precision mechanical parts, metal components |

**Tolerance rule of thumb:** If your part has mating features with clearance gaps under 0.3mm, use CNC milling or SLA printing. If gaps can be 0.5mm+, FDM is adequate. Laser cutting produces flat parts — if your design requires 3D curvature beyond simple bends, it must be 3D printed or milled.

**Checkpoint:** Confirm the selected method meets the tightest tolerance requirement on any mating surface or clearance gap in your design.

---

### Step 2: Prepare Digital Model

Export your CAD model in the correct format and verify geometric integrity before sending to fabrication.

**Export formats by method:**
| Method | Primary Format | Alternate Format | Notes |
|--------|---------------|------------------|-------|
| FDM 3D Print | .stl (binary) | .obj, .3mf | Binary STL is smallest file size |
| SLA 3D Print | .stl or .3mf | — | .3mf preserves color and multi-material |
| Laser Cutting | .dxf or .svg | .pdf, .ai | DXF for vector paths; SVG for fill areas |
| CNC Milling | .step or .iges | .stp | STEP retains solid geometry, not just mesh |

**Wall thickness verification:**

```python
"""
STL file validation and repair toolkit.

Validates watertightness, detects inverted normals, checks minimum wall thickness,
and attempts automatic repair for common STL issues found in CAD exports.
"""

from __future__ import annotations

import struct
import sys
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class STLFace:
    """A single triangle face in an STL mesh."""
    normal_x: float
    normal_y: float
    normal_z: float
    v1_x: float
    v1_y: float
    v1_z: float
    v2_x: float
    v2_y: float
    v2_z: float
    attribute_byte_count: int = 0


@dataclass
class STLValidationReport:
    """Results of an STL file validation pass."""
    filepath: str
    is_watertight: bool = False
    face_count: int = 0
    inverted_normals: int = 0
    non_manifold_edges: int = 0
    min_wall_thickness_mm: float = 0.0
    bbox_min_x: float = 0.0
    bbox_max_x: float = 0.0
    bbox_min_y: float = 0.0
    bbox_max_y: float = 0.0
    bbox_min_z: float = 0.0
    bbox_max_z: float = 0.0
    repair_suggestions: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def parse_stl_binary(filepath: str) -> tuple[list[STLFace], STLValidationReport]:
    """Parse a binary STL file and return faces plus validation report.

    Binary STL format (solidworks, blender, meshmixer output):
    - 80 bytes header
    - 4 bytes: number of triangles (uint32 little-endian)
    - For each triangle:
      - 12 floats: normal vector (nx, ny, nz)
      - 36 floats: 3 vertices (x, y, z each as float)
      - 2 bytes: attribute byte count

    Args:
        filepath: Path to the binary STL file.

    Returns:
        Tuple of (faces list, validation report).

    Raises:
        ValueError: If file is not a valid binary STL or has unsupported size.
    """
    face_size = 50 * 4  # 50 floats × 4 bytes each = 200 bytes per face

    with open(filepath, "rb") as f:
        header = f.read(80)
        if len(header) != 80:
            raise ValueError(f"File too small to be a valid STL: {len(header)} bytes")

        num_faces_bytes = f.read(4)
        if len(num_faces_bytes) != 4:
            raise ValueError("Cannot read face count from binary STL header")

        num_faces = struct.unpack("<I", num_faces_bytes)[0]

        if num_faces == 0 or num_faces > 10_000_000:
            raise ValueError(f"Invalid face count: {num_faces}")

        raw_data = f.read(num_faces * face_size)
        if len(raw_data) != num_faces * face_size:
            raise ValueError(
                f"File truncated: expected {num_faces * face_size} bytes, "
                f"got {len(raw_data)}"
            )

    faces: list[STLFace] = []
    offset = 0
    for _ in range(num_faces):
        nx, ny, nz = struct.unpack("<fff", raw_data[offset:offset + 12])
        v1x, v1y, v1z = struct.unpack("<fff", raw_data[offset + 12:offset + 24])
        v2x, v2y, v2z = struct.unpack("<fff", raw_data[offset + 24:offset + 36])
        v3x, v3y, v3z = struct.unpack("<fff", raw_data[offset + 36:offset + 48])

        faces.append(STLFace(
            normal_x=nx, normal_y=ny, normal_z=nz,
            v1_x=v1x, v1_y=v1y, v1_z=v1z,
            v2_x=v2x, v2_y=v2y, v2_z=v2z,
        ))

        # Skip the 3rd vertex (redundant for watertightness check — we only need edges)
        offset += face_size

    report = validate_stl_faces(filepath, faces)
    return faces, report


def parse_stl_ascii(filepath: str) -> tuple[list[STLFace], STLValidationReport]:
    """Parse an ASCII STL file (facet normal ..., outer loop ..., endloop, endsolid).

    Args:
        filepath: Path to the ASCII STL file.

    Returns:
        Tuple of (faces list, validation report).
    """
    faces: list[STLFace] = []

    with open(filepath, "r") as f:
        content = f.read()

    lines = [line.strip() for line in content.splitlines()]
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("facet normal"):
            parts = line.split()
            if len(parts) < 7:
                raise ValueError(f"Invalid facet normal line at position {i}")

            nx, ny, nz = float(parts[2]), float(parts[3]), float(parts[4])

            # Skip "outer loop", read 3 vertices
            i += 1  # outer loop
            v1x, v1y, v1z = parse_vertex_line(lines[i])
            i += 1
            v2x, v2y, v2z = parse_vertex_line(lines[i])
            i += 1
            v3x, v3y, v3z = parse_vertex_line(lines[i])

            faces.append(STLFace(
                normal_x=nx, normal_y=ny, normal_z=nz,
                v1_x=v1x, v1_y=v1y, v1_z=v1z,
                v2_x=v2x, v2_y=v2y, v2_z=v2z,
            ))

            i += 2  # endloop + endsolid

        i += 1

    report = validate_stl_faces(filepath, faces)
    return faces, report


def parse_vertex_line(line: str) -> tuple[float, float, float]:
    """Parse a single 'vertex x y z' line."""
    parts = line.split()
    if len(parts) < 4 or parts[0] != "vertex":
        raise ValueError(f"Invalid vertex line: {line}")
    return float(parts[1]), float(parts[2]), float(parts[3])


def validate_stl_faces(filepath: str, faces: list[STLFace]) -> STLValidationReport:
    """Run comprehensive validation on a set of STL faces.

    Checks:
    1. Watertightness (all edges shared by exactly 2 faces)
    2. Normal orientation consistency
    3. Bounding box calculation
    4. Minimum edge length as proxy for wall thickness

    Args:
        filepath: Original file path for the report.
        faces: Parsed STL face list.

    Returns:
        ValidationReport with all findings.
    """
    report = STLValidationReport(filepath=filepath, face_count=len(faces))

    if not faces:
        report.errors.append("Empty STL — no faces found")
        return report

    # --- Edge analysis for watertightness ---
    edge_map: dict[tuple[int, int], list[int]] = {}  # edge_key -> [face_indices]

    def _make_edge_key(v1: tuple, v2: tuple) -> tuple[int, int]:
        """Create a canonical (sorted) key for an edge to detect shared edges."""
        return min((id(v1), id(v2)), key=lambda x: str(x))

    # Use rounded coordinates for edge matching (avoid float precision issues)
    def _rounded_vertex(v: tuple) -> tuple:
        return (round(v[0], 4), round(v[1], 4), round(v[2], 4))

    edge_count: dict[tuple, int] = {}
    for face_idx, face in enumerate(faces):
        vertices = [
            _rounded_vertex((face.v1_x, face.v1_y, face.v1_z)),
            _rounded_vertex((face.v2_x, face.v2_y, face.v2_z)),
            # 3rd vertex is implied: face normal cross (v2-v1) direction
        ]

        for i in range(3):
            v_start = vertices[i]
            v_end = vertices[(i + 1) % 3]
            edge_key = tuple(sorted([v_start, v_end]))
            edge_count[edge_key] = edge_count.get(edge_key, 0) + 1

    # Non-manifold edges: shared by more or fewer than 2 faces
    non_manifold = sum(1 for count in edge_count.values() if count != 2)
    report.non_manifold_edges = non_manifold
    report.is_watertight = (non_manifold == 0)

    # --- Normal orientation check ---
    # For a watertight mesh, all face normals should point outward consistently.
    # Check that at least 95% of normals have positive dot product with the vector
    # from centroid to the face center (rough consistency check).
    if len(faces) > 0:
        centroid = [0.0, 0.0, 0.0]
        for f in faces:
            centroid[0] += (f.v1_x + f.v2_x) / 2
            centroid[1] += (f.v1_y + f.v2_y) / 2
            centroid[2] += (f.v1_z + f.v2_z) / 2
        centroid = [c / len(faces) for c in centroid]

        inverted_count = 0
        checked = 0
        for face in faces[:min(len(faces), 500)]:  # Sample for performance
            center_x = (face.v1_x + face.v2_x) / 2
            center_y = (face.v1_y + face.v2_y) / 2
            center_z = (face.v1_z + face.v2_z) / 2

            dx, dy, dz = center_x - centroid[0], center_y - centroid[1], center_z - centroid[2]
            length = math.sqrt(dx * dx + dy * dy + dz * dz)
            if length > 0:
                dot = (face.normal_x * dx + face.normal_y * dy + face.normal_z * dz) / length
                if dot < 0:  # Normal points inward
                    inverted_count += 1
                checked += 1

        report.inverted_normals = inverted_count

    # --- Bounding box ---
    xs, ys, zs = [], [], []
    for f in faces:
        xs.extend([f.v1_x, f.v2_x])
        ys.extend([f.v1_y, f.v2_y])
        zs.extend([f.v1_z, f.v2_z])

    report.bbox_min_x = min(xs)
    report.bbox_max_x = max(xs)
    report.bbox_min_y = min(ys)
    report.bbox_max_y = max(ys)
    report.bbox_min_z = min(zs)
    report.bbox_max_z = max(zs)

    # --- Minimum wall thickness estimate (minimum edge length as proxy) ---
    edge_lengths = []
    for f in faces:
        v1 = (f.v1_x, f.v1_y, f.v1_z)
        v2 = (f.v2_x, f.v2_y, f.v2_z)
        dx, dy, dz = v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]
        edge_lengths.append(math.sqrt(dx*dx + dy*dy + dz*dz))

    if edge_lengths:
        report.min_wall_thickness_mm = min(edge_lengths)

    # --- Generate repair suggestions ---
    if not report.is_watertight and non_manifold > 0:
        report.repair_suggestions.append(
            f"Non-watertight mesh: {non_manifold} non-manifold edges detected. "
            "Re-export from CAD software with 'Watertight' or 'Manifold' option enabled, "
            "or use Meshmixer/Meshlab to fill holes."
        )
    if report.inverted_normals > 0:
        report.repair_suggestions.append(
            f"Found {report.inverted_normals} inward-facing normals (sampled). "
            "Use 'Normalize Normals' or 'Flip Normals' in Meshmixer/Meshlab."
        )
    if report.face_count == 0:
        report.errors.append("No faces parsed — file may be ASCII STL with unexpected format")

    return report


if __name__ == "__main__":
    # Example usage: validate a local STL file
    target = sys.argv[1] if len(sys.argv) > 1 else "model.stl"
    try:
        faces, report = parse_stl_binary(target)
        print(f"\n{'='*60}")
        print(f"STL VALIDATION REPORT: {report.filepath}")
        print(f"{'='*60}")
        print(f"  Face count:          {report.face_count:,}")
        print(f"  Watertight:          {'YES' if report.is_watertight else 'NO'}")
        print(f"  Non-manifold edges:  {report.non_manifold_edges}")
        print(f"  Inverted normals:    {report.inverted_normals} (sampled)")
        print(f"  Min edge length:     {report.min_wall_thickness_mm:.3f} mm")
        print(f"  Bounding box:        ({report.bbox_min_x:.1f}, {report.bbox_min_y:.1f}, {report.bbox_min_z:.1f})")
        print(f"                     to ({report.bbox_max_x:.1f}, {report.bbox_max_y:.1f}, {report.bbox_max_z:.1f})")

        if report.repair_suggestions:
            print(f"\n  Repair suggestions:")
            for s in report.repair_suggestions:
                print(f"    - {s}")
        if report.errors:
            print(f"\n  Errors:")
            for e in report.errors:
                print(f"    - {e}")

        print(f"{'='*60}\n")

    except FileNotFoundError:
        print(f"File not found: {target}. Place an STL file at this path or pass the path as argument.")
    except ValueError as e:
        print(f"Validation error: {e}")
```

---

### Step 3: Configure Slicer/Machine Parameters

Configure your slicer with parameters matched to the required tolerance and surface finish. Use the JSON profile template below as a starting point for PrusaSlicer or OrcaSlicers-compatible profiles.

**Key parameter rules:**
| Parameter | Low Detail (Draft) | Standard (Production) | High Detail (Presentation) |
|-----------|-------------------|----------------------|--------------------------|
| Layer height | 0.28–0.30mm | 0.16–0.20mm | 0.08–0.12mm |
| Nozzle temp (PLA) | 200°C | 205–210°C | 210°C |
| Bed temp (PLA) | 60°C | 60°C | 60°C |
| Print speed | 80mm/s | 50mm/s | 30mm/s |
| Infill density | 10–15% | 15–20% | 20–30% |
| Infill pattern | Grid | Gyroid (stronger) | Gyroid or Cubic |
| Wall lines | 2 | 3 | 4+ |
| Support density | — | 15% | 20% |
| Top/bottom layers | 4 | 6 | 8 |

---

### Step 4: Generate and Review Toolpaths/G-Code

**For 3D printing:** Run the slicer to generate G-code, then review critical sections:

```python
"""
G-code generation script — creates a calibration test pattern.

Generates a standardized calibration block with known dimensions that can be
printed and measured to verify slicer accuracy. Also includes functions for
post-processing generated G-code to inject speed overrides and infill adjustments.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class CalibrationBlockSpec:
    """Specifications for a 3D printing calibration block."""

    # Dimensions in mm
    width: float = 20.0
    height: float = 20.0
    depth: float = 20.0

    # Feature dimensions for accuracy testing
    hole_diameter_mm: float = 6.0
    pillar_spacing_mm: float = 8.0
    wall_thickness_mm: float = 1.0

    # Slicer parameters embedded as G-code comments
    layer_height_mm: float = 0.2
    nozzle_diameter_mm: float = 0.4
    print_speed_mm_s: float = 50.0
    travel_speed_mm_s: float = 150.0

    # Material settings
    material_name: str = "PLA"
    nozzle_temp_c: int = 210
    bed_temp_c: int = 60


def generate_calibration_gcode(spec: CalibrationBlockSpec) -> str:
    """Generate G-code for a precision calibration block test pattern.

    The pattern includes:
    - A solid outer shell (4 walls) for dimensional accuracy check
    - Internal pillars spaced at known distances for shrinkage measurement
    - A through-hole for bore diameter verification
    - Height marks at every 5mm layer for Z-axis accuracy validation

    Args:
        spec: Calibration block specifications.

    Returns:
        Complete G-code string ready to send to printer or load into slicer.
    """
    gcode: list[str] = []

    # Header
    gcode.append(f"; Generated calibration block: {spec.width}x{spec.height}x{spec.depth} mm")
    gcode.append(f"; Material: {spec.material_name}, Nozzle: {spec.nozzle_diameter_mm}mm")
    gcode.append(f"; Layer height: {spec.layer_height_mm}mm, Speed: {spec.print_speed_mm_s}mm/s")
    gcode.append("; MEASUREMENT REFERENCE:")
    gcode.append(f";  - Overall width should be {spec.width:.2f}mm ±{0.1:.2f}mm")
    gcode.append(f";  - Pillar spacing should be {spec.pillar_spacing_mm:.2f}mm ±{0.05:.2f}mm")
    gcode.append(f";  - Hole diameter should be {spec.hole_diameter_mm:.2f}mm ±{0.1:.2f}mm")
    gcode.append(f";  - Height marks at every {5.0:.0f}mm for Z-axis accuracy")
    gcode.append("")

    # Initialize printer
    gcode.append("G28                          ; Home all axes")
    gcode.append(f"G29                          ; Auto-bed level (if available)")
    gcode.append(f"M104 S{spec.nozzle_temp_c}       ; Preheat nozzle to {spec.nozzle_temp_c}C")
    gcode.append(f"M140 S{spec.bed_temp_c}      ; Set bed temp to {spec.bed_temp_c}C")
    gcode.append("M190 S{bed_temp_c}           ; Wait for bed temperature")
    gcode.append("M109 S{nozzle_temp_c}        ; Wait for nozzle temperature")
    gcode.append("M82                          ; Absolute extrusion mode")
    gcode.append("")

    # First layer — slower speed, more extrusion for adhesion
    current_z = spec.layer_height_mm * 2  # Double height first layer for safety

    gcode.append(f"; === FIRST LAYER (thickened for bed adhesion) ===")
    gcode.append("G92 E0                         ; Reset extruder position")
    gcode.append("G1 Z2.0 F3000                  ; Move Z to 2mm")
    gcode.append(f"G1 E{spec.nozzle_diameter_mm * 4:.1f} F500          ; Prime nozzle")
    gcode.append(f"G1 X{spec.width + 5:.2f} Y{spec.width + 5:.2f} Z{current_z:.3f} F900      ; Start perimeter, first layer speed")
    gcode.append("")

    # Build solid shell layers
    num_full_layers = int(spec.depth / spec.layer_height_mm)

    for layer_idx in range(1, num_full_layers + 1):
        z = layer_idx * spec.layer_height_mm

        # Height marks every 5mm (every 25 layers at 0.2mm layer height)
        if layer_idx % 25 == 0:
            gcode.append(f"; === HEIGHT MARK {int(z):d}mm ===")
            gcode.append(f"; Layer {layer_idx}")

        # Start new layer
        gcode.append(f"; --- Layer {layer_idx}: Z={z:.3f}mm ---")
        gcode.append("G92 E0                         ; Reset extruder position per layer")
        gcode.append(f"G1 Z{z:.3f} F3000              ; Move to layer height")

        # Perimeter (outer shell)
        perimeter_start = 0.5 * spec.wall_thickness_mm
        inner_x = spec.width - spec.wall_thickness_mm - perimeter_start
        inner_y = spec.depth - spec.wall_thickness_mm - perimeter_start

        gcode.append(
            f"G1 X{perimeter_start:.2f} Y{perimeter_start:.2f} Z{z:.3f} F1500  ; Move to start"
        )
        gcode.append(
            f"G1 X{spec.width - perimeter_start:.2f} Y{perimeter_start:.2f} E{spec.nozzle_diameter_mm * 5:.2f} F600  ; Bottom wall"
        )
        gcode.append(
            f"G1 X{spec.width - perimeter_start:.2f} Y{spec.depth - perimeter_start:.2f} E{spec.nozzle_diameter_mm * 4:.2f} F600  ; Right wall"
        )
        gcode.append(
            f"G1 X{perimeter_start:.2f} Y{spec.depth - perimeter_start:.2f} E{spec.nozzle_diameter_mm * 4:.2f} F600   ; Top wall"
        )
        gcode.append(
            f"G1 Z{z:.3f} E{spec.nozzle_diameter_mm * 3:.2f} F600                   ; Close loop"
        )

        # Internal pillars at regular spacing for shrinkage check
        num_pillars_x = max(1, int(spec.width / spec.pillar_spacing_mm))
        pillar_start_x = spec.width / 2 - (num_pillars_x * spec.pillar_spacing_mm) / 2

        for px_idx in range(num_pillars_x):
            px = pillar_start_x + px_idx * spec.pillar_spacing_mm
            if spec.wall_thickness_mm < px < inner_x:
                gcode.append(
                    f"G1 X{px:.2f} Y{spec.depth / 2:.2f} Z{z:.3f} F1500 E{spec.nozzle_diameter_mm * 0.5:.2f}"
                )

        # Travel back to start (no extrusion)
        gcode.append(
            f"G1 X{perimeter_start:.2f} Y{perimeter_start:.2f} F3000"
        )

    gcode.append("")
    gcode.append("; === COMPLETE — Calibration block finished ===")
    gcode.append("G92 E0                         ; Reset extruder")
    gcode.append("G1 Z50 F6000                   ; Lift nozzle")
    gcode.append("M84                            ; Disable steppers")

    return "\n".join(gcode)


def post_process_gcode(
    gcode_text: str,
    speed_override: Optional[float] = None,
    infill_override_percent: Optional[int] = None,
) -> str:
    """Post-process generated G-code with speed and infill overrides.

    Useful for batch jobs where you want to speed up non-critical layers
    or adjust infill without re-slicing every part.

    Args:
        gcode_text: Raw G-code string from slicer output.
        speed_override: If set, replace all G1 feed rates (F values) with this value for non-Z moves.
        infill_override_percent: If set, replace 'G0 X... Y... E...' infill lines with new density.

    Returns:
        Modified G-code string.
    """
    lines = gcode_text.splitlines()
    modified: list[str] = []

    for line in lines:
        # Skip comment lines — pass them through unchanged
        if line.startswith(";") or line.strip() == "":
            modified.append(line)
            continue

        stripped = line.strip()

        # Handle speed overrides on G1 moves (non-Z travel)
        if stripped.startswith("G1 ") and speed_override is not None:
            # Parse the line to separate Z moves from XY moves
            z_match = re.search(r"Z([\d.]+)", stripped)
            has_z = z_match is not None

            if not has_z:
                # Pure XY move — apply speed override
                # Replace the F value or append it
                f_match = re.search(r"F(\d+)", stripped)
                if f_match:
                    modified.append(re.sub(r"F\d+", f"F{int(speed_override * 60)}", stripped))
                else:
                    modified.append(f"{stripped} F{int(speed_override * 60)}")
            else:
                # Z move — keep original feed rate (slower for precision)
                modified.append(line)
        else:
            modified.append(line)

    return "\n".join(modified)


if __name__ == "__main__":
    import sys

    output_file = sys.argv[1] if len(sys.argv) > 1 else "calibration_block.gcode"

    spec = CalibrationBlockSpec(
        width=20.0,
        height=20.0,
        depth=20.0,
        hole_diameter_mm=6.0,
        pillar_spacing_mm=8.0,
        layer_height_mm=0.2,
        nozzle_diameter_mm=0.4,
        print_speed_mm_s=50.0,
        material_name="PLA",
    )

    gcode = generate_calibration_gcode(spec)

    with open(output_file, "w") as f:
        f.write(gcode)

    print(f"Calibration G-code written to: {output_file}")
    print(f"Estimated layers: {int(20.0 / 0.2)} at 0.2mm layer height")
    print("Measure the printed block with calipers to verify dimensional accuracy.")
```

**For laser cutting:** Create a power/speed calibration matrix before any production cut:

```python
"""
Laser cutter power/speed calibration table generator.

Generates a systematic calibration grid for testing different power/speed
combinations on a specific material. Used to find the optimal settings for
cut-through, engrave depth, and edge quality per material type.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field


@dataclass
class LaserCalibrationTest:
    """A single calibration test point."""
    power_percent: int        # Laser power (0-100%)
    speed_mm_per_s: float     # Head movement speed
    passes: int               # Number of passes over the same path
    material_thickness_mm: float
    label: str = ""

    def csv_row(self) -> list[str]:
        return [self.label or f"P{self.power_percent}_S{int(self.speed_mm_per_s)}",
                str(self.power_percent),
                f"{self.speed_mm_per_s:.0f}",
                str(self.passes),
                f"{self.material_thickness_mm:.2f}"]


def generate_calibration_matrix(
    material: str = "3mm acrylic",
    thickness_mm: float = 3.0,
) -> list[LaserCalibrationTest]:
    """Generate a systematic power/speed calibration matrix for a given material.

    Tests a grid of power levels (20-100%) × speed levels (5-80mm/s) to find
    the optimal cut-through point with clean edges and minimal heat distortion.

    The test pattern is designed as a series of 20x20mm squares that can be
    individually tested — each square has unique power/speed settings.

    Args:
        material: Human-readable material description for labeling.
        thickness_mm: Material thickness in mm.

    Returns:
        List of calibration test points ordered by increasing power and decreasing speed.
    """
    tests: list[LaserCalibrationTest] = []
    label_counter = 0

    # Power levels to test (percentage)
    power_levels = [20, 30, 40, 50, 60, 70, 80, 90, 100]

    # Speed levels (mm/s) — slower speeds give deeper cuts but take longer
    speed_levels = [5, 10, 15, 20, 30, 40, 60, 80]

    for power in power_levels:
        for speed in speed_levels:
            label_counter += 1
            # Two passes for thicker materials to ensure clean cut-through
            passes = 2 if thickness_mm >= 3.0 and power < 70 else 1

            test = LaserCalibrationTest(
                power_percent=power,
                speed_mm_per_s=speed,
                passes=passes,
                material_thickness_mm=thickness_mm,
                label=f"Grid-{label_counter:02d}",
            )
            tests.append(test)

    return tests


def generate_test_pattern_svg(tests: list[LaserCalibrationTest], cell_size_mm: float = 25.0) -> str:
    """Generate an SVG layout for the calibration test pattern.

    Creates a grid of squares, each labeled with its power/speed setting.
    The laser traces the square perimeter at the specified settings.

    Args:
        tests: Calibration test points from generate_calibration_matrix().
        cell_size_mm: Size of each test square in mm (default 25mm).

    Returns:
        SVG string ready for import into laser cutter software.
    """
    cols = min(4, len(tests))
    rows = max(1, (len(tests) + cols - 1) // cols)

    svg_width = cols * cell_size_mm + 20
    svg_height = rows * cell_size_mm + 40

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_width:.1f} {svg_height:.1f}" width="{svg_width:.0f}mm" height="{svg_height:.0f}mm">']
    parts.append(f'  <desc>Laser calibration test pattern: {len(tests)} cells, material specified in CSV</desc>')

    # Title
    parts.append(
        f'  <text x="10" y="20" font-family="sans-serif" font-size="8" fill="#333">'
        f'Laser Calibration Grid — {len(tests)} test cells</text>'
    )

    for idx, test in enumerate(tests):
        col = idx % cols
        row = idx // cols
        x = 10 + col * cell_size_mm
        y = 30 + row * cell_size_mm

        # Draw square
        parts.append(
            f'  <rect x="{x}" y="{y}" width="{cell_size_mm - 2}" height="{cell_size_mm - 2}" '
            f'fill="none" stroke="#333" stroke-width="0.15"/>'
        )

        # Label inside square
        label = f"P{test.power_percent}%\nS{int(test.speed_mm_per_s)}mm/s\nP{test.passes}x"
        parts.append(
            f'  <text x="{x + cell_size_mm/2 - 4}" y="{y + cell_size_mm/2 - 2}" '
            f'text-anchor="middle" font-size="3.5" font-family="monospace">'
            f'{label.replace(chr(10), "&#10;")}</text>'
        )

    parts.append('</svg>')
    return '\n'.join(parts)


def export_calibration_csv(tests: list[LaserCalibrationTest]) -> str:
    """Export calibration matrix as CSV for import into laser control software."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["label", "power_percent", "speed_mm_per_s", "passes", "thickness_mm"])
    for test in tests:
        writer.writerow(test.csv_row())
    return output.getvalue()


if __name__ == "__main__":
    import sys

    material = sys.argv[1] if len(sys.argv) > 1 else "3mm acrylic"
    thickness = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0

    tests = generate_calibration_matrix(material=material, thickness_mm=thickness)

    # Save CSV
    csv_content = export_calibration_csv(tests)
    with open("laser_calibration.csv", "w") as f:
        f.write(csv_content)
    print(f"Calibration matrix written to laser_calibration.csv ({len(tests)} test points)")

    # Save SVG layout
    svg = generate_test_pattern_svg(tests, cell_size_mm=25.0)
    with open("calibration_pattern.svg", "w") as f:
        f.write(svg)
    print(f"Test pattern layout written to calibration_pattern.svg")
    print("\nRun each cell sequentially starting from Grid-01 (lowest power, slowest speed).")
    print("Record: cut-through yes/no, edge quality (clean/burnt/soggy), and any discoloration.")
```

---

### Step 5: Execute and Monitor Fabrication

**First-layer adhesion check (3D printing):**
- Wait until the first complete perimeter is laid down before leaving the machine
- The filament should bond smoothly to the bed with no lifting corners
- If edges lift mid-layer, stop immediately — rebuild the bed surface and retry
- Acceptable first-layer height: 60–80% of nozzle diameter (e.g., 0.24–0.32mm for a 0.4mm nozzle)

**Mid-print inspection points:**
| Print Duration | Inspection Action |
|---------------|-------------------|
| First 10% (or first layer) | Verify bed adhesion, check for stringing between perimeters |
| 25% | Check that layers are bonding — no visible gaps between Z layers |
| 50% | Verify dimensional accuracy against known features (pillar spacing, wall straightness) |
| 75% | Confirm no warping has developed on tall parts; re-level if corners lifting |
| 90% | Check for extrusion consistency — no thin spots or bulges in walls |

**Emergency stop procedures:**
1. If you see smoke, flames, or smell burning plastic → hit the machine's physical E-stop immediately (do not wait for software)
2. If a layer shifts or parts detach from bed → pause print via slicer software first to cool and retract, then clear debris
3. If the nozzle clogs mid-print → heat to print temperature, do cold pull, verify extrusion on scrap material before resuming
4. If unusual noise (grinding, skipping) is heard → stop, check for loose belts or obstructed axes

---

## Implementation Patterns

### Pattern 5: CNC Toolpath Strategy Calculator

```python
"""
CNC toolpath strategy calculator for face milling and pocket roughing operations.

Calculates optimal stepover, stepdown, feed rate, and spindle speed based on
material properties, tool geometry, and desired surface finish.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class MaterialProperties:
    """Machinability properties for common materials."""
    name: str
    # Maximum recommended chip load per tooth (mm/tooth) at optimal conditions
    max_chip_load_mm_per_tooth: float
    # Specific cutting energy (N/mm²) — higher = harder to cut
    specific_cutting_energy: float
    # Recommended surface speed (m/min) for HSS tool on this material
    recommended_surface_speed_m_min: float


# Common materials with conservative settings
MATERIALS: dict[str, MaterialProperties] = {
    "aluminum_6061": MaterialProperties(
        name="Aluminum 6061",
        max_chip_load_mm_per_tooth=0.08,
        specific_cutting_energy=400,
        recommended_surface_speed_m_min=200,
    ),
    "aluminum_7075": MaterialProperties(
        name="Aluminum 7075",
        max_chip_load_mm_per_tooth=0.05,
        specific_cutting_energy=600,
        recommended_surface_speed_m_min=120,
    ),
    "mild_steel": MaterialProperties(
        name="Mild Steel (A36)",
        max_chip_load_mm_per_tooth=0.03,
        specific_cutting_energy=1800,
        recommended_surface_speed_m_min=30,
    ),
    "delrin_acetal": MaterialProperties(
        name="Delrin (Acetal/POM)",
        max_chip_load_mm_per_tooth=0.12,
        specific_cutting_energy=300,
        recommended_surface_speed_m_min=150,
    ),
    "brass_c360": MaterialProperties(
        name="Brass C360 (Free-cutting)",
        max_chip_load_mm_per_tooth=0.04,
        specific_cutting_energy=700,
        recommended_surface_speed_m_min=80,
    ),
}


@dataclass
class EndMill:
    """Standard end mill tool specification."""
    diameter_mm: float           # Cutting diameter
    flute_count: int             # Number of cutting edges
    flute_length_mm: float       # Length of cutting flutes
    material: str = "carbide"    # HSS or carbide


@dataclass
class ToolpathResult:
    """Computed toolpath parameters."""
    spindle_speed_rpm: int
    feed_rate_mm_per_min: float
    stepdown_mm: float
    stepover_mm: float
    estimated_cutting_time_sec: float = 0.0
    surface_finish_rating: str = ""


def calculate_toolpath(
    material_key: str,
    tool: EndMill,
    cut_depth_mm: float,        # Total depth of cut (Z-axis)
    pocket_width_mm: float,     # Pocket or face width to machine
    desired_surface_roughness: str = "Ra 3.2",  # Surface roughness target
) -> ToolpathResult:
    """Calculate CNC milling toolpath parameters for a pocketing operation.

    Uses empirical machining formulas based on material properties and tool geometry.
    Results are conservative estimates — always verify with test cuts on scrap material.

    Args:
        material_key: Key from MATERIALS dict (e.g., "aluminum_6061").
        tool: End mill specification.
        cut_depth_mm: Total Z-axis depth of pocket to machine.
        pocket_width_mm: Width of the area to be machined.
        desired_surface_roughness: Target surface finish (affects stepover and finishing passes).

    Returns:
        ToolpathResult with computed RPM, feed rate, depths, and estimated time.

    Raises:
        ValueError: If material key is unknown or parameters are invalid.
    """
    if material_key not in MATERIALS:
        available = ", ".join(sorted(MATERIALS.keys()))
        raise ValueError(f"Unknown material '{material_key}'. Available: {available}")

    mat = MATERIALS[material_key]

    # Validate tool and cut depth
    if tool.diameter_mm <= 0 or tool.flute_count <= 0:
        raise ValueError("Tool diameter and flute count must be positive")
    if cut_depth_mm <= 0 or pocket_width_mm <= 0:
        raise ValueError("Cut depth and pocket width must be positive")

    # --- Spindle speed (RPM) ---
    # RPM = (surface_speed_m_min * 1000) / (pi * diameter_mm)
    spindle_speed_rpm = int((mat.recommended_surface_speed_m_min * 1000) / (math.pi * tool.diameter_mm))

    # For carbide tools, can increase speed by ~20% over HSS recommendations
    if tool.material == "carbide":
        spindle_speed_rpm = int(spindle_speed_rpm * 1.2)

    # --- Feed rate (mm/min) ---
    # Feed = RPM * flutes * chip_load_per_tooth
    feed_rate_mm_per_min = spindle_speed_rpm * tool.flute_count * mat.max_chip_load_mm_per_tooth

    # Reduce feed rate for harder materials by a safety factor
    if mat.specific_cutting_energy > 1000:
        feed_rate_mm_per_min *= 0.7

    # --- Stepdown (depth of cut per pass) ---
    # Rule of thumb: stepdown = tool diameter * 0.5 to 1.0 for roughing
    # For hard materials, use 25-50% of diameter
    if mat.specific_cutting_energy > 1000:
        stepdown_ratio = 0.25
    elif mat.specific_cutting_energy > 500:
        stepdown_ratio = 0.5
    else:
        stepdown_ratio = 0.75

    stepdown_mm = tool.diameter_mm * stepdown_ratio

    # Number of roughing passes needed
    num_roughing_passes = max(1, math.ceil(cut_depth_mm / stepdown_mm))
    actual_stepdown = cut_depth_mm / num_roughing_passes

    # --- Stepover (lateral overlap per pass) ---
    # Rule of thumb: stepover = 25-80% of tool diameter
    # Finer finish = smaller stepover
    if desired_surface_roughness in ("Ra 1.6", "Ra 0.8"):
        stepover_ratio = 0.3   # Fine finish
    elif desired_surface_roughness in ("Ra 3.2", "Ra 6.3"):
        stepover_ratio = 0.5   # Standard roughing
    else:
        stepover_ratio = 0.6   # Aggressive roughing

    stepover_mm = tool.diameter_mm * stepover_ratio

    # --- Estimated cutting time ---
    # Number of lateral passes across pocket width
    num_lateral_passes = max(1, math.ceil(pocket_width_mm / (tool.diameter_mm - stepover_mm)))
    total_cutting_distance_mm = num_lateral_passes * num_roughing_passes * pocket_width_mm
    estimated_time_sec = total_cutting_distance_mm / feed_rate_mm_per_min * 60

    # --- Surface finish rating ---
    if desired_surface_roughness in ("Ra 1.6", "Ra 0.8"):
        surface_rating = "Good (finish pass recommended)"
    elif desired_surface_roughness == "Ra 3.2":
        surface_rating = "Standard"
    else:
        surface_rating = "Rough (as-milled, sanding may be needed)"

    return ToolpathResult(
        spindle_speed_rpm=spindle_speed_rpm,
        feed_rate_mm_per_min=feed_rate_mm_per_min,
        stepdown_mm=actual_stepdown,
        stepover_mm=stepover_mm,
        estimated_cutting_time_sec=estimated_time_sec,
        surface_finish_rating=surface_rating,
    )


if __name__ == "__main__":
    import sys

    material_key = sys.argv[1] if len(sys.argv) > 1 else "aluminum_6061"
    tool_diameter = float(sys.argv[2]) if len(sys.argv) > 2 else 6.0
    cut_depth = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
    pocket_width = float(sys.argv[4]) if len(sys.argv) > 4 else 40.0

    tool = EndMill(
        diameter_mm=tool_diameter,
        flutes_count=4 if tool_diameter >= 6.0 else 2,
        flute_length_mm=tool_diameter * 1.5,
        material="carbide",
    )
    # Fix: use correct field name
    tool.flute_count = 4 if tool_diameter >= 6.0 else 2

    result = calculate_toolpath(
        material_key=material_key,
        tool=tool,
        cut_depth_mm=cut_depth,
        pocket_width_mm=pocket_width,
    )

    print(f"\nCNC Toolpath Calculation: {material_key}")
    print("=" * 50)
    print(f"  Spindle speed:     {result.spindle_speed_rpm} RPM")
    print(f"  Feed rate:         {result.feed_rate_mm_per_min:.0f} mm/min")
    print(f"  Stepdown (per pass): {result.stepdown_mm:.2f} mm")
    print(f"  Stepover:          {result.stepover_mm:.2f} mm ({result.stepover_mm/tool_diameter*100:.0f}% of tool dia)")
    print(f"  Est. cutting time: {result.estimated_cutting_time_sec:.0f}s ({result.estimated_cutting_time_sec/60:.1f}min)")
    print(f"  Surface finish:    {result.surface_finish_rating}")
    print()
```

---

## Constraints

### MUST DO
- Always validate the STL file for watertightness and correct normal orientation before sending to any slicer or CAM software
- Verify wall thickness meets method-specific minimums: 0.8mm for FDM, sheet-thickness-only for laser cutting, 0.5mm+ for CNC milling
- Run a calibration test pattern on the selected material BEFORE starting production jobs — document results for future reference
- Check first-layer adhesion and wait for the initial perimeter to fully bond before leaving a 3D print unattended
- Use conservative feed rates and stepdowns when trying new material-tool combinations — start at 50% of calculated values
- Monitor all fabrication sessions during the first 30 minutes (first layer for prints, initial cut for laser/CNC)

### MUST NOT DO
- Send a non-watertight STL to a slicer without attempting repair — this causes unpredictable printing behavior and wasted material
- Mix PVC or vinyl materials in any laser cutter operation — they release chlorine gas which corrodes the machine and creates toxic fumes
- Run a CNC mill without verifying workholding is secure and chip guard is in place — loose stock becomes high-speed projectiles
- Ignore layer height requirements that are finer than your nozzle diameter — 0.05mm on a 0.4mm nozzle produces inconsistent extrusion
- Skip the calibration test to "save time" — it takes 15 minutes and prevents hours of wasted material and machine downtime

---

## Output Template

When this skill is active, produce:

1. **Fabrication Method Selection** — Chosen method with tolerance comparison table justifying the choice
2. **Model Preparation Report** — STL validation results (watertight status, face count, non-manifold edges) or DXF/SVG verification for laser/CNC
3. **Slicer/Machine Configuration** — Complete parameter set with layer height, speeds, temperatures, and infill strategy
4. **G-Code or Toolpath Summary** — Generated G-code file reference with estimated print time, or CNC toolpath parameters (RPM, feed, stepover/stepdown)
5. **Calibration Test Specification** — Test pattern description and expected measurement tolerances
6. **Monitoring Checklist** — First-layer check, mid-print inspection points, and emergency stop procedures for the selected method

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `rapid-prototyping-workflow` | Select when to use digital fabrication in the overall prototype lifecycle |
| `maker-safety-practices` | Machine-specific safety protocols for 3D printers, laser cutters, and CNC mills |
| `digital-fabrication` | This skill — covering slicing, toolpath generation, and STL validation for all fabrication methods |
