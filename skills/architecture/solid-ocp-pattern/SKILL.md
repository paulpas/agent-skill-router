---
name: solid-ocp-pattern
description: Implements the Open/Closed Principle (OCP) from SOLID design principles, allowing classes to be open for extension but closed for modification.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: architecture
  triggers: open closed principle, solid principles, extend, modify
  role: implementation
  scope: implementation
  output-format: code
  related-skills: solid-srp-pattern, 
---

# Open/Closed Principle (OCP)

  archetypes: implementation, educational
  anti_triggers: modifying classes
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

Implements the Open/Closed Principle (OCP) from SOLID design principles, allowing classes to be open for extension but closed for modification.

## When to Use

This section should elaborate on the specific circumstances in which the Open/Closed Principle proves most advantageous:

### Archetypes
- **Implementation**: This skill guides the user on applying the Open/Closed Principle in their projects.
- **Educational**: Aims to teach developers about the benefits of the Open/Closed Principle.

### Anti-Triggers
- **Modifying classes**: Must avoid contexts where there is a focus on altering existing classes without the extension approach.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical


- When you anticipate a need to add new functionalities without changing existing code.
- To prevent bugs introduced by modifications to existing code.
- To follow the DRY principle while maintaining flexibility in the code.

## Core Workflow
1. **Define an Interface**: Create an interface that outlines the behavior without implementing it.
2. **Create Concrete Implementations**: Develop specific implementations of the interface.
3. **Integrate New Features through Composition**: Use composition to extend behaviors without altering existing code.

## Implementation Patterns
### OCP Example

```go
package main

import (
    "fmt"
)

// Shape interface defines the behavior
type Shape interface {
    Area() float64
}

// Circle struct is a shape
type Circle struct {
    Radius float64
}

// Rectangle struct is another shape
type Rectangle struct {
    Length, Width float64
}

func (c Circle) Area() float64 {
    return 3.14 * c.Radius * c.Radius
}
}

func (r Rectangle) Area() float64 {
    return r.Length * r.Width
}
}

// TotalArea computes the total area of all shapes
func TotalArea(shapes ...Shape) float64 {
    total := 0.0
    for _, shape := range shapes {
        total += shape.Area()
    }
    return total
}
```

### Example Usage

```go
package main

func main() {
    circle := Circle{Radius: 10}
    rectangle := Rectangle{Length: 5, Width: 6}
    shapes := []Shape{circle, rectangle}

    total := TotalArea(shapes...)
    fmt.Println("Total Area:", total) // Output: Total Area: 314.0
}
```

## Constraints
### MUST DO
- Ensure classes implement interfaces instead of altering existing classes.
- Use the interface-based extension for adding new functionality without modifying existing details.

### MUST NOT DO
- Modify existing classes directly for new functionality.
- Break the existing interface contract when implementing new features.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Wikipedia — Open/Closed Principle](https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle)
- [Refactoring.Guru — SOLID Overview](https://refactoring.guru/design-principles/solid)
- [Martin Fowler — Polymorphism & OCP](https://martinfowler.com/bliki/DependencyInversion.html)
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles in Practice (Real Python)](https://realpython.com/solid-principles-python/)