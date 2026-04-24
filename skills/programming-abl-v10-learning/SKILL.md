---
name: programming-abl-v10-learning
description: Reference guide for Progress OpenEdge ABL 10.1A (2005) — data types,
  variable declaration, procedures, functions, OOP basics, error handling, database
  access, transaction handling, control flow
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: programming
  role: reference
  scope: implementation
  output-format: code
  triggers: abl, abl programming, abl v10, openedge, openedge 10, progress 4gl, progress
    abl
  related-skills: programming-abl-v12-learning
---


# Progress OpenEdge ABL 10.1A — Reference Guide

> **Version:** Progress OpenEdge 10.1A (December 2005)  
> **Language:** ABL — Advanced Business Language (formerly Progress 4GL)  
> **Purpose:** Comprehensive reference for developers working with OpenEdge v10 codebases.

---

## TL;DR Checklist

- [ ] `?` is the universal unknown/null value across all data types
- [ ] `INT64` does NOT exist in v10.1A — use `DECIMAL` for large integers
- [ ] `NO-UNDO` is recommended for most variables (faster, not rolled back on UNDO)
- [ ] `ERROR-STATUS` is reset on every `NO-ERROR` statement — check immediately
- [ ] No `CATCH`/`THROW`/`FINALLY` — only `ON ERROR`, `NO-ERROR`, `RETURN ERROR`
- [ ] `FOR EACH ... NO-LOCK` is required for read-only database access
- [ ] `UNDO, LEAVE` exits a transaction block with rollback
- [ ] `RELEASE` commits and releases locks immediately
- [ ] OOP exists but is limited — no `ENUM`, no `PACKAGE-PRIVATE`, no generic collections
- [ ] JSON support does NOT exist — use XML or temp-table READ-XML/WRITE-XML

---

## When to Use

Use this skill when:

- Working with legacy OpenEdge 10.1A (December 2005) codebases
- Maintaining or refactoring ABL procedures written for v10
- Migrating v10 code to later versions (v11, v12)
- Understanding ABL fundamentals: data types, variable declaration, procedures
- Learning the v10 error handling model (pre-CATCH/THROW)
- Understanding ABL's implicit transaction model
- Working with ABL's OOP constructs as they existed in v10
- Implementing database access patterns specific to v10

---

## When NOT to Use

Avoid this skill for:

- New development — use `programming-abl-v12-learning` for modern ABL
- Questions about `ENUM`, `VAR`, compound operators (`+=`, `-=`) — added in v12.3+
- JSON support — added in v11.x
- Generic collections (`List<T>`, `HashMap<K,V>`) — added in v12.5+
- Safe navigation operator (`?:`) — added in v12.5
- `CATCH`/`THROW`/`FINALLY` — added in v10.2B

---

## Core Reference Content

### Data Types in v10.1A

| Data Type | v10 | Range / Notes |
|-----------|:---:|---------------|
| `CHARACTER` | ✅ | Max 32,767 bytes. Default `""`. General-purpose string. |
| `LONGCHAR` | ✅ | Up to 2 GB − 1 byte. Code-page aware. For large text. Added v10.0B. |
| `INTEGER` | ✅ | 32-bit signed: −2,147,483,648 to +2,147,483,647. Default `0`. |
| `INT64` | ❌ | **Not in v10.1A.** Added in v10.1B. Use `DECIMAL` for large integers. |
| `DECIMAL` | ✅ | Up to 50 significant digits, up to 10 decimal places. Default `0`. |
| `LOGICAL` | ✅ | TRUE/YES / FALSE/NO / Unknown (`?`). Default `NO`. |
| `DATE` | ✅ | 1/1/32768 BC to 12/31/32767 AD. Default `?`. |
| `DATETIME` | ✅ | DATE + milliseconds from midnight. Local time. Default `?`. Added v10.0B. |
| `DATETIME-TZ` | ✅ | DATETIME + UTC offset in minutes. Stored in UTC. Default `?`. Added v10.0B. |
| `RAW` | ✅ | Binary data, ≤ 32K bytes. |
| `MEMPTR` | ✅ | In-memory binary buffer, up to 2 GB − 1 byte. Requires explicit allocation. |
| `ROWID` | ✅ | Unique opaque database record identifier. Preferred over RECID. |
| `RECID` | ✅ | Legacy 32-bit integer record ID. Use ROWID instead in new code. |
| `HANDLE` | ✅ | Pointer to any ABL object or UI widget. Default `?`. |
| `WIDGET-HANDLE` | ✅ | Alias for HANDLE. Interchangeable in v10. |
| `COM-HANDLE` | ✅ | ActiveX/COM automation object reference. Windows only. |
| `BLOB` | ✅ | Binary Large Object. Database/temp-table fields only. Up to 1 GB. Added v10.0B. |
| `CLOB` | ✅ | Character Large Object. Database/temp-table fields only. Up to 1 GB. Added v10.0B. |
| `CLASS` | ✅ | Reference to a user-defined class instance. Default `?`. |
| `ENUM` | ❌ | **Not in v10.** Added in v12. Use INTEGER constants or CHARACTER literals instead. |

> ⚠️ **Critical:** `INT64` does **not exist** in v10.1A. Use `DECIMAL` for values that exceed 2,147,483,647. Assigning a large value to `INTEGER` causes a runtime overflow error.

### Data Type Examples

**CHARACTER and LONGCHAR:**

```abl
DEFINE VARIABLE cName     AS CHARACTER NO-UNDO.
DEFINE VARIABLE cFullName AS CHARACTER NO-UNDO INITIAL "Unknown".
DEFINE VARIABLE lcDocument AS LONGCHAR  NO-UNDO.  /* for large text content */

cName     = "John Smith".
lcDocument = "This is a very long text content that could be gigabytes...".

/* Case-insensitive by default */
IF cName = "john smith" THEN  /* evaluates to TRUE */
    MESSAGE "Names match (case-insensitive)" VIEW-AS ALERT-BOX.

/* CASE-SENSITIVE modifier */
DEFINE VARIABLE cSensitive AS CHARACTER CASE-SENSITIVE NO-UNDO.
```

**INTEGER and DECIMAL:**

```abl
DEFINE VARIABLE iCount   AS INTEGER NO-UNDO INITIAL 0.
DEFINE VARIABLE dAmount  AS DECIMAL NO-UNDO INITIAL 0.00.

/* v10 must use DECIMAL for large integers — no INT64 available */
DEFINE VARIABLE dBigNum AS DECIMAL NO-UNDO.
dBigNum = 5000000000.   /* exceeds INTEGER max — must be DECIMAL in v10 */

/* INTEGER arithmetic */
iCount = iCount + 1.

/* DECIMAL formatting */
dAmount = 1234567.89.
MESSAGE STRING(dAmount, "->>,>>>,>>9.99") VIEW-AS ALERT-BOX.
/* Displays: 1,234,567.89 */
```

**LOGICAL:**

```abl
DEFINE VARIABLE lActive  AS LOGICAL NO-UNDO INITIAL FALSE.
DEFINE VARIABLE lUnknown AS LOGICAL NO-UNDO.  /* default: NO */

lActive  = TRUE.     /* or YES */
lUnknown = ?.        /* unknown value */

/* All three states */
IF lActive = TRUE  THEN MESSAGE "Active".
IF lActive = NO    THEN MESSAGE "Inactive".
IF lActive = ?     THEN MESSAGE "Unknown state".

/* Shorthand: IF lActive checks for TRUE */
IF lActive THEN MESSAGE "Active flag is set".
```

**DATE, DATETIME, DATETIME-TZ:**

```abl
DEFINE VARIABLE dOrderDate  AS DATE        NO-UNDO.
DEFINE VARIABLE dtTimestamp AS DATETIME    NO-UNDO.
DEFINE VARIABLE dtzUtcTime  AS DATETIME-TZ NO-UNDO.

dOrderDate  = TODAY.
dtTimestamp = NOW.                          /* DATETIME-TZ — current time with tz offset */
dtzUtcTime  = NOW.

/* Construct a specific date */
dOrderDate = DATE(12, 31, 2005).            /* December 31, 2005 */

/* Extract components */
MESSAGE DAY(dOrderDate)   VIEW-AS ALERT-BOX.  /* 31 */
MESSAGE MONTH(dOrderDate) VIEW-AS ALERT-BOX.  /* 12 */
MESSAGE YEAR(dOrderDate)  VIEW-AS ALERT-BOX.  /* 2005 */

/* Date arithmetic — add integer days */
dOrderDate = dOrderDate + 30.   /* 30 days later */
dOrderDate = dOrderDate - 7.    /* 7 days earlier */

/* ISO date formatting */
MESSAGE ISO-DATE(dtTimestamp) VIEW-AS ALERT-BOX.
```

**HANDLE and MEMPTR:**

```abl
DEFINE VARIABLE hQuery AS HANDLE NO-UNDO.
DEFINE VARIABLE mBlock AS MEMPTR NO-UNDO.

/* HANDLE — points to an ABL object */
CREATE QUERY hQuery.
/* ... use hQuery ... */
DELETE OBJECT hQuery.

/* MEMPTR — raw binary buffer */
SET-SIZE(mBlock) = 1024.    /* allocate 1024 bytes */
PUT-BYTE(mBlock, 1) = 65.   /* write ASCII 'A' at byte 1 */
MESSAGE GET-BYTE(mBlock, 1) VIEW-AS ALERT-BOX.  /* 65 */
SET-SIZE(mBlock) = 0.       /* free the memory */
```

### Variable Declaration

**Full DEFINE VARIABLE Syntax:**

```abl
DEFINE
  { [ [ NEW [ GLOBAL ] ] SHARED ] | [ PRIVATE | PROTECTED | PUBLIC ] }
  VARIABLE variable-name
  { AS datatype
  | AS [ CLASS ] { type-name }
  | LIKE field }
  [ NO-UNDO ]
  [ INITIAL { constant | { [ constant [ , constant ] ... ] } } ]
  [ FORMAT string ]
  [ EXTENT [ expression ] ]
  [ LABEL string ]
  [ DECIMALS n ]
  [ CASE-SENSITIVE ]
```

**NO-UNDO Explained:**

`NO-UNDO` tells the ABL Virtual Machine (AVM) **not to roll back** this variable's value when an `UNDO` statement executes. This is recommended for most variables:

- **Without NO-UNDO:** The AVM tracks the "before image" of the variable for potential rollback. This adds overhead.
- **With NO-UNDO:** The variable is excluded from transaction rollback. Faster and more predictable.

```abl
/* With NO-UNDO (recommended) — not rolled back on UNDO */
DEFINE VARIABLE iCounter AS INTEGER NO-UNDO.

/* Without NO-UNDO — value will be rolled back if block UNDOs */
DEFINE VARIABLE iRollback AS INTEGER.

/* Demonstration: iRollback gets rolled back, iCounter does not */
DO TRANSACTION:
    iCounter  = 100.
    iRollback = 100.
    UNDO, LEAVE.   /* only iRollback reverts to 0 */
END.
MESSAGE "Counter: "  iCounter  VIEW-AS ALERT-BOX.  /* 100 — not rolled back */
MESSAGE "Rollback: " iRollback VIEW-AS ALERT-BOX.  /* 0   — was rolled back */
```

**INITIAL Value:**

```abl
/* Simple initial values */
DEFINE VARIABLE cStatus   AS CHARACTER NO-UNDO INITIAL "ACTIVE".
DEFINE VARIABLE iRetry    AS INTEGER   NO-UNDO INITIAL 3.
DEFINE VARIABLE lEnabled  AS LOGICAL   NO-UNDO INITIAL TRUE.
DEFINE VARIABLE dRate     AS DECIMAL   NO-UNDO INITIAL 0.15.

/* Unknown (null) initial — the default for DATE, DATETIME, DATETIME-TZ */
DEFINE VARIABLE dStartDate AS DATE NO-UNDO INITIAL ?.
```

**EXTENT — Arrays:**

```abl
/* Fixed-size array */
DEFINE VARIABLE arrMonths  AS CHARACTER EXTENT 12 NO-UNDO.
DEFINE VARIABLE arrScores  AS INTEGER   EXTENT 5  NO-UNDO INITIAL [100, 95, 88, 72, 60].

/* Assign by index (1-based) */
arrMonths[1]  = "January".
arrMonths[2]  = "February".
arrMonths[12] = "December".

/* Read by index */
MESSAGE arrMonths[1] VIEW-AS ALERT-BOX.  /* January */

/* Indeterminate (dynamic) extent — size set later */
DEFINE VARIABLE arrDynamic AS CHARACTER EXTENT NO-UNDO.
EXTENT(arrDynamic) = 20.    /* set size at runtime */

/* EXTENT() function returns array size */
DEFINE VARIABLE iSize AS INTEGER NO-UNDO.
iSize = EXTENT(arrMonths).  /* 12 */
```

**LIKE Field:**

The `LIKE` option inherits FORMAT, LABEL, DECIMALS, and CASE-SENSITIVE from a database field:

```abl
/* Inherits all format attributes from the Customer.Name field */
DEFINE VARIABLE cCustName AS CHARACTER NO-UNDO LIKE Customer.Name.

/* Inherits format but overrides label */
DEFINE VARIABLE dBalance AS DECIMAL NO-UNDO LIKE Customer.Balance
    LABEL "Current Balance".
```

### Procedures and Functions

**Internal PROCEDURE Syntax:**

Internal procedures are defined within the same `.p` file and called with `RUN`:

```abl
PROCEDURE validateCustomer:
    DEFINE INPUT  PARAMETER piCustNum  AS INTEGER   NO-UNDO.
    DEFINE OUTPUT PARAMETER pcError    AS CHARACTER NO-UNDO.

    /* Guard clause — check preconditions immediately */
    IF piCustNum <= 0 THEN DO:
        pcError = "Customer number must be positive".
        RETURN.
    END.

    FIND Customer WHERE Customer.CustNum = piCustNum NO-LOCK NO-ERROR.
    IF NOT AVAILABLE Customer THEN DO:
        pcError = "Customer " + STRING(piCustNum) + " not found".
        RETURN.
    END.
    IF ERROR-STATUS:ERROR THEN DO:
        pcError = "Database error: " + ERROR-STATUS:GET-MESSAGE(1).
        RETURN.
    END.

    pcError = "".  /* empty string means success */
END PROCEDURE.
```

**User-Defined FUNCTION Syntax:**

Functions must be declared (or forward-declared) before their first use:

```abl
/* Forward declaration — required when function body appears later in the file */
FUNCTION formatCurrency RETURNS CHARACTER (INPUT dAmount AS DECIMAL) FORWARD.

/* Function that calculates a discount tier */
FUNCTION getDiscountRate RETURNS DECIMAL (INPUT dBalance AS DECIMAL):
    IF dBalance >= 50000 THEN RETURN 0.20.
    IF dBalance >= 10000 THEN RETURN 0.10.
    IF dBalance >= 5000  THEN RETURN 0.05.
    RETURN 0.00.
END FUNCTION.

/* Implementation of forward-declared function */
FUNCTION formatCurrency RETURNS CHARACTER (INPUT dAmount AS DECIMAL):
    IF dAmount = ? THEN RETURN "N/A".
    RETURN "$" + STRING(dAmount, "->>,>>>,>>9.99").
END FUNCTION.

/* Usage */
DEFINE VARIABLE cFormatted AS CHARACTER NO-UNDO.
cFormatted = formatCurrency(INPUT 1234567.89).
MESSAGE cFormatted VIEW-AS ALERT-BOX.  /* $1,234,567.89 */
```

**Parameter Modes:**

| Mode | Direction | Description |
|------|-----------|-------------|
| `INPUT` | Caller → Procedure | Read-only in called procedure |
| `OUTPUT` | Procedure → Caller | Caller provides uninitialized variable |
| `INPUT-OUTPUT` | Both directions | Caller provides value; procedure can modify it |
| `RETURN` | Procedure → Caller | Special return parameter |
| `BUFFER` | Reference | Passes a database buffer by reference |
| `TABLE` | By value or ref | Passes a temp-table |
| `TABLE-HANDLE` | Handle | Passes a dynamic temp-table handle |
| `DATASET` | By value or ref | Passes a ProDataSet |
| `DATASET-HANDLE` | Handle | Passes a dynamic ProDataSet handle |

```abl
/* All standard parameter modes */
PROCEDURE demonstrateParams:
    DEFINE INPUT        PARAMETER pcInput   AS CHARACTER NO-UNDO.
    DEFINE OUTPUT       PARAMETER pcOutput  AS INTEGER   NO-UNDO.
    DEFINE INPUT-OUTPUT PARAMETER pdInOut   AS DECIMAL   NO-UNDO.
    DEFINE RETURN       PARAMETER prReturn  AS LOGICAL   NO-UNDO.

    /* Buffer parameter — passes actual DB buffer by reference */
    DEFINE PARAMETER BUFFER bCust FOR Customer.

    /* Temp-table parameters */
    DEFINE INPUT  PARAMETER TABLE FOR ttOrder.
    DEFINE OUTPUT PARAMETER TABLE FOR ttResult APPEND.
    DEFINE INPUT  PARAMETER TABLE-HANDLE httDynamic.

    /* Dataset parameters */
    DEFINE INPUT  PARAMETER DATASET FOR dsOrders.
    DEFINE OUTPUT PARAMETER DATASET-HANDLE hdsResult.

    pcOutput = LENGTH(pcInput).
    pdInOut  = pdInOut * 2.
    RETURN TRUE.
END PROCEDURE.
```

### Object-Oriented Programming (v10)

OOP was formally introduced in v10. While powerful, it is more limited than the v12 model.

**CLASS Statement Syntax:**

```abl
/* Basic class structure */
CLASS class-type-name
    [ INHERITS super-type-name ]
    [ IMPLEMENTS interface1 [, interface2]... ]
    [ USE-WIDGET-POOL ]
    [ ABSTRACT | FINAL ]
    [ SERIALIZABLE ]
    :

    /* Data members, properties, constructors, methods, events, destructor */

END CLASS.
```

**Full v10 class example:**

```abl
CLASS acme.BankAccount:

    /* Private data members */
    DEFINE PRIVATE VARIABLE dBalance     AS DECIMAL   NO-UNDO INITIAL 0.
    DEFINE PRIVATE VARIABLE cAccountId   AS CHARACTER NO-UNDO.
    DEFINE PRIVATE VARIABLE cOwnerName   AS CHARACTER NO-UNDO.

    /* Public property */
    DEFINE PUBLIC PROPERTY Balance AS DECIMAL NO-UNDO
        GET():
            RETURN dBalance.
        END GET.
        PRIVATE SET.    /* read-only externally */

    DEFINE PUBLIC PROPERTY AccountId AS CHARACTER NO-UNDO
        GET.            /* auto-property: AVM manages backing store */
        PRIVATE SET.

    /* Constructor */
    CONSTRUCTOR PUBLIC BankAccount(INPUT pcOwner AS CHARACTER,
                                   INPUT pcAccId  AS CHARACTER):
        cOwnerName = pcOwner.
        cAccountId = pcAccId.
    END CONSTRUCTOR.

    /* Public method */
    METHOD PUBLIC LOGICAL Deposit(INPUT pdAmount AS DECIMAL):
        IF pdAmount <= 0 THEN
            RETURN FALSE.
        dBalance = dBalance + pdAmount.
        RETURN TRUE.
    END METHOD.

    METHOD PUBLIC LOGICAL Withdraw(INPUT pdAmount AS DECIMAL):
        IF pdAmount <= 0       THEN RETURN FALSE.
        IF pdAmount > dBalance THEN RETURN FALSE.
        dBalance = dBalance - pdAmount.
        RETURN TRUE.
    END METHOD.

    /* Destructor — called on DELETE OBJECT */
    DESTRUCTOR PUBLIC BankAccount():
        /* cleanup resources if needed */
    END DESTRUCTOR.

END CLASS.
```

**Using the class:**

```abl
DEFINE VARIABLE rAccount AS CLASS acme.BankAccount NO-UNDO.

rAccount = NEW acme.BankAccount("John Smith", "ACC-001").

IF rAccount:Deposit(1000.00) THEN
    MESSAGE "Deposit successful. Balance: " rAccount:Balance
            VIEW-AS ALERT-BOX.

IF NOT rAccount:Withdraw(5000.00) THEN
    MESSAGE "Insufficient funds" VIEW-AS ALERT-BOX.

/* Clean up — explicit in v10 */
DELETE OBJECT rAccount.
```

**INTERFACE Syntax:**

```abl
INTERFACE acme.IPayable:

    /* Property prototypes — no implementation */
    DEFINE PUBLIC PROPERTY AccountId AS CHARACTER NO-UNDO
        GET.
        SET.

    /* Method prototypes */
    METHOD PUBLIC LOGICAL Deposit(INPUT pdAmount AS DECIMAL).
    METHOD PUBLIC LOGICAL Withdraw(INPUT pdAmount AS DECIMAL).
    METHOD PUBLIC DECIMAL GetBalance().

END INTERFACE.
```

**Rules for interfaces in v10:**
- All members are implicitly `PUBLIC`
- No `PRIVATE`, `STATIC`, or `ABSTRACT` on interface members
- No constructors, destructors, or storage
- A class can implement multiple interfaces: `IMPLEMENTS IFaceA, IFaceB`
- Interfaces can inherit from other interfaces: `INTERFACE ISavings INHERITS IPayable:`

**Inheritance — INHERITS (Single):**

ABL v10 supports **single inheritance** only. A class can inherit from one parent:

```abl
CLASS acme.SavingsAccount INHERITS acme.BankAccount:

    DEFINE PRIVATE VARIABLE dInterestRate AS DECIMAL NO-UNDO INITIAL 0.035.

    /* Override or extend constructor */
    CONSTRUCTOR PUBLIC SavingsAccount(INPUT pcOwner AS CHARACTER,
                                      INPUT pcAccId  AS CHARACTER,
                                      INPUT pdRate   AS DECIMAL):
        SUPER(pcOwner, pcAccId).     /* call parent constructor */
        dInterestRate = pdRate.
    END CONSTRUCTOR.

    /* Add new method not in parent */
    METHOD PUBLIC VOID ApplyInterest():
        DEFINE VARIABLE dInterest AS DECIMAL NO-UNDO.
        dInterest = THIS-OBJECT:Balance * dInterestRate.
        THIS-OBJECT:Deposit(dInterest).
    END METHOD.

END CLASS.
```

**Access Modifiers in v10:**

| Modifier | v10 | Accessible From |
|----------|:---:|-----------------|
| `PRIVATE` | ✅ | Defining class only (all instances of the same class can access each other's privates) |
| `PROTECTED` | ✅ | Defining class + any subclass in the hierarchy |
| `PUBLIC` | ✅ | Anywhere with a valid object reference or type name |
| `PACKAGE-PRIVATE` | ❌ | **Not in v10** — added in v12.2 |
| `PACKAGE-PROTECTED` | ❌ | **Not in v10** — added in v12.2 |

**Default access by member type:**

| Member Type | Default Access |
|-------------|---------------|
| Data members (variables) | `PRIVATE` |
| Properties | `PUBLIC` |
| Methods | `PUBLIC` |
| Events | `PUBLIC` |
| Constructors | `PUBLIC` |

### Error Handling (v10 Model)

> ⚠️ **Critical:** v10.1A does **not** have `CATCH`, `THROW`, or `FINALLY`. Those structured exception handling constructs were introduced in v10.2B. This section covers the **only** error handling mechanisms available in v10.

**The Three v10 Error Mechanisms:**

1. `ON ERROR` phrase on blocks
2. `NO-ERROR` option on statements + `ERROR-STATUS` system handle
3. `RETURN ERROR` to propagate errors to callers

**ON ERROR Phrase on Blocks:**

The `ON ERROR` phrase attaches to any block statement (`DO`, `REPEAT`, `FOR EACH`):

```abl
/* ON ERROR UNDO, LEAVE — undo block and exit it on error */
DO ON ERROR UNDO, LEAVE:
    FIND Customer WHERE Customer.CustNum = 1001 EXCLUSIVE-LOCK.
    Customer.Balance = Customer.Balance + 500.
    /* On error: undo the find/update and exit this DO block */
END.

/* ON ERROR UNDO, RETRY — undo and retry the current iteration */
REPEAT ON ERROR UNDO, RETRY:
    PROMPT-FOR Customer.CustNum.
    FIND Customer USING CustNum NO-ERROR.
    IF NOT AVAILABLE Customer THEN NEXT.
    DISPLAY Customer.Name Customer.Balance.
END.

/* ON ERROR UNDO, NEXT — undo and skip to next iteration */
FOR EACH Customer ON ERROR UNDO, NEXT:
    ASSIGN Customer.LastUpdated = TODAY NO-ERROR.
    IF ERROR-STATUS:ERROR THEN
        DISPLAY "Failed to update: " Customer.CustNum.
END.

/* ON ERROR UNDO, RETURN ERROR — propagate to caller */
DO TRANSACTION ON ERROR UNDO, RETURN ERROR:
    FIND Order WHERE Order.OrderNum = iNum EXCLUSIVE-LOCK.
    Order.Status = "CLOSED".
END.
```

**NO-ERROR Option:**

`NO-ERROR` suppresses the error condition and stores error information in `ERROR-STATUS`:

```abl
/* NO-ERROR on FIND */
FIND FIRST Customer WHERE Customer.CustNum = 9999 NO-LOCK NO-ERROR.
IF ERROR-STATUS:ERROR THEN DO:
    MESSAGE "Error finding customer: " ERROR-STATUS:GET-MESSAGE(1)
            VIEW-AS ALERT-BOX.
    RETURN.
END.
IF NOT AVAILABLE Customer THEN DO:
    MESSAGE "Customer not found" VIEW-AS ALERT-BOX.
    RETURN.
END.

/* NO-ERROR on ASSIGN */
ASSIGN Customer.Balance = dNewBalance NO-ERROR.
IF ERROR-STATUS:ERROR THEN DO:
    MESSAGE "Assignment error: " ERROR-STATUS:GET-MESSAGE(1)
            VIEW-AS ALERT-BOX.
    UNDO, RETURN ERROR.
END.

/* NO-ERROR on RUN */
RUN validateOrder (INPUT iOrderNum, OUTPUT cError) NO-ERROR.
IF ERROR-STATUS:ERROR THEN
    cError = ERROR-STATUS:GET-MESSAGE(1).
```

**ERROR-STATUS System Handle:**

`ERROR-STATUS` is a built-in system handle that contains information about the last error:

| Attribute / Method | Type | Description |
|-------------------|------|-------------|
| `ERROR-STATUS:ERROR` | LOGICAL | TRUE if the last `NO-ERROR` statement raised an error |
| `ERROR-STATUS:NUM-MESSAGES` | INTEGER | Count of error messages in the error stack |
| `ERROR-STATUS:GET-MESSAGE(n)` | CHARACTER | Error message text at index n (1-based) |
| `ERROR-STATUS:GET-NUMBER(n)` | INTEGER | Error number/code at index n (1-based) |

```abl
/* Check all messages in the error stack */
DEFINE VARIABLE ix AS INTEGER NO-UNDO.

FIND Customer WHERE Customer.CustNum = 9999 NO-LOCK NO-ERROR.
IF ERROR-STATUS:ERROR THEN DO:
    DO ix = 1 TO ERROR-STATUS:NUM-MESSAGES:
        MESSAGE "Error " ix ": [" ERROR-STATUS:GET-NUMBER(ix) "] "
                ERROR-STATUS:GET-MESSAGE(ix)
                VIEW-AS ALERT-BOX.
    END.
END.
```

> ⚠️ **WARNING:** `ERROR-STATUS` is **reset on every `NO-ERROR` statement**. If you call two NO-ERROR statements in a row, only the second one's error info is preserved. Always check `ERROR-STATUS` immediately after the statement that could fail.

**❌ BAD — ERROR-STATUS may be reset by the second NO-ERROR:**

```abl
FIND Customer WHERE Customer.CustNum = 1 NO-LOCK NO-ERROR.
ASSIGN Customer.Balance = 500 NO-ERROR.
IF ERROR-STATUS:ERROR THEN  /* This reflects only the ASSIGN, not the FIND */
    MESSAGE "Error" VIEW-AS ALERT-BOX.
```

**✅ GOOD — Check immediately after each NO-ERROR statement:**

```abl
FIND Customer WHERE Customer.CustNum = 1 NO-LOCK NO-ERROR.
IF ERROR-STATUS:ERROR THEN DO:
    MESSAGE "FIND error: " ERROR-STATUS:GET-MESSAGE(1) VIEW-AS ALERT-BOX.
    RETURN.
END.
IF NOT AVAILABLE Customer THEN RETURN.

ASSIGN Customer.Balance = 500 NO-ERROR.
IF ERROR-STATUS:ERROR THEN DO:
    MESSAGE "ASSIGN error: " ERROR-STATUS:GET-MESSAGE(1) VIEW-AS ALERT-BOX.
    UNDO, RETURN ERROR.
END.
```

**v10 Combined Error + Transaction Pattern:**

The canonical v10 pattern for safe database updates:

```abl
/* Reliable v10 update pattern */
DEFINE VARIABLE lSuccess AS LOGICAL NO-UNDO.

lSuccess = FALSE.
DO TRANSACTION ON ERROR UNDO, LEAVE:
    FIND Customer WHERE Customer.CustNum = iCustNum
        EXCLUSIVE-LOCK NO-WAIT NO-ERROR.
    IF ERROR-STATUS:ERROR THEN DO:
        MESSAGE "Record locked or error: " ERROR-STATUS:GET-MESSAGE(1)
                VIEW-AS ALERT-BOX.
        UNDO, LEAVE.
    END.
    IF NOT AVAILABLE Customer THEN DO:
        MESSAGE "Customer not found" VIEW-AS ALERT-BOX.
        UNDO, LEAVE.
    END.

    ASSIGN
        Customer.Balance    = Customer.Balance + dAdjustment
        Customer.LastUpdate = TODAY   NO-ERROR.
    IF ERROR-STATUS:ERROR THEN DO:
        UNDO, LEAVE.
    END.

    lSuccess = TRUE.
END.  /* transaction commits here if lSuccess = TRUE */

IF lSuccess THEN
    MESSAGE "Update successful" VIEW-AS ALERT-BOX.
```

### Database Access

**FOR EACH Statement:**

The `FOR EACH` statement is ABL's primary record iteration construct:

```abl
/* Basic iteration — NO-LOCK is required for read-only access */
FOR EACH Customer NO-LOCK:
    DISPLAY Customer.CustNum Customer.Name Customer.Balance.
END.

/* WHERE clause filtering */
FOR EACH Customer
    WHERE Customer.Balance > 1000
    AND   Customer.Country = "USA"
    NO-LOCK:
    DISPLAY Customer.Name Customer.Balance.
END.

/* ORDER BY clause */
FOR EACH Customer
    WHERE Customer.Country = "USA"
    NO-LOCK
    BY Customer.Name:
    DISPLAY Customer.Name.
END.

/* Descending sort */
FOR EACH Customer
    NO-LOCK
    BY Customer.Balance DESCENDING:
    DISPLAY Customer.Name Customer.Balance.
END.

/* Multi-table join */
FOR EACH Order NO-LOCK,
    EACH OrderLine OF Order NO-LOCK,
    FIRST Product OF OrderLine NO-LOCK:
    DISPLAY Order.OrderNum OrderLine.Qty Product.Name.
END.
```

**BREAK BY and Accumulation:**

```abl
/* BREAK BY enables group processing and ACCUM functions */
FOR EACH Customer
    NO-LOCK
    BREAK BY Customer.State
    BY Customer.Name:

    /* Fires once at the start of each State group */
    IF FIRST-OF(Customer.State) THEN
        MESSAGE "=== State: " Customer.State " ===" VIEW-AS ALERT-BOX.

    DISPLAY Customer.Name Customer.Balance.

    /* Fires once at the end of each State group */
    IF LAST-OF(Customer.State) THEN
        DISPLAY "Subtotal for " Customer.State ":"
                ACCUM SUM Customer.Balance.
END.

/* Accumulate function types: SUM, COUNT, MAX, MIN, AVERAGE */
FOR EACH OrderLine NO-LOCK BREAK BY OrderLine.OrderNum:
    IF LAST-OF(OrderLine.OrderNum) THEN
        DISPLAY "Order " OrderLine.OrderNum
                " Lines: " ACCUM COUNT OrderLine.LineNum
                " Total:  " ACCUM SUM   OrderLine.ExtPrice.
END.
```

**Lock Modes:**

| Lock Mode | Description |
|-----------|-------------|
| `NO-LOCK` | Read-only. No lock held. Other users can read and write. **Best for reports.** |
| `SHARE-LOCK` | Shared read lock. Others can share-lock but not exclusive-lock. |
| `EXCLUSIVE-LOCK` | Full write access. Other users must wait until the lock is released. |
| `NO-WAIT` | Do not block if lock unavailable — immediately return without the record. |

```abl
/* NO-LOCK — reporting and read-only */
FOR EACH Customer NO-LOCK:
    DISPLAY Customer.Name.
END.

/* EXCLUSIVE-LOCK — for updates */
FIND Customer WHERE Customer.CustNum = 1001 EXCLUSIVE-LOCK NO-ERROR.

/* SHARE-LOCK — read with notification to others */
FIND Customer WHERE Customer.CustNum = 1001 SHARE-LOCK NO-ERROR.

/* NO-WAIT — try to lock but don't wait if unavailable */
FIND Customer WHERE Customer.CustNum = 1001 EXCLUSIVE-LOCK NO-WAIT NO-ERROR.
IF LOCKED(Customer) THEN
    MESSAGE "Record is locked by another user" VIEW-AS ALERT-BOX.

/* Downgrade from EXCLUSIVE to NO-LOCK after update committed */
FIND CURRENT Customer NO-LOCK.
```

**FIND Statement:**

```abl
/* FIND FIRST — first record matching criteria */
FIND FIRST Customer WHERE Customer.Balance > 5000 NO-LOCK NO-ERROR.
IF NOT AVAILABLE Customer THEN
    MESSAGE "No customers found" VIEW-AS ALERT-BOX.

/* FIND LAST — last record matching criteria */
FIND LAST Customer BY Customer.Balance DESCENDING NO-LOCK.

/* FIND using frame field value */
FIND Customer USING Customer.CustNum.     /* matches frame input value */

/* FIND OF — uses index match to related table */
FOR EACH Order NO-LOCK:
    FIND Customer OF Order NO-LOCK NO-ERROR.
    IF AVAILABLE Customer THEN
        DISPLAY Order.OrderNum Customer.Name.
END.

/* FIND CURRENT — reposition existing buffer (change lock) */
FIND FIRST Customer NO-LOCK.
/* ... check the record ... */
FIND CURRENT Customer EXCLUSIVE-LOCK.   /* upgrade to exclusive for update */
Customer.Balance = Customer.Balance + 100.
FIND CURRENT Customer NO-LOCK.          /* downgrade lock when done */

/* CAN-FIND — boolean check without loading record into buffer */
IF CAN-FIND(Customer WHERE Customer.CustNum = iNum) THEN
    MESSAGE "Customer exists" VIEW-AS ALERT-BOX.
```

### Transaction Handling

**ABL Implicit Transaction Model:**

ABL uses an **implicit, scope-based transaction model**. There is no explicit `COMMIT` or `ROLLBACK` statement in the 4GL. Transactions are defined by block boundaries:

- **`REPEAT` block:** Each iteration is a separate transaction. The transaction commits at the bottom of each iteration or when `RELEASE` is called.
- **`DO TRANSACTION` block:** The entire `DO` block is one transaction. Commits at `END.` if no error occurred.
- **No block:** Without a transaction block, database writes create "chained" transactions that commit when the record buffer is released.

```abl
/* REPEAT — each iteration is auto-committed */
REPEAT:
    CREATE Order.
    Order.OrderNum = NEXT-VALUE(orderSeq).
    Order.CustNum  = iCustNum.
    RELEASE Order.    /* commits this iteration's transaction immediately */
END.

/* DO TRANSACTION — entire block is one atomic transaction */
DO TRANSACTION:
    FIND Customer WHERE Customer.CustNum = 1001 EXCLUSIVE-LOCK.
    ASSIGN
        Customer.Balance    = Customer.Balance + 500
        Customer.LastUpdate = TODAY.
END.   /* transaction commits here if no error */

/* Check if currently inside an active transaction */
IF TRANSACTION THEN
    MESSAGE "Inside a transaction" VIEW-AS ALERT-BOX.
```

**UNDO Statement:**

```abl
/* Syntax */
UNDO [ label ] [ , action ]

/* Actions: RETRY, LEAVE, NEXT, RETURN ERROR */

/* UNDO, RETRY — undo current iteration and try again */
REPEAT ON ERROR UNDO, RETRY:
    IF RETRY THEN MESSAGE "Retrying...".
    FIND Customer WHERE Customer.CustNum = iNum EXCLUSIVE-LOCK NO-ERROR.
    IF LOCKED(Customer) THEN DO:
        PAUSE 1 NO-MESSAGE.
        UNDO, RETRY.     /* wait 1 second and retry the lock */
    END.
    /* ... proceed with update ... */
END.

/* UNDO, LEAVE — undo and exit the current block */
DO TRANSACTION ON ERROR UNDO, LEAVE:
    FIND Order WHERE Order.OrderNum = iNum EXCLUSIVE-LOCK NO-ERROR.
    IF NOT AVAILABLE Order THEN UNDO, LEAVE.
    Order.Status = "PROCESSED".
END.

/* UNDO, NEXT — undo and skip to next iteration */
FOR EACH Customer EXCLUSIVE-LOCK ON ERROR UNDO, NEXT:
    ASSIGN Customer.Balance = Customer.Balance * 1.05 NO-ERROR.
    IF ERROR-STATUS:ERROR THEN
        UNDO, NEXT.
END.

/* UNDO, RETURN ERROR — undo and signal error to caller */
PROCEDURE updateBalance:
    DEFINE INPUT PARAMETER piCustNum AS INTEGER.
    DEFINE INPUT PARAMETER pdAmount  AS DECIMAL.

    DO TRANSACTION ON ERROR UNDO, RETURN ERROR:
        FIND Customer WHERE Customer.CustNum = piCustNum
            EXCLUSIVE-LOCK NO-ERROR.
        IF NOT AVAILABLE Customer THEN
            UNDO, RETURN ERROR "Customer not found: " + STRING(piCustNum).
        Customer.Balance = Customer.Balance + pdAmount.
    END.
END PROCEDURE.
```

**RELEASE Statement:**

`RELEASE` commits the transaction and releases locks on a record buffer:

```abl
/* RELEASE frees the buffer and commits — same as reaching end of REPEAT iteration */
FOR EACH Order EXCLUSIVE-LOCK:
    Order.Status = "PROCESSED".
    RELEASE Order.     /* commits the update and releases the lock immediately */
END.
```

### Control Flow

**IF / THEN / ELSE:**

```abl
/* Statement form — single action per branch */
IF Customer.Balance > 10000 THEN
    MESSAGE "Gold customer" VIEW-AS ALERT-BOX.
ELSE IF Customer.Balance > 5000 THEN
    MESSAGE "Silver customer" VIEW-AS ALERT-BOX.
ELSE
    MESSAGE "Standard customer" VIEW-AS ALERT-BOX.

/* Block form — multiple actions per branch */
IF Customer.Balance > 10000 THEN DO:
    ASSIGN Customer.Tier = "GOLD"
           Customer.Discount = 0.15.
    RUN notifyGoldStatus(INPUT Customer.CustNum).
END.
ELSE DO:
    ASSIGN Customer.Tier = "STANDARD"
           Customer.Discount = 0.00.
END.
```

**Inline IF Expression (Ternary):**

```abl
/* Inline IF evaluates to a value — like a ternary operator */
cTier    = IF Customer.Balance > 10000 THEN "GOLD" ELSE "STANDARD".
dRate    = IF lIsEmployee THEN 0.20 ELSE 0.10.
cStatus  = IF lActive THEN "Active" ELSE "Inactive".

/* Can be nested */
cTier = IF Customer.Balance > 50000 THEN "PLATINUM"
   ELSE IF Customer.Balance > 10000 THEN "GOLD"
   ELSE IF Customer.Balance > 5000  THEN "SILVER"
   ELSE "STANDARD".
```

**CASE Statement:**

```abl
/* Basic CASE */
CASE Customer.Tier:
    WHEN "GOLD"     THEN dDiscount = 0.15.
    WHEN "SILVER"   THEN dDiscount = 0.10.
    WHEN "BRONZE"   THEN dDiscount = 0.05.
    OTHERWISE            dDiscount = 0.00.
END CASE.

/* Multiple values per branch using OR WHEN */
CASE Order.Status:
    WHEN "NEW" OR WHEN "PENDING" THEN DO:
        MESSAGE "Order needs processing" VIEW-AS ALERT-BOX.
        RUN queueOrder(INPUT Order.OrderNum).
    END.
    WHEN "SHIPPED" OR WHEN "DELIVERED" THEN
        MESSAGE "Order is on its way" VIEW-AS ALERT-BOX.
    WHEN "CANCELLED" THEN
        RUN archiveOrder(INPUT Order.OrderNum).
    OTHERWISE
        MESSAGE "Unknown status: " Order.Status VIEW-AS ALERT-BOX.
END CASE.
```

**DO Loop:**

```abl
/* Counted loop */
DEFINE VARIABLE ix AS INTEGER NO-UNDO.
DO ix = 1 TO 10:
    DISPLAY ix.
END.

/* Counted loop with step */
DO ix = 10 TO 1 BY -1:   /* countdown */
    DISPLAY ix.
END.

/* While loop */
DEFINE VARIABLE lContinue AS LOGICAL NO-UNDO INITIAL TRUE.
DO WHILE lContinue:
    /* ... do work ... */
    IF iCount >= 100 THEN lContinue = FALSE.
END.

/* Transaction block */
DO TRANSACTION:
    CREATE Customer.
    Customer.CustNum = NEXT-VALUE(custSeq).
END.

/* Error-handling block */
DO ON ERROR UNDO, LEAVE:
    FIND Customer WHERE Customer.CustNum = 9999 EXCLUSIVE-LOCK NO-ERROR.
    IF NOT AVAILABLE Customer THEN LEAVE.
    Customer.Balance = 0.
END.
```

**REPEAT Statement:**

```abl
/* Infinite loop — exits via LEAVE or RETURN */
REPEAT:
    PROMPT-FOR Customer.CustNum.
    FIND Customer USING Customer.CustNum NO-LOCK NO-ERROR.
    IF NOT AVAILABLE Customer THEN DO:
        MESSAGE "Customer not found. Try again." VIEW-AS ALERT-BOX.
        NEXT.
    END.
    DISPLAY Customer.Name Customer.Balance.
    LEAVE.   /* exit after successful find */
END.

/* Counted REPEAT */
DEFINE VARIABLE ix AS INTEGER NO-UNDO.
REPEAT ix = 1 TO NUM-ALIASES:
    MESSAGE ALIAS(ix) VIEW-AS ALERT-BOX.
END.

/* Transaction per iteration */
REPEAT TRANSACTION:
    /* each pass through this loop is an auto-committed transaction */
    CREATE Order.
    Order.OrderNum = NEXT-VALUE(orderSeq).
    /* ... */
    RELEASE Order.
END.
```

**Named Blocks and LEAVE/NEXT:**

```abl
/* Named blocks allow LEAVE and NEXT to target specific blocks */
outerLoop:
DO ix = 1 TO 100:
    innerLoop:
    DO iy = 1 TO 100:
        IF ix = 50 AND iy = 50 THEN
            LEAVE outerLoop.    /* exit the outer DO */
        IF iy = 30 THEN
            NEXT outerLoop.     /* skip to next outer iteration */
    END.   /* innerLoop */
END.   /* outerLoop */
```

**LEAVE, NEXT, RETURN:**

```abl
LEAVE.              /* exit innermost block (like break in other languages) */
LEAVE blockLabel.   /* exit named block */

NEXT.               /* skip to next iteration (like continue) */
NEXT blockLabel.    /* skip to next in named block */

RETURN.             /* exit procedure/function normally */
RETURN "value".     /* return a string value — accessible via RETURN-VALUE */
RETURN ERROR.       /* exit and raise error condition in caller */
RETURN ERROR "message".  /* exit with error message string */
```

---

## What v10 Does NOT Have

This section is critical for developers working with v10 code or migrating to a later version.

### Missing Language Features Table

| Feature | Status in v10 | When Added |
|---------|:-------------:|------------|
| `INT64` data type | ❌ Not in v10.1A | v10.1B |
| `ENUM` statement | ❌ | v12 |
| `VAR` shorthand declaration | ❌ | v12.3 |
| Compound operators (`+=`, `-=`, `*=`, `/=`) | ❌ | v12.3 |
| `CATCH` / `THROW` / `FINALLY` | ❌ | v10.2B |
| `BLOCK-LEVEL ON ERROR UNDO, THROW` directive | ❌ | Post-v10 |
| JSON support (`JsonObject`, `JsonArray`, `READ-JSON`, `WRITE-JSON`) | ❌ | v11.x |
| Generic collections (`List<T>`, `SortedSet<T>`, `HashMap<K,V>`) | ❌ | v12.5–12.7 |
| Safe navigation operator `?:` | ❌ | v12.5 |
| `PACKAGE-PRIVATE` access modifier | ❌ | v12.2 |
| `PACKAGE-PROTECTED` access modifier | ❌ | v12.2 |
| Override non-abstract properties | ❌ | v12.5 |
| `FINAL` on properties | ❌ | v12.5 |
| Server-side joins (FOR+NO-LOCK up to 10 tables) | ❌ | v12.0 |
| Class-based SAX callbacks (`EVENT-HANDLER-OBJECT`) | ❌ | v12 |
| `DYNAMIC-INVOKE()` for class methods | ⚠️ Limited | Improved v12 |

### How to Work Around Missing Features in v10

**Instead of INT64 — use DECIMAL:**
```abl
/* v10: no INT64 — use DECIMAL for large numbers */
DEFINE VARIABLE dBigCounter AS DECIMAL NO-UNDO.
dBigCounter = 9000000000.   /* exceeds INTEGER max, fine as DECIMAL */
```

**Instead of ENUM — use INTEGER constants or CHARACTER literals:**
```abl
/* v10: no ENUM — use &DEFINE preprocessor constants */
&DEFINE STATUS_PENDING  "PENDING"
&DEFINE STATUS_ACTIVE   "ACTIVE"
&DEFINE STATUS_CLOSED   "CLOSED"

/* Or use INTEGER constants */
&DEFINE ORDER_NEW       1
&DEFINE ORDER_PENDING   2
&DEFINE ORDER_SHIPPED   3

DEFINE VARIABLE iStatus AS INTEGER NO-UNDO INITIAL {&ORDER_NEW}.
IF iStatus = {&ORDER_SHIPPED} THEN
    MESSAGE "Order shipped" VIEW-AS ALERT-BOX.
```

**Instead of CATCH/THROW — use NO-ERROR + ERROR-STATUS:**
```abl
/* v10: error handling without CATCH */
FIND Customer WHERE Customer.CustNum = iNum EXCLUSIVE-LOCK NO-ERROR.
IF ERROR-STATUS:ERROR THEN DO:
    /* handle database error */
    RETURN ERROR "DB error: " + ERROR-STATUS:GET-MESSAGE(1).
END.
IF NOT AVAILABLE Customer THEN DO:
    RETURN ERROR "Customer not found: " + STRING(iNum).
END.
```

**Instead of generic collections — use comma-delimited strings or temp-tables:**
```abl
/* v10: simulate a list with a comma-delimited string */
DEFINE VARIABLE cGoldCustomers AS CHARACTER NO-UNDO.
FOR EACH Customer NO-LOCK WHERE Customer.Balance > 10000:
    IF cGoldCustomers <> "" THEN
        cGoldCustomers = cGoldCustomers + ",".
    cGoldCustomers = cGoldCustomers + STRING(Customer.CustNum).
END.

/* Access items */
DEFINE VARIABLE ix AS INTEGER NO-UNDO.
DO ix = 1 TO NUM-ENTRIES(cGoldCustomers):
    MESSAGE "Gold customer: " ENTRY(ix, cGoldCustomers) VIEW-AS ALERT-BOX.
END.

/* Or use a temp-table as a typed collection */
DEFINE TEMP-TABLE ttGoldCustomers NO-UNDO
    FIELD CustNum AS INTEGER
    FIELD Name    AS CHARACTER
    INDEX ixCustNum IS PRIMARY CustNum.

FOR EACH Customer NO-LOCK WHERE Customer.Balance > 10000:
    CREATE ttGoldCustomers.
    ASSIGN ttGoldCustomers.CustNum = Customer.CustNum
           ttGoldCustomers.Name    = Customer.Name.
END.
```

**Instead of safe navigation `?:` — use explicit VALID-OBJECT checks:**
```abl
/* v10: must check for null/invalid objects explicitly */
IF VALID-OBJECT(rOrder) THEN
    IF VALID-OBJECT(rOrder:Customer) THEN
        MESSAGE rOrder:Customer:Name VIEW-AS ALERT-BOX.
```

---

## Related Skills

| Skill | Purpose |
|-------|--------|
| `programming-abl-v12-learning` | Modern ABL (v12+) with ENUM, CATCH/THROW, JSON, generics |
| `programming-abl-v10-ui` | OpenEdge v10 UI patterns (frames, widgets, event handling) |
| `coding-code-review` | General code review methodology, OWASP security patterns |

---

## Version History Context

| Version | Release | Key Language Additions |
|---------|---------|----------------------|
| v10.0B | ~2005 | `DATETIME`, `DATETIME-TZ`, `BLOB`, `CLOB`, `LONGCHAR`, `NOW` |
| **v10.1A** | **Dec 2005** | **Formal OOP** (`CLASS`, `INTERFACE`, `METHOD`, events) |
| v10.1B | 2006 | `INT64` data type |
| v10.2B | ~2007 | `CATCH` / `THROW` / `FINALLY` structured error handling |
| v11.x | ~2011+ | JSON support (`JsonObject`, `JsonArray`, `READ-JSON`, `WRITE-JSON`) |
| v12.0 | 2019 | Server-side joins, STOP catchable by default, 64-bit sequences |
| v12.2 | 2020 | `PACKAGE-PRIVATE`, `PACKAGE-PROTECTED` |
| v12.3 | 2021 | `VAR` shorthand, compound operators (`+=`, `-=`), `CHAR`/`INT` synonyms |
| v12.5 | 2022 | Safe navigation `?:`, generic `List<T>`, override non-abstract properties |
| v12.7 | 2023 | `HashMap<K,V>`, `HASH-CODE`, signed archive libraries |