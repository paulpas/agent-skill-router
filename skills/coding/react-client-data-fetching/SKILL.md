---
name: react-client-data-fetching
description: Implements efficient client-side data fetching in React using TanStack Query with proper caching, stale time configuration, error boundaries, optimistic updates, and query key conventions.
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
  triggers: client data fetching, tanstack query, react query, swr, data fetching, optimistic update, query key
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-async-waterfalls, react-server-performance, react-rerender-optimization
  author: https://github.com/vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React Client Data Fetching

Implements robust client-side data fetching patterns using TanStack Query (React Query) as the primary tool, replacing raw `useEffect` + `fetch` patterns with declarative queries, automatic caching, background refetching, optimistic mutations, and proper error handling. The result is resilient, fast-feeling UIs that handle loading, stale, and error states gracefully.

## TL;DR Checklist

- [ ] Set up QueryClient with sensible global defaults (staleTime, retry, refetchOnWindowFocus)
- [ ] Replace all `useEffect` data fetching with `useQuery` hooks
- [ ] Configure `staleTime` per query based on data volatility (not all data needs 0 staleTime)
- [ ] Implement loading states (skeleton/spinner) for every query
- [ ] Add error boundaries or fallback UI for failed queries
- [ ] Use mutation hooks with optimistic updates for create/update/delete operations
- [ ] Cancel in-flight requests on component unmount via AbortController or query cancellation
- [ ] Use query key conventions for predictable cache invalidation
- [ ] Implement prefetching for anticipated user actions (hovering links, next page)
- [ ] Use `placeholderData: keepPreviousData` for pagination and infinite scroll

---

## When to Use

Use this skill when:

- Building client-rendered React apps that fetch data from APIs
- Replacing legacy `useEffect` + `fetch` patterns with a robust data fetching layer
- Implementing infinite scroll, pagination, or search-as-you-type features
- Creating forms that need optimistic updates (instant UI feedback before server confirms)
- Migrating from a REST API to any client-side data fetching strategy
- Building real-time collaborative features that need background refetching
- Setting up a new React project from scratch that will communicate with backend APIs

---

## When NOT to Use

Avoid this skill for:

- Server Components that fetch initial data (use `react-server-performance` instead)
- Applications already using a different data-fetching paradigm (GraphQL with Apollo)
- Simple apps with one or two static API calls (raw `fetch` in `useEffect` is acceptable)
- Real-time data over WebSocket or SSE (TanStack Query is optimized for HTTP)
- Pages where data is fetched once and never changes (prefer Server Components)

---

## Core Workflow

1. **Install and Configure QueryClient Provider** — Wrap the app root with `<QueryClientProvider>`. Set global defaults: `staleTime` based on data volatility (not zero), `retry` count, and `refetchOnWindowFocus` behavior. **Checkpoint:** Verify the provider wraps all components that will use queries.

2. **Replace useEffect + fetch with useQuery** — Every API call in `useEffect` becomes a `useQuery` hook. Define query keys as arrays describing the resource hierarchy. **Checkpoint:** Verify loading, error, and success states all have corresponding UI.

3. **Implement Mutations with Optimistic Updates** — For create/update/delete operations, use `useMutation` with `onMutate` for optimistic updates and `onSettled` for cache invalidation. **Checkpoint:** Verify the UI updates instantly on mutation then reconciles with server response.

4. **Handle Error States Gracefully** — Add error boundaries around query-dependent sections. Implement retry UI for failed queries. **Checkpoint:** Verify users can recover from transient failures without full page reload.

5. **Cache Invalidation Strategy** — Define clear query key conventions so mutations can invalidate related queries. Use `queryClient.invalidateQueries()` with prefix matching. **Checkpoint:** Verify that after a mutation, related list views refetch automatically.

6. **Implement Prefetching** — For anticipated actions (hovering a link, next page), use `queryClient.prefetchQuery()` to start fetching before the user clicks. **Checkpoint:** Verify prefetched data shows instantly when the user navigates.

---

## Implementation Patterns

### Pattern 1: Setting Up QueryClient (BAD vs. GOOD)

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ❌ BAD: Default QueryClient — staleTime of 0 means every mount refetches
// This eliminates most caching benefits and causes unnecessary network requests.
const queryClient = new QueryClient();

// ✅ GOOD: Sensible global defaults configured upfront
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes before data is considered stale
      gcTime: 1000 * 60 * 30,           // 30 minutes before unused data is garbage collected
      retry: 2,                          // Retry twice on failure
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
      refetchOnWindowFocus: true,        // Refetch stale data when user returns to tab
      refetchOnReconnect: true,          // Refetch after network reconnection
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PageContent />
    </QueryClientProvider>
  );
}
```

### Pattern 2: useQuery with All States (BAD vs. GOOD)

```tsx
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

// ❌ BAD: Only handles success — no loading, error, or empty states
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  return <div>{data?.name}</div>;
  // If loading: renders empty briefly, then flashes content
  // If error: crashes with unhandled promise rejection
  // If empty: renders nothing with no explanation
}

// ✅ GOOD: Handles all states explicitly
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes for user data
  });

  // Loading state
  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div role="alert">
        <p>Failed to load profile: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  // Empty state (server returned 200 but data is null/undefined)
  if (!data) {
    return <p>No user data available.</p>;
  }

  // Success state
  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}
```

### Pattern 3: Optimistic Updates with useMutation

Optimistic updates give instant UI feedback before the server confirms, then reconcile.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error('Failed to update todo');
      return response.json();
    },

    // ── Optimistic update: apply immediately ──────────────
    onMutate: async ({ id, completed }) => {
      // Cancel any in-flight queries for todos to prevent overwrite
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value for rollback
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update the cache
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      );

      // Return context for rollback
      return { previousTodos };
    },

    // ── Rollback on error ────────────────────────────────
    onError: (_err, _vars, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    // ── Refetch after success to sync with server ─────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

### Pattern 4: Query Key Conventions for Cache Invalidation

Predictable query key structures make cache invalidation straightforward.

```tsx
// ── Convention: ['domain', 'resource', ...params, { filters }] ─────

// List queries
const usePosts = (filters: { status?: string }) =>
  useQuery({
    queryKey: ['posts', 'list', filters],
    queryFn: () => fetchPosts(filters),
  });

// Single item queries
const usePost = (postId: string) =>
  useQuery({
    queryKey: ['posts', 'detail', postId],
    queryFn: () => fetchPost(postId),
  });

// Mutations invalidate with prefix matching
const queryClient = useQueryClient();

// After creating a post, invalidate all post list queries
queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });

// After editing a post, update the detail cache and invalidate lists
queryClient.invalidateQueries({ queryKey: ['posts', 'detail', postId] });
queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });
```

### Pattern 5: Prefetching for Anticipated Navigation

```tsx
import { useQueryClient } from '@tanstack/react-query';

function PostLink({ postId, children }: { postId: string; children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Prefetch on hover — user will likely click
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['posts', 'detail', postId],
      queryFn: () => fetch(`/api/posts/${postId}`).then(r => r.json()),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <Link
      to={`/posts/${postId}`}
      onMouseEnter={prefetch}
      onTouchStart={prefetch} // Mobile: prefetch on first touch
    >
      {children}
    </Link>
  );
}
```

### Pattern 6: Pagination with keepPreviousData

```tsx
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

function PostList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['posts', 'list', { page }],
    queryFn: () => fetch(`/api/posts?page=${page}&limit=10`).then(r => r.json()),
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching next page
  });

  return (
    <div>
      {data?.posts.map(post => <PostCard key={post.id} post={post} />)}

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage(p => data?.hasNext ? p + 1 : p)}
          disabled={!data?.hasNext}
        >
          Next
        </button>
      </div>

      {isPlaceholderData && <Spinner />}
    </div>
  );
}
```

---

## Constraints

### MUST DO
- Use a dedicated data fetching library (TanStack Query or SWR) — never raw `useEffect` for data fetching
- Configure `staleTime` per query based on data volatility (staleTime: 0 is rarely correct)
- Implement error boundaries or fallback UI for every query's error state
- Handle loading states with skeleton/spinner UI for every query
- Cancel in-flight requests on component unmount via AbortController or query cancellation
- Invalidate related queries after successful mutations to keep cache consistent

### MUST NOT DO
- Fetch data in `useEffect` without proper cleanup (race conditions, memory leaks)
- Disable `refetchOnWindowFocus` without understanding the trade-off (stale data visible to returning users)
- Ignore query error states — a failed fetch should always have a visible UI response
- Use global `staleTime: 0` — this negates all caching benefits and causes unnecessary refetches
- Mutate the cache directly without using mutation hooks and optimistic update patterns

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-async-waterfalls` | Parallel data fetching patterns for both server and client |
| `react-server-performance` | Server Components for initial data fetch, client fetching for subsequent interactions |
| `react-rerender-optimization` | Prevent unnecessary re-renders when query data updates |
| `react-bundle-size` | Code splitting for heavy data-fetching pages |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [TanStack Query (React Query) Documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [TanStack Query useQuery Guide](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
- [TanStack Query Mutations and Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [TanStack Query Query Key Conventions](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [TanStack Query Prefetching](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [SWR Documentation](https://swr.vercel.app/docs/getting-started)
- [React useState vs useQuery Decision Guide](https://tkdodo.eu/blog/react-query-data-transformations)
