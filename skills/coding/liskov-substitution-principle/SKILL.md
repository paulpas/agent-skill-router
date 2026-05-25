---
name: liskov-substitution-principle
description: Detects and repairs subtype contract violations where derived classes
  break caller expectations by weakening preconditions, strengthening postconditions,
  or introducing side effects — enforcing safe substitutability.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: liskov substitution principle, LSP, subtype contract, precondition, postcondition,
    invariant, is-a relationship, breaking subclass, type safety
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
  - do-dont
  - examples
  related-skills: single-responsibility, open-closed-principle, interface-segregation-principle,
    dependency-inversion-principle
------
# Liskov Substitution Principle (LSP)

Enforces the Liskov Substitution Principle by detecting subtype contract violations where derived or specialized classes break caller expectations. Identifies preconditions that are weakened, postconditions that are strengthened, invariants that are broken, and side effects introduced at the subclass level — then repairs them through proper inheritance design, composition, or the Composition over Inheritance pattern.

## TL;DR Checklist

- [ ] List every precondition (input validation, required state) the base class method promises
- [ ] List every postcondition (return value guarantee, side effect, exception type) the base class method guarantees
- [ ] Verify each subclass accepts no more inputs than the parent and returns the same or broader result type
- [ ] Check that every overridden method raises the same exceptions on invalid input as the parent
- [ ] Confirm class invariants hold after any method call in every subclass
- [ ] Replace inheritance with composition when the "is-a" relationship is semantically invalid

---

## When to Use

Use this skill when:

- Reviewing a class hierarchy where callers pass subclasses interchangeably and something breaks silently or raises unexpected errors
- Adding a new subclass and suspecting its overridden methods change behavior beyond what the parent contract allows
- Refactoring a fragile base class where child classes are breaking caller assumptions about method return types, exception behavior, or side effects
- Designing an abstract base class (ABC) or Protocol and defining the contract that all implementors must honor
- Encountering `NotImplementedError` in an overridden method — this is almost always an LSP violation
- Auditing library code where a third-party subclass of your ABC raises different exceptions or returns default values instead of failing

---

## When NOT to Use

Avoid this skill for:

- **Flat module design** — If you are not using inheritance, abstract classes, or protocol implementations, LSP does not apply (use `design-patterns-and-principles` for other structural concerns)
- **Interface vs. implementation disagreements** — If the issue is about forcing a client to depend on unused methods, that is Interface Segregation Principle (use `interface-segregation-principle`)
- **One-off scripts or throwaway prototypes** — Contract analysis adds overhead when correctness of substitution is irrelevant to the task
- **Performance profiling scenarios** — LSP violations are design problems; use profiling skills first to confirm the issue is structural, not algorithmic

---

## Core Workflow

1. **Extract the Base Class Contract** — For each public method in the base class (ABC, Protocol, or parent class), enumerate:
   - **Preconditions**: What must be true about inputs and object state before the method is called? (e.g., non-empty list, value within range, file path exists)
   - **Postconditions**: What is guaranteed after the method returns? (e.g., return type, side effect like writing to a file, exception raised on error)
   - **Invariants**: State constraints that must hold true after any public method call.
   **Checkpoint:** Every subclass must satisfy these preconditions and postconditions without the caller knowing it is using a subclass.

2. **Walk Each Subclass Override** — For every overridden method in each subclass, check:
   - Does the subclass accept MORE inputs than the parent? (e.g., adds required parameters without defaults) → **Weakened precondition**
   - Does the subclass return FEWER results or a different type? (e.g., returns `None` instead of a value on success) → **Strengthened postcondition**
   - Does the subclass change which exceptions are raised for the same invalid input? → **Postcondition mismatch**
   - Does the subclass introduce new side effects (e.g., writes to disk, sends network requests)? → **Unexpected behavior**
   - Does the class invariant break in this subclass? (e.g., parent requires `sorted == True` after every method call, child's override breaks sorting)
   **Checkpoint:** Every caller that works with the base type must work identically with the subclass. No `isinstance()` checks allowed.

3. **Classify the Violation** — Identify which category of LSP violation is occurring:
   - **"Squircle" (Square-is-not-a-Rectangle)**: The subtype relationship itself is invalid. A Square cannot satisfy Rectangle's `set_width()` without violating `area() == width * height`.
   - **Silent Failure**: Override returns `None`, empty list, or default value instead of raising the exception the parent guarantees. Caller gets confusing downstream errors.
   - **Capability Reduction**: Subclass removes behavior (e.g., `ReadableFile.write()` raises `NotImplementedError`), making it unusable where the parent is expected.
   - **Invariant Break**: One subclass maintains a constraint that another violates (e.g., `total >= 0` invariant in `Account`, but `OverdraftAccount` allows negative balances).
   **Checkpoint:** Before applying a fix, confirm which category you are dealing with — the repair strategy depends on this classification.

4. **Apply the Fix Strategy** — Choose the appropriate pattern based on violation type:
   - **Capability reduction or "squircle"**: Use Composition over Inheritance. Extract the incompatible capability into its own class and compose it instead of inheriting from the parent.
   - **Precondition weakening**: Restore or strengthen the precondition to match (or be stricter than) the parent. Never relax input validation in a subclass.
   - **Postcondition strengthening**: Relax the postcondition to match the parent's guarantees. If the parent says "returns int or raises ValueError," do not return `None` on bad input.
   - **Invariant break**: Extract the invariant into a shared base class, or use a Protocol that both implementations satisfy without requiring a common ancestor.
   - **Unexpected side effects**: Move them behind a separate interface (e.g., an optional `LoggingBehavior` mixin) so callers of the base type are not surprised.
   **Checkpoint:** After applying the fix, verify that every original caller of the base class works with the new subclass without modification.

5. **Validate Substitutability** — Write or confirm tests where instances of both parent and subclass are used interchangeably in a generic function. The behavior must be indistinguishable to the caller.
   **Checkpoint:** `def process(items: list[Base]) -> None:` must work with `[SubA(), SubB()]` where it previously worked with `[Base(), Base()]`.

---

## Implementation Patterns

### Pattern 1: The Classic "Squircle" — Invariant Violation via Composition

The most famous LSP violation: `Square` inheriting from `Rectangle`. Setting width breaks the invariant that area equals width times height because both dimensions must be equal.

```python
# ❌ BAD — Square is a Rectangle only syntactically.
# Setting width on a Square invalidates the mathematical invariant (area = w * h).
from __future__ import annotations


class Rectangle:
    """A geometric rectangle with independent width and height."""

    def __init__(self, width: float, height: float) -> None:
        self._width = width
        self._height = height

    @property
    def width(self) -> float:
        return self._width

    @width.setter
    def width(self, value: float) -> None:
        if value <= 0:
            raise ValueError(f"Width must be positive, got {value}")
        self._width = value

    @property
    def height(self) -> float:
        return self._height

    @height.setter
    def height(self, value: float) -> None:
        if value <= 0:
            raise ValueError(f"Height must be positive, got {value}")
        self._height = value

    @property
    def area(self) -> float:
        return self._width * self._height

    def describe(self) -> str:
        return f"Rectangle({self._width} x {self._height}), area={self.area}"


# ❌ Squircle: Square inherits from Rectangle but breaks the invariant.
# Setting width on a Rectangle changes only one dimension.
# Setting width on a Square must change BOTH dimensions to stay a square,
# which means the subclass's set_width has DIFFERENT behavior than the parent.
class Square(Rectangle):
    """Violates LSP: changing width or height affects both — different behavior from parent."""

    @property
    def width(self) -> float:
        return self._width

    @width.setter
    def width(self, value: float) -> None:
        if value <= 0:
            raise ValueError(f"Side must be positive, got {value}")
        self._width = value
        self._height = value  # Extra behavior the parent does not have

    @property
    def height(self) -> float:
        return self._height

    @height.setter
    def height(self, value: float) -> None:
        if value <= 0:
            raise ValueError(f"Side must be positive, got {value}")
        self._height = value
        self._width = value  # Extra behavior the parent does not have


def print_area(shape: Rectangle) -> None:
    """Caller expects setting width to change only one dimension."""
    shape.width = 10
    # For a Square, this changes BOTH dimensions — caller's assumption is broken.
    print(f"Area after set_width(10): {shape.area}")


# Test proves the violation:
r = Rectangle(3, 4)
s = Square(3)
print_area(r)  # area = 40  (only width changed from 3 to 10)
print_area(s)  # area = 100 (BOTH dimensions changed from 3 to 10)
# Same function, same call pattern, DIFFERENT outcome. LSP broken.


# ✅ GOOD — Composition over Inheritance: Square and Rectangle are separate types.
# They share behavior through a shared abstraction that reflects reality.
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ShapeArea:
    """Behavioral contract: anything with a calculable area."""

    @property
    def area(self) -> float:
        ...  # abstract


class Rectangle(ShapeArea):
    """Rectangle has independent width and height — no LSP issues with itself."""

    def __init__(self, width: float, height: float) -> None:
        if width <= 0 or height <= 0:
            raise ValueError("Width and height must be positive")
        self._width = width
        self._height = height

    @property
    def width(self) -> float:
        return self._width

    @property
    def height(self) -> float:
        return self._height

    @property
    def area(self) -> float:
        return self._width * self._height

    def describe(self) -> str:
        return f"Rectangle({self._width} x {self._height}), area={self.area}"


class Square(ShapeArea):
    """Square is its own type with a single side dimension — no inheritance lie."""

    def __init__(self, side: float) -> None:
        if side <= 0:
            raise ValueError(f"Side must be positive, got {side}")
        self._side = side

    @property
    def area(self) -> float:
        return self._side * self._side

    def describe(self) -> str:
        return f"Square({self._side}), area={self.area}"


def print_area_composed(shape: ShapeArea) -> None:
    """Works correctly with any shape because no inheritance lie exists."""
    print(f"Area: {shape.area}")
```

---

### Pattern 2: Silent Failure — Returning Default Instead of Raising

A subclass silently returns a default value (None, empty list, False) instead of raising the exception the parent contract guarantees. Callers see confusing downstream errors rather than clear failure semantics.

```python
# ❌ BAD — Subclass silently returns None on invalid input
# Parent guarantees: returns a User object or raises ValueError
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class User:
    id: int
    name: str
    email: str


class UserRepository:
    """Parent contract: find_or_create always returns a User or raises ValueError."""

    def find_or_create(self, user_id: int) -> User:
        """Find existing user or create one. Raises ValueError if input is invalid."""
        if user_id <= 0:
            raise ValueError(f"Invalid user_id: {user_id}")
        return self._fetch_from_db(user_id)

    def _fetch_from_db(self, user_id: int) -> User:
        raise NotImplementedError


class CachedUserRepository(UserRepository):
    """Violates LSP: silently returns None instead of raising on invalid input.
    Caller code that does `user = repo.find_or_create(-1)` now gets None,
    and the next line crashes with AttributeError — far from the real bug."""

    def find_or_create(self, user_id: int) -> Optional[User]:
        if user_id <= 0:
            return None  # ❌ Changed exception → default value. Silent failure.
        return self._fetch_from_db(user_id)


def register_new_user(repo: UserRepository, user_id: int) -> User:
    """Caller relies on ValueError being raised for invalid input."""
    user = repo.find_or_create(user_id)
    # With CachedUserRepository, this crashes with AttributeError instead of ValueError
    print(f"Registered user {user.name}")  # ← NoneType error, confusing
    return user


# ✅ GOOD — Subclass preserves the exception contract exactly.
class StrictCachedUserRepository(UserRepository):
    """Honors parent contract: same preconditions, same postconditions, same exceptions."""

    def find_or_create(self, user_id: int) -> User:
        if user_id <= 0:
            raise ValueError(f"Invalid user_id: {user_id}")  # Same exception as parent
        cached = self._get_cached(user_id)
        if cached is not None:
            return cached
        return super().find_or_create(user_id)

    def _get_cached(self, user_id: int) -> Optional[User]:
        """Internal cache lookup — caller does not see this."""
        # Simulated cache miss
        return None


# Verification: both repositories behave identically from the caller's perspective
repo1: UserRepository = UserRepository()
repo2: UserRepository = StrictCachedUserRepository()

try:
    register_new_user(repo1, -1)
except ValueError as e:
    print(f"repo1 caught: {e}")  # "Invalid user_id: -1"

try:
    register_new_user(repo2, -1)
except ValueError as e:
    print(f"repo2 caught: {e}")  # "Invalid user_id: -1" — identical behavior
```

---

### Pattern 3: Capability Reduction — Subclass That Cannot Do What Parent Can

A subclass overrides a method to do nothing or raise `NotImplementedError`, effectively removing a capability the parent provides. This is a form of LSP violation disguised as an "optional feature."

```python
# ❌ BAD — ReadableFile claims to be a File but cannot perform all parent operations
from abc import ABC, abstractmethod
from typing import BinaryIO


class File(ABC):
    """Abstract contract for any file-like object that can read and write."""

    @abstractmethod
    def read(self) -> bytes:
        """Read entire contents. Returns bytes or raises IOError."""

    @abstractmethod
    def write(self, data: bytes) -> int:
        """Write bytes to the file. Returns bytes written or raises IOError."""


class ReadableFile(File):
    """Violates LSP: inherits from File but cannot write — breaks substitutability."""

    def __init__(self, path: str) -> None:
        self._path = path

    def read(self) -> bytes:
        with open(self._path, "rb") as f:
            return f.read()

    def write(self, data: bytes) -> int:
        raise NotImplementedError(
            "ReadableFile does not support writing — caller expecting File will crash"
        )


def backup_file(source: File, dest: File) -> None:
    """Generic function that works with ANY two File objects."""
    content = source.read()
    dest.write(content)  # Crashes if dest is a ReadableFile (can't write)


# This fails at runtime because ReadableFile cannot do what File promises
src = ReadableFile("/tmp/data.bin")
dst = ReadableFile("/tmp/backup.bin")
backup_file(src, dst)  # ← NotImplementedError on the write() call


# ✅ GOOD — Separate the capabilities into distinct contracts.
# Use composition: a writable file COMPOSEs a readable one and adds write behavior.

class Readable(ABC):
    """Contract for objects that support reading."""

    @abstractmethod
    def read(self) -> bytes:
        ...


class Writable(ABC):
    """Contract for objects that support writing."""

    @abstractmethod
    def write(self, data: bytes) -> int:
        ...


class File(Readable, Writable):
    """Full-featured file supporting both reading and writing."""

    def __init__(self, path: str, mode: str = "wb+") -> None:
        self._path = path
        self._handle: BinaryIO | None = None
        self._open(mode)

    def _open(self, mode: str) -> None:
        self._handle = open(self._path, mode)

    def read(self) -> bytes:
        if not self._handle:
            raise IOError("File is closed")
        current_pos = self._handle.tell()
        self._handle.seek(0)
        data = self._handle.read()
        self._handle.seek(current_pos)
        return data

    def write(self, data: bytes) -> int:
        if not self._handle:
            raise IOError("File is closed")
        return self._handle.write(data)


class ReadOnlyFile(File):
    """ReadOnlyFile inherits from File but overrides write to raise — still LSP-safe
    because the exception behavior MATCHES the parent contract. The parent File
    also raises IOError when operations fail. The key difference: ReadOnlyFile's
    precondition for write() is 'always fails' which IS its documented postcondition."""

    def __init__(self, path: str) -> None:
        super().__init__(path, mode="rb")  # Open read-only at OS level

    def write(self, data: bytes) -> int:
        raise IOError(f"ReadOnlyFile: cannot write to {self._path}")


# Now the design is correct: ReadOnlyFile raises an appropriate IOError
# (same exception type as parent's general IOError contract).
# If you truly need separate read-only and writable contracts, use the
# Readable/Writable protocol composition shown above.
```

---

### Pattern 4: Invariant Break Across Subclasses — Extracting Shared State Constraints

A base class maintains an invariant (e.g., `total >= 0` for a bank account), but a subclass breaks it without the caller's knowledge because the subclass uses different internal logic.

```python
# ❌ BAD — OverdraftAccount violates the invariant "balance must be non-negative"
# Parent guarantees this, but child silently allows negative balance.
from __future__ import annotations
from typing import Optional


class Account:
    """Base account with invariant: balance is never negative."""

    def __init__(self, owner: str, initial_balance: float = 0.0) -> None:
        self._owner = owner
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")
        self._balance = initial_balance

    @property
    def owner(self) -> str:
        return self._owner

    @property
    def balance(self) -> float:
        """Postcondition: always returns non-negative value."""
        if self._balance < 0:
            raise RuntimeError(
                f"Invariant broken: balance is {self._balance} — must be >= 0"
            )
        return self._balance

    def deposit(self, amount: float) -> None:
        """Precondition: amount > 0. Postcondition: balance increases by amount."""
        if amount <= 0:
            raise ValueError(f"Deposit amount must be positive, got {amount}")
        self._balance += amount

    def withdraw(self, amount: float) -> None:
        """Precondition: amount > 0 AND amount <= current balance.
        Postcondition: balance decreases by amount (or raises)."""
        if amount <= 0:
            raise ValueError(f"Withdrawal amount must be positive, got {amount}")
        if amount > self._balance:
            raise ValueError(
                f"Insufficient funds: requested {amount}, available {self._balance}"
            )
        self._balance -= amount


class OverdraftAccount(Account):
    """Violates LSP: allows negative balance, breaking the invariant that callers
    of Account depend on. Any function that assumes balance >= 0 will misbehave."""

    def withdraw(self, amount: float) -> None:
        """Overridden to remove the balance check — this weakens the postcondition."""
        if amount <= 0:
            raise ValueError(f"Withdrawal amount must be positive, got {amount}")
        self._balance -= amount  # No balance check — invariant broken!

    @property
    def overdraft_limit(self) -> float:
        return 500.0


# Proof of LSP violation:
def process_withdrawal(account: Account, amount: float) -> None:
    """Caller assumes: if this function doesn't raise ValueError, balance stays >= 0."""
    try:
        account.withdraw(amount)
    except ValueError as e:
        print(f"Rejected: {e}")
        return
    # After this call, caller trusts that account.balance >= 0
    assert account.balance >= 0, "Invariant should hold after successful withdrawal"


# With Account: works correctly — raises ValueError for insufficient funds
a = Account("Alice", 100.0)
process_withdrawal(a, 200.0)  # Raises ValueError ✓

# With OverdraftAccount: passes silently but balance is now negative
b = OverdraftAccount("Bob", 100.0)
process_withdrawal(b, 200.0)  # No exception! Then assert fails at line above.


# ✅ GOOD — OverdraftAccount uses composition and a separate overdraft mechanism.
# The balance invariant is preserved in the base Account; overdraft is handled
# through a separate credit line that does not mutate the base account's invariant.
class CreditLine:
    """Separate concern: manages an approved overdraft limit."""

    def __init__(self, limit: float) -> None:
        if limit < 0:
            raise ValueError("Overdraft limit must be non-negative")
        self._limit = limit
        self._used: float = 0.0

    @property
    def available(self) -> float:
        return self._limit - self._used

    def authorize_withdrawal(self, amount: float) -> bool:
        """Check if overdraft facility can cover the shortfall."""
        shortfall = amount - self._available_credit()
        if shortfall > 0 and shortfall <= self.available:
            self._used += shortfall
            return True
        return False

    def _available_credit(self) -> float:
        """How much credit this account currently has remaining."""
        raise NotImplementedError


class SecureOverdraftAccount(Account):
    """Preserves the Account invariant while adding overdraft via a separate CreditLine."""

    def __init__(
        self,
        owner: str,
        initial_balance: float = 0.0,
        overdraft_limit: float = 500.0,
    ) -> None:
        super().__init__(owner, initial_balance)
        self._credit_line = CreditLine(overdraft_limit)

    def withdraw(self, amount: float) -> None:
        """Withdraw with overdraft protection — invariant preserved at all times."""
        if amount <= 0:
            raise ValueError(f"Withdrawal amount must be positive, got {amount}")

        try:
            super().withdraw(amount)
            return  # Success without touching credit line
        except ValueError as e:
            if "Insufficient funds" in str(e):
                if self._credit_line.authorize_withdrawal(amount):
                    # Overdraft authorized — re-check using the parent's safe path
                    # by temporarily allowing balance to go negative via a protected method
                    current = self.balance
                    shortfall = amount - current
                    super().__init__(self.owner, current - amount)  # Reset with negative
                    # Actually: better approach is a separate internal method
                    raise ValueError(
                        f"Overdraft authorized but requires separate balance tracking"
                    )
                raise ValueError(f"Insufficient funds and overdraft limit exhausted")
            raise


# ✅✅ BETTER — Use composition to completely separate concerns.
# Account never goes negative; overdraft is an external credit decision.
class TransactionAccount:
    """Full design: account balance never goes negative, overdraft is a separate service."""

    def __init__(self, owner: str, initial_balance: float = 0.0) -> None:
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")
        self._owner = owner
        self._balance: float = initial_balance

    @property
    def balance(self) -> float:
        assert self._balance >= 0, "Invariant broken"
        return self._balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError(f"Deposit amount must be positive, got {amount}")
        self._balance += amount

    def withdraw(self, amount: float) -> None:
        """Only withdraws from the real balance. Never goes negative."""
        if amount <= 0:
            raise ValueError(f"Withdrawal amount must be positive, got {amount}")
        if amount > self._balance:
            raise ValueError(
                f"Insufficient funds: requested {amount}, available {self._balance}"
            )
        self._balance -= amount

    @property
    def owner(self) -> str:
        return self._owner
```

---

### Pattern 5: Covariant Return Types — The One Allowed Postcondition Variation

Python (and Java, C#) allow covariant return types in method overrides. A subclass may return a MORE specific type than the parent declares, which is an LSP-compliant weakening of the postcondition (returning a more specific type is always safe because any code expecting the base type can accept the more specific subtype).

```python
# ✅ GOOD — Covariant return types are LSP-safe.
# Parent says "returns Animal", child returns "Dog" — any caller expecting an
# Animal can safely use a Dog without breaking.
from abc import ABC, abstractmethod


class Animal(ABC):
    @abstractmethod
    def speak(self) -> str:
        """Returns the sound this animal makes."""


class Dog(Animal):
    def speak(self) -> str:
        return "Woof!"


class Cat(Animal):
    def speak(self) -> str:
        return "Meow!"


# Covariant return type: subclass narrows the return to a more specific type
class TalkingDog(Dog):
    """Overrides speak() — return type is still str, so this is safe."""

    def __init__(self, name: str) -> None:
        self._name = name

    def speak(self) -> str:
        return f"{self._name} says Woof!"


class DogFactory(ABC):
    """Abstract factory returns a generic Dog."""

    @abstractmethod
    def create_dog(self) -> Dog:
        ...


class TalkingDogFactory(DogFactory):
    """Overrides factory to return the more specific TalkingDog — LSP-safe (covariant)."""

    def create_dog(self) -> TalkingDog:  # Covariant: Dog → TalkingDog
        return TalkingDog(name="Buddy")


# Verification: substitutability holds
def adopt(factory: DogFactory) -> None:
    dog = factory.create_dog()
    print(f"Adopted a {type(dog).__name__} that says: {dog.speak()}")


adopt(DogFactory.__new__(DogFactory))  # Would need concrete impl, shown for type check
# Both factories are interchangeable from adopt()'s perspective.
```

---

## Constraints

### MUST DO
- Every subclass must be usable wherever the parent type is expected without any special handling, `isinstance()` checks, or try/except blocks by the caller
- Preconditions in subclasses must be equal to or stricter than the parent's — never relax input validation, required state checks, or domain constraints
- Postconditions in subclasses must be equal to or weaker (broader) than the parent's — never narrow the return type (except for covariant return types), never replace an exception with a default value, never suppress exceptions silently
- Class invariants must hold after every public method call in every subclass — if a subclass cannot maintain the invariant, inheritance is the wrong tool; use composition instead
- Document preconditions and postconditions in docstrings explicitly — `Raises ValueError when: ...`, `Returns: ... or raises TypeError`
- Write substitutability tests: define a function that accepts the base type and exercise it with every known subclass

### MUST NOT DO
- Override a method to raise `NotImplementedError`, `pass`, or return `None` silently — this is the most common LSP violation and always indicates broken inheritance
- Change a method from raising an exception to returning a default value (or vice versa) without caller awareness — callers depend on the exception contract
- Use inheritance merely for code reuse when the "is-a" relationship is not semantically valid — extract shared logic into a utility module or use composition
- Allow a subclass to change the type of exceptions raised for equivalent invalid inputs — if parent raises `ValueError`, subclass must also raise `ValueError` (or a more specific subtype)
- Modify class invariants conditionally in subclasses — either the invariant is always true (use inheritance), or it is sometimes false (use composition with separate contracts)

---

## Output Template

When auditing or repairing an LSP violation, produce:

1. **Violation Classification** — Which of the four categories: "squircle", silent failure, capability reduction, or invariant break
2. **Contract Extraction** — Parent method's preconditions and postconditions listed explicitly
3. **Subclass Behavior Comparison** — Side-by-side table showing how each subclass deviates from the parent contract
4. **Fix Recommendation** — Specific pattern to apply (Composition over Inheritance, precondition restoration, invariant extraction, protocol separation)
5. **Verification Test** — A generic function that accepts the base type and proves both parent and new subclass work interchangeably

---

## Related Skills

| Skill | Purpose |
|---|---|
| `single-responsibility` | Ensures each class has one reason to change, reducing the surface area where LSP violations can hide |
| `open-closed-principle` | Extending behavior through new implementations rather than modifying existing subclasses — complements LSP's substitution guarantee |
| `interface-segregation-principle` | Prevents fat interfaces that force subclasses into capability reduction — the companion to LSP for interface design |
| `dependency-inversion-principle` | Depend on abstractions so concrete subclasses can be swapped without recompilation — enables LSP at the module level |
| `design-patterns-and-principles` | Broader pattern catalog including Strategy, Bridge, and Template Method patterns that resolve common inheritance problems |

---

## Quick Reference: LSP Violation Detector

Use this mental model when examining any subclass relationship:

```
Base Type (T)
    │
    ├── Subtype A ── Does T → A work for ALL callers of T? ── YES ──→ LSP satisfied
    │                                          │
    │                                          NO ──→ What breaks?
    │                                            ├── Caller gets wrong return type → Strengthened postcondition
    │                                            ├── Caller hits unexpected error → Precondition weakened
    │                                            ├── Caller sees different invariant → State broken
    │                                            └── Caller must add isinstance check → "Is-a" is a lie
    │
    └── Subtype B ── Same questions...
```

The core test: **If I replace every `Base` with `Sub`, does the program behave identically?** If any call site breaks, adapts, or produces different results, LSP is violated. The repair is never to patch the caller — it is to fix the subclass hierarchy.