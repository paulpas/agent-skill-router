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

