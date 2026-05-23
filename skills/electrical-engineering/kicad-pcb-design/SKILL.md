---
name: kicad-pcb-design
description: Implements modern KiCad 9+ PCB design workflows covering schematic capture,
  component library management, controlled-impedance layout, EMC-aware routing, DRC
  validation, and fabrication file generation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: electrical-engineering
  triggers: PCB design, KiCad, printed circuit board, schematic capture, signal integrity,
    impedance control, how do i design a circuit board, EMC compliance
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
  - examples
  - config
  - diagrams
  related-skills: electrical-engineering-hardware-debugging, electrical-engineering-component-selection
------

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

