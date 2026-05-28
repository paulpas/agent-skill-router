---
name: gof-strategy-pattern
description: Implements the Strategy design pattern allowing the definition of a family of algorithms, encapsulating each one, and making them interchangeable.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: architecture
  triggers: strategy pattern, encapsulate algorithms, interchangeable algorithms, gof patterns
  role: implementation
  scope: implementation
  output-format: code
  related-skills: gof-factory-pattern, 
---

# Strategy Pattern

Implements the Strategy design pattern allowing the definition of a family of algorithms, encapsulating each one, and making them interchangeable.

## When to Use

The When to Use section should outline the scenarios where the Strategy pattern is particularly beneficial:

### Archetypes
- **Implementation**: This skill is aimed at implementation to assist developers in applying the Strategy pattern correctly.
- **Educational**: It serves as an educational resource, helping users understand when to use the Strategy pattern.

### Anti-Triggers
- **Coupling algorithms**: It should prevent triggering in scenarios where algorithms are tightly coupled, negating benefits.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical



  archetypes: implementation, educational
  anti_triggers: coupling algorithms
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
- When different variants of an algorithm are needed.
- When the choice of the algorithm should be independent of clients that use it.
- When you want to avoid using conditionals to switch between algorithms.

## Core Workflow
1. **Define the Strategy Interface**: Create a common interface for all strategies.
2. **Implement Concrete Strategies**: Create concrete classes that implement the strategy interface.
3. **Context Class**: Maintain a reference to a strategy object to delegate behavior.

## Implementation Patterns
### Strategy Pattern Example

```go
package main

import (
    "fmt"
)

// Strategy interface
type Strategy interface {
    Execute(int, int) int
}

// Concrete strategy: Addition
type Add struct {}

func (Add) Execute(a int, b int) int {
    return a + b
}
}

// Concrete strategy: Subtraction
type Subtract struct {}

func (Subtract) Execute(a int, b int) int {
    return a - b
}
}

// Context
type Context struct {
    strategy Strategy
}

func (c *Context) SetStrategy(s Strategy) {
    c.strategy = s
}

func (c *Context) ExecuteStrategy(a, b int) int {
    return c.strategy.Execute(a, b)
}
```

### Example Usage

```go
package main

import (
    "fmt"
)

func main() {
    context := &Context{}

    // Using Addition Strategy
    context.SetStrategy(Add{})
    fmt.Println(context.ExecuteStrategy(5, 3)) // Output: 8

    // Using Subtraction Strategy
    context.SetStrategy(Subtract{})
    fmt.Println(context.ExecuteStrategy(5, 3)) // Output: 2
}
```

## Constraints
### MUST DO
- Define clear interfaces for strategies to promote encapsulation.
- Ensure clients are decoupled from specific strategy implementations.

### MUST NOT DO
- Coupling algorithms within the context class itself.
- Hardcoding specific strategy instantiation within client code.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Refactoring.Guru — Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [GoF Design Patterns (Gamma et al.) — Addison-Wesley](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Strategy Pattern in Python (Real Python)](https://realpython.com/strategy-pattern-python/)
- [Martin Fowler — Strategy Pattern](https://martinfowler.com/articles/nonOOlisp.html)
- [Java Strategy Pattern (Baeldung)](https://www.baeldung.com/java-strategy-pattern)