---
name: gof-singleton-pattern
description: Implements the Singleton design pattern ensuring a class has only one instance while providing a global point of access to it.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: architecture
  triggers: singleton pattern, ensure single instance, global access, gof patterns
  role: implementation
  scope: implementation
  output-format: code
  related-skills: gof-factory-pattern, gof-strategy-pattern
---

# Singleton Pattern

  archetypes: implementation, educational
  anti_triggers: allowing multiple instances
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical



Implements the Singleton design pattern ensuring a class has only one instance while providing a global point of access to it.

## When to Use

The When to Use section should detail under what circumstances this skill is applicable by incorporating the following:

### Archetypes
- **Implementation**: Aims to guide developers in implementing the Singleton pattern effectively.
- **Educational**: Educates the user on the implications and benefits of the Singleton pattern in their projects.

### Anti-Triggers
- **Allowing multiple instances**: This skill should avoid contexts where discussions around multiple instances occur without justification.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical


- When exactly one instance of a class is needed.
- When it’s critical to control the access to that instance globally.
- When the instance should run in a multithreaded environment without data corruption.

## Core Workflow
1. **Define the Class**: Create a private constructor to prevent direct initialization.
2. **Static Method**: Implement a static method that provides access to the instance, creating it if necessary.
3. **Provide Thread Safety**: Ensure the method is thread-safe to prevent multiple instances in concurrent environments.

## Implementation Patterns
### Thread-Safe Singleton Pattern

```go
package main

import (
    "sync"
)

type singleton struct {
    // example resource
    resource string
}

var instance *singleton
var once sync.Once

// GetInstance returns the single instance of the singleton class
func GetInstance() *singleton {
    once.Do(func() {
        instance = &singleton{resource: "Initialized Resource"}
    })
    return instance
}
```

### Example Usage

```go
package main

import (
    "fmt"
)

func main() {
    firstInstance := GetInstance()
    fmt.Println(firstInstance.resource)  // Output: Initialized Resource

    secondInstance := GetInstance()
    fmt.Println(firstInstance == secondInstance)  // Output: true
}
```

## Constraints
### MUST DO
- Ensure only one instance is created throughout the application.
- Initialize the instance lazily (only when it’s needed).

### MUST NOT DO
- Allow public instantiation of the class.
- Create new instances within your application logic directly.