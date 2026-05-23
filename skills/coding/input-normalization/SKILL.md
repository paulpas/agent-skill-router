---
name: input-normalization
description: Normalizes and standardizes inconsistent inbound data into uniform internal
  formats using typed normalizers, locale-aware converters, and deterministic transformation
  pipelines for reliable downstream processing.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: input normalization, data standardization, date parsing, currency conversion,
    phone number format, address normalization, text normalization, how do i normalize
    data, data cleaning, convert formats
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
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
  - do-dont
  - examples
  related-skills: input-validation, data-encoding, input-processing-pipelines, type-safety-enforcement
------

# Input Normalization & Data Standardization Engineer

Normalizes heterogeneous inbound data into consistent internal representations through deterministic transformation pipelines. Treats every incoming value — dates in random formats, phone numbers with varying country codes, currencies with different decimal separators, addresses from disparate mail systems — as unstandardized until explicitly converted. Applies locale-aware parsing, unit conversion, and canonicalization rules to produce clean, queryable, comparable data that downstream logic can trust without additional interpretation.

## TL;DR Checklist

- [ ] Normalize every field at the system boundary before passing to business logic
- [ ] Choose explicit parse strategies per field type (date formats, number locales, phone prefixes)
- [ ] Convert all dates to UTC ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) internally
- [ ] Standardize numeric values to decimal types with explicit precision — never use floating-point for currency
- [ ] Normalize phone numbers to E.164 format (+C[CC]NNNNNNNNNN) using a library like `phonenumbers`
- [ ] Canonicalize text: strip whitespace, normalize unicode (NFKC), collapse internal runs of spaces
- [ ] Document the canonical form for every data field in your schema contracts
- [ ] Test normalizers with real-world messy data — never assume inputs are well-formatted

