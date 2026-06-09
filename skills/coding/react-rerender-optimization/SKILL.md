---
name: react-rerender-optimization
description: Reduces unnecessary React component re-renders using targeted memoization (React.memo, useMemo, useCallback), stable key props for list rendering, atomic state management, and context value stabilization.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: react rerender, memoization, react memo, useMemo, useCallback, render optimization, avoid rerender
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-client-data-fetching, react-async-waterfalls, react-composition-patterns
  author: https://github.com/vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React Re-Render Optimization

Minimizes unnecessary re-renders in React component trees by applying targeted memoization (`React.memo`, `useMemo`, `useCallback`), using stable and unique key props for list rendering, colocating state to its smallest necessary scope, stabilizing context provider values, and splitting large state objects into atomic units. Every optimization is driven by profiler measurements — never by intuition alone.

## TL;DR Checklist

- [ ] Profile with React DevTools Profiler before applying any memoization
- [ ] Wrap frequently re-rendering child components with `React.memo()`
- [ ] Memoize expensive computations with `useMemo()` — not every inline value
- [ ] Pass stable function references with `useCallback()` to memoized children
- [ ] Use stable, unique IDs (not array index) as list keys
- [ ] Split state into atomic `useState` calls instead of one large object
- [ ] Use `useRef` for values that should NOT trigger re-renders
- [ ] Stabilize context provider values with `useMemo()` to prevent cascading re-renders
- [ ] Move context provider out of the same component that renders children

---

## When to Use

Use this skill when:

- React DevTools Profiler shows excessive re-renders of deep component trees
- UI feels laggy or janky during state updates (not data loading)
- Components re-render when their props haven't changed (wasted renders)
- Large lists re-render entirely when only one item changes
- Context providers cause all consumers to re-render unnecessarily
- Building animation-heavy interfaces where every frame matters
- Investigating performance issues with complex forms or data entry screens

---

## When NOT to Use

Avoid this skill for:

- Initial development — write correct code first, optimize later (premature optimization)
- Applications with simple component trees where re-render cost is negligible
- Components that re-render infrequently (once per user action, not per keystroke)
- Parts of the tree where re-renders are cheap (leaf nodes with no children)
- Over-memoizing: wrapping everything in `React.memo` and `useCallback` adds overhead

---

## Core Workflow

1. **Profile First** — Open React DevTools Profiler, record an interaction, and inspect the flamegraph. Identify components that re-render unnecessarily. **Checkpoint:** Note which components re-render without prop changes — those are optimization targets.

2. **Apply Targeted React.memo** — Wrap components that receive the same props but re-render due to parent state changes. Verify the component renders less frequently in the profiler after adding `React.memo`. **Checkpoint:** Re-profile to confirm the memo actually prevented re-renders.

3. **Memoize Expensive Computations** — Use `useMemo()` for derived data (filtered lists, sorted arrays, formatted values) that are expensive to compute. Do NOT memoize trivial calculations like string concatenation. **Checkpoint:** Verify the computation runs once when dependencies change, not on every render.

4. **Stabilize Callbacks with useCallback** — Pass `useCallback()` to children wrapped in `React.memo()` so they receive stable function references. Without this, `React.memo` can't prevent re-renders because the callback prop changes every render.

5. **Optimize Keys and State** — Replace array index keys with stable IDs. Split large `useState` objects into atomic pieces. **Checkpoint:** Verify the profiler shows fewer re-renders in list items and form fields.

6. **Stabilize Context** — Wrap context provider values in `useMemo()`. Move the provider into its own component to prevent the provider value from changing when unrelated parent state changes.

---

## Implementation Patterns

### Pattern 1: React.memo with useCallback (BAD vs. GOOD)

```tsx
import { memo, useState, useCallback } from 'react';

// ── Child component ─────────────────────────────────────
interface ExpensiveItemProps {
  title: string;
  onSelect: (id: string) => void;
  selected: boolean;
}

const ExpensiveItem = memo(function ExpensiveItem({
  title,
  onSelect,
  selected,
}: ExpensiveItemProps) {
  // Simulates expensive rendering (large list item with charts, etc.)
  console.log(`Rendering: ${title}`);
  return (
    <div
      className={`item ${selected ? 'item--selected' : ''}`}
      onClick={() => onSelect(title)}
    >
      {title}
    </div>
  );
});

// ── Parent component ────────────────────────────────────
function ItemList() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

  // ❌ BAD: New function created every render — memoized child can't skip re-render
  const handleBadSelect = (id: string) => {
    setSelected(id);
  };

  // ✅ GOOD: Stable callback identity via useCallback
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []); // No deps — setSelected is stable

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />

      {items.map(item => (
        <ExpensiveItem
          key={item}
          title={item}
          onSelect={handleSelect}   // Stable reference — memo works!
          selected={selected === item}
        />
      ))}
    </div>
  );
}
// With BAD handleBadSelect: typing in search causes ALL items to re-render
// With GOOD handleSelect: only the changed item re-renders when selected changes
```

### Pattern 2: useMemo for Expensive Computations

```tsx
import { useMemo } from 'react';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
}

function TransactionSummary({ transactions, categoryFilter }: {
  transactions: Transaction[];
  categoryFilter: string;
}) {
  // ❌ BAD: Filtered + sorted arrays recomputed on EVERY render
  const filtered = transactions
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ✅ GOOD: Only recompute when transactions or categoryFilter actually change
  const filteredTransactions = useMemo(
    () => transactions
      .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, categoryFilter]
  );

  const totals = useMemo(
    () => filteredTransactions.reduce(
      (acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }),
      {} as Record<string, number>
    ),
    [filteredTransactions]
  );

  return (
    <div>
      {filteredTransactions.map(t => (
        <div key={t.id}>{t.category}: ${t.amount}</div>
      ))}
      <div>Category breakdown: {JSON.stringify(totals)}</div>
    </div>
  );
}
```

### Pattern 3: Stable Keys for Lists (BAD vs. GOOD)

```tsx
// ❌ BAD: Array index as key — causes re-renders, state bugs, and lost focus
function BadTodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
        // Problem 1: Adding an item shifts all keys — all items re-render
        // Problem 2: Removing an item shifts keys — wrong items get new state
        // Problem 3: Reordering breaks completely — React can't track identity
      ))}
    </ul>
  );
}

// ✅ GOOD: Stable unique ID as key
function GoodTodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
        // IDs stay stable across add/remove/reorder — only changed items re-render
      ))}
    </ul>
  );
}

// ⚠️ ACCEPTABLE (last resort): Stable combined key when no ID exists
function AcceptableFallback({ items }: { items: { name: string; type: string }[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={`${item.type}-${item.name}`}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

### Pattern 4: Atomic State Instead of Large Objects

```tsx
import { useState } from 'react';

interface FormData {
  name: string;
  email: string;
  address: string;
  city: string;
  country: string;
  newsletter: boolean;
  theme: 'light' | 'dark';
  fontSize: number;
}

// ❌ BAD: Single state object — changing ANY field re-renders ALL form components
function BadForm() {
  const [form, setForm] = useState<FormData>({ /* initial values */ });

  const updateField = (field: keyof FormData, value: string | boolean | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Every field change triggers one re-render of the entire form
  };

  return (
    <div>
      <input value={form.name} onChange={e => updateField('name', e.target.value)} />
      <input value={form.email} onChange={e => updateField('email', e.target.value)} />
      {/* Full re-render on every keystroke — even for unrelated fields */}
    </div>
  );
}

// ✅ GOOD: Atomic state — each field re-renders independently
function GoodForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Typing in name only re-renders the name input (if memoized properly or in separate component)
  return (
    <div>
      <NameInput value={name} onChange={setName} />
      <EmailInput value={email} onChange={setEmail} />
      <AddressInput value={address} onChange={setAddress} />
      <NewsletterToggle value={newsletter} onChange={setNewsletter} />
    </div>
  );
}
```

### Pattern 5: Context Value Stabilization

```tsx
import { createContext, useContext, useMemo, useState } from 'react';

interface AuthContextValue {
  user: { id: string; name: string } | null;
  login: (token: string) => void;
  logout: () => void;
}

// ❌ BAD: Context provider in a component that also renders children
// Any parent state change creates a new context value → ALL consumers re-render
function BadAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  // This is a NEW object every render — every consumer re-renders
  const value = {
    user,
    login: (token: string) => setUser({ id: '1', name: 'User' }),
    logout: () => setUser(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ GOOD: Context value memoized so only relevant changes trigger re-renders
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  // Stable callbacks — identity doesn't change across renders
  const login = useCallback((token: string) => {
    setUser({ id: '1', name: 'User' });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Memoized context value — only changes when user changes
  const value = useMemo<AuthContextValue>(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Pattern 6: useRef for Non-Rendering Values

```tsx
import { useRef, useState, useEffect } from 'react';

function Timer() {
  const [elapsed, setElapsed] = useState(0);

  // ❌ BAD: State for values that don't affect rendering
  const [intervalId, setIntervalId] = useState<number | null>(null);
  // Changing intervalId triggers a re-render even though nothing visible changes

  // ✅ GOOD: useRef for persistent values that don't trigger re-renders
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <div>Elapsed: {elapsed}ms</div>;
}
```

---

## Constraints

### MUST DO
- Profile before memoizing — measure the performance problem, don't guess
- Use stable, unique IDs as list keys — never use array index for dynamic lists
- Stabilize context provider values with `useMemo()` to prevent cascading re-renders
- Split state into the smallest logical units (separate `useState` calls)
- Use `useRef` for values that persist across renders but shouldn't trigger re-renders
- Wrap `useCallback` around callbacks passed to memoized child components

### MUST NOT DO
- Over-memoize — only memoize when the profiler shows a measurable benefit
- Use array index as key in dynamic lists (add/remove/reorder causes bugs)
- Create new objects or arrays in the render body and pass them as props (breaks memoization)
- Put context provider in the same component that renders children (creates new value on every parent render)
- Memoize trivial computations — `useMemo` has overhead; only use it for genuinely expensive operations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-composition-patterns` | Proper component composition reduces prop changes that trigger re-renders |
| `react-client-data-fetching` | Query caching reduces unnecessary re-renders from data refetches |
| `react-async-waterfalls` | Parallel data fetching prevents cascading re-renders from sequential data loads |
| `react-server-performance` | Server Components eliminate client re-renders for static content |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React.memo API Reference](https://react.dev/reference/react/memo)
- [useMemo API Reference](https://react.dev/reference/react/useMemo)
- [useCallback API Reference](https://react.dev/reference/react/useCallback)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiler)
- [React Reconciliation and Keys](https://react.dev/learn/preserving-and-resetting-state)
- [Before You memo() (Dan Abramov)](https://overreacted.io/before-you-memo/)
- [React Context Performance](https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions)
