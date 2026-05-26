---
name: domain-driven-strategic
description: Maps bounded contexts using context mapping patterns (Customer/Supplier, Shared Kernel, ACL, Open Host Service) and facilitates Event Storming sessions to discover architecture boundaries in complex domains.
license: MIT
compatibility: opencode
archetypes:
  - strategic
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture without constraints
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: strategic
metadata:
  version: "1.0.0"
  domain: coding
  triggers: bounded contexts, ubiquitous language, event storming, context mapping, shared kernel, anticorruption layer, strategic design, ACL, open host service, published language, customer supplier pattern
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, diagrams]
  related-skills: domain-driven-tactical, architecture-microservices
---

# Strategic Domain-Driven Design — Bounded Contexts & Architecture Boundaries

Models software architecture at the strategic level by identifying bounded contexts, constructing context maps, building ubiquitous language across teams, and facilitating Event Storming workshops to discover domain events and relationships before any code is written.

## TL;DR Checklist

- [ ] Identify bounded contexts through event storming or domain analysis
- [ ] Draw a context map showing all relationships between contexts
- [ ] Select the correct pattern for each relationship (ACL, Customer/Supplier, Shared Kernel, etc.)
- [ ] Define the ubiquitous language document with precise terminology per context
- [ ] Establish module isolation boundaries in the Python package structure
- [ ] Document published languages and integration contracts

---

## When to Use

- Starting a new greenfield application in a complex domain with multiple subdomains
- Refactoring a monolith into bounded contexts or microservices
- Resolving team misalignment caused by inconsistent terminology across departments
- Deciding whether two features should share code or be isolated in separate modules
- Designing integration boundaries between independently deployable services
- Onboarding new developers to understand the architectural rationale of an existing system

---

## When NOT to Use

- Simple CRUD applications with a single, undisputed domain — tactical DDD patterns are sufficient
- Rapid prototyping where architecture decisions will be thrown away
- Situations requiring low-level code design (use `domain-driven-tactical` instead)
- When the domain is so simple that context mapping adds overhead without benefit

---

## Core Workflow

1. **Discover Subdomains** — Conduct a domain language session with domain experts. Identify the core, supporting, and generic subdomains using Evans' classification. **Checkpoint:** Every subdomain must be classified; if uncertain, mark as "needs expert review" rather than guessing.

2. **Run Event Storming Workshop** — Facilitate a 2-4 hour session using colored sticky notes (or digital equivalents). Step A: Domain experts place orange "Domain Event" cards chronologically on the wall. Step B: Add purple "Command" cards that cause each event. Step C: Add blue "Actor" cards responsible for commands. Step D: Identify "Aggregates" (yellow) and "Systems" (green) that react to events. **Checkpoint:** After 2 hours, you should see clusters of events that naturally group together — these clusters hint at bounded context boundaries.

3. **Extract Bounded Contexts** — Analyze event storming output for linguistic patterns. When the same word ("order", "client") has different meanings in different parts of the wall, those are separate contexts. Group events and commands by shared terminology into context candidates. **Checkpoint:** Each bounded context must have a single, unambiguous definition of its core noun phrases. If "customer" means something different in Sales vs. Support, they are separate contexts.

4. **Draw the Context Map** — For every pair of related bounded contexts, determine their relationship pattern:
   - Customer/Supplier: One context depends on another's model; upstream is a "supplier," downstream is a "customer." Use when there is a clear hierarchy and the supplier evolves at its own pace.
   - Shared Kernel: Two contexts share a small subset of the domain model. Use only for unavoidable overlaps (e.g., user identity, common reference data). Mark which parts are shared — never assume implicit sharing.
   - Anticorruption Layer (ACL): The downstream context translates messages from an upstream context that uses a different model. Use when integrating with legacy systems or third-party services whose domain model is incompatible.
   - Open Host Service: The upstream exposes its capabilities through a protocol and message set designed for consumption by other contexts. Use when the upstream wants to encourage healthy integration from many downstream consumers.
   - Published Language: The upstream communicates using a format (JSON Schema, Protocol Buffers, GraphQL schema) that is part of its domain model, not an implementation detail. Use to prevent translation layers from proliferating.

5. **Build Ubiquitous Language Documentation** — Create a shared glossary per bounded context. Each term gets: the exact word used in code, the precise definition agreed with domain experts, and which context owns it. **Checkpoint:** No term may appear with two different definitions across contexts unless explicitly noted as a "different meaning" case (these are natural ACL trigger points).

6. **Enforce Module Isolation** — Translate the context map into Python package structure. Each bounded context maps to a top-level package. Interfaces between contexts use explicit contracts (protocols, dataclasses) rather than importing internal types. **Checkpoint:** `from billing.context_internal import _internal_helper` must not appear in any module outside the `billing` package.

---

## Implementation Patterns

### Pattern 1: Context Map with Explicit Relationship Classes

Model your context map as code so it can be versioned, reviewed, and enforced by static analysis. This makes architectural decisions explicit rather than implicit in directory structure.

```python
"""Context mapping model — declares architecture boundaries as typed data."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol


class RelationshipType(Enum):
    CUSTOMER_SUPPLIER = "customer_supplier"
    SHARED_KERNEL = "shared_kernel"
    ACL = "anticorruption_layer"
    OPEN_HOST_SERVICE = "open_host_service"
    PUBLISHED_LANGUAGE = "published_language"


@dataclass(frozen=True)
class BoundedContext:
    """Represents a single bounded context with its owning team and subdomain type."""
    name: str
    subdomain_type: str  # "core", "supporting", or "generic"
    team_owner: str
    published_languages: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return f"BoundedContext({self.name}, {self.subdomain_type})"


@dataclass(frozen=True)
class ContextRelationship:
    """Declares the relationship between two bounded contexts."""
    upstream: BoundedContext
    downstream: BoundedContext
    relationship_type: RelationshipType

    def validate(self) -> None:
        """Enforce constraints that must always hold for a valid context map."""
        if self.upstream.name == self.downstream.name:
            raise ValueError(
                f"Context '{self.upstream.name}' cannot have a relationship with itself"
            )
        if self.relationship_type is RelationshipType.SHARED_KERNEL:
            # Shared kernel must be small — flag it for manual review
            pass  # Size check done in code review


class ContextMap:
    """Central registry of all bounded contexts and their relationships.

    Use this as the single source of truth for architectural boundaries.
    Static analysis tools can read this to enforce module isolation.
    """

    def __init__(self) -> None:
        self._contexts: dict[str, BoundedContext] = {}
        self._relationships: list[ContextRelationship] = []

    def register_context(self, ctx: BoundedContext) -> None:
        if ctx.name in self._contexts:
            raise ValueError(f"Bounded context '{ctx.name}' already registered")
        self._contexts[ctx.name] = ctx

    def add_relationship(self, rel: ContextRelationship) -> None:
        rel.validate()
        # Ensure both contexts are registered before linking them
        if rel.upstream.name not in self._contexts:
            raise ValueError(
                f"Upstream context '{rel.upstream.name}' not registered"
            )
        if rel.downstream.name not in self._contexts:
            raise ValueError(
                f"Downstream context '{rel.downstream.name}' not registered"
            )
        self._relationships.append(rel)

    @property
    def relationships(self) -> list[ContextRelationship]:
        return list(self._relationships)

    def get_acl_for(self, downstream_name: str) -> list[BoundedContext]:
        """Find all upstream contexts that require an ACL when consumed by `downstream_name`."""
        acl_sources: list[BoundedContext] = []
        for rel in self._relationships:
            if (
                rel.downstream.name == downstream_name
                and rel.relationship_type is RelationshipType.ACL
            ):
                acl_sources.append(rel.upstream)
        return acl_sources
```

### Pattern 2: Anticorruption Layer Translation (BAD vs. GOOD)

**❌ BAD — Directly importing the legacy model leaks corruption into your clean domain.**

```python
# ❌ BAD: LegacyInvoice is directly used in the clean Order domain
from legacy_invoicing.models import LegacyInvoice


class OrderService:
    """Leeps legacy domain model semantics into the order context."""

    def process_order(self, invoice_data: dict) -> Order:
        # The legacy model uses "inv_status" which means nothing in our domain
        inv = LegacyInvoice.from_dict(invoice_data)
        # Direct dependency on legacy internals — if LegacyInvoice changes,
        # our clean model breaks too. This is the corruption we are trying to prevent.
        return Order(
            amount=inv.total_amount,
            status=self._legacy_status_to_order(inv.inv_status),
            invoice_id=inv.id,
        )

    def _legacy_status_to_order(self, status: str) -> str:
        mapping = {"P": "paid", "O": "open", "C": "cancelled"}
        return mapping.get(status, "unknown")
```

**✅ GOOD — The ACL wraps the legacy model in a translation layer that produces native domain objects.**

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol


# --- Clean Domain Model (internal to order context) ---

@dataclass(frozen=True)
class Invoice:
    """Native invoice representation within the Order bounded context."""
    id: str
    amount: float
    status: "InvoiceStatus"
    issued_at: str  # ISO 8601 — our language, not theirs


class InvoiceStatus(Enum):
    PAID = "paid"
    OPEN = "open"
    CANCELLED = "cancelled"


# --- ACL Interface (defines what the legacy system contracts look like) ---

class LegacyInvoiceProtocol(Protocol):
    """Abstract interface for the legacy invoice model.

    The actual implementation wraps a third-party SDK or database schema.
    By depending on this protocol, the Order context never imports legacy internals.
    """

    def to_dict(self) -> dict: ...
    @staticmethod
    def from_raw(raw: dict) -> LegacyInvoiceProtocol: ...


# --- ACL Translation Layer ---

class LegacyInvoiceAdapter:
    """Translates legacy invoice data into our native Invoice domain object.

    This class lives in the Anticorruption Layer and is the ONLY place where
    knowledge of the legacy model exists. All other code uses native types.
    """

    STATUS_MAPPING: dict[str, InvoiceStatus] = {
        "P": InvoiceStatus.PAID,
        "O": InvoiceStatus.OPEN,
        "C": InvoiceStatus.CANCELLED,
    }

    @classmethod
    def to_native(cls, legacy_data: dict) -> Invoice:
        raw_adapter: LegacyInvoiceProtocol = LegacyInvoiceProtocol.from_raw(legacy_data)  # type: ignore[assignment]
        invoice_dict = legacy_data
        status_str = invoice_dict.get("inv_status", "")
        return Invoice(
            id=str(invoice_dict.get("id", "")),
            amount=float(invoice_dict.get("total_amount", 0.0)),
            status=cls.STATUS_MAPPING.get(status_str, InvoiceStatus.OPEN),
            issued_at=invoice_dict.get("issued_at", ""),
        )


# --- OrderService now uses clean types only ---

class OrderService:
    """Uses native Invoice type — no knowledge of legacy internals."""

    def process_order(self, invoice_data: dict) -> Order:  # noqa: F821
        native_invoice = LegacyInvoiceAdapter.to_native(invoice_data)
        return Order(  # noqa: F821
            amount=native_invoice.amount,
            status=native_invoice.status,
            invoice_id=native_invoice.id,
        )
```

### Pattern 3: Ubiquitous Language Registry

A typed registry that enforces terminology consistency and serves as documentation for developers and domain experts.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class GlossaryTerm:
    """A single term in the ubiquitous language with authoritative definition."""
    term: str
    definition: str
    context_owns_it: str  # Which bounded context is the authoritative source
    synonyms: list[str] = field(default_factory=list)
    domain_expert_reviewed: bool = False

    def validate_definition(self) -> None:
        """Ensures every term has a definition approved by a domain expert."""
        if not self.definition.strip():
            raise ValueError(
                f"Term '{self.term}' has an empty definition — "
                "must be reviewed with a domain expert"
            )


class UbiquitousLanguageRegistry:
    """Central registry for all ubiquitous language terms.

    Provides query methods that help developers discover the correct term
    and definition when writing code, tests, or documentation.
    """

    def __init__(self) -> None:
        self._terms: dict[str, GlossaryTerm] = {}
        self._context_terms: dict[str, list[GlossaryTerm]] = {}

    def register(self, term: GlossaryTerm) -> None:
        if term.term in self._terms:
            raise ValueError(
                f"Term '{term.term}' already registered in context "
                f"'{self._terms[term.term].context_owns_it}' — "
                f"cannot redefine in '{term.context_owns_it}'"
            )
        term.validate_definition()
        self._terms[term.term] = term
        ctx = term.context_owns_it
        self._context_terms.setdefault(ctx, []).append(term)

    def get_term(self, term_name: str) -> GlossaryTerm | None:
        return self._terms.get(term_name)

    def terms_for_context(self, context_name: str) -> list[GlossaryTerm]:
        return list(self._context_terms.get(context_name, []))

    @property
    def all_contexts(self) -> list[str]:
        return list(self._context_terms.keys())
```

---

## Constraints

### MUST DO
- Classify every subdomain as core, supporting, or generic before designing context boundaries
- Document the ubiquitous language with definitions reviewed and approved by domain experts — never let developers define terms alone
- Use an Anticorruption Layer whenever integrating a bounded context with a legacy or third-party system whose model conflicts with your own
- Keep Shared Kernels small — if more than 20% of a context's model is shared, the kernel has grown too large and should be split
- Encode the context map in typed code (dataclasses, enums) rather than only documenting it in text — machine-readable boundaries can be enforced by CI checks
- Run Event Storming workshops with domain experts present; never extract contexts from an architecture team sitting alone
- Define published languages using explicit schema documents (JSON Schema, Protocol Buffers, GraphQL SDL), not implicit API conventions

### MUST NOT DO
- Allow a single database schema to serve multiple bounded contexts without explicit ownership — each context owns its own data store or at least its own schema namespace
- Share code between contexts through shared libraries that import internal types from both sides — this creates hidden dependencies that destroy autonomy
- Use the word "service" to describe a bounded context — services are implementation units; bounded contexts are domain boundaries
- Begin writing production code before the context map and ubiquitous language are documented — strategic decisions must precede tactical implementation
- Put ACL translation logic inside the consuming service's business logic — it must be isolated in its own layer so the core domain remains clean
- Assume two teams can coordinate terminology without a written registry — verbal agreements dissolve under pressure; only written, versioned language endures

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-tactical` | Implements the tactical DDD patterns (Entities, Value Objects, Aggregates, Repositories) within each bounded context identified by strategic design |
| `architecture-microservices` | Guides decomposition of bounded contexts into independently deployable microservice units with deployment and communication concerns |

---

## Live References

> Authoritative documentation and reference material for strategic DDD patterns.

- [Domain-Driven Design: Tackling Complexity in the Heart of Software by Eric Evans](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215) — The foundational text defining bounded contexts, context mapping, and subdomain classification
- [Implementing Domain-Driven Design by Vaughn Vernon ("The Red Book")](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577) — Practical patterns for context mapping, ACLs, and published languages
- [Event Storming by Alberto Brandolini](https://leanpub.com/eventstorming) — Original description of the workshop method for discovering domain events and context boundaries
- [Martin Fowler — Bounded Context](http://martinfowler.com/bliki/BoundedContext.html) — Clear explanation of bounded contexts with practical examples
- [Udi Dahan — The Autonomy Boundary](https://udinic.blogspot.com/2013/08/the-autonomy-boundary.html) — How bounded context autonomy enables independently evolving teams
- [Python dataclasses documentation](https://docs.python.org/3/library/dataclasses.html) — Standard library reference for using `dataclasses` with `frozen=True` for immutable domain models
- [The Open Host Service pattern explained by Vernon, Chapter 15 of Implementing DDD](https://learning.oreilly.com/library/view/implementing-domain-driven/9780135218487/ch15.html)
