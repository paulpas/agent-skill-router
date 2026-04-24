---
name: programming-abl-v12-learning
description: "Reference guide for Progress OpenEdge ABL 12.7 (2023) \u2014 v10\u2192\
  v12 migration, INT64, ENUM, VAR shorthand, CATCH/THROW/FINALLY, JSON support, generic\
  \ collections, safe navigation operator, server-side joins"
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: programming
  role: reference
  scope: implementation
  output-format: code
  triggers: abl v12, openedge 12, abl 12.7, v10 to v12 migration, abl migration, catch
    throw, jsonobject, read-json
  related-skills: programming-abl-v10-learning, programming-abl-v12-ui
---


# Progress OpenEdge ABL 12 — v10 to v12 Migration Reference

> **Version:** Progress OpenEdge 12.7 (May 2023)  
> **Language:** Advanced Business Language (ABL), also known as Progress 4GL  
> **Scope:** v10→v12 migration patterns and new v12 features

---

## TL;DR Checklist

- [ ] **VAR statement** (12.3): `VAR INT x = 0.` replaces verbose `DEFINE VARIABLE` 
- [ ] **Compound operators** (12.3): Use `+=`, `-=`, `*=`, `/=` for cleaner code
- [ ] **Safe navigation** (12.5): `obj?:Property?:Method()` avoids null checks
- [ ] **CATCH/THROW** (12.x): Replace `ON ERROR` with structured exception handling
- [ ] **JSON support** (11.x+): Use `READ-JSON`/`WRITE-JSON` instead of manual parsing
- [ ] **Generic collections** (12.5+): `List<T>`, `SortedSet<T>`, `HashMap<K,V>` replace linked lists
- [ ] **ENUM type** (12.x): Strongly typed named constants for safety
- [ ] **PACKAGE-PRIVATE** (12.2): Package-level encapsulation like Java
- [ ] **Server-side joins** (12.0): `FOR EACH...JOIN` reduces client round-trips
- [ ] **INT64** (10.1B): 64-bit integers for large numeric values

---

## When to Use This Skill

This reference is designed for:

- **Migration engineers** moving legacy ABL v10 codebases to v12
- **ABL developers** learning new v12 language features
- **Code reviewers** evaluating v12 patterns vs. v10 anti-patterns
- **Architects** designing systems with v12 capabilities

---

## When NOT to Use This Skill

- For basic ABL procedural programming — use `programming-abl-v10-learning`
- For UI/widget programming — use `programming-abl-v12-ui`
- For OpenEdge server configuration — consult server documentation

---

## Version History: 12.0 – 12.7

| Version | Release | Key Theme |
|---------|---------|-----------|
| **12.0** | 2019 | Server-side joins, Docker, 64-bit sequences default, STOP catchable by default |
| **12.1** | 2020 | High availability, performance, security enhancements |
| **12.2** | 2020 | `PACKAGE-PRIVATE`/`PACKAGE-PROTECTED` access, AES-GCM encryption, Docker DB |
| **12.3** | 2021 | `VAR` statement, compound operators (`+=`, `-=`), `CHAR`/`INT` full synonyms |
| **12.4** | 2022 | `VAR` with inline `NEW`, expression initialization, `AGGREGATE` statement |
| **12.5** | 2022 | `List<T>`, safe navigation `?:`, override non-abstract properties, `FINAL` on properties |
| **12.6** | 2023 | `SortedSet<T>`, Java 17 support, TLS 1.3, `LeakCheck` diagnostics |
| **12.7** | May 2023 | `HashMap<K,V>`, `HASH-CODE()`, `.NET 6`, signed archive libraries |

---

## Six Major Pillars of Change (v10 → v12)

### 1. Language Ergonomics
The `VAR` shorthand, compound operators (`+=`, `-=`), and `CHAR`/`INT` keyword synonyms reduce boilerplate significantly.

```abl
/* v10 — Verbose */
DEFINE VARIABLE x AS INTEGER INITIAL 0.
DEFINE VARIABLE name AS CHARACTER INITIAL "".
ASSIGN x = x + 1.
ASSIGN name = name + " world".

/* v12 — Concise */
VAR INT x = 0.
VAR CHAR name = "".
x += 1.
name += " world".
```

### 2. OOP Maturity
Package-level access modifiers, property overriding, generics/collections, and the safe navigation operator (`?:`) bring ABL's OOP model closer to Java/C#.

### 3. Error Handling
Structured `CATCH`/`THROW`/`FINALLY` blocks (first available in 10.2B, fully developed by 12.x) replace the legacy `ON ERROR` + `NO-ERROR` model.

### 4. JSON Support
Complete JSON object model (`JsonObject`, `JsonArray`, `ObjectModelParser`) plus `READ-JSON`/`WRITE-JSON` on temp-tables and ProDataSets. JSON was completely absent in v10.

### 5. Generic Collections
Built-in generic collections (`List<T>`, `SortedSet<T>`, `HashMap<TKey,TValue>`) eliminate the need for custom linked-list patterns.

### 6. Infrastructure
64-bit sequences by default, multi-threaded database server, Docker support, OAuth2/SAML, TLS 1.3.

---

## Quick Reference: What's New in v12

### Complete Feature Comparison Table (v10 vs v12)

| Category | v10 | v12 | Status |
|----------|-----|-----|--------|
| **INT64 data type** | ❌ Not available | ✅ `DEFINE VARIABLE x AS INT64` | Added in v10.1B |
| **ENUM type** | ❌ Not available | ✅ `ENUM` statement | New in v12+ |
| **VAR shorthand** | ❌ Must use `DEFINE VARIABLE` | ✅ `VAR INT x = 0.` | New in 12.3 |
| **Compound operators** | ❌ `x = x + 1` | ✅ `x += 1` | New in 12.3 |
| **PACKAGE-PRIVATE access** | ❌ Not available | ✅ `PACKAGE-PRIVATE` / `PACKAGE-PROTECTED` | New in 12.2 |
| **Override non-abstract properties** | ❌ Only abstract | ✅ Any non-final property | New in 12.5 |
| **Safe navigation `?:`** | ❌ Must use VALID-OBJECT checks | ✅ `obj?:Property?:Method()` | New in 12.5 |
| **Generic collections** | ❌ Not available | ✅ `List<T>`, `SortedSet<T>`, `HashMap<K,V>` | 12.5–12.7 |
| **CATCH / THROW / FINALLY** | ❌ Not in v10 (added 10.2B) | ✅ Full structured exception handling | Fully mature in v12 |
| **BLOCK-LEVEL ON ERROR UNDO, THROW** | ❌ Not available | ✅ Single directive covers all blocks | New post-v10 |
| **JSON support** | ❌ None | ✅ `JsonObject`, `JsonArray`, `READ-JSON`, `WRITE-JSON` | New in 11.x |
| **SAX callbacks via OO class** | ❌ Procedure-only | ✅ `EVENT-HANDLER-OBJECT` | Improved in v12 |
| **DYNAMIC-INVOKE()** | ⚠️ Limited | ✅ Full class-method dynamic invocation | Improved in v12 |
| **SERIALIZE-ROW() for JSON** | ❌ XML only | ✅ JSON + XML targets | New in v12 |
| **STOP as catchable object** | ⚠️ Required `-catchStop` flag | ✅ Default behavior — CATCH/FINALLY fire | Changed in 12.0 |
| **64-bit sequences** | ⚠️ Optional | ✅ Default for new databases | Changed in 12.0 |
| **Methods as async callbacks** | ❌ Procedures only | ✅ Class methods as `EVENT-HANDLER` | New in 12.3 |
| **Server-side joins** | ❌ Not available | ✅ FOR+NO-LOCK, up to 10 tables | New in 12.0 |
| **`HASH-CODE` function** | ❌ Not available | ✅ `HASH-CODE(arg1, arg2)` | New in 12.7 |
| **`FINAL` on properties** | ❌ Not available | ✅ Prevent subclass override | New in 12.5 |
| **`AGGREGATE` statement** | ❌ Not available | ✅ Server-side aggregation | New in 12.4 |

---

## Version-by-Version Feature Table (v10.0B through v12.7)

| Feature | Introduced | Category |
|---------|-----------|----------|
| `DATETIME` data type | v10.0B | Data Types |
| `DATETIME-TZ` data type | v10.0B | Data Types |
| `BLOB` / `CLOB` field types | v10.0B | Data Types |
| `LONGCHAR` data type | v10.0B | Data Types |
| `INT64` data type | v10.1B | Data Types |
| `CLASS` / `INTERFACE` OOP | v10 | OOP |
| `CATCH` / `THROW` / `FINALLY` | 10.2B | Error Handling |
| JSON (`JsonObject`, `JsonArray`, `READ-JSON`, `WRITE-JSON`) | 11.x | JSON |
| `Progress.IO.MemoryOutputStream` / `MemoryInputStream` | **12.0** | I/O |
| `STOP` catchable by default (no `-catchStop` needed) | **12.0** | Error Handling |
| Indeterminate array resize without data loss | **12.0** | Language |
| 64-bit sequences enabled by default (new DBs) | **12.0** | Database |
| Server-side joins (FOR + NO-LOCK, up to 10 tables) | **12.0** | Database |
| `PACKAGE-PRIVATE` access modifier | **12.2** | OOP |
| `PACKAGE-PROTECTED` access modifier | **12.2** | OOP |
| Methods as socket / SAX callbacks | **12.2** | OOP |
| `require-return-values` compiler option | **12.2** | Compiler |
| AES-GCM encryption in ABL | **12.2** | Security |
| OpenEdge Application Archive (`.oear`) | **12.2** | CI/CD |
| `VAR` statement (shorthand `DEFINE VARIABLE`) | **12.3** | Language |
| `CHAR` and `INT` as full type keywords | **12.3** | Language |
| Compound operators (`+=`, `-=`, `*=`, `/=`) | **12.3** | Language |
| Runtime resize of initialized indeterminate arrays | **12.3** | Language |
| Methods as `RUN ... ASYNC` callbacks | **12.3** | OOP |
| Methods as SAX-READER callbacks | **12.3** | XML |
| `VAR` with expressions and function calls | **12.4** | Language |
| `VAR` with inline `NEW` | **12.4** | Language |
| `AGGREGATE` statement (server-side aggregation) | **12.4** | Database |
| Override non-abstract properties | **12.5** | OOP |
| `FINAL` on properties | **12.5** | OOP |
| Safe navigation operator `?:` | **12.5** | Language |
| `Progress.Collections.List<T>` | **12.5** | Collections |
| Generic type syntax `<T>` | **12.5** | Language |
| `Progress.Collections.SortedSet<T>` | **12.6** | Collections |
| `OpenEdge.Core.Util.LeakCheck` class | **12.6** | Diagnostics |
| Java 17 support | **12.6** | Platform |
| `Progress.Collections.HashMap<TKey, TValue>` | **12.7** | Collections |
| `HASH-CODE` function | **12.7** | Language |
| Signed Archive Libraries (`.apl`) | **12.7** | Deployment |
| `.NET 6` support on Windows | **12.7** | Platform |
| `ABL Type Hierarchy View` in Developer Studio | **12.7** | Tooling |

---

## Data Types

### Full Data Type Table (v10 vs v12)

| Data Type | v10 | v12 | Notes |
|-----------|:---:|:---:|-------|
| `CHARACTER` | ✅ | ✅ | Max 32,767 bytes. Default `""`. Keyword alias `CHAR` (v12.3+). |
| `LONGCHAR` | ✅ | ✅ | Up to 2 GB − 1 byte. Code-page aware. |
| `INTEGER` | ✅ | ✅ | 32-bit signed: −2,147,483,648 to +2,147,483,647. Default `0`. Keyword alias `INT` (v12.3+). |
| `INT64` | ❌ | ✅ | 64-bit signed: −9,223,372,036,854,775,808 to +9,223,372,036,854,775,807. Default `0`. **Added v10.1B.** |
| `DECIMAL` | ✅ | ✅ | Up to 50 significant digits, up to 10 decimal places. Default `0`. |
| `LOGICAL` | ✅ | ✅ | TRUE/FALSE/YES/NO/Unknown(?). Default `NO`. |
| `DATE` | ✅ | ✅ | 1/1/32768 BC to 12/31/32767 AD. Default `?`. |
| `DATETIME` | ✅ | ✅ | DATE + milliseconds from midnight. Local time. Default `?`. **Added v10.0B.** |
| `DATETIME-TZ` | ✅ | ✅ | DATETIME + UTC offset. Stored in UTC. Default `?`. **Added v10.0B.** |
| `RAW` | ✅ | ✅ | Binary, ≤ 32K. |
| `MEMPTR` | ✅ | ✅ | In-memory binary, up to 2 GB − 1 byte. |
| `ROWID` | ✅ | ✅ | Unique database record identifier. Preferred over RECID. |
| `RECID` | ✅ | ✅ | Legacy 32-bit record ID. Use ROWID instead. |
| `HANDLE` | ✅ | ✅ | Pointer to an ABL object/widget. Interchangeable with WIDGET-HANDLE. |
| `WIDGET-HANDLE` | ✅ | ✅ | Alias for HANDLE. |
| `COM-HANDLE` | ✅ | ✅ | ActiveX/COM object reference. |
| `BLOB` | ✅ | ✅ | Binary large object. DB/temp-table fields only. Up to 1 GB. **Added v10.0B.** |
| `CLOB` | ✅ | ✅ | Character large object. DB/temp-table fields only. Up to 1 GB. **Added v10.0B.** |
| `CLASS` | ✅ | ✅ | User-defined class object reference. Default `?`. |
| `ENUM` | ❌ | ✅ | Strongly typed named constants. Implicitly class-based. **New in v12.** |

### INT64 — 64-Bit Integer (Added v10.1B)

```abl
DEFINE VARIABLE id AS INT64 INITIAL 0.

/* Large values that overflow INTEGER */
id = 9000000000000000000.

/* Use in database fields for large sequences, snowflake IDs, etc. */
TABLE-SCHEMA myTable:
    DEFINE COLUMN myId AS INT64.
END TABLE-SCHEMA.
```

### ENUM Type (New in v12)

The ENUM type provides strongly typed named constants with implicit class backing.

```abl
/* Define an enum type */
ENUM OrderStatus:
    PENDING.
    PROCESSING.
    SHIPPED.
    DELIVERED.
    CANCELLED.
END ENUM.

/* Use the enum */
VAR OrderStatus status = OrderStatus:PENDING.

/* Switch is type-safe */
SWITCH status:
    CASE OrderStatus:PENDING:
        DISPLAY "Waiting for processing".
    CASE OrderStatus:SHIPPED:
        DISPLAY "Out for delivery".
    DEFAULT:
        DISPLAY "Unknown status".
END SWITCH.

/* Iteration support */
FOREACH s IN OrderStatus:
    DISPLAY s / ENUM-NAME(s).
END.
```

---

## Variable Declaration

### The VAR Statement (New in 12.3)

The `VAR` statement is a concise alternative to `DEFINE VARIABLE`.

**Basic syntax:**
```abl
VAR TYPE name [AS subtype] [= expression].
```

**Examples:**
```abl
/* Basic declarations */
VAR INT count = 0.
VAR CHAR name = "".
VAR DECIMAL price = 99.99.
VAR LOGICAL isActive = TRUE.

/* With expressions */
VAR INT sum = 1 + 2 + 3.
VAR DATE today = TODAY.
VAR INTEGER length = LENGTH("hello").

/* With function calls */
VAR CHAR json = GET-TEMP-JSON().
VAR INTEGER count = GET-RECORD-COUNT().

/* With inline NEW (12.4+) */
VAR Customer customer = NEW Customer().
VAR JsonObject payload = NEW JsonObject().
VAR Progress.Collections.List<STRING> names = NEW Progress.Collections.List<STRING>().

/* Arrays */
VAR INT scores[5].
VAR CHAR items[?].

/* Multiple declarations */
VAR INT x = 0, y = 0, z = 0.
```

**MUST NOT:**
- Use `VAR` for database fields (only variables)
- Use `VAR` for temp-table definitions (use `DEFINE TEMP-TABLE`)
- Use `VAR` to shadow class properties or method parameters

### CHAR and INT as Type Keywords (12.3+)

`CHAR` is now a full synonym for `CHARACTER`. `INT` is now a full synonym for `INTEGER`.

```abl
/* v10 */
DEFINE VARIABLE name AS CHARACTER.
DEFINE VARIABLE count AS INTEGER.

/* v12 */
VAR CHARACTER name.
VAR INT count.

/* Also valid (12.3+) */
VAR CHAR name.
VAR INT count.
```

### Compound Operators (12.3+)

Compound assignment operators reduce boilerplate for common operations.

```abl
VAR INT x = 0.
VAR CHAR text = "Hello".
VAR DECIMAL total = 100.00.

x += 1.      /* Same as: x = x + 1 */
x -= 5.      /* Same as: x = x - 5 */
x *= 2.      /* Same as: x = x * 2 */
x /= 3.      /* Same as: x = x / 3 */

text += " World".    /* Same as: text = text + " World" */

total += 50.00.      /* Same as: total = total + 50.00 */
```

---

## Error Handling (v12 Model)

### CATCH / THROW / FINALLY

**v10 legacy pattern (anti-pattern):**
```abl
/* v10 — Fragile, hard to trace */
ON ERROR UNDO, ERROR-HANDLER.

PROCESS-ORDER(orderNum IN):
    /* ... logic ... */
    IF NOT AVAILABLE order THEN
        THROW ERROR "Order not found".
    /* ... more logic ... */
END.

ERROR-HANDLER:
    /* Single handler for everything */
    DISPLAY ERROR-TEXT.
    RETURN.
```

**v12 structured pattern:**
```abl
/* v12 — Structured, explicit, testable */
PROCESS-ORDER(orderNum IN):
    ON ERROR UNDO, THROW.
    
    TRY
        VAR Order order = GET-ORDER(orderNum).
        
        IF order = ? THEN
            THROW NEW OrderNotFoundException("Order not found", orderNum).
            
        UPDATE-ORDER(order).
        COMMIT.
        
    CATCH OrderNotFoundException AS e:
        LOGGER:WARN("Order {1} not found", orderNum).
        RETURN FALSE.
        
    CATCH Progress.Lang.Exception AS e:
        LOGGER:ERROR("Error processing order {1}: {2}", orderNum, e:Message).
        RETURN FALSE.
        
    FINALLY:
        /* Always runs — cleanup here */
        RELEASE-LOCK(orderNum).
    END.
    
    RETURN TRUE.
END.
```

**Key principles:**
1. Use `ON ERROR UNDO, THROW` at procedure/block level
2. Use `TRY/CATCH/FINALLY` for structured exception handling
3. Define custom exception classes for domain errors
4. Catch specific exceptions before general ones
5. Use `FINALLY` for cleanup code that must always run

### Custom Exception Classes

```abl
/* Define a custom exception hierarchy */
CLASS acme.OrderException INHERITS Progress.Lang.Exception:
    CONSTRUCTOR PUBLIC OrderException(message AS STRING):
        SUPER(message).
    END CONSTRUCTOR.
END CLASS.

CLASS acme.OrderNotFoundException INHERITS acme.OrderException:
    DEFINE PRIVATE PROPERTY _orderId AS INTEGER.
    
    CONSTRUCTOR PUBLIC OrderNotFoundException(message AS STRING, orderId AS INTEGER):
        SUPER(message).
        _orderId = orderId.
    END CONSTRUCTOR.
    
    DEFINE PUBLIC PROPERTY OrderId AS INTEGER GET ONLY:
        GET():
            RETURN _orderId.
        END GET.
    END PROPERTY.
END CLASS.

/* Usage */
THROW NEW acme.OrderNotFoundException("Order not found", orderId).
```

---

## JSON Support (New in 11.x, Enhanced in 12.x)

### Reading JSON

```abl
/* Parse JSON string to JsonObject */
VAR CHAR jsonStr = ""{\"name\":\"John\",\"age\":30}\"".
VAR JsonObject obj = NEW JsonObject():LOAD-JSON(jsonStr).

/* Access properties */
DISPLAY obj:GetValue("name") AS CHARACTER.
DISPLAY obj:GetValue("age") AS INTEGER.

/* Read nested object */
VAR JsonObject address = obj:GetObject("address").
DISPLAY address:GetValue("city") AS CHARACTER.
```

### Writing JSON

```abl
/* Build JsonObject programmatically */
VAR JsonObject user = NEW JsonObject().
user:Put("name", "John").
user:Put("age", 30).
user:Put("active", TRUE).

/* Convert back to string */
VAR CHAR jsonStr = user:GET-JSON().
DISPLAY jsonStr.
/* Output: {"age":30,"name":"John","active":true} */
```

### READ-JSON / WRITE-JSON (11.x+)

```abl
DEFINE TEMP-TABLE ttUser
    FIELD id AS INTEGER
    FIELD name AS CHARACTER
    FIELD email AS CHARACTER
    FIELD active AS LOGICAL.

/* Populate temp-table */
CREATE ttUser.
ASSIGN ttUser/id = 1
       ttUser/name = "John"
       ttUser/email = "john@example.com"
       ttUser/active = TRUE.

/* Write temp-table to JSON */
VAR CHAR userJson = "".
WRITE-JSON(ttUser, userJson).

/* Read JSON back into temp-table */
DEFINE TEMP-TABLE ttUser2
    FIELD id AS INTEGER
    FIELD name AS CHARACTER
    FIELD email AS CHARACTER  
    FIELD active AS LOGICAL.

READ-JSON(ttUser2, userJson).
DISPLAY ttUser2/name.
```

### JsonArray

```abl
VAR JsonArray arr = NEW JsonArray().
arr:Add("Apple").
arr:Add("Banana").
arr:Add("Cherry").

/* Access by index */
DISPLAY arr:GetValue(0) AS CHARACTER.  /* Apple */

/* Iterate */
FOREACH i FROM 1 TO arr:Count:
    DISPLAY arr:GetValue(i - 1) AS CHARACTER.
END.

/* Convert to JSON string */
VAR CHAR jsonArr = arr:GET-JSON().
```

---

## Generic Collections (12.5+)

### List<T>

```abl
VAR Progress.Collections.List<STRING> names = NEW Progress.Collections.List<STRING>().

names:Add("Alice").
names:Add("Bob").
names:Add("Charlie").

/* Access by index (0-based) */
DISPLAY names:Get(0) AS CHARACTER.  /* Alice */

/* Modify */
names:Set(1, "Robert").

/* Remove */
names:Remove("Charlie").

/* Count */
DISPLAY names:Count.  /* 2 */

/* Contains check */
IF names:Contains("Alice") THEN
    DISPLAY "Found Alice".
    
/* Clear */
names:Clear().
```

### SortedSet<T>

```abl
VAR Progress.Collections.SortedSet<STRING> uniqueNames = NEW Progress.Collections.SortedSet<STRING>().

uniqueNames:Add("Charlie").
uniqueNames:Add("Alice").
uniqueNames:Add("Bob").
/* Adding duplicate returns FALSE */
uniqueNames:Add("Alice").  /* Returns FALSE, not added */

/* Automatically sorted */
DISPLAY uniqueNames:First() AS CHARACTER.  /* Alice */
DISPLAY uniqueNames:Last() AS CHARACTER.   /* Charlie */
```

### HashMap<TKey, TValue>

```abl
VAR Progress.Collections.HashMap<STRING, INTEGER> ages = NEW Progress.Collections.HashMap<STRING, INTEGER>().

ages:Put("Alice", 30).
ages:Put("Bob", 25).
ages:Put("Charlie", 35).

/* Get value */
VAR INT aliceAge = ages:Get("Alice").
DISPLAY aliceAge.  /* 30 */

/* Check if key exists */
IF ages:ContainsKey("Bob") THEN
    DISPLAY "Bob is in the map".

/* Remove entry */
ages:Remove("Charlie").

/* Count */
DISPLAY ages:Count.  /* 2 */
```

### HASH-CODE Function (12.7+)

```abl
/* Generate hash code for objects or values */
VAR INT hash1 = HASH-CODE("hello").
VAR INT hash2 = HASH-CODE("hello").
DISPLAY hash1 = hash2.  /* TRUE - same input produces same hash */

/* Multi-argument hash */
VAR INT combined = HASH-CODE("firstName", "lastName", 12345).

/* Useful for custom Equals implementations and hash-based collections */
```

---

## OOP Features

### PACKAGE-PRIVATE / PACKAGE-PROTECTED Access (12.2+)

Package-level access modifiers allow sharing between classes in the same namespace.

```abl
/* File: acme/Base.cls */
CLASS acme.Base:
    DEFINE PRIVATE PROPERTY _private AS STRING.
    DEFINE PACKAGE-PRIVATE PROPERTY _packageLevel AS STRING.
    DEFINE PACKAGE-PROTECTED PROPERTY _protected AS STRING.
    DEFINE PUBLIC PROPERTY Public AS STRING.
END CLASS.

/* File: acme/Sibling.cls - Same package */
CLASS acme.Sibling:
    METHOD PUBLIC VOID AccessBase(base AS acme.Base):
        /* base:_private      - ERROR: cannot access */
        base:_packageLevel = "shared".    /* OK: same package */
        base:_protected = "inherited".    /* OK: package-protected */
    END METHOD.
END CLASS.

/* File: other/Outside.cls - Different package */
CLASS other.Outside:
    METHOD PUBLIC VOID AccessBase(base AS acme.Base):
        /* base:_private      - ERROR: cannot access */
        /* base:_packageLevel - ERROR: different package */
        /* base:_protected    - ERROR: different package */
        base:Public = "public".           /* OK: public */
    END METHOD.
END CLASS.
```

### Safe Navigation Operator `?:` (12.5+)

Eliminates verbose null checks when accessing nested properties.

```abl
/* v10/v11 — Verbose null checking */
VAR Customer cust = GET-CUSTOMER(id).
IF cust <> ? THEN
    IF cust:Address <> ? THEN
        IF cust:Address:City <> ? THEN
            DISPLAY cust:Address:City:Name.
        END.
    END.
END.

/* v12.5+ — Concise safe navigation */
VAR CHAR cityName = GET-CUSTOMER(id)?:Address?:City?:Name ?? "Unknown".
DISPLAY cityName.
```

### Override Non-Abstract Properties (12.5+)

Prior to 12.5, only abstract properties could be overridden. Now any non-final property can be overridden.

```abl
/* Base class with concrete property */
CLASS acme.Base:
    DEFINE PUBLIC PROPERTY Value AS STRING GET. SET.
END CLASS.

/* Override with coded getter/setter (12.5+) */
CLASS acme.Derived INHERITS acme.Base:
    DEFINE PRIVATE PROPERTY _value AS STRING.
    
    DEFINE PUBLIC PROPERTY OVERRIDE Value AS STRING GET. SET.
    END PROPERTY.
    
    GET():
        RETURN UPPER(_value).
    END GET.
    
    SET(newValue AS STRING):
        _value = LOWER(newValue).
    END SET.
    
END PROPERTY.
END CLASS.
```

### FINAL Properties (12.5+)

Prevent property overriding in subclasses.

```abl
CLASS acme.FinalBase:
    DEFINE FINAL PUBLIC PROPERTY Immutable AS STRING GET. SET.
END CLASS.

CLASS acme.FinalDerived INHERITS acme.FinalBase:
    /* This would cause a compile error:
    DEFINE PUBLIC PROPERTY OVERRIDE Immutable AS STRING... 
    */
END CLASS.
```

---

## Server-Side Joins (12.0+)

### Basic Server-Side Join

```abl
/* v10 — Client-side join (slow) */
FOR EACH Customer NO-LOCK:
    FOR EACH Order WHERE Order.CustId = Customer.Id NO-LOCK:
        /* Process each combination */
    END.
END.

/* v12 — Server-side join (fast) */
FOR EACH Customer NO-LOCK
    JOIN Order WHERE Order.CustId = Customer.Id NO-LOCK:
        /* Database performs the join */
    END.
END.
```

### Multiple Table Joins

```abl
/* Server-side join up to 10 tables */
FOR EACH Customer NO-LOCK
    JOIN Order WHERE Order.CustId = Customer.Id NO-LOCK
    JOIN OrderItem WHERE OrderItem.OrderId = Order.Id NO-LOCK
    JOIN Product WHERE Product.Id = OrderItem.ProductId NO-LOCK:
        
    DISPLAY Customer.Name,
            Order.OrderDate,
            OrderItem.Quantity,
            Product.Name,
            OrderItem.UnitPrice * OrderItem.Quantity AS Total.
END.
```

---

## Migration Checklist (v10 → v12)

### Language Modernization

- [ ] Replace `DEFINE VARIABLE x AS INTEGER` with `VAR INT x`
- [ ] Replace `DEFINE VARIABLE x AS CHARACTER` with `VAR CHAR x`
- [ ] Use compound operators: `x += 1` instead of `x = x + 1`
- [ ] Use `CHAR`/`INT` keywords instead of `CHARACTER`/`INTEGER` where appropriate

### Error Handling Migration

- [ ] Replace `ON ERROR` blocks with `TRY/CATCH/FINALLY`
- [ ] Create custom exception classes for domain errors
- [ ] Remove `NO-ERROR` flags; use structured error handling
- [ ] Add `FINALLY` blocks for cleanup code

### JSON Migration

- [ ] Replace manual JSON string parsing with `JsonObject:LOAD-JSON()`
- [ ] Use `READ-JSON`/`WRITE-JSON` for temp-table serialization
- [ ] Replace `SERIALIZE-ROW(..., "XML")` with `SERIALIZE-ROW(..., "JSON")`

### Collections Migration

- [ ] Replace linked list patterns with `List<T>`
- [ ] Replace sorted array patterns with `SortedSet<T>`
- [ ] Replace custom hash maps with `HashMap<TKey, TValue>`
- [ ] Use `HASH-CODE()` for custom object hashing

### OOP Improvements

- [ ] Replace `VALID-OBJECT()` chains with safe navigation `?:`
- [ ] Use `PACKAGE-PRIVATE` for package-level encapsulation
- [ ] Consider `FINAL` on properties that should not be overridden
- [ ] Override non-abstract properties where needed (12.5+)

### Database Improvements

- [ ] Convert client-side nested FOR EACH loops to server-side JOINs
- [ ] Review sequence fields for INT64 compatibility
- [ ] Consider `AGGREGATE` statement for server-side aggregations

---

## Related Skills

| Skill | Purpose |
|-------|--------|
| `programming-abl-v10-learning` | Original ABL v10 procedural programming reference |
| `programming-abl-v12-ui` | UI/widget programming in ABL 12 |

---

## References

- [Progress OpenEdge 12.7 Documentation](https://documentation.progress.com/output/oberon/enusoe1270index/)
- [ABL Language Reference](https://documentation.progress.com/output/oberon/enusoe1270lang/)
- [OpenEdge Developer Studio](https://documentation.progress.com/output/oberon/enusoe1270dds/)

---

*Compiled from official Progress OpenEdge 12.7 documentation. Last updated: May 2023*
