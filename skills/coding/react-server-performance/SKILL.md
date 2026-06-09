---
name: react-server-performance
description: Optimizes React server rendering performance using Server Components, streaming SSR with Suspense boundaries, React.cache deduplication, static generation, and ISR caching strategies.
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
  triggers: server components, react server, streaming ssr, server rendering, next.js server, isr, static generation
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  related-skills: react-async-waterfalls, react-client-data-fetching, react-bundle-size
  author: https://github.com/vercel
  source: https://github.com/vercel-labs/agent-skills
---

# React Server Performance Optimization

Maximizes server rendering performance by applying React Server Components for data fetching and static content, streaming SSR to progressively deliver HTML, `React.cache()` to deduplicate server data fetches, and smart caching strategies (ISR, static generation). The goal is to minimize Time to First Byte (TTFB) while maximizing how much content reaches the user as fast as possible.

## TL;DR Checklist

- [ ] Default to Server Components — only use `'use client'` when interactivity is required
- [ ] Move all initial data fetching to Server Components (no client waterfalls)
- [ ] Deduplicate server data fetches with `React.cache()` across component boundaries
- [ ] Use Suspense boundaries to stream slow data sections progressively
- [ ] Apply `generateStaticParams` for static generation of dynamic routes where possible
- [ ] Cache database queries with appropriate TTL using `React.cache()` or Next.js fetch options
- [ ] Use ISR (Incremental Static Regeneration) for content that changes infrequently
- [ ] Profile server response times before and after optimization

---

## When to Use

Use this skill when:

- Building a Next.js App Router application with RSC (React Server Components)
- Time to First Byte (TTFB) is high due to serial data fetching on the server
- Pages have a mix of static content (header, nav) and dynamic data (user-specific panels)
- Database queries are being made redundantly across multiple components
- Building content-driven sites (docs, blogs, marketing) that benefit from static generation
- Implementing ISR for pages that change but don't need real-time freshness
- Profiling server performance and looking for rendering bottlenecks

---

## When NOT to Use

Avoid this skill for:

- Client-only apps (Vite, Create React App) that don't use server rendering
- Highly interactive applications where most UI is state-driven (dashboards, games)
- Real-time applications that need fresh data on every request (trading dashboards, chat)
- Applications already using App Router with Server Components effectively

---

## Core Workflow

1. **Audit Component Interactivity** — Every component starts as a Server Component. Ask: "Does this need `useState`, `useEffect`, `onClick`, or browser APIs?" If no, keep it server-side. **Checkpoint:** Minimize `'use client'` directives — the goal is fewer client boundaries.

2. **Move Data Fetching to Server Components** — Move initial data fetching out of `useEffect` and into async Server Components. Fetch data where it's used instead of passing it down from a parent. **Checkpoint:** Verify no data-fetching happens inside `useEffect` on initial page load.

3. **Deduplicate with React.cache()** — Wrap shared data fetching functions with `React.cache()` so the same fetch called from multiple components results in only one request. **Checkpoint:** Check network tab — each unique query should appear only once per request.

4. **Apply Streaming via Suspense** — Wrap slow data sections in `<Suspense>` boundaries with skeleton fallbacks. The page shell renders immediately while slow sections stream in. **Checkpoint:** Verify the initial HTML contains the page shell, not a loading spinner.

5. **Cache Static Content** — Use `generateStaticParams` for routes that don't change per-request. Apply ISR with appropriate `revalidate` intervals for content that updates periodically. **Checkpoint:** Verify static pages are served from CDN cache, not rendered per request.

---

## Implementation Patterns

### Pattern 1: Server Component vs Client Component (BAD vs. GOOD)

```tsx
// ❌ BAD: Client component for content that doesn't need interactivity
'use client';

import { useEffect, useState } from 'react';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Skeleton />;
  return <div>{user.name}</div>;
}
// Problem: Client waterfalls, no streaming, extra JS bundle weight


// ✅ GOOD: Server Component fetches directly, no client JS needed
// No 'use client' directive — this is a Server Component by default

interface User {
  id: string;
  name: string;
  email: string;
}

async function UserProfile({ userId }: { userId: string }) {
  // Direct fetch — no useEffect, no waterfall
  const user: User = await fetch(`https://api.example.com/users/${userId}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  }).then(r => r.json());

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Pattern 2: React.cache() for Data Deduplication

When the same data is needed by multiple components in the tree, `React.cache()` ensures it's fetched only once per request.

```tsx
import { cache } from 'react';

// ── Cache the database query ────────────────────────────
interface Post {
  id: string;
  title: string;
  body: string;
}

const getFeaturedPosts = cache(async (): Promise<Post[]> => {
  // This function can be called from multiple components,
  // but the database query runs only once per request.
  const posts = await db.query('SELECT * FROM posts WHERE featured = true LIMIT 5');
  return posts;
});

// ── Component A calls it ────────────────────────────────
async function FeaturedPosts() {
  const posts = await getFeaturedPosts();
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  );
}

// ── Component B calls the SAME function ─────────────────
async function SidebarFeatured() {
  const posts = await getFeaturedPosts(); // No duplicate query!
  return (
    <aside>
      <h3>Featured</h3>
      {posts.slice(0, 3).map(post => <p key={post.id}>{post.title}</p>)}
    </aside>
  );
}
```

### Pattern 3: Streaming with Suspense Boundaries

Stream the page shell immediately while slow sections load progressively.

```tsx
import { Suspense } from 'react';

// ── Slow async components stream independently ──────────
async function AnalyticsWidget() {
  // This takes ~2 seconds
  const data = await fetch('https://api.example.com/analytics').then(r => r.json());
  return <ExpensiveDashboard data={data} />;
}

async function ActivityFeed() {
  // This takes ~1 second
  const activities = await fetch('https://api.example.com/activities').then(r => r.json());
  return <Feed items={activities} />;
}

// ── Page defines Suspense boundaries ────────────────────
function DashboardPage() {
  return (
    <div>
      {/* Renders immediately — no async dependencies */}
      <Header title="Dashboard" />

      {/* Streams in when AnalyticsWidget resolves (~2s) */}
      <Suspense fallback={<div className="skeleton-chart" />}>
        <AnalyticsWidget />
      </Suspense>

      {/* Streams independently when ActivityFeed resolves (~1s) */}
      <Suspense fallback={<div className="skeleton-list" />}>
        <ActivityFeed />
      </Suspense>

      {/* Renders immediately after header */}
      <Footer />
    </div>
  );
}
// Result: TTFB is near-instant (header + footer), content fills in progressively
```

### Pattern 4: Static Generation with generateStaticParams

For content-driven routes, generate pages at build time instead of per-request.

```tsx
// app/posts/[slug]/page.tsx

// Generate all post pages at build time
export async function generateStaticParams() {
  const posts = await db.query('SELECT slug FROM posts WHERE published = true');

  return posts.map((post: { slug: string }) => ({
    slug: post.slug,
  }));
}

// This function is called at build time for each slug
async function PostPage({ params }: { params: { slug: string } }) {
  const post = await db.query('SELECT * FROM posts WHERE slug = $1', [params.slug]);

  // Revalidate this page every 300 seconds (5 minutes) via ISR
  // New visitors after 5 min trigger a server-side regeneration
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.body}</div>
    </article>
  );
}

// Use ISR with revalidation
export const revalidate = 300;

export default PostPage;
```

### Pattern 5: Appropriate Caching with fetch Options

```tsx
// ── Force dynamic (no cache) for user-specific data ─────
async function getCurrentUser() {
  return await fetch('https://api.example.com/me', {
    cache: 'no-store', // Never cache — user-specific
  }).then(r => r.json());
}

// ── Time-based revalidation for semi-static data ────────
async function getProductList() {
  return await fetch('https://api.example.com/products', {
    next: { revalidate: 300 }, // Revalidate every 5 minutes via ISR
  }).then(r => r.json());
}

// ── Force static for build-time data ────────────────────
async function getDocumentation() {
  // Cache the result — content doesn't change between deploys
  return await fetch('https://api.example.com/docs', {
    cache: 'force-cache',
  }).then(r => r.json());
}

// ── Mark route segments as dynamic ──────────────────────
// In Next.js App Router files:
// export const dynamic = 'force-static';  // Force static generation
// export const dynamic = 'force-dynamic'; // Force dynamic rendering
// export const revalidate = 60;           // ISR with 60s revalidation
```

---

## Constraints

### MUST DO
- Default to Server Components — only add `'use client'` when interactivity is required
- Deduplicate server data fetches with `React.cache()` to prevent redundant database queries
- Use `<Suspense>` boundaries for any section that depends on slow server data
- Cache database queries and API responses with appropriate TTL strategies
- Use `generateStaticParams` for routes with finite, enumerable paths
- Apply ISR (`revalidate` option) for content that changes periodically

### MUST NOT DO
- Use client hooks (`useState`, `useEffect`, `useContext`) in Server Components
- Fetch the same data from multiple server components without `React.cache()` deduplication
- Block the initial HTML response with slow data fetches — use streaming instead
- Use client components when a Server Component would suffice (extra JS bundle weight)
- Disable caching globally — tune cache per route based on data freshness requirements

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-async-waterfalls` | Parallel data fetching complements server component streaming |
| `react-client-data-fetching` | Client-side fetching for post-initial-load interactions |
| `react-bundle-size` | Server Components reduce client JS bundle automatically |
| `react-rerender-optimization` | Memoization for interactive parts of server-streamed pages |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React cache() API](https://react.dev/reference/react/cache)
- [Next.js Data Fetching and Caching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [Streaming Server-Side Rendering](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [Next.js generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Incremental Static Regeneration (ISR)](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
