---
name: python-package-publishing
description: Builds, verifies, and publishes Python packages with hatchling, hatch-vcs
  dynamic versioning, twine checks, test pypi, and GitHub Actions release CI/CD.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: python package, publish to pypi, how do i publish a python package, build
    wheel sdist, pyproject.toml hatchling, twine check, test pypi, github actions
    release
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
  - config
  - examples
  - do-dont
  related-skills: coding/python-module-structure, modern-python-development, coding/software-delivery-pipelines
------

# Python Package Publishing Engine

Builds, verifies, and publishes production-ready Python packages using hatchling as the build backend, hatch-vcs for git-tag-driven dynamic versioning, twine for pre-upload verification, and GitHub Actions for automated release CI/CD. Handles wheel and sdist distribution creation, CLI entry points, optional dependency groups, and native extension builds.

## TL;DR Checklist

- [ ] Set `[build-system]` to `hatchling` with `requires-python >= 3.10`
- [ ] Configure `hatch-vcs` for git-tag-driven dynamic versioning — never hardcode versions
- [ ] Run `python -m build` to produce both `.whl` and `.tar.gz` artifacts
- [ ] Verify every artifact with `twine check dist/*` before uploading
- [ ] Publish to TestPyPI first with `twine upload --repository testpypi dist/*`, then PyPI
- [ ] Define CLI entry points under `[project.scripts]` for console commands
- [ ] Group optional dependencies under `[project.optional-dependencies]`
- [ ] Configure native extension build in `hatch_build.py` when C/C++/Rust extensions are needed

