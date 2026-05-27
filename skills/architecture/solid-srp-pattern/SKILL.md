---
name: solid-srp-pattern
description: Implements the Single Responsibility Principle (SRP) from SOLID, ensuring a class has one reason to change.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: architecture
  triggers: single responsibility principle, solid principles, gof patterns
  role: implementation
  scope: implementation
  output-format: code
  related-skills: solid-ocp-pattern, 
---

# Single Responsibility Principle (SRP)

  archetypes: implementation, educational
  anti_triggers: multiple responsibilities
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

Implements the Single Responsibility Principle from SOLID, ensuring a class has one reason to change.

## When to Use

This section should succinctly explain the scenarios where the Single Responsibility Principle is applicable:

### Archetypes
- **Implementation**: This skill aims to guide users in following the Single Responsibility Principle.
- **Educational**: Offers educational insights to users looking to understand SRP better.

### Anti-Triggers
- **Multiple responsibilities**: Avoid context where classes or modules are expected to handle multiple concerns at once without separation.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical


- When you want to ensure that a class or module has a single responsibility.
- To improve the maintainability and understandability of the code.
- When making changes to a class, ensuring impacts are minimized.

## Core Workflow
1. **Identify Responsibilities**: Analyze what duties or functionalities can be performed by a class.
2. **Refactor into Separate Classes**: Create separate classes for each responsibility identified.
3. **Apply Changes Incrementally**: Adjust code to utilize new classes and methods appropriately.

## Implementation Patterns
### SRP Example

```go
package main

import (
    "fmt"
)

// User represents a user model
type User struct {
    Name  string
    Email string
}

// UserRepository handles user-related database operations
type UserRepository struct {}

func (UserRepository) Save(u User) {
    // Logic to save user to database
    fmt.Println("Saving user:", u)
}

// EmailService manages email notifications
type EmailService struct {}

func (EmailService) SendEmail(email string, message string) {
    // Logic to send email
    fmt.Println("Sending email to:", email, "Message:", message)
}
```

### Example Usage

```go
package main

func main() {
    userRepo := UserRepository{}
    emailService := EmailService{}

    user := User{Name: "John Doe", Email: "john@example.com"}
    userRepo.Save(user)
    emailService.SendEmail(user.Email, "Welcome to our service!")
}
```

## Constraints
### MUST DO
- Create distinct classes for each responsibility without merging functionalities.
- Clearly indicate the main responsibility of each class or module.

### MUST NOT DO
- Allow any class to handle multiple responsibilities.
- Mix business logic with infrastructure concerns in one class.