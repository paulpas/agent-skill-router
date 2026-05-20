---
name: test-driven-development
description: Implements test-driven development (TDD) cycle with red-green-refactor workflow, writing failing unit tests before implementation code to drive design and catch regressions early.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: test-driven development, tdd, red-green-refactor, unit testing, how do i write tests first, test-first approach, behavior driven
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: mocking, test-coverage-analysis, refactoring
---

# Test-Driven Development (TDD)

When this skill is active, I act as a TDD practitioner who writes failing tests before implementation code, using the strict red-green-refactor cycle to drive clean, well-designed code. I enforce the discipline that every line of production code must be preceded by a failing test, ensuring that behavior is specified before it is implemented. This approach naturally produces code aligned with SOLID principles — especially Single Responsibility and Dependency Inversion — because small, focused tests force small, focused functions.

## TL;DR Checklist

- [ ] Verify the test fails in RED phase before writing any production code
- [ ] Confirm the implementation is the absolute minimum to pass the failing test
- [ ] Check that test names describe behavior using "should" or "raises" phrasing
- [ ] Validate all tests use Arrange-Act-Assert structure with clear section comments
- [ ] Ensure no test depends on execution order, shared state, or network calls
- [ ] Verify every refactoring is followed by a full green test suite run
- [ ] Confirm edge cases (empty input, boundary values, error conditions) are tested before happy path

---

## When to Use

Use this skill when:

- Starting a new module, function, or class where the API contract is not yet finalized — TDD drives interface design through its tests.
- Refactoring existing code that lacks test coverage — write a regression test first, then refactor with confidence.
- Designing public APIs or library interfaces — write consumer-facing tests that describe how the API should behave.
- Implementing critical business logic where correctness is non-negotiable (pricing rules, tax calculations, authentication flows) — TDD catches subtle edge cases early.
- Onboarding a new developer to an existing codebase — use TDD as a learning discipline to understand legacy modules by writing tests first.

---

## When NOT to Use

Avoid this skill for:

- Exploratory prototyping or spike work where the goal is rapid discovery of feasibility, not production-quality code.
- UI layout and visual styling tasks where changes are validated visually rather than through automated assertions.
- One-off scripts (data cleanup, migration helpers) that run once and are never maintained.
- Performance-critical hot paths where benchmark-driven optimization cycles are more appropriate — write the fast version first, then add correctness tests afterward.

---

## Core Workflow

Follow the strict RED → GREEN → REFACTOR cycle for every unit of behavior. Do not skip phases.

### Phase 1: RED — Write a Failing Test

1. Identify the smallest verifiable behavior that the next line of production code must satisfy. Think in terms of single responsibility.
2. Write a test function in your desired API style (pytest `def test_*`, following AAA structure). The test name must describe the expected behavior, not the implementation detail.
3. Run only this new test to verify it fails for the right reason — it should fail with `NameError` or `AssertionError`, never for an unrelated cause.

**Checkpoint:** The test fails deterministically before any production code exists for this behavior. If it passes without production code, the test is not testing anything meaningful.

### Phase 2: GREEN — Write Minimal Code to Pass

1. Write the absolute minimum production code required to make the failing test pass. Do not add features, do not handle cases not covered by the current test, do not refactor yet.
2. Use stubs, early returns, or hardcoded values if necessary — the goal is only green, not elegant.
3. Run the new test to verify it passes.

**Checkpoint:** The single failing test now passes with minimal implementation. The test suite for previously completed behaviors still passes. You have made exactly one behavioral change.

### Phase 3: REFACTOR — Clean Up with Confidence

1. Refactor both test and production code. Remove duplication, extract functions, rename variables, improve readability. Your tests serve as the safety net — if refactoring breaks behavior, the tests catch it immediately.
2. Apply SOLID principles during refactoring. If you cannot write a focused test for a function, it likely violates Single Responsibility Principle.
3. Run the FULL test suite after refactoring to confirm no regression was introduced.

**Checkpoint:** All tests (old and new) pass. Code quality has improved (shorter functions, clearer names, less duplication). No behavior has changed — only the implementation has evolved.

---

## Implementation Patterns

### Pattern 1: Arrange-Act-Assert Structure

The AAA pattern enforces test clarity by separating each logical phase with a blank line and comment. This structure is critical for diagnostics — when a test fails, knowing which phase failed narrows the investigation significantly.

```python
# ❌ BAD — Mixed phases, unclear what is being tested, no structure
def test_process_order():
    order = Order(items=[{"sku": "A", "price": 10, "qty": 2}])
    tax_rate = 0.08
    shipping = 5.0 if order.total < 50 else 0
    total_with_tax = (order.total + shipping) * (1 + tax_rate)
    result = order.process(tax_rate, shipping)
    assert result == total_with_tax
```

```python
# ✅ GOOD — Clear AAA structure, behavior-focused name, explicit assertions
from decimal import Decimal
from dataclasses import dataclass


@dataclass(frozen=True)
class LineItem:
    sku: str
    unit_price: Decimal
    quantity: int

    @property
    def subtotal(self) -> Decimal:
        return self.unit_price * self.quantity


@dataclass(frozen=True)
class Order:
    items: tuple[LineItem, ...]
    tax_rate: Decimal = Decimal("0.08")

    @property
    def total(self) -> Decimal:
        return sum((item.subtotal for item in self.items), Decimal("0"))

    def process(self) -> dict[str, str | float]:
        subtotal = self.total
        tax = subtotal * self.tax_rate
        grand_total = subtotal + tax
        return {
            "subtotal": float(subtotal),
            "tax": float(tax),
            "grand_total": float(grand_total),
        }


def test_process_order_returns_correct_totals() -> None:
    """Order with two line items should compute subtotal, tax, and grand total."""
    # Arrange
    order = Order(
        items=(
            LineItem(sku="A", unit_price=Decimal("10.00"), quantity=2),
            LineItem(sku="B", unit_price=Decimal("5.50"), quantity=3),
        ),
        tax_rate=Decimal("0.08"),
    )

    # Act
    result = order.process()

    # Assert
    assert result["subtotal"] == 36.50
    assert abs(result["tax"] - 2.92) < 0.01
    assert result["grand_total"] == 39.42
```

**Why it matters:** When the assertion on `result["tax"]` fails, you immediately know the problem is in tax computation (the Assert phase), not in how the order was constructed (Arrange) or how `process()` was called (Act). This dramatically reduces debugging time.

### Pattern 2: Testing Edge Cases Before Happy Path

Always test boundary conditions and error states before the "happy path." Edge cases reveal assumptions baked into implementation that happy paths hide. Write these tests first to force the implementation to handle them correctly from the start.

```python
# ✅ GOOD — Edge cases tested explicitly before the happy path
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional


def calculate_discounted_price(
    unit_price: Decimal,
    quantity: int,
    discount_percent: Decimal,
) -> Decimal:
    """Calculate final price after percentage discount.

    Args:
        unit_price: Price per item, must be non-negative.
        quantity: Number of items, must be positive.
        discount_percent: Discount from 0 (none) to 100 (free).

    Returns:
        Total discounted price rounded to 2 decimal places.

    Raises:
        ValueError: If unit_price is negative, quantity is non-positive,
                    or discount_percent is outside [0, 100].
    """
    if unit_price < Decimal("0"):
        raise ValueError("unit_price must be non-negative")
    if quantity <= 0:
        raise ValueError("quantity must be positive")
    if not Decimal("0") <= discount_percent <= Decimal("100"):
        raise ValueError("discount_percent must be between 0 and 100 inclusive")

    subtotal = unit_price * quantity
    discount = subtotal * (discount_percent / Decimal("100"))
    final_price = subtotal - discount
    return float(final_price)


def test_calculate_discounted_price_rejects_negative_unit_price() -> None:
    """Edge case: negative price should raise ValueError."""
    with pytest.raises(ValueError, match="non-negative"):
        calculate_discounted_price(Decimal("-5.00"), quantity=1, discount_percent=Decimal("0"))


def test_calculate_discounted_price_rejects_zero_quantity() -> None:
    """Edge case: zero quantity should raise ValueError."""
    with pytest.raises(ValueError, match="positive"):
        calculate_discounted_price(Decimal("10.00"), quantity=0, discount_percent=Decimal("0"))


def test_calculate_discounted_price_rejects_over_100_discount() -> None:
    """Edge case: discount exceeding 100% should raise ValueError."""
    with pytest.raises(ValueError, match="between 0 and 100"):
        calculate_discounted_price(Decimal("10.00"), quantity=1, discount_percent=Decimal("150"))


def test_calculate_discounted_price_rejects_negative_discount() -> None:
    """Edge case: negative discount should raise ValueError."""
    with pytest.raises(ValueError, match="between 0 and 100"):
        calculate_discounted_price(Decimal("10.00"), quantity=1, discount_percent=Decimal("-5"))


def test_calculate_discounted_price_handles_float_precision() -> None:
    """Edge case: values with many decimal places should round correctly."""
    price = Decimal("9.999")
    qty = 3
    discount = Decimal("12.5")
    result = calculate_discounted_price(price, qty, discount)
    # Expected: (9.999 * 3) * (1 - 0.125) = 29.997 * 0.875 = 26.247375 → 26.25
    assert abs(result - 26.25) < 0.01


def test_calculate_discounted_price_happy_path() -> None:
    """Happy path: 2 items at $10 each with 10% discount should return $18.00."""
    result = calculate_discounted_price(Decimal("10.00"), quantity=2, discount_percent=Decimal("10"))
    assert result == pytest.approx(18.00)


def test_calculate_discounted_price_full_discount_returns_zero() -> None:
    """Edge case: 100% discount should return zero."""
    result = calculate_discounted_price(Decimal("100.00"), quantity=5, discount_percent=Decimal("100"))
    assert result == 0.0
```

**Key insight:** By writing the negative tests first (Patterns 2a–2d), the implementation is forced to validate inputs before computing anything. The happy path test (2e) becomes trivial — it only verifies that correct computation happens after validation passes.

### Pattern 3: Mocking External Dependencies

Unit tests must be fast, deterministic, and isolated from external systems. Use precise mocks for database calls, HTTP requests, file I/O, and email services. Never let a unit test hit the network or write to disk.

```python
# ❌ BAD — Integration test disguised as a unit test: hits real database
import sqlite3


def test_create_user_saves_to_database():
    """This is NOT a unit test — it requires a running DB connection."""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)")

    user_email = "alice@example.com"
    cursor.execute("INSERT INTO users (email) VALUES (?)", (user_email,))
    conn.commit()

    cursor.execute("SELECT email FROM users WHERE email = ?", (user_email,))
    result = cursor.fetchone()

    assert result is not None
    assert result[0] == "user@example.com"  # Bug: wrong expected value, still passes with DB
    conn.close()
```

```python
# ✅ GOOD — Unit test with precise mock: fast, deterministic, no external dependency
from unittest.mock import MagicMock, patch


class UserRepository:
    """Repository for user persistence."""

    def __init__(self, connection) -> None:
        self._connection = connection

    def save(self, email: str) -> int:
        """Persist a user by email and return the generated ID.

        Args:
            email: The user's email address, must be unique.

        Returns:
            The integer ID assigned to the new user.
        """
        query = "INSERT INTO users (email) VALUES (?)"
        cursor = self._connection.cursor()
        cursor.execute(query, (email,))
        self._connection.commit()
        return cursor.lastrowid

    def find_by_email(self, email: str) -> str | None:
        """Look up a user's email. Returns None if not found."""
        query = "SELECT email FROM users WHERE email = ?"
        cursor = self._connection.cursor()
        cursor.execute(query, (email,))
        row = cursor.fetchone()
        return row[0] if row else None


def test_user_repository_save_returns_inserted_id():
    """Verify save returns the ID from cursor.lastrowid."""
    # Arrange — mock the entire DB connection
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.lastrowid = 42
    mock_conn.cursor.return_value = mock_cursor

    repo = UserRepository(mock_conn)

    # Act
    user_id = repo.save("alice@example.com")

    # Assert
    assert user_id == 42
    mock_cursor.execute.assert_called_once_with(
        "INSERT INTO users (email) VALUES (?)", ("alice@example.com",)
    )
    mock_conn.commit.assert_called_once()


def test_user_repository_find_by_email_returns_none_for_missing_user():
    """Verify find_by_email returns None when no matching record exists."""
    # Arrange
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = None  # No row found
    mock_conn.cursor.return_value = mock_cursor

    repo = UserRepository(mock_conn)

    # Act
    result = repo.find_by_email("ghost@example.com")

    # Assert
    assert result is None


def test_user_repository_find_by_email_returns_email_for_existing_user():
    """Verify find_by_email returns the email string for a found user."""
    # Arrange
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = ("bob@example.com",)  # Tuple, matches DB cursor result
    mock_conn.cursor.return_value = mock_cursor

    repo = UserRepository(mock_conn)

    # Act
    result = repo.find_by_email("bob@example.com")

    # Assert
    assert result == "bob@example.com"
```

**Key insight:** The BAD example is an integration test — it requires database setup, takes milliseconds instead of microseconds, and hides bugs through incorrect expected values. The GOOD examples run instantly, have no dependencies, and each tests exactly one behavior with a precise assertion on the mock calls.

### Pattern 4: Property-Based Testing for Complex Logic

For functions with complex invariants that are hard to enumerate by hand, use Hypothesis for property-based testing. This discovers edge cases you would never think to write manually by generating thousands of random inputs.

```python
import hypothesis.strategies as st
from hypothesis import given, settings, assume
from hypothesis.errors import InvalidArgument
from typing import List


def merge_sorted_lists(
    left: List[int],
    right: List[int],
) -> List[int]:
    """Merge two sorted lists into a single sorted list.

    Args:
        left: First sorted input list (ascending order).
        right: Second sorted input list (ascending order).

    Returns:
        A new list containing all elements from both inputs, sorted ascending.
    """
    result: List[int] = []
    i, j = 0, 0

    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    # Append remaining elements from either list
    result.extend(left[i:])
    result.extend(right[j:])

    return result


@given(
    left=st.lists(st.integers(min_value=-1_000_000, max_value=1_000_000), min_size=0, max_size=20),
    right=st.lists(st.integers(min_value=-1_000_000, max_value=1_000_000), min_size=0, max_size=20),
)
@settings(max_examples=200, deadline=500)
def test_merge_preserves_all_elements(left: List[int], right: List[int]) -> None:
    """Property: the merged result contains exactly the multiset union of both inputs."""
    assume(len(left) > 0 or len(right) > 0)  # Skip degenerate all-empty case

    merged = merge_sorted_lists(left, right)

    # Property 1: total length equals sum of input lengths
    assert len(merged) == len(left) + len(right)

    # Property 2: every element from left appears in merged
    for element in left:
        assert element in merged

    # Property 3: every element from right appears in merged
    for element in right:
        assert element in merged


@given(
    left=st.lists(st.integers(min_value=-1_000_000, max_value=1_000_000), min_size=0, max_size=20),
    right=st.lists(st.integers(min_value=-1_000_000, max_value=1_000_000), min_size=0, max_size=20),
)
@settings(max_examples=200, deadline=500)
def test_merge_output_is_sorted(left: List[int], right: List[int]) -> None:
    """Property: the merged result is always in ascending order."""
    assume(len(left) > 0 or len(right) > 0)

    merged = merge_sorted_lists(left, right)

    for i in range(1, len(merged)):
        assert merged[i - 1] <= merged[i]


@given(
    sorted_left=st.lists(st.integers(), min_size=1, max_size=10, unique=True),
    sorted_right=st.lists(st.integers(), min_size=1, max_size=10, unique=True),
)
@settings(max_examples=200, deadline=500)
def test_merge_with_duplicates_handles_repeated_values(sorted_left: List[int], sorted_right: List[int]) -> None:
    """Property: duplicate values across inputs are preserved in the output."""
    # Introduce controlled duplicates by setting matching boundaries
    if sorted_left and sorted_right:
        shared_value = sorted_left[-1]  # Use last of left as shared
        sorted_right_copy = [shared_value] + sorted_right

        merged = merge_sorted_lists(sorted_left, sorted_right_copy)

        # Count occurrences in input
        expected_count_left = sum(1 for x in sorted_left if x == shared_value)
        expected_count_right = sum(1 for x in sorted_right_copy if x == shared_value)
        expected_total = expected_count_left + expected_count_right

        # Output must contain the same number of shared values
        actual_count = sum(1 for x in merged if x == shared_value)
        assert actual_count == expected_total

        # And the list is still sorted
        for i in range(1, len(merged)):
            assert merged[i - 1] <= merged[i]
```

**Key insight:** The three Hypothesis tests encode mathematical properties (multiset union, sortedness, duplicate preservation) rather than specific input-output pairs. Hypothesis generates over 600 random test cases in total, catching bugs like off-by-one errors or incorrect merge order that hand-written edge case tests might miss.

---

## Constraints

### MUST DO

1. Write the failing test first (RED phase) before any production code exists for that behavior. This is the core TDD discipline — never write implementation without a failing test driving it.
2. Keep each cycle small: one test, one minimal implementation, then refactor. A single TDD iteration should take 2–10 minutes, not hours. If you are writing more than one test before running code, your cycle is too big.
3. Name tests descriptively using behavior phrasing: `test_{subject}_{condition}_{expected}`. Examples: `test_calculate_discount_rejects_negative_price`, `test_parse_email_raises_on_missing_at`. Avoid `test_001` or `test_method_a`.
4. Use Arrange-Act-Assert structure in every test with blank line separators and comment markers. This is the single highest-impact pattern for test readability and debugging speed.
5. Mock external dependencies (databases, HTTP clients, file systems, email services) in unit tests. Unit tests must be deterministic and run in milliseconds — any network call or disk I/O turns them into slow integration tests.
6. Test edge cases before the happy path: empty inputs, single items, boundary values (zero, negative, maximum), and precision-sensitive operations. These failures expose assumptions that happy paths mask.
7. Run the FULL test suite after every refactoring step. Partial runs risk missing regressions in unrelated modules. The green state is a safety guarantee — protect it rigorously.

### MUST NOT DO

1. Write production code without a failing test driving it. This violates TDD discipline and leaves untested paths in your codebase that become regression traps during future refactoring.
2. Write tests that depend on execution order, shared mutable state, or network calls. Each test must be independently runnable in any order with `pytest -x` — if tests interfere with each other, they are fragile and misleading.
3. Mock entire modules indiscriminately. Only mock external boundaries (database adapters, HTTP clients). Internal method calls within your own classes should use real implementations so you verify actual behavior, not just mock call counts.
4. Put integration tests (database access, real HTTP calls, file system writes) in the unit test suite. Separate them into `tests/integration/` and run with a dedicated marker like `@pytest.mark.integration`. Mixing suites makes CI slow and flaky.
5. Skip hard-to-write tests for complex logic. The tests you resist writing are almost always the most critical — they cover edge cases, error paths, and boundary conditions that break in production first.
6. Use magic numbers in assertions. Define constants or use `pytest.approx()` for floating-point comparisons. Hardcoded values like `assert result == 3.14159` make tests brittle and obscure intent.
7. Test implementation details instead of behavior. Do not assert that a private method was called (`assert obj._validate.called`) — assert the observable outcome instead (`assert obj.is_valid`). This keeps tests resilient to refactoring and enforces clean interfaces.

---

## TDD Anti-Patterns

### Anti-Pattern 1: The "Golden Master" (Reverse Engineering)

Writing all production code first, then reverse-engineering tests that pass. This is not TDD — it is post-hoc validation disguised as testing. The tests become documentation of what was already written rather than design drivers for what should be written.

```python
# ❌ BAD — Golden Master: production code written first, test added after
def calculate_shipping(weight_kg: float) -> float:
    """Calculate shipping cost based on weight."""
    if weight_kg <= 0:
        return 0.0
    base_rate = 5.0
    per_kg_rate = 1.2
    if weight_kg > 20:
        per_kg_rate = 0.8  # Volume discount
    return base_rate + (weight_kg * per_kg_rate)


def test_calculate_shipping():
    """Test written after the implementation — just verifies existing behavior."""
    assert calculate_shipping(5) == 11.0
    assert calculate_shipping(25) == 25.0


# ✅ GOOD — TDD: test first drives design, implementation is minimal and correct
def test_calculate_shipping_zero_weight_returns_zero() -> float:
    """Edge case: zero or negative weight should cost nothing."""
    assert calculate_shipping(0) == pytest.approx(0.0)
    assert calculate_shipping(-1) == pytest.approx(0.0)


def test_calculate_shipping_under_20kg_applies_standard_rate() -> None:
    """Standard rate: $5 base + $1.20/kg for packages up to 20kg."""
    result = calculate_shipping(5)
    assert result == pytest.approx(11.0)  # 5.0 + (5 * 1.2)


def test_calculate_shipping_over_20kg_applies_discounted_rate() -> None:
    """Volume discount: $5 base + $0.80/kg for packages over 20kg."""
    result = calculate_shipping(25)
    assert result == pytest.approx(25.0)  # 5.0 + (25 * 0.8)


def test_calculate_shipping_boundary_exactly_20kg() -> None:
    """Boundary: exactly 20kg should use standard rate, not discounted."""
    result = calculate_shipping(20)
    assert result == pytest.approx(29.0)  # 5.0 + (20 * 1.2) — standard rate


def test_calculate_shipping_boundary_exactly_21kg() -> None:
    """Boundary: 21kg should trigger the discounted rate."""
    result = calculate_shipping(21)
    assert result == pytest.approx(21.8)  # 5.0 + (21 * 0.8) — discounted rate
```

**Why this is harmful:** The Golden Master test has only two assertions — it validates the final implementation but tells you nothing about whether the volume discount threshold was an intentional design decision or a hardcoded accident. The TDD version with boundary tests forces the developer to think about what happens at 20kg vs 21kg before writing the conditional logic, resulting in clearer, more deliberate code.

### Anti-Pattern 2: The "Over-Mocked" Test

Mocking everything including internal methods so thoroughly that the test verifies nothing about actual application behavior. You end up testing the mock library rather than your code.

```python
# ❌ BAD — Over-mocked: everything is mocked, nothing real is tested
def test_user_service_creates_and_sends_welcome_email():
    """This test mocks so aggressively it never tests real user logic."""
    mock_repo = MagicMock()
    mock_email_client = MagicMock()

    service = UserService(mock_repo, mock_email_client)
    service.create_user("alice@example.com", "Secret123!")

    # These assertions only verify the mock was called — not that anything real happened
    mock_repo.save.assert_called_once()
    mock_email_client.send.assert_called_once()
```

```python
# ✅ GOOD — Selective mocking: real logic tested, external boundaries isolated
class UserRepository:
    """In-memory repository for unit testing."""

    def __init__(self) -> None:
        self._users: dict[str, str] = {}

    def save(self, email: str, password_hash: str) -> int:
        """Persist a user. Returns auto-generated ID."""
        if email in self._users:
            raise ValueError(f"User with email {email} already exists")
        user_id = len(self._users) + 1
        self._users[email] = password_hash
        return user_id

    def find_by_email(self, email: str) -> str | None:
        """Look up a user's stored password hash by email."""
        return self._users.get(email)


class EmailClient:
    """External email delivery service — mocked in tests."""

    def send_welcome_email(self, to: str, subject: str, body: str) -> bool:
        """Send a welcome email. Returns True on success."""
        ...  # Actual HTTP call to email provider


class UserService:
    """Business logic for user management."""

    def __init__(self, user_repo: UserRepository, email_client: EmailClient) -> None:
        self._repo = user_repo
        self._email_client = email_client

    def create_user(self, email: str, password: str) -> int:
        """Create a new user account and send a welcome email.

        Args:
            email: The user's email address. Must be unique.
            password: Plain text password (should be hashed in production).

        Returns:
            The integer ID of the newly created user.

        Raises:
            ValueError: If a user with this email already exists.
        """
        user_id = self._repo.save(email, password)  # In real code, hash first
        self._email_client.send_welcome_email(
            to=email,
            subject="Welcome!",
            body=f"Hello {email}, your account has been created.",
        )
        return user_id


def test_user_service_rejects_duplicate_email() -> None:
    """Verify that creating a second user with the same email raises ValueError."""
    # Arrange — use real repository (no mock needed), mock only external email
    repo = UserRepository()
    mock_email = MagicMock(spec=EmailClient)

    service = UserService(repo, mock_email)
    service.create_user("alice@example.com", "password123")

    with pytest.raises(ValueError, match="already exists"):
        service.create_user("alice@example.com", "different_password")

    # The email was never sent because the second save failed
    mock_email.send_welcome_email.assert_called_once()


def test_user_service_sends_welcome_on_success() -> None:
    """Verify welcome email is sent with correct recipient and subject."""
    repo = UserRepository()
    mock_email = MagicMock(spec=EmailClient)

    service = UserService(repo, mock_email)
    user_id = service.create_user("bob@example.com", "securepass")

    assert user_id == 1
    mock_email.send_welcome_email.assert_called_once_with(
        to="bob@example.com",
        subject="Welcome!",
        body="Hello bob@example.com, your account has been created.",
    )
```

**Why this is harmful:** The BAD test never verifies that `UserRepository.save` actually stores data — it only checks that a mock was called. The GOOD test uses a real in-memory repository to verify the duplicate-email constraint, while still mocking the external `EmailClient`. This tests actual business logic rather than mock call counts.

---

## Output Template

When this skill is active, produce the following output for each behavior being implemented:

1. **Test Specification** — The failing test (RED phase) with a descriptive name, AAA structure, and assertion that defines expected behavior. Include any fixtures or setup needed.
2. **Minimal Implementation** — The simplest possible production code that makes the test pass (GREEN phase). Use stubs, early returns, or hardcoded values if needed. Add a comment `# TODO: replace with real implementation` where appropriate.
3. **Refactoring Summary** — After GREEN, describe what was cleaned up during REFACTOR phase. List extracted functions, renamed variables, or duplicated code removed. Confirm the full test suite still passes.
4. **Edge Cases Covered** — A bulleted list of edge cases tested in this cycle (empty input, boundary values, error conditions). Each edge case should reference its corresponding test function name.
5. **Test Quality Check** — A final checklist confirming: AAA structure used, no shared state, no network calls, descriptive names, assertions on behavior not implementation details.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `mocking` | Precise mocking techniques for external dependencies using pytest fixtures and unittest.mock — essential companion to TDD for isolating unit tests. |
| `test-coverage-analysis` | Analyze test coverage reports, identify untested branches, and prioritize which paths need additional tests after TDD cycles. |
| `refactoring` | Apply safe refactoring techniques with tests as the regression guard — directly follows the REFACTOR phase of each TDD cycle. |
