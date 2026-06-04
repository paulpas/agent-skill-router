---




name: event-storming
description: Facilitates collaborative EventStorming workshops to discover bounded
  contexts, map domain events, identify aggregates and commands, and produce visual
  business process models for domain-driven design projects.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: event storming, eventstorming, domain discovery, workshop facilitation,
    bounded context, domain events, sticky notes, collaborative modeling
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
  - examples
  - diagrams
  related-skills: ddd-context-mapping, ddd-tactical-patterns, event-driven-patterns,
    architecture-decision-records




---




# EventStorming Facilitator

Facilitates collaborative EventStorming workshops to discover bounded contexts, map domain events, identify aggregates and commands, and produce visual business process models for domain-driven design projects.

EventStorming is not a documentation exercise — it is a **discovery workshop** where developers, domain experts, product owners, and stakeholders collaboratively build a shared understanding of the business domain through visual mapping on a physical or virtual timeline. The output is a living artifact that captures how the business actually works, revealing hidden complexity, conflicting terminology, and integration boundaries.

## TL;DR Checklist

- [ ] Set up EventBoard with timeline axis (left-to-right temporal flow)
- [ ] Start with domain events in orange sticky notes — these drive everything
- [ ] Layer commands in blue, aggregates in yellow, actors in purple, systems in green
- [ ] Identify hotspots (many events converging), pain points (errors shown in red), and external systems
- [ ] Draw bounded context boundaries around clusters of related events
- [ ] Name every aggregate after the noun it represents and mark its read/write operations
- [ ] Document all decisions, open questions, and action items before closing the session

---

## When to Use

Use this skill when:

- Starting a new system or major feature where you need to build shared domain understanding across stakeholders
- Existing domain terminology is inconsistent — different teams use different words for the same concept
- A monolith needs to be decomposed into bounded contexts for microservices migration
- Requirements are vague or contradictory and you need to surface assumptions through visual modeling
- Onboarding new team members to a complex business domain and need an accelerated shared-knowledge exercise
- Identifying integration boundaries between services before designing API contracts

---

## When NOT to Use

Avoid EventStorming for:

- Small, well-understood features with a single clear owner — overhead outweighs benefit (use a quick sync instead)
- Situations where domain experts are unavailable — the workshop requires actual business knowledge, not guesses
- Technical deep-dives on implementation details like database schema design or CI/CD pipelines — use architecture workshops for those
- Remote-only teams without collaborative whiteboard tools — EventStorming relies on spatial proximity and rapid sticky-note iteration (though virtual tools exist)

---

## Core Workflow

EventStorming follows a structured progression through four discovery layers. Each layer builds on the previous one, and you must complete each layer before moving forward. The workshop typically runs 2–4 hours for a single bounded context.

### Phase 1: Domain Event Discovery (Orange Layer)

**Objective:** Populate the timeline with all business-relevant events in the domain.

1. **Set up the EventBoard** — Create a horizontal timeline axis across a large wall or virtual board (Miro, FigJam, Mural). Label the left side as "earliest" and the right as "latest." Add column headers for major time periods if relevant: `Q1`, `Q2`, `Order Received`, `Order Fulfilled`.

2. **Emit domain events** — Have all participants write one domain event per orange sticky note. Domain events are past-tense facts that signify something meaningful happened in the business:
   - `"Order Was Placed"` ✅
   - `"Payment Was Processed"` ✅
   - `"Customer Logged In"` ✅ (but lower priority)
   - `"User Clicked Button"` ❌ — this is a UI interaction, not a domain event

3. **Place events on the timeline** — Arrange orange sticky notes left-to-right by when they occur in the business process. Do not worry about perfect ordering initially — participants will naturally reorganize as they see each other's contributions. Cluster related events together vertically.

4. **Resolve naming conflicts immediately** — If two sticky notes use different names for the same event (e.g., `"Order Was Placed"` vs. `"Order Submitted"`), discuss and agree on a single term. Document disagreements in an "Open Questions" column. The goal is building **ubiquitous language** — one shared vocabulary across all roles.

5. **Checkpoint: Every event must be in the past tense and represent a business fact.** If someone writes `"Create Order"` (imperative), re-categorize it as a command (blue). If they write `"Order Processing"` (noun phrase), ask "What actually happened?" to convert to past-tense event.

### Phase 2: Commands, Actors, and Systems (Blue, Purple, Green Layer)

**Objective:** Understand what triggers each event and who or what is responsible.

6. **Place commands above their events** — For each orange domain event, write a blue sticky note above it naming the command that triggered the event. Commands are imperatives from an actor or system:
   - Above `"Order Was Placed"` → `Place Order` (blue)
   - Above `"Payment Was Processed"` → `Process Payment` (blue)
   - Above `"Shipment Dispatched"` → `Dispatch Shipment` (blue)

7. **Place actors below their commands** — Write purple sticky notes below each command identifying the human actor or external system that issued it:
   - Below `Place Order` → `Customer` (purple)
   - Below `Process Payment` → `Payment Gateway` (green — this is a system, not a human actor)

8. **Mark external systems** — Write green sticky notes for any external service or third-party system that participates in the domain: payment processors, shipping carriers, tax calculation services, email providers. Draw dashed lines from these green notes to the commands or events they interact with.

9. **Identify pain points and hotspots** — Add red sticky notes for known problems, error paths, and edge cases:
   - `"Payment Failed"` in red → places it as an alternative event path
   - `"Refund Issued"` in red → shows the reverse flow
   - Write pain points on yellow sticky notes for non-error issues (bottlenecks, manual workarounds)

10. **Checkpoint: Every orange event has exactly one blue command above it.** If a gap exists (event with no command), ask "What action caused this?" If an event has multiple commands, consolidate — there should be exactly one primary triggering command per event.

### Phase 3: Aggregate Identification (Yellow Layer)

**Objective:** Identify the aggregates — the consistency boundaries within which domain rules are enforced.

11. **Place aggregate sticky notes below their events** — For each cluster of related events and commands, write a yellow sticky note naming the aggregate that coordinates them. Aggregates are always nouns representing business entities with invariants:
    - `Order` aggregate → owns `Order Was Placed`, `Payment Was Processed`, `Shipment Dispatched`
    - `Payment` aggregate → owns `Payment Was Processed`, `Refund Issued`
    - `Inventory` aggregate → owns `Item Reserved`, `Item Shipped`

12. **Draw aggregate boundaries** — Draw circles or rectangles around events and commands that belong to the same aggregate. All invariants (business rules that must always be true) within an aggregate boundary are enforced atomically. Events outside the aggregate boundary communicate via domain events (eventual consistency).

13. **Mark read vs. write operations** — For each aggregate, identify:
    - **Write operations** (commands that modify state): `Place Order`, `Cancel Order`, `Process Refund`
    - **Read operations** (queries that project state): `Get Order Status`, `List Orders`

14. **Identify aggregate relationships** — Draw arrows between aggregates showing how they interact:
    - Direct reference (object ID): `Order` → references `Customer` aggregate via customer ID
    - Event-based (eventual consistency): `Order Was Placed` event → triggers `Payment Was Processed` in a different aggregate

15. **Checkpoint: Each aggregate has clear invariants.** Write the invariants on small white sticky notes and place them inside the aggregate boundary. Example invariant: "An Order cannot be Shipped before Payment Is Confirmed." If you cannot articulate an invariant, the boundary may need adjustment.

### Phase 4: Bounded Context Mapping (Red Layer)

**Objective:** Identify bounded context boundaries where different parts of the domain use different models for the same concept.

16. **Find context collisions** — Scan the EventBoard for terms used in conflicting ways by different groups:
    - `"Customer"` in Sales means a person who buys → `"Customer"` in Collections means a billable account
    - `"Order"` in Operations means a fulfillment unit → `"Order"` in Finance means a billing invoice
    These collisions signal a need for bounded context separation.

17. **Draw context map boundaries** — Use red tape or digital boundary lines to group related aggregates into bounded contexts. Within each context, terminology is consistent (ubiquitous language). Between contexts, define explicit integration patterns:
    - **Shared Kernel**: Two contexts share a subset of the same model (e.g., `Customer` aggregate shared between Sales and Collections)
    - **Customer-Supplier (Upstream/Downstream)**: One context defines the contract, another depends on it. The upstream context controls its model; the downstream adapts via Anti-Corruption Layer.
    - **Anti-Corruption Layer**: A translation layer that prevents an external domain model from polluting your own. Write ACL boundaries as dashed lines between contexts.
    - **Conformist**: A downstream system simply conforms to the upstream's model without transformation.
    - **Open Host Service**: An explicitly published interface (API) that other systems can consume.
    - **Published Language**: A shared format or protocol (JSON schema, event schema) used across contexts.

18. **Identify integration events** — Draw dashed arrows between bounded contexts showing inter-context communication via domain events. These are the contract boundaries: what each context promises to publish and what it expects others to publish.

19. **Checkpoint: Every bounded context has a single ubiquitous language.** Within any one red boundary, no term should have two meanings. If a collision remains unresolved, mark it as a design decision needed before implementation begins.

---

## Workshop Setup Reference

### Physical Workshop Materials

| Material | Purpose | Quantity (for 8–12 people) |
|----------|---------|---------------------------|
| Large wall or whiteboard | EventBoard surface | 1 (minimum 3m × 2m) |
| Orange sticky notes | Domain events (past-tense facts) | 50–100 sheets |
| Blue sticky notes | Commands (imperatives that trigger events) | 30–50 sheets |
| Yellow sticky notes | Aggregates (business entity consistency boundaries) | 20–30 sheets |
| Purple sticky notes | Human actors (who issues commands) | 10–15 sheets |
| Green sticky notes | External systems (third-party integrations) | 10–15 sheets |
| Red sticky notes | Pain points and error paths | 10–20 sheets |
| Black marker pens | Writing on sticky notes (thick for visibility) | 4–6 pens |
| Colored tape or painter's tape | Bounded context boundaries and timeline axis | 5–10 rolls |
| Timer / stopwatch | Time-box each sub-exercise | 1 |

### Virtual Workshop Tools

| Tool | Why Use It |
|------|-----------|
| Miro | Industry standard for collaborative whiteboarding; supports sticky notes, timelines, and freeform drawing |
| FigJam | Excellent real-time collaboration with built-in templates; integrates with Figma design tools |
| Mural | Strong facilitation features including timed exercises and structured canvases |
| Whimsical | Simple interface good for smaller teams (under 6 people); clean visual output |

### Workshop Size Guidelines

- **Optimal group size:** 8–12 participants (developers + domain experts + product owners)
- **Minimum viable group:** 4–5 (must include at least one domain expert)
- **Maximum effective group:** 15 (beyond this, use parallel sub-workshops with a synthesizer)
- **Required roles:** Facilitator (one person), Domain Expert (at least one), Developer(s), Product Owner/Representative

---

## Example: E-Commerce Order Domain

The following is a complete walkthrough of an EventStorming session for an e-commerce order management domain. Use this as a reference for what a successful session produces.

### Step 1 — Initial Timeline with Domain Events (Orange)

Participants populate the timeline with these events, discovered through facilitated questioning:

```
Timeline → Time flows left to right

[Order Was Placed] ── [Payment Authorization Attempted] ── [Payment Was Authorized]
        │                          │                               │
        │                          ├── [Payment Failed]            │
        │                          │                               │
        │                          └── [Payment Was Captured] ─────┘
        │                                                 │
[Inventory Was Reserved] ── [Item Was Shipped] ── [Delivery Confirmed]
        │                            │                    │
        └── [Reservation Expired]    └── [Return Initiated] ── [Refund Issued]
```

### Step 2 — Commands (Blue) and Actors (Purple/Green)

For each event, we identify the triggering command:

```
                     [Place Order]              [Authorize Payment]
                          ↑                           ↑
                       [Customer]                  [Payment Gateway]

                     [Capture Payment]            [Reserve Inventory]
                          ↑                           ↑
                   [Order System]               [Warehouse System]

                      [Dispatch Item]              [Confirm Delivery]
                          ↑                            ↑
                     [Shipping Carrier]           [Delivery Confirmation Service]

                 [Initiate Return]               [Issue Refund]
                          ↑                           ↑
                       [Customer]                  [Finance System]
```

### Step 3 — Aggregates (Yellow) with Invariants

Three aggregates identified from the event flow:

```
┌───────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  ORDER AGGREGATE      │    │  PAYMENT AGGREGATE   │    │  INVENTORY AGGREGATE │
│                       │    │                      │    │                      │
│ Events:               │    │ Events:              │    │ Events:              │
│  Order Was Placed     │    │  Payment Auth.       │    │  Inventory Reserved  │
│  Item Shipped         │    │  Payment Failed      │    │  Reservation Expired │
│                       │    │  Payment Captured    │    │                      │
│ Invariants:           │    │                      │    │ Invariants:          │
│  • Order total        │    │ Invariants:          │    │  • Reserved qty ≤    │
│    must match line    │    │  • Auth expires      │    │    available stock   │
│    items              │    │    after 24h         │    │                      │
│  • Status transitions │    │  • Captured amount   │    │ Rules:               │
│    must follow:       │    │    ≤ authorized      │    │  • Reserve on order  │
│    Draft → Placed →   │    │                      │    │  • Release after     │
│    Shipped/Delivered  │    │ Commands:            │    │    shipment or       │
│                       │    │  Authorize Payment   │    │    reservation expire│
│ Commands:             │    │  Capture Payment     │    │                      │
│  Place Order          │    │  Issue Refund        │    └──────────────────────┘
│  Cancel Order         │    │                      │
│                       │    └──────────────────────┘
└───────────────────────┘
```

### Step 4 — Bounded Contexts (Red) with Context Map Patterns

```
┌──────────────────────────┐      ┌──────────────────────────┐
│    SALES CONTEXT         │      │   FULFILLMENT CONTEXT     │
│  (Ubiquitous Language:   │      │   (Ubiquitous Language:   │
│   "Customer", "Order")   │─────▶│   "Shipper", "Shipment") │
│                          │ Share│                           │
│  Aggregates:             │Kernel│  Aggregates:              │
│  • Order                 │     │  • Shipment               │
│  • Customer              │     │  • Package                │
└──────────────────────────┘      └──────────────────────────┘

┌──────────────────────────┐      ┌──────────────────────────┐
│   FINANCE CONTEXT        │◀────▶│    INVENTORY CONTEXT     │
│   (ACL protects Finance  │ ACL  │   ("Stock" = available   │
│    from Sales' "Order")  │     │    inventory count)       │
│                          │      │                           │
│  Aggregates:             │      │  Aggregates:              │
│  • Invoice               │      │  • StockItem              │
│  • Payment               │      │  • Reservation            │
└──────────────────────────┘      └──────────────────────────┘

Inter-context communication via domain events:
  SALES → FULFILLMENT: "Order Was Placed" (shared kernel)
  SALES → FINANCE:     "Invoice Generated" (eventual consistency)
  INVENTORY → SALES:   "Reservation Expired" (eventual consistency)
```

---

## Facilitation Techniques

### Questioning Patterns

Use these questions to drive discovery when participants stall or provide surface-level answers:

| Situation | Ask This | Purpose |
|-----------|----------|---------|
| Participant writes a command instead of an event | "What is the past-tense fact that resulted from this action?" | Convert imperative to declarative domain fact |
| Multiple events on one sticky note | "How many separate things happened here? Write each on its own note." | Prevent conflation of distinct events |
| Unclear cause-effect chain | "What directly caused this event to happen?" or "What happens right after this?" | Establish command-event causality |
| Conflicting terminology | "When you say 'X,' what exactly do you mean? And when you say 'Y,' does that refer to the same thing?" | Surface and resolve ubiquitous language gaps |
| Missing context | "Who initiated this? What system triggered it?" | Identify actors and external dependencies |
| Invariant identification | "What would be broken if this step were skipped?" or "Under what conditions must this never happen?" | Discover business rules that belong inside aggregate boundaries |

### Managing Group Dynamics

- **Silent brainstorming first:** Give everyone 5 minutes of individual silent writing before group discussion. This prevents dominant personalities from steering the session and surfaces quieter perspectives.
- **Parking lot for tangents:** Keep a separate area (physical or digital) for questions and ideas that are relevant but off-topic. Address parking lot items after the core flow is mapped.
- **Rotate who writes on sticky notes:** Each person should write their own notes to ensure ownership of what they contribute. Do not let one person take over writing.
- **Time-box each phase:** Domain Event Discovery: 20 minutes. Commands/Actors: 15 minutes. Aggregates: 20 minutes. Bounded Contexts: 15 minutes. Review and documentation: 10 minutes. Total: ~80 minutes minimum per context.
- **End with synthesis:** Before closing, walk through the completed EventBoard as a group. Ask each participant: "What surprised you?" and "What did we miss?" Record these observations.

### Common Anti-Patterns and How to Correct Them

| Anti-pattern | What It Looks Like | Correction |
|-------------|-------------------|------------|
| UI-level events on the timeline | `"Button Was Clicked"`, `"Page Loaded"` | Remove from domain event layer — these belong to interaction design, not the business domain |
| Commands mixed with events | `"Place Order"` written in orange instead of blue | Re-categorize: commands are imperatives (blue), events are past-tense facts (orange) |
| Aggregates named after services | `"OrderService"`, `"PaymentAPI"` | Rename to business nouns: `Order`, `Payment` — aggregates are domain concepts, not infrastructure |
| No invariant documentation | Aggregate boundary drawn but no rules stated inside | Write invariants on white sticky notes inside each aggregate boundary |
| Context boundaries too fine-grained | Every aggregate becomes its own bounded context | Merge related aggregates into single contexts until you find genuine terminology collisions |
| Over-reliance on facilitator talking | Facilitator explains the domain instead of asking questions | Step back and ask participants to explain; your job is to guide discovery, not lecture |

---

## Output Artifacts

Every EventStorming session must produce these artifacts. Use them as the foundation for all subsequent design work:

### Artifact 1: EventBoard Photo/Export

A complete digital capture of the final EventBoard state. This becomes the single source of truth for domain understanding. Export from your whiteboard tool (Miro/FigJam) at high resolution. Label with session date and participants.

### Artifact 2: Ubiquitous Language Dictionary

Extract all agreed-upon terms from the sticky notes into a structured dictionary. Format as a living document:

| Term | Context | Definition | Owned By |
|------|---------|-----------|----------|
| Order | Sales | A customer request to purchase one or more items, moving through Draft → Placed → Shipped status | Product Owner |
| Shipment | Fulfillment | The physical movement of ordered items from warehouse to customer, tracked by carrier | Operations Lead |
| Reservation | Inventory | Temporary hold on stock quantity for a specific Order, lasting until shipment or expiration | Supply Chain Manager |

### Artifact 3: Context Map Document

A formalized version of the bounded context boundaries identified in Phase 4. Include:
- Each context name with its ubiquitous language
- All aggregates within each context
- Integration patterns between every pair of contexts (Shared Kernel, ACL, Conformist, etc.)
- Published domain events at each context boundary

### Artifact 4: Decision and Question Log

Every unresolved question, design decision, and action item from the workshop:

| ID | Category | Description | Owner | Due Date |
|----|----------|-------------|-------|----------|
| Q1 | Design | Whether "Cancel Order" should be a command or an event | Architect | Sprint 2 |
| D1 | Decision | Payment aggregate handles both auth and capture (not separate aggregates) | Team Lead | Immediate |
| A1 | Action | Schedule follow-up with Finance team to resolve Invoice vs. Receipt terminology | Facilitator | Next week |

### Artifact 5: Bounded Context Implementation Blueprint

Translate each bounded context into implementation-level guidance:

```python
# Example: Order aggregate from SALES CONTEXT
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional
import uuid


class OrderStatus(Enum):
    DRAFT = "draft"
    PLACED = "placed"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

VALID_TRANSITIONS = {
    OrderStatus.DRAFT: {OrderStatus.PLACED},
    OrderStatus.PLACED: {OrderStatus.PAID, OrderStatus.CANCELLED},
    OrderStatus.PAID: {OrderStatus.SHIPPED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
}


@dataclass
class OrderLineItem:
    product_id: str
    quantity: int
    unit_price: decimal.Decimal

    @property
    def total(self) -> decimal.Decimal:
        return self.unit_price * self.quantity


@dataclass
class Order:
    """Order aggregate — enforces invariants within its consistency boundary.

    Invariants (from EventStorming):
    - Order total must match sum of line items
    - Status transitions must follow defined graph
    - Cannot ship before payment is confirmed
    """
    order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    items: List[OrderLineItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def total(self) -> decimal.Decimal:
        return sum(item.total for item in self.items)

    def add_item(self, item: OrderLineItem) -> None:
        """Only allowed in DRAFT status."""
        if self.status != OrderStatus.DRAFT:
            raise ValueError(
                f"Cannot add items to Order in {self.status.value} state"
            )
        self.items.append(item)

    def place(self) -> None:
        """Transition from DRAFT to PLACED. Enforces total > 0."""
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Order can only be placed from DRAFT state")
        if not self.items:
            raise ValueError("Cannot place an order with no line items")
        if self.total <= 0:
            raise ValueError("Order total must be positive")
        self.status = OrderStatus.PLACED

    def cancel(self) -> None:
        """Transition to CANCELLED from PLACED or DRAFT."""
        allowed_from = {OrderStatus.DRAFT, OrderStatus.PLACED}
        if self.status not in allowed_from:
            raise ValueError(
                f"Cannot cancel an order in {self.status.value} state"
            )
        self.status = OrderStatus.CANCELLED

    def ship(self) -> None:
        """Transition to SHIPPED — invariant: payment must be confirmed."""
        if self.status != OrderStatus.PAID:
            raise ValueError(
                "Cannot ship an order that is not in PAID state"
            )
        self.status = OrderStatus.SHIPPED
```

---

## Domain-Driven Integration Patterns

### Event Storming → CQRS Separation

After EventStorming identifies all events, separate the model into:

- **Command Side (Write Model):** Commands and their handling logic. Each command modifies one or more aggregates atomically.
- **Query Side (Read Model):** Projections built from domain events. Read models are optimized for specific UI screens or reports.

```python
# Pattern: Command handler publishes domain event after state mutation
class PlaceOrderCommandHandler:
    def handle(self, command: PlaceOrder) -> list[DomainEvent]:
        order = self.order_repository.find(command.order_id)

        # Execute domain logic (invariants enforced inside aggregate)
        order.add_item(OrderLineItem(
            product_id=command.product_id,
            quantity=command.quantity,
            unit_price=command.unit_price,
        ))
        order.place()

        self.order_repository.save(order)

        # Publish the domain event — downstream systems react via this event
        return [OrderWasPlacedEvent(
            order_id=order.order_id,
            customer_id=order.customer_id,
            items=[item.__dict__ for item in order.items],
            placed_at=order.created_at,
        )]
```

### Event Storming → Microservice Boundaries

The bounded contexts identified in Phase 4 become the basis for microservice decomposition. Each bounded context maps to a service:

| Bounded Context | Service Name | Database (own data) | Key Domain Events Published |
|----------------|-------------|---------------------|----------------------------|
| Sales | `order-service` | orders, customers | OrderWasPlaced, OrderCancelled |
| Fulfillment | `fulfillment-service` | shipments, packages | ItemShipped, DeliveryConfirmed |
| Finance | `billing-service` | invoices, payments | PaymentCaptured, RefundIssued |
| Inventory | `inventory-service` | stock_items, reservations | InventoryReserved, ReservationExpired |

**Critical rule:** Each microservice owns its data exclusively. No two services write to the same database table. Inter-service communication is exclusively through domain events (eventual consistency), not direct database access or synchronous RPC calls between owned aggregates.

---

## Constraints

### MUST DO
- Start every session with domain events in orange — never begin with commands or aggregates, as they depend on event discovery
- Write domain events in past tense (e.g., "Order Was Placed", not "Place Order")
- Include at least one domain expert who can validate the accuracy of every sticky note placed
- Document invariants inside every aggregate boundary identified — if an aggregate has no stated invariants, it is not properly defined
- Capture a complete photo/digital export of the final EventBoard before tearing down
- Resolve terminology conflicts immediately during the session rather than deferring to post-workshop

### MUST NOT DO
- Let developers skip domain expert input and fill in business events from technical assumptions — this produces a system design, not a domain model
- Place UI interaction events (button clicks, page loads) on the domain timeline — these are implementation details, not business facts
- Create aggregate boundaries without explicitly stating the invariants they protect — an unnamed boundary is just a grouping, not a consistency guarantee
- Design microservice boundaries based on code structure or team organization ("Conway's Law") instead of the bounded contexts discovered during EventStorming
- Rush through Phase 1 (domain events) to get to the "exciting" parts — if the event timeline is incomplete, every downstream artifact (aggregates, contexts, services) will be wrong

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `ddd-context-mapping` | Formalize bounded context relationships identified during EventStorming into a full context map |
| `ddd-tactical-patterns` | Implement aggregates, entities, and value objects discovered during the session |
| `event-driven-patterns` | Design the event routing infrastructure that publishes domain events between services |
| `architecture-decision-records` | Document key architectural decisions that emerged from EventStorming findings |

---

## Workshop Facilitation Reference Card

Quick reference for running a focused 60-minute EventStorming sprint on a single bounded context:

```
┌─────────────────────────────────────────────────────────┐
│                  EVENTSTORMING SPRINT                    │
│                                                         │
│  Minute 0-5:   Setup — draw timeline, distribute notes │
│  Minute 5-20:  Phase 1 — Domain Events (orange)        │
│                 Silent brainstorm → place → arrange    │
│  Minute 20-30: Phase 2 — Commands + Actors             │
│                 Blue above events, purple/green below   │
│  Minute 30-45: Phase 3 — Aggregates                    │
│                 Yellow notes, draw boundaries           │
│  Minute 45-55: Phase 4 — Bounded Contexts              │
│                 Red boundaries, context map patterns    │
│  Minute 55-60: Synthesize — photo, decisions, next steps│
└─────────────────────────────────────────────────────────┘
```

---

*EventStorming was invented by Stefano Maggioli and Alberto Brandolini. This skill encodes the core workshop methodology for use as a collaborative discovery technique within domain-driven design projects.*

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [EventStorming Official Website](https://www.eventstorming.com/) — Alberto Brandolini's official EventStorming methodology documentation
- [Domain-Driven Design Redesign (Eric Evans, 2020)](https://domainlanguage.com/ddd/redesign/) — Eric Evans' updated DDD guidance including EventStorming integration
- [EventStorming for Discovery and Design (InfoQ Guide)](https://www.infoq.com/articles/event-storming-discovery-design/) — InfoQ's practical guide to running EventStorming workshops effectively
- [Big Picture EventStorming vs Process Modeling (Stefano Maggioli)](https://leanpub.com/bigpictureeventstorming) — Leanpub reference for the Big Picture variant of EventStorming
- [C4 Model for Software Architecture](https://c4model.com/) — Simon Brown's C4 model for visualizing system architecture alongside EventStorming outputs
