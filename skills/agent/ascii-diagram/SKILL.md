---
name: ascii-diagram
description: Generates clear, readable ASCII diagrams in Excalidraw-style for flowcharts, sequence diagrams, and state diagrams to visualize processes, interactions, and system states.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: ascii diagram, excalidraw style, flowchart, sequence diagram, state diagram, diagram generation, visual explanation, process flow, system architecture
  role: implementation
  scope: implementation
  output-format: code
  related-skills: code-review, documentation, feature-research
---

# ASCII Diagram Generator (Excalidraw Style)

Creates clean, readable ASCII diagrams that mimic the visual style of Excalidraw for technical documentation, architecture visualization, and process explanation.

## When to Use

Use this skill when:

- Explaining complex processes or workflows to team members
- Documenting system architecture or data flows
- Creating visual representations for technical specifications
- Illustrating user interactions or API call sequences
- Visualizing state machines or application states
- Needing lightweight, text-based diagrams that work anywhere (Markdown, terminals, etc.)

## Core Workflow

1. **Identify Diagram Type** — Determine if you need a flowchart, sequence diagram, or state diagram based on what you're visualizing
2. **Define Elements** — List all components, actors, states, or steps that need to be included
3. **Establish Relationships** — Map out how elements connect, interact, or transition between each other
4. **Apply Styling Conventions** — Use consistent box styles, arrow types, and spacing for clarity
5. **Review for Readability** — Ensure the diagram is understandable at a glance with proper alignment and labeling

## Implementation Patterns

### Pattern 1: Flowchart Diagrams

Use rounded boxes for processes, diamonds for decisions, and parallelograms for input/output.

```
+------------------+     +------------------+     +------------------+
|  Start Process   |     |  Validate Input  |     |  Process Data    |
|   (Rounded)      |---->|   (Rounded)      |---->|   (Rounded)      |
+------------------+     +------------------+     +------------------+
                                   |                   |
                                   | Invalid           | Valid
                                   v                   v
                             +------------------+  +------------------+
                             | Show Error       |  | Save to Database |
                             |   (Rounded)      |  |   (Rounded)      |
                             +------------------+  +------------------+
                                           |                   |
                                           +--------+----------+
                                                    |
                                                +------------------+
                                                |   End Process    |
                                                |   (Rounded)      |
                                                +------------------+
```

**Key Conventions:**
- Rounded rectangles: `(Rounded)` for start/end and processes
- Diamonds: Decision points with labeled branches
- Arrows: Show flow direction with labels when needed
- Consistent spacing: 2-3 spaces between elements for readability

### Pattern 2: Sequence Diagrams

Show interactions between actors/objects over time with vertical lifelines and horizontal messages.

```
Actor A          Actor B          System
     |               |               |
     |---Request---->|               |
     |               |               |
     |               |---Process---->|
     |               |               |
     |               |<---Response---|
     |               |               |
     |<---Result-----|               |
     |               |               |
```

**Key Conventions:**
- Actor/Object names at top of columns
- Vertical dashed lines: Lifelines showing active time
- Horizontal arrows: Messages with labels
- Activation bars: Thin rectangles on lifelines during processing
- Return arrows: Dashed lines for responses

### Pattern 3: State Diagrams

Illustrate states and transitions in a state machine with rounded boxes for states and labeled arrows for transitions.

```
+------------------+
|   Idle State     |
|   (Rounded)      |
+------------------+
        |
        | trigger_event()
        v
+------------------+
| Processing State |
|   (Rounded)      |
+------------------+
        |
        | timeout()
        v
+------------------+
|   Error State    |
|   (Rounded)      |
+------------------+
        |
        | reset()
        v
+------------------+
|   Idle State     |
|   (Rounded)      |
+------------------+
```

**Key Conventions:**
- Rounded rectangles: States
- Labeled arrows: Transitions with event/condition
- Initial state: Often marked with incoming arrow from left
- Final state: Double circle or special notation
- Self-transitions: Arrow that loops back to same state

### Pattern 4: Container/Component Diagrams

Show system components and their relationships with clear boundaries.

```
+--------------------------------------------------+
|                                                  |
|           +------------------+                   |
|           |  Web Frontend    |                   |
|           |   (Rounded)      |                   |
|           +--------+---------+                   |
|                    |                            |
|                    | HTTP/REST                  |
|                    v                            |
|           +------------------+                   |
|           |   API Gateway    |                   |
|           |   (Rounded)      |                   |
|           +--------+---------+                   |
|                    |                            |
|                    | gRPC                       |
|                    v                            |
|           +------------------+                   |
|           |  Business Logic  |                   |
|           |   (Rounded)      |                   |
|           +--------+---------+                   |
|                    |                            |
|                    | SQL                        |
|                    v                            |
|           +------------------+                   |
|           |   Database       |                   |
|           |   (Rounded)      |                   |
|           +------------------+                   |
|                                                  |
+--------------------------------------------------+
              External System Boundary
```

**Key Conventions:**
- Outer boundary: Shows system/context boundary
- Internal boxes: Components or services
- Labeled arrows: Communication protocols between components
- Technology labels: Show what protocol/technology is used
- Consistent alignment: Keeps diagram readable

## Constraints

### MUST DO
- Use consistent spacing (2-3 spaces) between elements for readability
- Label all arrows meaningfully (avoid unlabeled connections)
- Keep text labels concise but descriptive (max 3-4 words when possible)
- Use rounded boxes for processes/states, diamonds for decisions
- Maintain vertical/horizontal alignment for clean appearance
- Include start/end points in flowcharts for clear boundaries
- Show activation bars in sequence diagrams during processing
- Use dashed lines for return messages in sequence diagrams

### MUST NOT DO
- Overcrowd diagrams with too many elements (split if >10 components)
- Use inconsistent box styles within the same diagram
- Make arrows cross excessively (reorganize to minimize crossings)
- Use tiny text or abbreviations that reduce readability
- Forget to label decision outcomes in flowcharts
- Mix different arrow styles without clear meaning
- Create diagrams wider than 80 characters (terminal/unreadable)

## Examples

### Example 1: User Login Flowchart

```
+------------------+     +------------------+     +------------------+
|   User Login     |     | Validate Creds   |     |  Generate Token  |
|   Process Start  |---->|   (Rounded)      |---->|   (Rounded)      |
+------------------+     +------------------+     +------------------+
                                   |                   |
                                   | Invalid           | Valid
                                   v                   v
                             +------------------+  +------------------+
                             | Show Login Error |  | Set Auth Cookie  |
                             |   (Rounded)      |  |   (Rounded)      |
                             +------------------+  +------------------+
                                           |                   |
                                           +--------+----------+
                                                    |
                                                +------------------+
                                                |   Login Complete |
                                                |   Process End    |
                                                +------------------+
```

### Example 2: API Request Sequence Diagram

```
Client          API Server         Database
     |               |               |
     |--GET /users-->|               |
     |               |               |
     |               |---QUERY------>|
     |               |               |
     |               |<--RESULTS-----|
     |               |               |
     |<--200 OK------|               |
     |               |               |
```

### Example 3: Order Processing State Diagram

```
+------------------+
|   Order Placed   |
|   (Rounded)      |
+------------------+
        |
        | payment_received()
        v
+------------------+
|  Payment Confirmed |
|   (Rounded)        |
+------------------+
        |
        | inventory_allocated()
        v
+------------------+
|   Order Shipped  |
|   (Rounded)      |
+------------------+
        |
        | delivered()
        v
+------------------+
|  Order Delivered |
|   (Rounded)      |
+------------------+
        |
        | completed()
        v
+------------------+
|  Order Complete  |
|   (Rounded)      |
+------------------+
```

### Example 4: Microservices Architecture

```
+-----------------------------------------------------------------------------+
|                                                                             |
|           +------------------+     +------------------+                    |
|           |  User Interface  |     |   Mobile App     |                    |
|           |   (Rounded)      |     |   (Rounded)      |                    |
|           +--------+---------+     +--------+---------+                    |
|                    |                             |                        |
|                    | HTTPS                       | HTTPS                    |
|                    v                             | v                      |
|           +------------------+     +------------------+                    |
|           |   API Gateway    |     |  Third-Party API |                    |
|           |   (Rounded)      |     |   (Rounded)      |                    |
|           +--------+---------+     +--------+---------+                    |
|                    |                             |                        |
|                    | gRPC/WebSocket              | API Key                |
|                    v                             | v                      |
|           +------------------+                    |                        |
|           |  User Service    |<------------------+                        |
|           |   (Rounded)      |                    |                        |
|           +--------+---------+                    |                        |
|                    |                             |                        |
|                    | gRPC                        |                        |
|                    v                             |                        |
|           +------------------+                    |                        |
|           |  Order Service   |                    |                        |
|           |   (Rounded)      |                    |                        |
|           +--------+---------+                    |                        |
|                    |                             |                        |
|                    | gRPC                        |                        |
|                    v                             |                        |
|           +------------------+                    |                        |
|           |  Payment Service |                    |                        |
|           |   (Rounded)      |                    |                        |
|           +--------+---------+                    |                        |
|                    |                             |                        |
|                    | gRPC                        |                        |
|                    v                             |                        |
|           +------------------+                    |                        |
|           |  Notification Svc|                    |                        |
|           |   (Rounded)      |                    |                        |
|           +------------------+                    |                        |
|                                                                             |
+-----------------------------------------------------------------------------+
                    Internal Microservices System
```

## TL;DR Checklist for ASCII Diagrams

- [ ] Diagram type matches purpose (flowchart/sequence/state/architecture)
- [ ] All elements clearly labeled with concise, descriptive text
- [ ] Consistent use of shapes: rounded for processes, diamonds for decisions
- [ ] Meaningful labels on all connections and transitions
- [ ] Proper alignment and spacing (2-3 spaces between elements)
- [ ] Clear start/end points where applicable
- [ ] Readable at glance without needing legend or explanation
- [ ] Stays within 80-character width for terminal compatibility