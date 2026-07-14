---
name: react-async-waterfalls
description: Eliminates async request waterfalls in React applications by parallelizing data fetching, hoisting fetches to route and page level, and using streaming SSR with Suspense boundaries.
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
  triggers: react waterfall, async waterfall, data fetching, promise all, parallel fetch, react suspense, streaming ssr
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-server-performance, react-client-data-fetching, react-rerender-optimization
  author: https://github.com/vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React Async Waterfall Elimination

Prevents the sequential request waterfall pattern where each component waits for its parent's data before fetching its own. By parallelizing independent fetches, hoisting data dependencies to the route level, and using streaming SSR, this skill ensures pages load as fast as their slowest independent data source rather than the sum of all sequential fetch times.

## TL;DR Checklist

- [ ] Identify ALL data dependencies for the route before writing any component
- [ ] Group independent fetches with `Promise.all()` — never `await` them sequentially
- [ ] Hoist shared data fetching to the nearest common ancestor (page or layout)
- [ ] Prevent `useEffect` for data fetching — use TanStack Query, SWR, or Server Components
- [ ] Wrap async-dependent UI sections in `<Suspense>` boundaries with skeleton fallbacks
- [ ] Enable streaming SSR so data arrives progressively, not in one blocked response
- [ ] Use `generateMetadata` with parallel `fetch()` calls for Next.js route data
- [ ] Prefer React Server Components for initial data fetching to avoid client waterfalls

---

## When to Use

Use this skill when:

- A page loads data sequentially (component A fetches → renders → component B fetches)
- Metrics show high "Time to First Byte" (TTFB) caused by backend data serialization
- Multiple components on the same page fetch overlapping or related data
- Building server-rendered React apps (Next.js, Remix) with multiple data dependencies
- Implementing loading states and skeletons — waterfalls make them appear staggered
- Reviewing an existing codebase for performance issues related to data fetching patterns

---

## When NOT to Use

Avoid this skill for:

- Single data-fetch operations with no dependent child fetches (no waterfall to eliminate)
- Client-only apps where all data loads in parallel via a single GraphQL query
- Pages with only one data dependency (parallelization adds complexity without benefit)
- Real-time data that must refetch on every render (WebSockets, SSE — different pattern)

---

## Core Workflow

1. **Map All Data Dependencies** — Before writing code, list every piece of data the route needs. Note which fetches are independent and which depend on previous results. **Checkpoint:** If any fetch starts inside a component that renders conditionally based on a parent fetch, you have a waterfall.

2. **Hoist Independent Fetches** — Move all parallelizable data fetching to the page or layout level. Group independent fetches with `Promise.all()`. **Checkpoint:** Verify no child component initiates its own `useEffect` fetch on mount.

3. **Wrap Dependent UI in Suspense** — For data that can't be hoisted (depends on user interaction), wrap it in `<Suspense>` with a skeleton fallback. This enables streaming — the page renders while slow data loads.

4. **Implement Streaming SSR** — Use React 19's streaming APIs or Next.js `loading.tsx` to progressively deliver HTML as each Suspense boundary resolves. **Checkpoint:** Verify the initial HTML response contains shell content, not a blank page waiting for all data.

5. **Deduplicate Across Routes** — Use `React.cache()` in Server Components or query client cache in client components to prevent duplicate fetches when the same data is needed by sibling components.

---

## Implementation Patterns

### Pattern 1: Parallel Fetching with Promise.all (BAD vs. GOOD)

```tsx
// ❌ BAD: Sequential awaits create a waterfall
// Total time = A.time + B.time + C.time (e.g. 200ms + 300ms + 150ms = 650ms)
async function Page() {
  const user = await fetch('/api/user').then(r => r.json());
  // posts fetch doesn't start until user resolves
  const posts = await fetch(`/api/users/${user.id}/posts`).then(r => r.json());
  // notifications fetch doesn't start until posts resolves
  const notifications = await fetch(`/api/users/${user.id}/notifications`).then(r => r.json());

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <NotificationBell count={notifications.length} />
    </div>
  );
}

// ✅ GOOD: Parallel fetches, no waterfall
// Total time = max(A.time, B.time, C.time) (e.g. max(200ms, 300ms, 150ms) = 300ms)
async function Page() {
  // All three fetches start simultaneously
  const [user, posts, notifications] = await Promise.all([
    fetch('/api/user').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/notifications').then(r => r.json()),
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <NotificationBell count={notifications.length} />
    </div>
  );
}
```

### Pattern 2: Hoisting with React Query's useQueries

When fetches must happen in child components, use TanStack Query's parallel query hooks to hoist the fetching orchestration while keeping data colocated.

```tsx
import { useQueries } from '@tanstack/react-query';

// ── Custom hook hoists parallel fetching ───────────────
function useUserDashboard(userId: string) {
  return useQueries({
    queries: [
      {
        queryKey: ['user', userId],
        queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
        staleTime: 5 * 60 * 1000, // 5 min
      },
      {
        queryKey: ['user-posts', userId],
        queryFn: () => fetch(`/api/users/${userId}/posts`).then(r => r.json()),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['user-stats', userId],
        queryFn: () => fetch(`/api/users/${userId}/stats`).then(r => r.json()),
        staleTime: 10 * 60 * 1000,
      },
    ],
  });
}

// ── Component uses the hoisted hook ─────────────────────
function UserDashboard({ userId }: { userId: string }) {
  const [userQuery, postsQuery, statsQuery] = useUserDashboard(userId);

  if (userQuery.isLoading || postsQuery.isLoading || statsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <UserProfile user={userQuery.data} />
      <PostList posts={postsQuery.data} />
      <UserStats stats={statsQuery.data} />
    </div>
  );
}
```

### Pattern 3: Suspense Boundaries with Streaming

Wrap components that depend on slow data in Suspense boundaries. React streams each boundary's content as it resolves, progressively enhancing the page.

```tsx
import { Suspense } from 'react';

// ── Async Server Component ─────────────────────────────
async function SlowDataComponent() {
  // This triggers streaming — the page shell renders immediately
  const data = await fetch('https://api.example.com/slow-endpoint').then(r => r.json());
  return <ExpensiveChart data={data} />;
}

// ── Fast shell renders immediately ──────────────────────
function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* This renders immediately */}
      <Navigation />

      {/* This streams in when SlowDataComponent resolves */}
      <Suspense fallback={<ChartSkeleton />}>
        <SlowDataComponent />
      </Suspense>

      {/* Multiple Suspense boundaries stream independently */}
      <Suspense fallback={<ListSkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
```

### Pattern 4: Client-Side Parallel Fetching with AbortController

```tsx
import { useEffect, useState } from 'react';

interface DashboardData {
  user: { name: string };
  posts: Array<{ id: number; title: string }>;
  metrics: { views: number; clicks: number };
}

function useDashboardData(userId: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchAll() {
      try {
        setLoading(true);
        const [user, posts, metrics] = await Promise.all([
          fetch(`/api/users/${userId}`, { signal }).then(r => r.json()),
          fetch(`/api/users/${userId}/posts`, { signal }).then(r => r.json()),
          fetch(`/api/users/${userId}/metrics`, { signal }).then(r => r.json()),
        ]);
        setData({ user, posts, metrics });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchAll();

    // Cleanup: cancel in-flight requests on unmount
    return () => controller.abort();
  }, [userId]);

  return { data, error, loading };
}
```

---

## Constraints

### MUST DO
- Use `Promise.all()` for all independent data fetches — never `await` them sequentially
- Hoist shared data fetching to the nearest common ancestor (page or layout component)
- Wrap async components in `<Suspense>` boundaries with meaningful fallback UIs
- Use AbortController to cancel in-flight requests when the component unmounts
- Prefer React Server Components for initial data fetching in Next.js apps
- Use `React.cache()` in Server Components to deduplicate fetches across boundaries

### MUST NOT DO
- Fetch data inside `useEffect` (creates client waterfalls) — use TanStack Query or SWR instead
- Fetch inside child components that only render after parent data loads (nested waterfalls)
- Block rendering with sequential `await` statements when fetches are independent
- Fetch the same data from multiple components without deduplication
- Use client components for data fetching when a Server Component would suffice

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-server-performance` | Server Components, caching, and streaming for SSR optimization |
| `react-client-data-fetching` | Client-side data fetching with TanStack Query and SWR |
| `react-rerender-optimization` | Prevent unnecessary re-renders after data arrives |
| `react-bundle-size` | Code splitting and lazy loading for data-heavy pages |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Suspense Documentation](https://react.dev/reference/react/Suspense)
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [TanStack Query Parallel Queries](https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries)
- [React Server Components (RFC)](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023)
- [Streaming Server-Side Rendering](https://github.com/reactwg/server-components/discussions/5)
- [AbortController API](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Promise.all() MDN Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
