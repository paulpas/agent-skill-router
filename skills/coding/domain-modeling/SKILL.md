---
name: domain-modeling
description: Analyzes business domains to extract ubiquitous language, identify bounded
  contexts, map core/supporting/generic subdomains, and produce domain maps that guide
  software architecture decisions before implementation.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: domain modeling, ubiquitous language, bounded context, subdomain classification,
    domain map, how do i understand the domain, strategic design
  archetypes:
  - diagnostic
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: implementation
  output-format: analysis
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: domain-driven-design, software-design-principles, framework-requirements
---
# Domain Modeling Framework

Senior architect performing deep business domain analysis to extract shared vocabulary, identify bounded context boundaries, classify subdomains by strategic importance, and produce domain maps that directly inform software architecture. This skill operates at the strategic layer of DDD — understanding *what* the business does before deciding *how* to build it. It is complementary to `domain-driven-design` which covers tactical patterns like aggregates, value objects, and entities applied after the domain has been modeled.

## TL;DR Checklist

- [ ] Interview stakeholders and extract a structured dictionary of domain terms with single definitions
- [ ] Identify bounded contexts by clustering concepts that share a consistent meaning and responsibility
- [ ] Classify every subdomain as core, supporting, or generic to guide build-vs-buy decisions
- [ ] Draw a context map showing relationships between bounded contexts (Customer/Supplier, Conformist, ACL, etc.)
- [ ] Document the ubiquitous language dictionary and distribute it to all team members before coding begins
- [ ] Validate each bounded context boundary by confirming no concept has conflicting definitions within a single context
- [ ] Produce a domain map that directly informs module boundaries, team assignments, and technology choices

---

## When to Use

Use this skill when:

- Starting a new complex system where the business rules are unclear or contested among stakeholders
- Multiple teams use the same term with different meanings (e.g., "customer" in sales vs. support)
- A legacy system needs restructuring and you must understand what each part actually does before refactoring
- Planning microservice decomposition — bounded contexts map naturally to service boundaries
- Conducting discovery for a domain-driven design initiative before tactical pattern implementation begins
- A project is failing because developers and business stakeholders keep talking past each other

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with well-understood, trivial business logic — standard data modeling suffices
- Emergency hotfixes where understanding the domain deeply wastes time that should go into fixing code
- Situations where domain experts are completely unavailable — you cannot model what you cannot learn
- Refactoring purely technical concerns (database migration, framework upgrade) with no business rule changes

---

## Core Workflow

1. **Conduct Domain Elicitation Sessions** — Interview key stakeholders (product owners, domain experts, senior engineers). Record every noun, verb, and adjective they use to describe the business. Do not impose your own terminology yet; capture theirs verbatim. Run parallel interviews with different teams and note where terminology diverges. **Checkpoint:** You have at least 3 distinct stakeholder perspectives documented. Any term used by 2+ stakeholders with conflicting definitions is flagged for resolution.

2. **Build the Ubiquitous Language Dictionary** — Collect all domain terms into a structured dictionary. Each entry must include: term, definition (in the domain expert's words), the context in which it applies, and any synonyms or aliases encountered during interviews. Resolve conflicts by facilitating discussion between stakeholders until a single agreed definition exists per term. **Checkpoint:** Every term in the dictionary has exactly one authoritative definition. Terms with unresolved conflicts are escalated to a decision meeting before proceeding.

3. **Identify Bounded Contexts** — Group terms and concepts into candidate bounded contexts by clustering around distinct responsibilities. A bounded context is defined by its responsibility, not by technical concerns. Each concept should appear in only one context with a single meaning. Draw preliminary context boundaries and validate: does "order" mean the same thing everywhere? If not, identify which contexts own which meanings. **Checkpoint:** No concept appears in multiple contexts with different semantics. Every team member can name all bounded contexts and describe each one in a single sentence.

4. **Classify Subdomains** — For each bounded context (or sub-context within it), classify whether it is core, supporting, or generic:
   - **Core** — Differentiates your business; unique competitive advantage; must be built in-house with deep investment
   - **Supporting** — Necessary for the business to function but not distinctive; invest moderately, optimize efficiency
   - **Generic** — Commoditized problem that exists everywhere; buy off-the-shelf or use standard solutions
   **Checkpoint:** Every subdomain is classified. Core domains have identified engineers with domain expertise assigned.

5. **Create Context Maps** — Draw the relationships between bounded contexts. For each pair of interacting contexts, determine the relationship pattern:
   - **Customer/Supplier** — One context depends on another's model; define clear contracts
   - **Conformist** — Subordinate context adopts the upstream context's model without translation
   - **Anticorruption Layer (ACL)** — Translate between incompatible models at the boundary
   - **Shared Kernel** — Two contexts share a subset of models with strict change coordination
   - **Published Language** — Contexts communicate via an openly documented protocol or language
   - **Open Host Service** — Expose your model as a service API for other contexts to consume
   - **Pipeline** — One-way information flow; the receiving context transforms data independently
   **Checkpoint:** Every context interaction has an explicitly named pattern. No context-to-context relationship is left implicit.

6. **Produce Domain Map and Architecture Artifacts** — Create a consolidated domain map showing all bounded contexts, their relationships, subdomain classifications, and core ubiquitous language terms. This document becomes the foundation for module structure, team organization, technology selection, and API design. **Checkpoint:** The domain map is reviewed by at least one domain expert and one senior engineer before any implementation begins.

7. **Establish Language Governance** — Create a process for maintaining the ubiquitous language dictionary as the business evolves. New terms must be added through a lightweight review involving stakeholders. Terms that change definition trigger a bounded context boundary review. **Checkpoint:** A living document (wiki, shared file) is created and linked from project onboarding materials.

---

## Domain Analysis Patterns

### Pattern 1: Ubiquitous Language Extraction

Extract domain vocabulary from stakeholder conversations and structure it as an authoritative dictionary. The goal is to capture how experts actually talk about their domain — not how developers wish they talked about it. Record terms, definitions, synonyms, and usage context. When two stakeholders use the same word differently, that divergence often reveals a bounded context boundary.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class DomainTerm:
    """A single entry in the ubiquitous language dictionary.
    
    Frozen ensures terms cannot be mutated after extraction,
    preserving the authoritative definition established by stakeholders.
    """
    term: str
    definition: str          # Verbatim or paraphrased from domain expert
    context_of_use: str      # Which bounded context this belongs to
    synonyms: tuple[str, ...] = ()
    aliases_conflicting: list[str] = field(default_factory=list)
    last_validated_by: Optional[str] = None


class UbiquitousLanguageDictionary:
    """Structured repository of extracted domain vocabulary.
    
    Acts as the single source of truth for all domain terminology.
    New terms are added through structured extraction sessions,
    not ad-hoc developer naming decisions.
    """

    def __init__(self) -> None:
        self._terms: dict[str, DomainTerm] = {}

    def add_term(
        self,
        term: str,
        definition: str,
        context_of_use: str,
        synonyms: tuple[str, ...] = (),
        aliases_conflicting: list[str] | None = None,
        validated_by: str | None = None,
    ) -> DomainTerm:
        """Add or update a term in the dictionary.
        
        Args:
            term: The canonical domain term (singular, present-tense preferred)
            definition: Authoritative definition agreed by stakeholders
            context_of_use: The bounded context this term belongs to
            synonyms: Alternative terms that mean the same thing
            aliases_conflicting: Terms that look similar but have different meanings
            validated_by: Name of the domain expert who confirmed this definition
        
        Returns:
            The created or updated DomainTerm
        """
        if aliases_conflicting is None:
            aliases_conflicting = []

        self._terms[term] = DomainTerm(
            term=term,
            definition=definition,
            context_of_use=context_of_use,
            synonyms=synonyms,
            aliases_conflicting=aliases_conflicting,
            last_validated_by=validated_by,
        )
        return self._terms[term]

    def get(self, term: str) -> DomainTerm | None:
        """Look up a term. Returns None if not yet defined."""
        return self._terms.get(term)

    def find_conflicts(self) -> list[tuple[str, str]]:
        """Return pairs of terms whose definitions reference each other circularly.
        
        Circular references between definitions often indicate that the concepts
        are actually the same concept with different names — a sign that two
        bounded contexts may have been split incorrectly.
        """
        conflicts: list[tuple[str, str]] = []
        terms_list = list(self._terms.values())

        for i, term_a in enumerate(terms_list):
            for term_b in terms_list[i + 1 :]:
                if (
                    term_a.term.lower() in term_b.definition.lower()
                    and term_b.term.lower() in term_a.definition.lower()
                ):
                    conflicts.append((term_a.term, term_b.term))

        return conflicts

    def terms_by_context(self) -> dict[str, list[DomainTerm]]:
        """Group all terms by their bounded context for easy review."""
        grouped: dict[str, list[DomainTerm]] = {}
        for entry in self._terms.values():
            grouped.setdefault(entry.context_of_use, []).append(entry)
        return grouped

    def __len__(self) -> int:
        return len(self._terms)


# Example usage — extracting terms from a payments domain
def extract_payments_language() -> UbiquitousLanguageDictionary:
    """Demonstrate language extraction for an e-commerce payments bounded context."""
    dictionary = UbiquitousLanguageDictionary()

    dictionary.add_term(
        term="Settlement",
        definition="The transfer of funds from the buyer's bank to the merchant's account, "
                   "typically occurring 1-3 business days after transaction authorization",
        context_of_use="Payments Bounded Context",
        synonyms=("payout", "fund transfer"),
        aliases_conflicting=["Clearing"],  # Clearing = validation step BEFORE settlement
        validated_by="Maria Chen, Head of Finance",
    )

    dictionary.add_term(
        term="Chargeback",
        definition="A forced transaction reversal initiated by the cardholder's bank, "
                   "not the merchant. The disputed amount is deducted from the merchant's settlement",
        context_of_use="Payments Bounded Context",
        synonyms=("dispute reversal",),
        validated_by="Maria Chen, Head of Finance",
    )

    dictionary.add_term(
        term="Authorization Hold",
        definition="A temporary reservation of funds on the customer's payment method. "
                   "Does not transfer money — only prevents the customer from spending those funds. "
                   "Expires after 7 days unless captured into a settlement",
        context_of_use="Payments Bounded Context",
        synonyms=("pre-authorization", "auth hold"),
        aliases_conflicting=["Reservation"],  # Reservation in Inventory context means something else
        validated_by="Marcus Webb, Lead Payments Engineer",
    )

    return dictionary


# ❌ BAD: Unstructured note-taking — no authority, no resolution of conflicts
bad_notes = [
    "settlement = money goes to merchant (from finance guy)",
    "settlement = the process of completing a trade (from trader who meant something else)",
]

# ✅ GOOD: Structured dictionary with authoritative definitions and conflict tracking
good_dict = extract_payments_language()
settlement_term = good_dict.get("Settlement")
assert settlement_term.context_of_use == "Payments Bounded Context"
assert settlement_term.aliases_conflicting == ["Clearing"]
```

**Key principles:**
- Capture terms *verbatim* from stakeholders before normalizing — the original language reveals how experts think
- Every term must have a single authoritative definition per bounded context; conflicts are explicit data, not noise
- Record who validated each term — when a definition is disputed, you know whom to escalate to
- Circular definition detection (`find_conflicts`) surfaces cases where two terms actually describe the same concept

---

### Pattern 2: Bounded Context Mapping

Bounded contexts are structural boundaries where a domain model applies. The same business concept can have completely different models in different contexts. A context map visualizes how these contexts interact and which translation or adaptation patterns govern their relationships. This pattern helps you decide where to draw service boundaries, team boundaries, and module separation in your architecture.

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORDER MANAGEMENT SYSTEM                   │
│                                                                 │
│  ┌──────────────┐    Customer/Supplier    ┌──────────────────┐  │
│  │   ORDERS     │ ◄────────────────────►  │    PAYMENTS      │  │
│  │              │    (we conform to their) │                  │  │
│  │  - Order     │                         │  - Transaction   │  │
│  │  - Item      │                         │  - Settlement    │  │
│  └──────┬───────┘                         └────────┬─────────┘  │
│         │                                          │            │
│         │  Anticorruption Layer                    │            │
│         │  (translate Shipping terms)              │            │
│         ▼                                          ▼            │
│  ┌──────────────┐                         ┌──────────────────┐  │
│  │    INVENTORY │                         │     CUSTOMERS    │  │
│  │              │   Published Language    │                  │  │
│  │  - SKU       │ ◄────────────────────►  │  - Account       │  │
│  │  - Warehouse │    (REST API spec)      │  - Address       │  │
│  └──────┬───────┘                         └──────────────────┘  │
│         │                                                       │
│         │  Shared Kernel (Product catalog subset)               │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   CATALOG    │                                               │
│  │              │                                               │
│  │  - Product   │                                               │
│  │  - Category  │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

Relationships:
  Orders → Payments:     Customer/Supplier (Orders depends on Payments' Transaction model)
  Orders ↔ Inventory:    Anticorruption Layer (Inventory uses "Bin Location", Orders uses "Shipment Origin")
  Customers ↔ Inventory: Published Language (both consume the same REST catalog API)
  Orders → Catalog:      Shared Kernel (both use a subset of Product model with strict change protocol)
```

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional


class ContextRelationship(Enum):
    """The relationship patterns from Evans' Strategic Design."""

    CUSTOMER_SUPPLIER = auto()  # One context depends on the other's model; contracts define boundaries
    CONFORMIST = auto()         # Subordinate adopts upstream's model without translation
    ACL = auto()                # Anticorruption Layer — translates between incompatible models
    SHARED_KERNEL = auto()      # Two contexts share a subset of models with coordination protocol
    PUBLISHED_LANGUAGE = auto() # Communication via documented, open protocol or language
    OPEN_HOST_SERVICE = auto()  # Expose model as service API for others to consume
    PIPELINE = auto()           # One-way information flow; receiving side transforms independently


@dataclass(frozen=True)
class BoundedContext:
    """A bounded context — a structural boundary where a domain model applies."""

    name: str
    description: str
    team_owner: str
    subdomain_classification: CoreSupportingGeneric = CoreSupportingGeneric.GENERIC
    _relationships: list[ContextRelationship] = field(default_factory=list, repr=False)

    def add_relationship(self, pattern: ContextRelationship) -> None:
        """Add a relationship pattern. Frozen dataclass uses __post_init__ + object.__setattr__."""
        if self._relationships is None:
            object.__setattr__(self, '_relationships', [])
        object.__setattr__(self, '_relationships', [*self._relationships, pattern])

    @property
    def relationships(self) -> list[ContextRelationship]:
        return list(self._relationships) if self._relationships else []


class ContextMapBuilder:
    """Builds and validates a context map from bounded context definitions.
    
    Validates that relationship patterns are semantically consistent — e.g.,
    a Shared Kernel must have exactly two contexts sharing models, not one or three.
    """

    def __init__(self) -> None:
        self._contexts: dict[str, BoundedContext] = {}
        self._relationship_rules: list[dict[str, str]] = []

    def add_context(
        self,
        name: str,
        description: str,
        team_owner: str,
        subdomain: CoreSupportingGeneric = CoreSupportingGeneric.GENERIC,
    ) -> BoundedContext:
        """Register a bounded context in the map."""
        ctx = BoundedContext(
            name=name,
            description=description,
            team_owner=team_owner,
            subdomain_classification=subdomain,
        )
        self._contexts[name] = ctx
        return ctx

    def define_relationship(
        self,
        source_context: str,
        target_context: str,
        pattern: ContextRelationship,
        shared_models: tuple[str, ...] = (),
    ) -> dict[str, object]:
        """Define a relationship between two bounded contexts.
        
        Args:
            source_context: Name of the context initiating or owning this interaction
            target_context: Name of the dependent or receiving context
            pattern: The relationship pattern governing this interaction
            shared_models: If Shared Kernel, which models are shared between contexts
        
        Returns:
            Relationship record for documentation generation
        """
        if source_context not in self._contexts:
            raise KeyError(f"Context '{source_context}' not registered. Register it first.")
        if target_context not in self._contexts:
            raise KeyError(f"Context '{target_context}' not registered. Register it first.")

        relationship = {
            "source": source_context,
            "target": target_context,
            "pattern": pattern,
            "shared_models": shared_models,
        }
        self._relationship_rules.append(relationship)

        # Attach to both contexts for quick lookup
        self._contexts[source_context].add_relationship(pattern)
        if target_context != source_context:
            self._contexts[target_context].add_relationship(pattern)

        return relationship

    def identify_acl_boundaries(self) -> list[dict[str, str]]:
        """Return all contexts that serve as Anticorruption Layer boundaries.
        
        ACLs are the most architecturally expensive patterns — they add a full
        translation layer between incompatible models. Flagging them helps
        leadership understand where integration complexity lives.
        """
        return [
            rule for rule in self._relationship_rules
            if rule["pattern"] == ContextRelationship.ACL
        ]

    def generate_context_map_summary(self) -> str:
        """Generate a text summary of the full context map."""
        lines = ["=== Context Map Summary ===", ""]
        for name, ctx in self._contexts.items():
            rel_count = len(ctx.relationships)
            lines.append(f"  {ctx.name} ({ctx.subdomain_classification.value})")
            lines.append(f"    Owner: {ctx.team_owner}")
            lines.append(f"    Relationships: {rel_count}")

        if self._relationship_rules:
            lines.append("")
            lines.append("  Relationships:")
            for rule in self._relationship_rules:
                pattern_name = rule["pattern"].name.replace("_", " ").title()
                shared = f" [Shared: {', '.join(rule['shared_models'])}]" \
                    if rule.get('shared_models') else ""
                lines.append(f"    {rule['source']} → {rule['target']}: {pattern_name}{shared}")

        return "\n".join(lines)


# Example: E-commerce context map with real-world relationships
def build_ecommerce_context_map() -> ContextMapBuilder:
    """Build a bounded context map for an e-commerce platform."""
    builder = ContextMapBuilder()

    # Register all bounded contexts
    orders = builder.add_context(
        name="Orders",
        description="Manages order lifecycle from cart checkout through fulfillment",
        team_owner="Commerce Team A",
        subdomain=CoreSupportingGeneric.CORE,
    )

    payments = builder.add_context(
        name="Payments",
        description="Handles transaction processing, settlements, and chargebacks",
        team_owner="Payments Team B",
        subdomain=CoreSupportingGeneric.CORE,
    )

    inventory = builder.add_context(
        name="Inventory",
        description="Tracks stock levels, warehouse allocation, and replenishment",
        team_owner="Warehouse Operations",
        subdomain=CoreSupportingGeneric.SUPPORTING,
    )

    customers = builder.add_context(
        name="Customers",
        description="Manages customer accounts, profiles, and preferences",
        team_owner="Growth Team C",
        subdomain=CoreSupportingGeneric.SUPPORTING,
    )

    catalog = builder.add_context(
        name="Catalog",
        description="Product information, categories, pricing tiers, and search indexing",
        team_owner="Commerce Team A",
        subdomain=CoreSupportingGeneric.SUPPORTING,
    )

    shipping = builder.add_context(
        name="Shipping",
        description="External logistics provider integration — rate calculation, label generation, tracking",
        team_owner="Third-party (ShipStation API)",
        subdomain=CoreSupportingGeneric.GENERIC,
    )

    # Define relationships between contexts
    orders.define_relationship("Orders", "Payments", ContextRelationship.CUSTOMER_SUPPLIER)
    orders.define_relationship("Orders", "Inventory", ContextRelationship.ACL)
    customers.define_relationship("Customers", "Catalog", ContextRelationship.PUBLISHED_LANGUAGE, ("Product",))
    orders.define_relationship("Orders", "Catalog", ContextRelationship.SHARED_KERNEL, ("Product", "PriceTier"))
    orders.define_relationship("Orders", "Shipping", ContextRelationship.ACL)

    return builder


# Usage
if __name__ == "__main__":
    ecom_map = build_ecommerce_context_map()
    print(ecom_map.generate_context_map_summary())
    
    acl_boundaries = ecom_map.identify_acl_boundaries()
    print(f"\nACL boundaries ({len(acl_boundaries)}):")
    for acl in acl_boundaries:
        print(f"  {acl['source']} → {acl['target']}: requires full translation layer")
```

**Key principles:**
- Draw the map on a whiteboard with stakeholders present — context mapping is a social activity, not a documentation exercise
- ACLs are expensive — every ACL adds a translation module that must be maintained and tested. Minimize their number by negotiating model alignment upstream
- Shared Kernels require change coordination protocols — if both teams modify the shared subset independently, bugs will occur. Establish a review gate for shared model changes
- A `Conformist` relationship means one team has no choice but to adopt another team's terminology and data shape. Make this explicit — it is often an architectural debt that should be resolved

---

### Pattern 3: Subdomain Classification

Every bounded context (or sub-context within it) falls into one of three categories: core, supporting, or generic. This classification drives investment decisions — what to build in-house, what to buy, and what to outsource. Core domains are your competitive moat; generic domains are commoditized problems that any competent vendor can solve. Supporting domains sit in between.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional


class SubdomainClassification(Enum):
    """Strategic classification of a subdomain by its business value."""

    CORE = auto()          # Differentiates your business — build in-house with deep investment
    SUPPORTING = auto()    # Necessary but not distinctive — invest for efficiency, not uniqueness
    GENERIC = auto()       # Commoditized — buy off-the-shelf or use standard solutions


@dataclass(frozen=True)
class SubdomainAnalysis:
    """Structured analysis of a single subdomain's strategic classification.
    
    The investment_decision is derived from the classification and specifies
    what action the organization should take.
    """

    name: str
    classification: SubdomainClassification
    description: str
    investment_decision: str  # "Build", "Buy", "Outsource", or "Optimize"
    built_in_house: bool      # True for CORE, depends for SUPPORTING, False for GENERIC
    team_with_domain_expertise: Optional[str] = None
    alternatives_evaluated: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class SubdomainPortfolio:
    """Aggregates all subdomain analyses to guide investment strategy."""

    subdomains: tuple[SubdomainAnalysis, ...] = ()

    @classmethod
    def from_list(cls, subdomains: list[SubdomainAnalysis]) -> SubdomainPortfolio:
        return cls(subdomains=tuple(sorted(subdomains, key=lambda s: (
            0 if s.classification == SubdomainClassification.CORE else
            1 if s.classification == SubdomainClassification.SUPPORTING else 2,
            s.name
        ))))

    @property
    def core_count(self) -> int:
        return sum(1 for s in self.subdomains if s.classification == SubdomainClassification.CORE)

    @property
    def supporting_count(self) -> int:
        return sum(1 for s in self.subdomains if s.classification == SubdomainClassification.SUPPORTING)

    @property
    def generic_count(self) -> int:
        return sum(1 for s in self.subdomains if s.classification == SubdomainClassification.GENERIC)

    def generate_investment_report(self) -> str:
        """Produce a summary report for leadership on investment allocation."""
        lines = [
            "=== Subdomain Investment Analysis ===",
            f"  Core domains:     {self.core_count} (Build in-house — highest priority)",
            f"  Supporting:       {self.supporting_count} (Optimize internally — medium priority)",
            f"  Generic:          {self.generic_count} (Buy/Outsource — lowest investment)",
            "",
        ]

        # List core domains that lack assigned domain expertise
        missing_expertise = [
            s for s in self.subdomains
            if s.classification == SubdomainClassification.CORE and not s.team_with_domain_expertise
        ]
        if missing_expertise:
            lines.append("  ⚠ WARNING — Core domains without assigned domain expertise:")
            for s in missing_expertise:
                lines.append(f"    - {s.name}: no team with domain expertise identified")
            lines.append("")

        # List generic domains currently being built in-house
        self_built_generic = [
            s for s in self.subdomains
            if s.classification == SubdomainClassification.GENERIC and s.built_in_house
        ]
        if self_built_generic:
            lines.append("  ⚠ WARNING — Generic domains currently built in-house:")
            for s in self_built_generic:
                lines.append(f"    - {s.name}: evaluate buying or outsourcing")
            lines.append("")

        # List each subdomain with its classification and decision
        lines.extend([
            "  Detailed breakdown:",
        ])
        for s in self.subdomains:
            lines.append(
                f"    [{s.classification.name}] {s.name}: {s.investment_decision}"
            )
            if s.alternatives_evaluated:
                lines.append(f"      Alternatives considered: {', '.join(s.alternatives_evaluated)}")

        return "\n".join(lines)


# Example: Subdomain classification for a fintech company
def analyze_fintech_subdomains() -> SubdomainPortfolio:
    """Classify subdomains for a digital banking platform."""
    subdomains = [
        SubdomainAnalysis(
            name="Fraud Detection Engine",
            classification=SubdomainClassification.CORE,
            description="Real-time transaction fraud scoring using proprietary ML models",
            investment_decision="Build — this is our competitive moat",
            built_in_house=True,
            team_with_domain_expertise="Risk Engineering Team",
        ),
        SubdomainAnalysis(
            name="Regulatory Reporting",
            classification=SubdomainClassification.SUPPORTING,
            description="Generate required reports for regulatory bodies (FINRA, SEC)",
            investment_decision="Optimize internally — use best-in-class template library",
            built_in_house=True,
            team_with_domain_expertise="Compliance Engineering",
        ),
        SubdomainAnalysis(
            name="Identity Verification (KYC)",
            classification=SubdomainClassification.GENERIC,
            description="Customer identity verification via document scanning and biometrics",
            investment_decision="Buy — Jumio or Onfido solution",
            built_in_house=False,
            alternatives_evaluated=["Onfida API", "Jumio SDK", "Build in-house"],
        ),
        SubdomainAnalysis(
            name="Payment Processing",
            classification=SubdomainClassification.GENERIC,
            description="Card payments, ACH transfers, wire routing — standardized infrastructure",
            investment_decision="Buy — Stripe or Adyen processor",
            built_in_house=False,
            alternatives_evaluated=["Stripe", "Adyen", "Build custom processor"],
        ),
        SubdomainAnalysis(
            name="Customer Onboarding Flow",
            classification=SubdomainClassification.CORE,
            description="End-to-end account opening with conversion optimization",
            investment_decision="Build — conversion rate is our primary growth lever",
            built_in_house=True,
            team_with_domain_expertise="Product Engineering Team",
        ),
        SubdomainAnalysis(
            name="Email/SMS Notifications",
            classification=SubdomainClassification.GENERIC,
            description="Transactional notifications for account events",
            investment_decision="Buy — SendGrid + Twilio integration",
            built_in_house=False,
            alternatives_evaluated=["SendGrid + Twilio", "SES + SNS", "Build in-house"],
        ),
    ]

    return SubdomainPortfolio.from_list(subdomains)


# ❌ BAD: Classifying everything as core — leads to over-investment and wasted resources
bad_classification = [
    # Every feature is "core" so nothing is prioritized; build time explodes
]

# ✅ GOOD: Honest classification drives rational investment decisions
portfolio = analyze_fintech_subdomains()
print(portfolio.generate_investment_report())

# Verify the classification logic
assert portfolio.core_count == 2, "Should have exactly 2 core domains"
assert portfolio.generic_count == 3, "Should have exactly 3 generic domains"
```

**Key principles:**
- Be ruthless about generic classification — if a problem exists in every company of your type, someone has already solved it elegantly and you should buy the solution
- Core domains must have engineers with genuine domain expertise assigned. If your team knows nothing about fraud patterns, that is not actually a core capability yet — it is an aspiration
- Supporting domains deserve optimization investment but not moonshot innovation. Make them reliable and efficient; they are infrastructure, not differentiation
- Generic domains being built in-house are architectural debt. Every month spent maintaining a KYC system you could buy for $5k/month is a month of core engineering wasted

---

## Constraints

### MUST DO

- **Capture stakeholder language verbatim before normalizing** — record how experts actually talk about their domain; imposing developer terminology at the start corrupts the ubiquitous language from the beginning
- **Resolve every term definition conflict explicitly** — if two stakeholders disagree on what "order" means, that is a bounded context boundary signal, not something to paper over with vague definitions
- **Classify every subdomain before any coding begins** — an unclassified subdomain will become architectural debt as teams make ad-hoc technology and team assignment decisions based on incomplete understanding
- **Draw the context map visually with stakeholders present** — this is a collaborative sense-making activity, not a documentation exercise. Static documents produced in isolation will be wrong
- **Name every context-to-context relationship pattern explicitly** — never leave an interaction between bounded contexts implicit. Each one should have a named pattern (Customer/Supplier, ACL, Conformist, etc.)
- **Assign a domain expert to every core subdomain** — core capabilities without domain expertise are vulnerabilities waiting to become failures

### MUST NOT DO

- **Skip domain modeling for "simple" projects** — even seemingly simple systems develop hidden complexity as they grow; the cost of modeling is small compared to the cost of refactoring
- **Let developers choose terminology during implementation** — if developers name classes based on database columns or UI labels, the ubiquitous language is broken and technical debt accumulates silently
- **Use "shared everything" architecture when bounded contexts differ** — sharing databases, APIs, or code between contexts with conflicting definitions guarantees that someone's model will be wrong in production
- **Treat context maps as one-time deliverables** — domains evolve. Revisit the map quarterly, after every major feature launch, and when new teams join. An outdated context map is worse than no map
- **Create ACLs as a default relationship pattern** — Anticorruption Layers add significant complexity. Prefer negotiating model alignment upstream over building translation layers downstream

---

## Output Template

When applying this skill, produce:

1. **Ubiquitous Language Dictionary** — Structured entries (term, definition, context_of_use, validated_by) covering all core domain concepts. Must be distributable as a wiki page or shared document.
2. **Bounded Context Inventory** — List of all identified bounded contexts with one-sentence descriptions and team ownership assignments.
3. **Context Map Diagram** — Visual (ASCII art or diagram) showing all bounded contexts and their relationship patterns, exported to the project's architecture documentation.
4. **Subdomain Classification Table** — Every subdomain listed with its classification (core/supporting/generic), investment decision, and team assignment.
5. **Architecture Recommendations** — Based on the domain analysis, specific recommendations for module structure, team organization, technology selection, and service boundaries.

All outputs should be reviewable artifacts that can be presented to both technical teams and business stakeholders. The ubiquitous language dictionary must be written in plain language that non-technical stakeholders can validate.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Tactical patterns (aggregates, value objects, entities) applied AFTER the domain has been modeled by this skill |
| `software-design-principles` | Structural design principles (SOLID, modular decomposition) that guide implementation within a modeled domain |
| `framework-requirements` | Project scaffolding and framework selection informed by the module boundaries defined in the domain model |

---

## Further Reading

- *Domain-Driven Design: Tackling Complexity in the Heart of Software* by Eric Evans (the Blue Book) — original definition of ubiquitous language, bounded contexts, context maps, and core/supporting/generic classification
- *Implementing Domain-Driven Design* by Vaughn Vernon (the Red Book) — practical examples with strategic design patterns adapted across languages
- [Strategy Pattern Context Maps](https://dddcommunity.org/library/vernon_2014/) — Martin Fowler's article clarifying the 7 relationship patterns between bounded contexts
