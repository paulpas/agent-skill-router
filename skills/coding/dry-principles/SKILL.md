---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Implements DRY (Don't Repeat Yourself) principle enforcement through
  pattern recognition, code duplication detection, and refactoring guidance for clean
  maintainable codebases
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: clean-code, code-refactoring-refactor-clean, code-review
  role: implementation
  scope: implementation
  triggers: dry principle, don't repeat yourself, code duplication, refactoring, code
    duplication detection, refactoring guidance, maintainable code, code reuse
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
  version: 1.0.0
name: dry-principles
------
# DRY Principle Enforcer

Implements DRY (Don't Repeat Yourself) principle enforcement by identifying semantic duplication patterns, providing actionable refactoring strategies, and guiding developers toward maintainable codebases where knowledge and logic exist in exactly one place.

## TL;DR Checklist

- [ ] Identify semantic duplication (same intent, different syntax)
- [ ] Distinguish syntactic similarity from true duplication
- [ ] Apply extraction strategies (function, class, mixin, template method)
- [ ] Preserve single source of truth for business logic
- [ ] Verify refactoring doesn't create hidden coupling
- [ ] Update documentation when abstracting duplicated logic
- [ ] Test thoroughly after extraction to maintain behavior

---

## When to Use

Use this skill when:

- Detecting copy-paste code patterns across multiple files or functions
- Writing or reviewing code with similar logic repeated 2+ times
- Adding new features that require modifying existing duplicated code
- Onboarding developers to explain why certain patterns exist
- Designing libraries or frameworks where API consistency matters
- Refactoring legacy codebases with known duplication issues
- Creating reusable components or modules

---

## When NOT to Use

Avoid applying DRY enforcement when:

- **Coincidental similarity**: Two functions happen to use similar syntax but solve different problems (e.g., `add(1, 2)` and `add(3, 4)` with different domains)
- **Performance-critical paths**: Where inlining provides measurable optimization and duplication is justified
- **Independent evolution**: When duplicated code is expected to diverge (e.g., parallel test suites with different setups)
- **Temporary code**: Quick prototypes or spike solutions where refactoring overhead outweighs benefit
- **Cross-cutting concerns**: Logging, error handling, metrics collection—consider composition or decorators instead

**Rule of thumb**: If changing one instance requires changing all others to maintain consistency, it's duplication. If each instance can evolve independently, it's intentional parallelism.

---

## Core Workflow

1. **Detect Semantic Duplication** — Identify code that expresses the same concept or intent, not just similar syntax. **Checkpoint:** Verify both instances would need identical changes if the underlying business rule changed.

2. **Classify Duplication Type** — Categorize as: copy-paste (identical), boilerplate (structural), or conceptual (same logic with minor variations). **Checkpoint:** Choose appropriate extraction strategy based on variation pattern.

3. **Extract to Single Source of Truth** — Apply refactoring: extract function, extract class, use template method, or introduce mixin/composition. **Checkpoint:** Ensure no code remains that duplicates the extracted logic.

4. **Maintain Backward Compatibility** — If extracting from existing code, ensure all callers continue to work without modification or with minimal adapter changes. **Checkpoint:** All existing tests pass after extraction.

5. **Document the Abstraction** — Add clear documentation explaining the abstraction's purpose, boundaries, and variation points. **Checkpoint:** New developers can understand the abstraction without reading implementation details.

---

## Implementation Patterns

### Pattern 1: Extract Function for Duplicate Logic

When identical or near-identical code appears 2+ times, extract to a single function with configurable parameters.

```python
# ❌ BAD — Copy-paste duplication violates DRY
def calculate_shipping_cost_urgent(weight: float, distance: float) -> float:
    base_rate = 5.00
    weight_multiplier = 2.50
    distance_multiplier = 1.50
    return base_rate + (weight * weight_multiplier) + (distance * distance_multiplier)

def calculate_shipping_cost_standard(weight: float, distance: float) -> float:
    base_rate = 3.00
    weight_multiplier = 1.50
    distance_multiplier = 1.00
    return base_rate + (weight * weight_multiplier) + (distance * distance_multiplier)

def calculate_shipping_cost_economy(weight: float, distance: float) -> float:
    base_rate = 2.00
    weight_multiplier = 1.00
    distance_multiplier = 0.80
    return base_rate + (weight * weight_multiplier) + (distance * distance_multiplier)

# ✅ GOOD — Extracted with configurable parameters
def calculate_shipping_cost(
    weight: float,
    distance: float,
    base_rate: float = 3.00,
    weight_multiplier: float = 1.50,
    distance_multiplier: float = 1.00,
) -> float:
    """Calculate shipping cost with configurable pricing tiers."""
    return base_rate + (weight * weight_multiplier) + (distance * distance_multiplier)

# Usage: define pricing tiers as configuration
URGENT_TIER = {"base_rate": 5.00, "weight_multiplier": 2.50, "distance_multiplier": 1.50}
STANDARD_TIER = {"base_rate": 3.00, "weight_multiplier": 1.50, "distance_multiplier": 1.00}
ECONOMY_TIER = {"base_rate": 2.00, "weight_multiplier": 1.00, "distance_multiplier": 0.80}

cost_urgent = calculate_shipping_cost(weight, distance, **URGENT_TIER)
```

### Pattern 2: Template Method for Variation Points

When code structure is identical but specific steps vary, use template method pattern to define skeleton and let subclasses customize.

```typescript
// ❌ BAD — Boilerplate duplication with only implementation changing
class XmlDataExporter {
  async export(data: any[]): Promise<string> {
    const headers = await this.fetchHeaders();
    const validated = this.validateData(data);
    const transformed = this.transformToXml(validated);
    const compressed = this.compress(transformed);
    return this.save(compressed);
  }

  protected async fetchHeaders(): Promise<Map<string, string>> {
    return new Map([['Content-Type', 'application/xml']]);
  }

  protected validateData(data: any[]): boolean {
    return data.every(item => item.id !== undefined);
  }

  protected transformToXml(data: any[]): string {
    return data.map(item => `<item id="${item.id}">${JSON.stringify(item)}</item>`).join('\n');
  }

  protected compress(content: string): string {
    return content; // No compression for XML
  }

  protected save(content: string): Promise<string> {
    return fs.promises.writeFile('export.xml', content);
  }
}

class JsonDataExporter {
  async export(data: any[]): Promise<string> {
    const headers = await this.fetchHeaders();
    const validated = this.validateData(data);
    const transformed = this.transformToJson(validated);
    const compressed = this.compress(transformed);
    return this.save(compressed);
  }

  protected async fetchHeaders(): Promise<Map<string, string>> {
    return new Map([['Content-Type', 'application/json']]);
  }

  protected validateData(data: any[]): boolean {
    return data.every(item => item.id !== undefined);
  }

  protected transformToJson(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  protected compress(content: string): string {
    return content; // No compression for JSON
  }

  protected save(content: string): Promise<string> {
    return fs.promises.writeFile('export.json', content);
  }
}

// ✅ GOOD — Template method defines invariant structure
abstract class DataExporter<T extends string> {
  async export(data: any[]): Promise<T> {
    const headers = await this.fetchHeaders();
    const validated = this.validateData(data);
    const transformed = this.transform(validated);
    const compressed = this.compress(transformed);
    return this.save(compressed) as Promise<T>;
  }

  protected abstract transform(data: any[]): T;

  protected async fetchHeaders(): Promise<Map<string, string>> {
    return new Map();
  }

  protected validateData(data: any[]): boolean {
    return data.every(item => item.id !== undefined);
  }

  protected compress(content: T): T {
    return content; // Default: no compression
  }

  protected abstract save(content: T): Promise<T>;
}

class XmlDataExporter extends DataExporter<string> {
  protected async fetchHeaders(): Promise<Map<string, string>> {
    return new Map([['Content-Type', 'application/xml']]);
  }

  protected transform(data: any[]): string {
    return data.map(item => `<item id="${item.id}">${JSON.stringify(item)}</item>`).join('\n');
  }

  protected save(content: string): Promise<string> {
    return fs.promises.writeFile('export.xml', content);
  }
}

class JsonDataExporter extends DataExporter<string> {
  protected async fetchHeaders(): Promise<Map<string, string>> {
    return new Map([['Content-Type', 'application/json']]);
  }

  protected transform(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  protected save(content: string): Promise<string> {
    return fs.promises.writeFile('export.json', content);
  }
}
```

### Pattern 3: Strategy Pattern for Algorithm Families

When the same operation has multiple algorithms or approaches, use strategy pattern to encapsulate variations.

```python
# ❌ BAD — Conditional logic duplicates across the codebase
class PaymentProcessor:
    def process(self, amount: float, method: str) -> dict:
        if method == "credit_card":
            # Validation logic duplicated
            if not self.validate_card_number(self.card_number):
                raise ValueError("Invalid card number")
            if not self.validate_expiry(self.expiry_date):
                raise ValueError("Card expired")
            # Processing logic specific to credit card
            fee = amount * 0.029 + 0.30
            return {"status": "processed", "fee": fee, "method": "credit_card"}
        
        elif method == "paypal":
            # Same validation logic duplicated
            if not self.validate_email(self.paypal_email):
                raise ValueError("Invalid PayPal email")
            # Processing logic specific to PayPal
            fee = amount * 0.049
            return {"status": "processed", "fee": fee, "method": "paypal"}
        
        elif method == "bank_transfer":
            # Again, same validation pattern
            if not self.validate_account_number(self.account_number):
                raise ValueError("Invalid account number")
            if not self.validate_routing_number(self.routing_number):
                raise ValueError("Invalid routing number")
            # Processing logic for bank transfer
            fee = 2.50
            return {"status": "processed", "fee": fee, "method": "bank_transfer"}
        
        raise ValueError(f"Unsupported payment method: {method}")

# ✅ GOOD — Strategy pattern extracts variations
from abc import ABC, abstractmethod

class PaymentValidator(ABC):
    @abstractmethod
    def validate(self, data: dict) -> bool:
        pass

class CreditCardValidator(PaymentValidator):
    def validate(self, data: dict) -> bool:
        return (self._validate_card_number(data.get("card_number")) and
                self._validate_expiry(data.get("expiry_date")))

class PayPalValidator(PaymentValidator):
    def validate(self, data: dict) -> bool:
        return self._validate_email(data.get("paypal_email"))

class BankTransferValidator(PaymentValidator):
    def validate(self, data: dict) -> bool:
        return (self._validate_account_number(data.get("account_number")) and
                self._validate_routing_number(data.get("routing_number")))

class PaymentStrategy(ABC):
    @abstractmethod
    def calculate_fee(self, amount: float) -> float:
        pass

    @abstractmethod
    def get_method_name(self) -> str:
        pass

class CreditCardStrategy(PaymentStrategy):
    def calculate_fee(self, amount: float) -> float:
        return amount * 0.029 + 0.30

    def get_method_name(self) -> str:
        return "credit_card"

class PayPalStrategy(PaymentStrategy):
    def calculate_fee(self, amount: float) -> float:
        return amount * 0.049

    def get_method_name(self) -> str:
        return "paypal"

class BankTransferStrategy(PaymentStrategy):
    def calculate_fee(self, amount: float) -> float:
        return 2.50

    def get_method_name(self) -> str:
        return "bank_transfer"

class PaymentProcessor:
    def __init__(
        self,
        validator: PaymentValidator,
        strategy: PaymentStrategy,
        data: dict
    ):
        self.validator = validator
        self.strategy = strategy
        self.data = data

    def process(self) -> dict:
        if not self.validator.validate(self.data):
            raise ValueError(f"Validation failed for {self.strategy.get_method_name()}")
        
        fee = self.strategy.calculate_fee(self.data.get("amount", 0))
        return {
            "status": "processed",
            "fee": fee,
            "method": self.strategy.get_method_name()
        }

# Usage: each payment method has its own validator and strategy
processor = PaymentProcessor(
    validator=CreditCardValidator(),
    strategy=CreditCardStrategy(),
    data={"amount": 100.0, "card_number": "4111111111111111", "expiry_date": "12/25"}
)
result = processor.process()
```

### Pattern 4: Extract Configuration for Magic Values

When the same values appear scattered throughout code, extract to a single configuration source.

```python
# ❌ BAD — Magic values scattered (duplication of configuration)
class EmailService:
    MAX_RECIPIENTS = 50  # Duplicated constant
    TIMEOUT_SECONDS = 30  # Duplicated constant
    
    def send_batch(self, recipients: list[str], message: str) -> None:
        if len(recipients) > self.MAX_RECIPIENTS:  # Using duplicate constant
            raise ValueError(f"Cannot send to more than {self.MAX_RECIPIENTS} recipients")
        
        for i in range(0, len(recipients), self.MAX_RECIPIENTS):  # Using duplicate constant
            batch = recipients[i:i + self.MAX_RECIPIENTS]
            self._send_batch(batch, message)

class NotificationService:
    MAX_RECIPIENTS = 50  # Same constant duplicated again!
    TIMEOUT_SECONDS = 30  # And again!
    
    def push_notification(self, tokens: list[str], payload: dict) -> None:
        if len(tokens) > self.MAX_RECIPIENTS:
            raise ValueError(f"Cannot send to more than {self.MAX_RECIPIENTS} devices")

# ✅ GOOD — Single source of configuration
from typing import Final

class AppConfiguration:
    """Single source of truth for application configuration."""
    
    # Email service limits
    EMAIL_MAX_RECIPIENTS: Final[int] = 50
    EMAIL_TIMEOUT_SECONDS: Final[int] = 30
    EMAIL_RETRY_ATTEMPTS: Final[int] = 3
    
    # Notification service limits
    PUSH_MAX_DEVICES: Final[int] = 100
    PUSH_TIMEOUT_SECONDS: Final[int] = 15
    PUSH_RETRY_ATTEMPTS: Final[int] = 2
    
    # Common limits
    DEFAULT_PAGE_SIZE: Final[int] = 20
    MAX_PAGE_SIZE: Final[int] = 100

config = AppConfiguration()

class EmailService:
    def send_batch(self, recipients: list[str], message: str) -> None:
        if len(recipients) > config.EMAIL_MAX_RECIPIENTS:
            raise ValueError(
                f"Cannot send to more than {config.EMAIL_MAX_RECIPIENTS} recipients"
            )
        
        for i in range(0, len(recipients), config.EMAIL_MAX_RECIPIENTS):
            batch = recipients[i:i + config.EMAIL_MAX_RECIPIENTS]
            self._send_batch(batch, message)

class NotificationService:
    def push_notification(self, tokens: list[str], payload: dict) -> None:
        if len(tokens) > config.PUSH_MAX_DEVICES:
            raise ValueError(
                f"Cannot send to more than {config.PUSH_MAX_DEVICES} devices"
            )
```

---

## Constraints

### MUST DO

- **Detect semantic duplication**: Identify when changing a business rule would require changing multiple code locations
- **Apply extraction with caution**: Ensure extracted code doesn't create hidden dependencies or tight coupling
- **Maintain test coverage**: All tests must pass after refactoring to ensure behavior preservation
- **Prefer composition over inheritance**: When extracting common behavior, use composition unless there's a clear is-a relationship
- **Document variation points**: Clearly document where and how the abstraction can vary in future implementations
- **Consider future evolution**: Design abstractions that can accommodate likely future requirements without breaking existing code

### MUST NOT DO

- **Over-abstraction**: Don't create abstractions for code that won't be reused or is unlikely to change together
- **Abstract for the sake of DRY**: If the duplication is coincidental and unlikely to repeat, keep code separate
- **Create one-size-fits-all abstractions**: Generic abstractions often become overly complex and hard to understand
- **Ignore performance implications**: Some DRY patterns (e.g., excessive polymorphism) may have runtime costs
- **Break encapsulation**: Don't expose internal implementation details to make extraction easier
- **Create circular dependencies**: Extraction should not introduce dependency cycles between modules

---

## Output Template

When applying DRY principle enforcement, structure the output as follows:

1. **Detection Summary** — List all detected duplication instances with file locations and line numbers

2. **Classification** — Identify duplication type: copy-paste, boilerplate, or conceptual

3. **Recommended Refactoring** — Specify extraction strategy:
   - Extract function (for similar logic with configurable parameters)
   - Extract class/mixin (for shared state and behavior)
   - Template method (for invariant structure with varying steps)
   - Strategy pattern (for algorithm families)
   - Configuration extraction (for magic values and constants)

4. **Implementation Sketch** — Provide code example showing:
   - Before state (with duplication)
   - After state (refactored with DRY)
   - Key changes and rationale

5. **Migration Path** — Step-by-step instructions:
   - Create new abstraction first
   - Update callers to use new abstraction
   - Remove old duplicated code
   - Run tests to verify

6. **Risks and Trade-offs** — Document:
   - Performance implications
   - Increased complexity if over-applied
   - Breaking changes if existing API changes
   - Testing requirements for refactored code

---

## Related Skills

| Skill | Purpose |
|---|---|
| `clean-code` | Complementary principles for writing readable, maintainable code; DRY is one aspect of clean code |
| `code-refactoring-refactor-clean` | Specific refactoring techniques to apply after DRY duplication is detected |
| `code-review` | Code review methodology that includes checking for DRY violations as part of quality assurance |
| `m0-foundation` | APEX platform patterns that enforce DRY through configuration and standardized error handling |
| `exchange-adapters` | Exchange adapter patterns that benefit from DRY through shared authentication and error handling |

---

*This skill enforces DRY as a maintainability principle, not a rigid rule. Apply judgment: duplicate code is better than wrong abstraction.*

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia: Don't Repeat Yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [Martin Fowler — Refactoring Duplicates](https://martinfowler.com/refactoring/)
- [The Clean Code Book — DRY Principle (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2013/05/27/TheMathematicianAndTheGarbageCollector.html)
- [Google Style Guide — Avoid Duplication](https://google.github.io/styleguide/)
- [Refactoring.guru — Extract Method Pattern](https://refactoring.com/catalog/extractFunction.html)
