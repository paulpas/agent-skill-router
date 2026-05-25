---
name: bitwise-masks
description: Implements bitwise operations (&, |, ^, <<, >>) for flag management,
  permission bitmasking, and state tracking across C++, Python, and Rust.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: bitwise operations, bit mask, flag enum, permission bits, bitwise AND,
    shift operator, bitmasking, flag management, state flags, permission mask, bitwise
    OR, XOR flag, bit shifting
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
  - do-dont
  related-skills: reference-operators,type-safety-enums
------
# Bitwise Mask Operations

Implements bitwise operations (&, |, ^, <<, >>) for flag management, permission bitmasking, and state tracking. These low-level patterns eliminate conditional branches, reduce memory footprint, and enable compact representation of multi-state configurations.

## TL;DR Checklist

- [ ] Define flags as distinct powers of two using `1 << N` syntax
- [ ] Use & for checking if specific bits are set in a mask
- [ ] Use | to add/enable flags without disturbing existing ones
- [ ] Use ~ and & together to remove/clear specific flags
- [ ] Use ^ to toggle a flag's state (set if off, clear if on)
- [ ] Validate bit positions fit within the target integer type width

---

## When to Use

Use this skill when:

- Implementing permission systems with multiple access levels (read, write, execute, delete)
- Managing feature flags or configuration options compactly in a single integer field
- Building network protocol parsers that decode binary headers containing flag fields
- Optimizing memory usage by packing multiple boolean states into a single integer instead of separate booleans
- Creating game engine state machines where many on/off states need efficient storage

---

## When NOT to Use

Avoid this skill for:

- Simple true/false logic that only needs two states — use regular `bool` or `std::optional<bool>` instead
- More than ~32 distinct flags in a single bitmask (exceeds 32-bit capacity, switch to multiple fields or typed enums)
- Readability-critical business logic where bitwise operations obscure intent without heavy documentation
- Cross-platform code that must handle undefined behavior around signed integer sign-bit shifting

---

## Core Workflow

1. **Define Flag Constants** — Assign each flag a unique power-of-two value using left shift: `FLAG_A = 1 << 0`, `FLAG_B = 1 << 1`, `FLAG_C = 1 << 2`. Ensure no two flags share the same bit position by designating bit 0 for the first flag, bit 1 for the second, and so on.
   **Checkpoint:** Verify all flag values are distinct powers of two by confirming `(flag_a & flag_b) == 0` for every unique pair.

2. **Initialize State** — Start with a base value of `0` (no flags set) or a known default configuration such as `DEFAULT_PERMS = READ | WRITE`. Always initialize the variable with an explicit value before applying user input or external data.
   **Checkpoint:** Confirm the initial value matches your intended default behavior and that no garbage bits are set from uninitialized memory.

3. **Set Flags (Enable)** — Use bitwise OR (`|`) to add flags without disturbing existing ones: `state = state | FLAG_A` or shorthand `state |= FLAG_A`. This operation sets the target bit to 1 while leaving all other bits unchanged.
   **Checkpoint:** Verify only the target bit changed by comparing `old_state ^ new_state` against the flag being set — the XOR should equal the flag value.

4. **Check Flags** — Use bitwise AND (`&`) to test if specific bits are set, then compare against the flag: `if (state & FLAG_A) { /* flag is active */ }`. This correctly handles cases where multiple flags are active simultaneously.
   **Checkpoint:** Never use strict equality (`==`) after `&` unless you require ALL specified bits to match exactly — most checks should verify presence of at least the requested flags only.

5. **Clear Flags (Disable)** — Use bitwise AND with NOT (`~`) to remove specific flags: `state = state & ~FLAG_A`. The `~` operator inverts the flag mask so only the target bit becomes zero while all other bits pass through unchanged.
   **Checkpoint:** Confirm remaining flags are preserved by asserting `(new_state & ~FLAG_A) == (old_state & ~FLAG_A)` for any unrelated flags.

6. **Toggle Flags** — Use XOR (`^`) to flip a flag's state: `state = state ^ FLAG_A`. If the bit was set, it clears; if it was clear, it sets. This is useful for undo/redo operations and configuration dialogs.
   **Checkpoint:** Only use XOR for toggle semantics — not for "force enable" or "force disable" scenarios where you need deterministic outcomes regardless of current state.

7. **Validate Bounds** — Ensure bit positions never exceed your integer type width (31 for signed 32-bit, 63 for signed 64-bit). When flags originate from external input such as configuration files, network packets, or user data, validate before applying any shifts.
   **Checkpoint:** Add runtime assertions or bounds checks: `assert(flag_bit >= 0 && flag_bit < type_width)` before executing `1 << flag_bit`.

---

## Implementation Patterns

### Pattern 1: Permission Bitmask (C++)

```cpp
#include <cstdint>
#include <iostream>
#include <string>

// Define permissions as distinct bit positions using enum for type safety
enum Permission : uint32_t {
    READ      = 1U << 0,  // 0x00000001
    WRITE     = 1U << 1,  // 0x00000002
    EXECUTE   = 1U << 2,  // 0x00000004
    DELETE    = 1U << 3,  // 0x00000008
    ADMIN     = 1U << 31  // 0x80000000 — highest bit for privileged access
};

class PermissionMask {
public:
    uint32_t flags;

    explicit PermissionMask(uint32_t initial = 0) : flags(initial) {}

    void grant(Permission perm) {
        flags |= static_cast<uint32_t>(perm);
    }

    void revoke(Permission perm) {
        flags &= ~static_cast<uint32_t>(perm);
    }

    bool has(Permission perm) const {
        return (flags & static_cast<uint32_t>(perm)) != 0;
    }

    void toggle(Permission perm) {
        flags ^= static_cast<uint32_t>(perm);
    }

    // Combine multiple permissions at once using a batch mask
    void grant_batch(uint32_t perms) {
        flags |= perms;
    }

    // Check if ALL specified permission bits are present
    bool has_all(uint32_t perms) const {
        return (flags & perms) == perms;
    }

    // Check if ANY of the specified permission bits are present
    bool has_any(uint32_t perms) const {
        return (flags & perms) != 0;
    }

    std::string describe() const {
        std::string desc = "[";
        if (flags & static_cast<uint32_t>(Permission::READ))      desc += "R ";
        if (flags & static_cast<uint32_t>(Permission::WRITE))     desc += "W ";
        if (flags & static_cast<uint32_t>(Permission::EXECUTE))   desc += "X ";
        if (flags & static_cast<uint32_t>(Permission::DELETE))    desc += "D ";
        if (flags & static_cast<uint32_t>(Permission::ADMIN))     desc += "A ";
        // Trim trailing space
        while (!desc.empty() && desc.back() == ' ') desc.pop_back();
        return desc + "]";
    }
};

// Usage: create a mask and grant specific permissions
void apply_admin_access(PermissionMask& user) {
    user.grant_batch(static_cast<uint32_t>(Permission::READ) |
                      static_cast<uint32_t>(Permission::WRITE) |
                      static_cast<uint32_t>(Permission::EXECUTE) |
                      static_cast<uint32_t>(Permission::ADMIN));
}
```

### Pattern 2: Type-Safe Flag Enum (Python IntFlag)

```python
from enum import IntFlag
from typing import Final

class FilePermissions(IntFlag):
    """Type-safe file permission bitmask using Python's IntFlag.
    
    IntFlag combines the properties of int and Flag, enabling both
    arithmetic operations (|, &, ^, ~) and membership testing.
    """
    
    OWNER_READ:      Final = 0o400   # Bit 8  — owner read
    OWNER_WRITE:     Final = 0o200   # Bit 7  — owner write
    OWNER_EXECUTE:   Final = 0o100   # Bit 6  — owner execute
    GROUP_READ:      Final = 0o040   # Bit 5  — group read
    GROUP_WRITE:     Final = 0o020   # Bit 4  — group write
    GROUP_EXECUTE:   Final = 0o010   # Bit 3  — group execute
    OTHER_READ:      Final = 0o004   # Bit 2  — other read
    OTHER_WRITE:     Final = 0o002   # Bit 1  — other write
    OTHER_EXECUTE:   Final = 0o001   # Bit 0  — other execute

def check_permissions(perm: FilePermissions, required: FilePermissions) -> bool:
    """Check if permission set satisfies ALL required flags using bitwise AND."""
    return (perm & required) == required

def merge_permissions(base: FilePermissions, additions: FilePermissions) -> FilePermissions:
    """Combine two permission sets using bitwise OR, returning a new IntFlag."""
    return base | additions

def remove_permissions(perm: FilePermissions, to_remove: FilePermissions) -> FilePermissions:
    """Clear specific flags using bitwise AND with NOT (~)."""
    return perm & ~to_remove

def count_set_bits(perm: FilePermissions) -> int:
    """Count the number of individual permission bits that are set."""
    return bin(perm.value).count('1')

# Example usage with real chmod-style permissions:
user_perms = FilePermissions.OWNER_READ | FilePermissions.OWNER_WRITE | FilePermissions.OWNER_EXECUTE
required_access = FilePermissions.OWNER_READ | FilePermissions.OWNER_WRITE

if check_permissions(user_perms, required_access):
    print("User has read+write access")

# Remove execute permission while preserving read and write
cleaned = remove_permissions(user_perms, FilePermissions.OWNER_EXECUTE)
assert not (cleaned & FilePermissions.OWNER_EXECUTE), "Execute should be cleared"
assert (cleaned & FilePermissions.OWNER_READ), "Read should remain"
```

### Pattern 3: Network Protocol Header Parsing (Rust)

```rust
/// Parse a 16-bit network packet header containing flag fields.
/// Demonstrates extracting individual bits from packed binary data.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PacketFlags {
    pub is_acknowledged: bool,
    pub is_retransmit: bool,
    pub urgent_flag: bool,
    pub reserved_bits: u8,
}

impl PacketFlags {
    const FLAG_ACK:      u16 = 1 << 0;   // Bit 0
    const FLAG_RETRANSMIT: u16 = 1 << 1;  // Bit 1
    const FLAG_URGENT:     u16 = 1 << 2;  // Bit 2
    const MASK_RESERVED:   u16 = 0b1111_0000; // Upper 4 bits reserved for future use

    /// Construct structured flags from a raw 16-bit network byte value.
    pub fn from_wire(raw: u16) -> Self {
        PacketFlags {
            is_acknowledged: (raw & Self::FLAG_ACK) != 0,
            is_retransmit:   (raw & Self::FLAG_RETRANSMIT) != 0,
            urgent_flag:     (raw & Self::FLAG_URGENT) != 0,
            reserved_bits:   ((raw >> 4) & 0x0F) as u8, // Extract upper nibble via shift + mask
        }
    }

    /// Convert structured flags back to wire format for transmission.
    pub fn to_wire(&self) -> u16 {
        let mut result: u16 = 0;
        if self.is_acknowledged { result |= Self::FLAG_ACK; }
        if self.is_retransmit   { result |= Self::FLAG_RETRANSMIT; }
        if self.urgent_flag     { result |= Self::FLAG_URGENT; }
        result |= (self.reserved_bits as u16) << 4; // Shift into upper nibble
        result
    }

    /// Clear reserved bits to ensure canonical wire representation.
    pub fn sanitize(&mut self) {
        self.reserved_bits = 0;
    }
}

// Wire format flow: raw bytes → bitwise extraction → structured flags → validate → transmit back
```

### Pattern 4: Bit Manipulation Pitfalls (BAD vs. GOOD)

```python
# ❌ BAD — shifting by a negative amount or by ≥ type width is undefined behavior
def bad_shift_check(state: int, flag_bit: int) -> bool:
    # No validation on flag_bit — could shift by -1 or 63 causing errors
    return (state >> flag_bit) & 1 == 1

# ❌ BAD — equality check after AND fails when multiple flags are set simultaneously
def bad_has_any_permission(state: int, permission_mask: int) -> bool:
    # This only returns True if state matches permission_mask EXACTLY
    # It will return False even if state has ALL requested flags plus others
    return (state & permission_mask) == permission_mask

# ✅ GOOD — bounded shift with explicit type width and proper validation
def safe_check_flag(state: int, flag_bit: int, max_bits: int = 63) -> bool:
    """Check if a specific bit is set, with bounds validation."""
    if not (0 <= flag_bit < max_bits):
        raise ValueError(f"flag_bit {flag_bit} exceeds maximum {max_bits}")
    return (state >> flag_bit) & 1 == 1

def safe_has_any_permission(state: int, permission_mask: int) -> bool:
    """Check if ANY of the specified bits are set using proper mask check."""
    return (state & permission_mask) != 0

def safe_has_all_permissions(state: int, required_mask: int) -> bool:
    """Check if ALL specified bits are set in state."""
    return (state & required_mask) == required_mask

def safe_set_flag(state: int, flag_bit: int, max_bits: int = 63) -> int:
    """Set a specific bit using bounded shift and bitwise OR."""
    if not (0 <= flag_bit < max_bits):
        raise ValueError(f"Cannot set bit {flag_bit} in {max_bits}-bit type")
    return state | (1 << flag_bit)

def safe_clear_flag(state: int, flag_bit: int) -> int:
    """Clear a specific bit using bitwise AND with NOT (~)."""
    return state & ~(1 << flag_bit)
```

---

## Constraints

### MUST DO
- Always define flags as distinct powers of two using `1 << N` syntax for clarity and maintainability
- Use unsigned integer types (`uint32_t`, `uint64_t`) to avoid undefined behavior with sign-bit shifts in C/C++
- Validate bit positions against type width before applying shifts derived from external input (config files, network packets, user data)
- Document which bits represent which flags using named constants and inline comments at the definition site
- Use helper functions (`has()`, `grant()`, `revoke()`) wrapping raw bitwise ops in business logic layers

### MUST NOT DO
- Never shift by a negative amount or by an amount ≥ the type's bit width — this is undefined behavior in C/C++ and causes runtime errors elsewhere
- Use strict equality `==` after `&` when you only need to verify that at least one of several flags is set — use `!= 0` instead
- Mix signed and unsigned types in bitwise operations — silent sign-extension bugs can corrupt the upper bits of your mask
- Store more than 32 distinct flags in a single 32-bit integer without explicitly switching to 64-bit or multi-field designs

---

## Output Template

When implementing or reviewing bitmask logic, produce:

1. **Flag Definitions** — List all flag constants with their bit positions (e.g., `FLAG_X = 1 << N`), type, and human-readable purpose
2. **State Type Declaration** — The integer type used (`uint32_t`, `uint64_t`, `IntFlag`, `u16`) and justification for its width
3. **Operations Applied** — Which bitwise operators are used where: `&` for checking, `|` for setting, `~` + `&` for clearing, `^` for toggling
4. **Bounds Validation Logic** — How external flag values are validated against the integer type's bit width before any shift operations
5. **Wire / Serialization Format** — If used in network protocols or file formats, describe the byte layout and endianness assumptions

---

## Related Skills

| Skill | Purpose |
|---|---|
| `reference-operators` | Understanding & as reference/address-of operator across C++, Rust, and C# |
| `type-safety-enums` | Using typed enums and structs instead of raw bitmasks for higher-level type safety |
