---
name: react-composition-patterns
description: Implements React composition patterns including compound components, state lifting, polymorphic components, slot-based layouts, and variant-driven designs for reusable component APIs.
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
  triggers: react composition, compound components, react patterns, polymorphic components, slot pattern, component API, composition vs inheritance
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-async-waterfalls, react-rerender-optimization, react-server-performance
  author: https://github.com/vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React Composition Patterns

Transforms React component architecture by applying composition patterns — compound components, state lifting, polymorphic elements, and slot-based layouts — to create reusable, maintainable, and type-safe component APIs. Composition replaces inheritance as the primary mechanism for code reuse in React.

## TL;DR Checklist

- [ ] Extract reusable UI patterns into self-contained components before copy-pasting
- [ ] Use Compound Components with Context API for co-dependent pieces (Tabs, Accordion)
- [ ] Lift state to the nearest common ancestor when multiple children need shared data
- [ ] Pass data through props, never through refs or direct DOM queries
- [ ] Use `as` or `asChild` prop for polymorphic components with TypeScript generics
- [ ] Keep one component per file with colocated tests, stories, and styles
- [ ] Use Slot pattern for flexible, positional children instead of rigid prop APIs
- [ ] Drive visual variation through props (size, variant) not multiple separate components

---

## When to Use

Use this skill when:

- Building reusable component libraries or design systems
- Designing components with multiple visual variants (size, color, tone)
- Creating co-dependent UI patterns like Tabs, Accordion, Menu, or Stepper
- Needing a component to render as different HTML elements depending on context
- Passing shared state from a parent to multiple children without prop drilling
- Deciding between composition and inheritance for a new component API
- Reviewing component architecture for reusability and maintenance concerns

---

## When NOT to Use

Avoid this skill for:

- Simple, single-purpose components that don't compose with others (use a plain function component instead)
- Deeply nested prop drilling problems — use Context API or a state management library instead
- Components with only one variant or use case (over-engineering)
- Layout-only concerns better handled by CSS Grid or Flexbox (composition is for logic, not layout)
- Premature abstraction — don't create compound component APIs for components used once

---

## Core Workflow

1. **Identify Composable Patterns** — Look for repeated UI groupings in the design (label + input, tab panel, accordion item). **Checkpoint:** If you see the same 2-3 element combination in 3+ places, it's a composition candidate.

2. **Choose Composition Strategy** — Select the right pattern:
   - **Compound Components** → co-dependent pieces that share implicit state (Tabs, Accordion, Menu)
   - **Polymorphic** → component renders as different HTML elements via `as` prop
   - **Slot Pattern** → flexible layout with named/positional children
   - **Variant-Driven** → same component, different visual style via props

3. **Implement with TypeScript** — Write proper generics for polymorphic props, type-safe context for compound components. **Checkpoint:** Verify consumers get full type inference without manual type annotations.

4. **Share State via Context** — Use React Context (not prop threading) for compound component state. Place context provider in the parent compound wrapper.

5. **Export Pieces Individually** — Export every sub-component independently so consumers can import only what they use (enables tree shaking). **Checkpoint:** Verify each export is independently usable in tests.

6. **Test Composition Combinations** — Test each sub-component in isolation and all valid parent-child combinations. Edge cases: missing children, nested instances, dynamic children.

---

## Implementation Patterns

### Pattern 1: Compound Components with Context API

Compound components let related pieces share implicit state through Context, avoiding manual prop threading. The parent exposes a provider; children consume it.

```tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

// Context holds shared state — never exported directly
interface TabsContextValue {
  activeTab: string;
  onSelect: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tab sub-components must be rendered within <Tabs>');
  }
  return ctx;
}

// ── Parent wrapper ──────────────────────────────────────
interface TabsProps {
  defaultTab: string;
  children: React.ReactNode;
}

function Tabs({ defaultTab, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const onSelect = useCallback((value: string) => setActiveTab(value), []);

  return (
    <TabsContext.Provider value={{ activeTab, onSelect }}>
      {children}
    </TabsContext.Provider>
  );
}

// ── Sub-components ──────────────────────────────────────
function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist" className="tab-list">{children}</div>;
}

interface TabProps {
  value: string;
  children: React.ReactNode;
}

function Tab({ value, children }: TabProps) {
  const { activeTab, onSelect } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(value)}
      className={isActive ? 'tab tab--active' : 'tab'}
    >
      {children}
    </button>
  );
}

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
}

function TabPanel({ value, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Attach sub-components as properties for the fluent API
Tabs.TabList = TabList;
Tabs.Tab = Tab;
Tabs.TabPanel = TabPanel;

export { Tabs };

// Usage:
// <Tabs defaultTab="profile">
//   <Tabs.TabList>
//     <Tabs.Tab value="profile">Profile</Tabs.Tab>
//     <Tabs.Tab value="settings">Settings</Tabs.Tab>
//   </Tabs.TabList>
//   <Tabs.TabPanel value="profile">Profile content</Tabs.TabPanel>
//   <Tabs.TabPanel value="settings">Settings content</Tabs.TabPanel>
// </Tabs>
```

### Pattern 2: Polymorphic Component with TypeScript Generics

Polymorphic components accept an `as` prop to render as any HTML element while preserving type-safe props for that element.

```tsx
import React from 'react';

// ── Type-safe polymorphic props ─────────────────────────
type PolymorphicProps<
  T extends React.ElementType,
  P extends Record<string, unknown> = Record<string, unknown>
> = {
  as?: T;
  children: React.ReactNode;
} & P &
  Omit<React.ComponentPropsWithoutRef<T>, keyof (P & { as?: T; children: React.ReactNode })>;

// ── Component ───────────────────────────────────────────
interface TextProps {
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'bold';
}

function Text<T extends React.ElementType = 'span'>({
  as,
  size = 'md',
  weight = 'normal',
  children,
  ...rest
}: PolymorphicProps<T, TextProps>) {
  const Component = as || 'span';
  const className = `text text--${size} text--${weight}`;

  return <Component className={className} {...rest}>{children}</Component>;
}

export { Text };

// Usage:
// <Text as="h1" size="lg" weight="bold">Heading</Text>
// <Text as="p" size="sm">Paragraph with all native p props inferred</Text>
// <Text as="a" href="/page" size="md">Link styled as text</Text>
```

### Pattern 3: State Lifting (BAD vs. GOOD)

```tsx
// ❌ BAD: State trapped in child — sibling can't react to changes
function SearchInput() {
  const [query, setQuery] = useState('');
  // query is inaccessible to the parent or siblings
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

function SearchResults() {
  // Can't access the query from SearchInput
  return <div>{/* no results to show */}</div>;
}

function SearchPage() {
  return (
    <div>
      <SearchInput />
      <SearchResults /> {/* Always empty — can't see the query */}
    </div>
  );
}

// ✅ GOOD: State lifted to common ancestor
function SearchInput({ query, onQueryChange }: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return <input value={query} onChange={e => onQueryChange(e.target.value)} />;
}

function SearchResults({ query }: { query: string }) {
  // Can now access the query
  return <div>Results for: {query}</div>;
}

function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <SearchInput query={query} onQueryChange={setQuery} />
      <SearchResults query={query} />
    </div>
  );
}
```

### Pattern 4: Slot-Based Layout

Slot patterns accept named children for flexible layout composition without tight coupling to specific child types.

```tsx
interface CardProps {
  /** Slot for the top-right action area */
  actions?: React.ReactNode;
  /** Slot for the main body content */
  body: React.ReactNode;
  /** Slot for the bottom footer area */
  footer?: React.ReactNode;
}

function Card({ actions, body, footer }: CardProps) {
  return (
    <div className="card">
      {actions && <div className="card__actions">{actions}</div>}
      <div className="card__body">{body}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}

// Usage:
// <Card
//   actions={<button onClick={handleClose}>✕</button>}
//   body={<p>Main content goes here</p>}
//   footer={<small>Last updated today</small>}
// />
```

---

## Constraints

### MUST DO
- Use Context API for compound component state — never thread props through intermediary components
- Provide TypeScript generics for polymorphic `as` prop so consumers get full type inference
- Export compound component sub-pieces individually for tree-shaking and independent testing
- Keep one component per file; colocate tests, stories, and styles beside the component
- Split components when they do more than one logical thing (Single Responsibility)
- Drive visual variants through size/variant props instead of creating separate components

### MUST NOT DO
- Pass data through refs or DOM queries — always use props for data flow
- Mutate children with `cloneElement` unless absolutely necessary (prefer render props or slots)
- Mix layout concerns with business logic in the same component
- Create compound component APIs for components used only once
- Use inheritance patterns for React component reuse

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-rerender-optimization` | Optimize re-renders once composition patterns are in place |
| `react-async-waterfalls` | Manage data dependencies in composed component trees |
| `react-server-performance` | Server Components and streaming for composed layouts |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Composition vs Inheritance](https://react.dev/learn/composition-vs-inheritance)
- [React Compound Components Pattern](https://reactpatterns.com/#compound-component)
- [Polymorphic Components in TypeScript](https://www.typescriptlang.org/docs/handbook/jsx.html#function-component)
- [React Children Patterns (Slots)](https://react.dev/reference/react/Children)
- [Single Responsibility Principle in Components](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [React Context API](https://react.dev/reference/react/createContext)
- [Colocation principle (Kent C. Dodds)](https://kentcdodds.com/blog/colocation)
