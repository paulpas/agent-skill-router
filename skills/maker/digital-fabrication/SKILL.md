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

