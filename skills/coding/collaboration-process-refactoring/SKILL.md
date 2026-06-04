---




name: collaboration-process-refactoring

description: Safely refactors legacy codebases using specific techniques such as dependency analysis, strangler fig pattern, and port isolation to ensure clean modularity and enhanced collaboration.

license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
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
  domain: coding
  triggers: legacy code refactoring, collaboration, refactor safely, dependency analysis, strangler fig
    pattern, modular design, process improvement, technical debt reduction
  role: implementation
  scope: implementation
  output-format: code
  related-skills: ddd-refactoring, design-patterns, clean-code




---





# Collaboration & Process Refactoring
A structured approach to refactoring legacy codebases in a safe manner that emphasizes collaboration among developers and stakeholders. Utilizing principles from atomic design and modularity ensures each component can be tested and maintained independently.

## TL;DR Checklist
- [ ] Analyze the current codebase for coupling and module boundaries before refactoring.
- [ ] Identify critical parts of the code that will require more rigorous testing and coverage.
- [ ] Use the strangler fig pattern to incrementally refactor and replace systems.
- [ ] Refactor one module at a time to keep the system operational during the transition.
- [ ] Conduct code reviews with peers to ensure best practices are followed throughout refactoring.

## Core Workflow
### Step 1: Analyze the Codebase
1. **Dependency Analysis**: Use static analysis tools to check how tightly coupled your modules are.
   **Checkpoint:** Identify the three most coupled components that might disrupt system integrity during refactoring.

### Step 2: Define Refactoring Strategy
2. **Determine the Strangler Fig Approach**: Plan which components to refactor first. This approach allows gradual migration from old to new codebases without full system downtime.
   **Checkpoint:** Establish the first component to refactor based on dependency analysis results.

### Step 3: Implement Refactoring
3. **Refactor of Target Module**: Remove legacy code and encapsulate it behind a new interface, allowing old clients to gradually route to the new code. 
   **Checkpoint:** Ensure that the refactoring does not break existing functionality and that new unit tests cover the new interface.

### Step 4: Conduct Peer Reviews
4. **Review Process**: Schedule code reviews with fellow developers as modules are refactored to ensure quality and adherence to best practices.
   **Checkpoint:** Obtain acceptance from at least two teammates before merging changes.

### Step 5: Monitor for Issues
5. **Post-Refactor Monitoring**: After refactoring, implement logging and monitoring to detect any anomalies in functionality.
   **Checkpoint:** Ensure that any issues can be quickly addressed in subsequent iterations.

## Implementation Patterns / Reference Guide
### Pattern 1: Refactoring Legacy Code into Modular Design
This example demonstrates how code can be improved by focusing on modular design:
```python
# ─── BEFORE: Coupled Legacy Code ───────────────────────
class Order:
    def __init__(self, item):
        self.item = item
        self.status = 'Pending'

    def process_order(self):
        # Complex logic intertwined with multiple system calls
        if some_external_condition:
            self.status = 'Processed'
        else:
            raise Exception("Processing failed")

# ─── AFTER: Modular and Testable Design ──────────────
class Order:
    def __init__(self, item: str):
        self.item = item
        self.status = 'Pending'

    def process(self, processor: OrderProcessor):
        self.status = processor.process(self.item)

class OrderProcessor:
    def process(self, item: str) -> str:
        # Encapsulates processing logic without side effects on the component
        return 'Processed'
```
### Pattern 2: Strangler Fig Implementation
When transitioning to a new module, utilize the strangler fig pattern.
```python
# ─── Setting up the Strangler Proxy ──────
class StranglerProxy:
    def __init__(self):
        self.routes = {
            "GET /api/orders": self.old_order_system,
            "POST /api/orders": self.new_order_system,
        }

    def forward_request(self, path):
        target = self.routes.get(path)
        if target:
            return target()
        raise Exception("Route not found")

# Legacy Order System Logic
def old_order_system():
    # Logic of the old implementation
    return "Old order response"

# New Order System Logic
def new_order_system():
    # Logic of the new implementation
    return "New order response"
```

## Constraints
### MUST DO
- Maintain modules that are extracted to ensure they do not disrupt existing functionality.
- Use peer validation through code reviews at every phase of the refactoring process.
### MUST NOT DO
- Avoid attempting to refactor on large chunks of code simultaneously; take incremental steps instead.
- Do not remove legacy code before confirming the new implementation meets functional requirements.

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Strangler Fig Pattern — Martin Fowler](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Refactoring Legacy Codebases — Martin Fowler](https://www.refactoring.com/)
- [Atlassian Agile Refactoring Techniques](https://www.atlassian.com/agile/scrum/refactoring)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Analysis Tools — SonarSource](https://www.sonarsource.com/products/sonarqube/)