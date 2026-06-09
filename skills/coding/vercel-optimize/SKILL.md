---
name: vercel-optimize
description: Optimizes Vercel-deployed applications for cost, performance, and reliability through cold start mitigation, caching strategy, edge function optimization, bundle auditing, and monitoring.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
  - strategic
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: vercel optimize, vercel performance, cold start, vercel caching, vercel analytics, edge functions, vercel cost
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  related-skills: react-native-rendering
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# Vercel Application Optimization

A senior Vercel platform engineer who optimizes deployed applications for cost, performance, and reliability — mitigating cold starts, tuning CDN caching, optimizing Edge Functions, reducing bundle size, and setting up monitoring dashboards.

## TL;DR Checklist

- [ ] Audit performance baseline with Vercel Analytics or Lighthouse CI before optimizing
- [ ] Mitigate cold starts by migrating latency-sensitive endpoints to Edge Functions
- [ ] Configure CDN caching with `stale-while-revalidate` for dynamic content and `immutable` for static assets
- [ ] Split bundles at route level with `next/dynamic` and lazy-load heavy dependencies
- [ ] Optimize images with next/image configuration (formats, sizes, remotePatterns, loader)
- [ ] Use Next.js Script component with appropriate strategy for third-party scripts
- [ ] Set up Vercel Analytics, Speed Insights, and Logs for ongoing monitoring
- [ ] Track per-function execution cost to identify expensive operations

---

## When to Use

Use this skill when:

- A Next.js app on Vercel has slow page loads or high Time-to-First-Byte (TTFB)
- Serverless function cold starts are noticeable (response times >500ms on first request)
- The monthly Vercel bill is growing faster than traffic
- Lighthouse scores are below 90 for Performance
- Images are unoptimized (large file sizes, wrong formats, missing dimensions)
- Third-party scripts block page rendering (no strategy-based loading)
- You need to implement ISR (Incremental Static Regeneration) with on-demand revalidation

---

## When NOT to Use

Avoid this skill for:

- Apps not deployed on Vercel (different platform, different optimization strategies)
- Static sites with zero server-side computation — Vercel's defaults are already optimal
- Prototyping or staging environments where optimization overhead isn't justified
- Before establishing performance baselines — always measure the problem first

---

## Core Workflow

1. **Audit Performance** — Establish baseline metrics:
   - Enable Vercel Analytics and Speed Insights in the project dashboard
   - Run Lighthouse CI on critical pages and record LCP, CLS, INP scores
   - Identify pages with high TTFB (above 500ms), large bundle sizes, or unoptimized images
   - Check Vercel Logs for function execution duration and error rates
   **Checkpoint:** Document baseline values for every metric you plan to improve. Without baselines, you cannot measure success.

2. **Address Cold Starts** — Reduce serverless function latency:
   - Migrate latency-sensitive endpoints from Serverless Functions to Edge Functions (sub-50ms start)
   - Implement lambda warmers for Serverless Functions that cannot be migrated
   - Use `keep-alive` connections to reuse database and API connections across invocations
   - Decrease function memory allocation if underutilized (cold starts scale with memory)
   **Checkpoint:** Verify that cold start latency drops below 200ms for critical paths. Retest from a fresh region.

3. **Optimize Caching Strategy** — Reduce origin requests:
   - Configure `Cache-Control` headers with `s-maxage` + `stale-while-revalidate` for dynamic pages
   - Set `immutable` with `max-age=31536000` for static assets (fonts, images, compiled CSS)
   - Implement ISR with appropriate `revalidate` intervals and on-demand revalidation webhooks
   - Use `next.config.js` `headers` for global cache policies
   **Checkpoint:** Verify cache hit rate in Vercel Analytics is above 80% for static assets and above 50% for dynamic pages.

4. **Reduce Bundle Size** — Ship less JavaScript:
   - Use `next/dynamic` with `ssr: false` for heavy client-only components (charts, maps, editors)
   - Tree-shake unused exports from large dependencies (lodash, moment, date-fns)
   - Analyze bundle with `@next/bundle-analyzer` and identify large chunks
   - Lazy-load below-the-fold components and route segments
   - Replace large dependencies with lighter alternatives
   **Checkpoint:** Run `ANALYZE=true next build` — total JS per page must be under 150KB (gzipped) for pages above the fold.

5. **Set Up Monitoring** — Ensure ongoing visibility:
   - Configure Vercel Analytics for real-user monitoring (RUM)
   - Set up Speed Insights for Core Web Vitals tracking (LCP, CLS, INP)
   - Export Vercel Logs and create custom metrics for function duration, error rate, and cache hit ratio
   - Set up budget alerts: alert when LCP exceeds 2.5s or error rate exceeds 1%
   **Checkpoint:** Verify dashboards are populated with data within 24 hours of enabling.

6. **Review Cost Metrics** — Optimize the Vercel bill:
   - Identify top-spending Serverless Functions by execution duration and invocation count
   - Migrate high-traffic Serverless Functions to Edge Functions or ISR to reduce compute cost
   - Optimize `next/image` configuration to reduce image optimization bandwidth charges
   - Review function memory allocation — over-allocated memory costs more per invocation
   **Checkpoint:** Compare current projected monthly cost vs. previous month — target 20% reduction.

---

## Implementation Patterns

### Pattern 1: Edge Function Migration (Cold Start Mitigation)

```typescript
// ❌ BAD: Serverless Function for a simple API proxy — 500ms+ cold start
// pages/api/proxy.ts (Serverless Function)
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  res.status(200).json(data);
}

// ✅ GOOD: Edge Function for the same proxy — sub-50ms cold start
// app/api/proxy/route.ts (Edge Function — works in App Router)
export const runtime = 'edge';

export async function GET(request: Request) {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return Response.json(data);
}

// ✅ GOOD: Keep-alive connection reuse for database-backed endpoints
// lib/db.ts — reuse connection across invocations
let dbClient: DatabaseClient | null = null;

export async function getDb(): Promise<DatabaseClient> {
  if (!dbClient) {
    dbClient = await createClient({
      connectionString: process.env.DATABASE_URL!,
      poolSize: 1,
      // Keep connection alive between function invocations
      idleTimeoutMillis: 60_000,
    });
  }
  return dbClient;
}

// app/api/users/route.ts — uses the cached connection
export const runtime = 'nodejs';

export async function GET() {
  const db = await getDb();  // Reuses connection on warm invocations
  const users = await db.query('SELECT * FROM users LIMIT 10');
  return Response.json(users);
}
```

### Pattern 2: Advanced Caching Strategy

```typescript
// next.config.js — global cache headers
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Static assets: cache forever in CDN and browser
        source: '/:path*.(svg|png|jpg|jpeg|gif|webp|woff2|ttf|eot|css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes: CDN cache with stale-while-revalidate
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
      {
        // HTML pages: short CDN cache, fallback to server
        source: '/:path((?!api|_next|static).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },
};

// ✅ GOOD: ISR with on-demand revalidation
// app/blog/[slug]/page.tsx
interface BlogPageProps {
  params: { slug: string };
}

export default async function BlogPost({ params }: BlogPageProps) {
  const post = await getPost(params.slug);
  return <article>{/* ... */}</article>;
}

// Revalidate every 60 seconds, but also trigger on-demand when content changes
export const revalidate = 60;

// app/api/revalidate/route.ts — on-demand revalidation webhook
export async function POST(request: Request) {
  const { secret, slug } = await request.json();

  // Validate secret to prevent unauthorized revalidation
  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 });
  }

  try {
    await revalidatePath(`/blog/${slug}`);
    return Response.json({ revalidated: true });
  } catch (err) {
    return Response.json({ message: 'Revalidation failed' }, { status: 500 });
  }
}
```

### Pattern 3: Bundle Optimization with next/dynamic

```tsx
// ❌ BAD: Heavy chart library imported eagerly — adds 120KB to the main bundle
import { LineChart } from 'recharts';

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <LineChart width={600} height={300} data={data}>
          {/* ... */}
        </LineChart>
      )}
    </div>
  );
}

// ✅ GOOD: Chart library lazy-loaded — added to a separate chunk, loaded on demand
import dynamic from 'next/dynamic';

const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    ssr: false, // Charts are client-only — no SSR needed
    loading: () => <div className="chart-skeleton h-[300px] w-[600px] bg-gray-100 animate-pulse" />,
  }
);

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && <LazyLineChart width={600} height={300} data={data} />}
    </div>
  );
}

// ✅ GOOD: Route-level code splitting with Next.js App Router
// app/dashboard/page.tsx — automatically code-split at route boundaries
export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      {/* Heavy components loaded per-route, not in the global layout */}
    </main>
  );
}

// app/analytics/page.tsx — separate chunk, no impact on dashboard load time
export default function AnalyticsPage() {
  return (
    <main>
      <h1>Analytics</h1>
    </main>
  );
}
```

### Pattern 4: Image Optimization with next/image

```tsx
import Image from 'next/image';

// ❌ BAD: Unoptimized image — no sizes, wrong format fallback, large dimensions
function BadHero() {
  return (
    <img
      src="/hero.png"   // Large PNG — no WebP, no AVIF
      alt="Hero"
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

// ✅ GOOD: Fully optimized with next/image
function OptimizedHero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1920}
      height={1080}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
      priority          // LCP element — load immediately, don't lazy-load
      quality={85}      // Balance quality vs. file size
    />
  );
}

// ✅ GOOD: next.config.js with remote image configuration
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],  // AVIF preferred, WebP fallback
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,  // Cache optimized images for 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
```

### Pattern 5: Script Loading Strategies

```tsx
// ❌ BAD: Script tag blocks rendering — no strategy, loads synchronously
export default function MarketingPage() {
  return (
    <div>
      <script src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID" />
      <script dangerouslySetInnerHTML={{
        __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);}`
      }} />
      {/* Main content — blocked until scripts load */}
    </div>
  );
}

// ✅ GOOD: Next.js Script component with appropriate strategies
import Script from 'next/script';

export default function OptimizedMarketingPage() {
  return (
    <>
      {/* Critical analytics — load before page becomes interactive, but don't block render */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
        strategy="afterInteractive"
      />

      {/* Chat widget — load after everything else is done */}
      <Script
        src="https://widget.intercom.io/widget/abc123"
        strategy="lazyOnload"
      />

      {/* Heatmap tool — not needed on mobile */}
      <Script
        src="https://static.hotjar.com/c/hotjar-123456.js"
        strategy="lazyOnload"
      />

      {/* Main page content renders immediately — not blocked by scripts */}
      <main>
        <h1>Welcome</h1>
        <p>This content renders before any third-party scripts load.</p>
      </main>
    </>
  );
}
```

---

## Constraints

### MUST DO
- Measure performance baselines with Vercel Analytics or Lighthouse CI before and after each optimization
- Use `stale-while-revalidate` caching for dynamic content with `s-maxage` set to acceptable freshness TTL
- Set `Cache-Control: public, max-age=31536000, immutable` for all static assets (fonts, images, compiled CSS/JS)
- Use `runtime: 'edge'` for API routes that need sub-50ms cold starts and low latency globally
- Use `next/dynamic` with `ssr: false` for heavy client-only components that are not visible above the fold
- Configure `next/image` with `formats: ['image/avif', 'image/webp']` and appropriate `remotePatterns`
- Use Next.js `<Script>` component with explicit `strategy` — never plain `<script>` tags
- Monitor Serverless Function execution durations and migrate expensive ones to Edge or ISR

### MUST NOT DO
- Use Serverless Functions for high-traffic, latency-sensitive endpoints — prefer Edge Functions or ISR
- Set `revalidate: 0` on ISR pages that don't need real-time freshness — set a reasonable TTL
- Include heavy npm packages (chart libraries, moment.js, lodash) in the main bundle — dynamic import them
- Use `<img>` tags for anything that is not a user-uploaded image with unknown dimensions
- Block page rendering with third-party scripts — always use `afterInteractive` or `lazyOnload` strategy
- Ignore Vercel Analytics data — it reveals real user performance, not just synthetic Lighthouse scores
- Optimize without cost awareness — a 10ms function improvement isn't worth 2x memory allocation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-rendering` | Extends rendering optimization principles to React Native mobile apps |

---

## Live References

> Authoritative documentation links for Vercel deployment optimization.

- [Vercel Performance Guide](https://vercel.com/docs/performance) — Official performance overview
- [Vercel Edge Functions Docs](https://vercel.com/docs/functions/edge-functions) — Edge Function configuration and limits
- [Vercel Caching & CDN](https://vercel.com/docs/edge-network/caching) — CDN cache behavior and Cache-Control headers
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images) — next/image configuration reference
- [Next.js Script Component](https://nextjs.org/docs/app/building-your-application/optimizing/scripts) — Script loading strategies
- [Vercel Analytics (RUM)](https://vercel.com/docs/analytics) — Real-user monitoring setup
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights) — Core Web Vitals tracking
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) — Bundle composition analysis
- [Vercel Cost Optimization](https://vercel.com/docs/accounts/plans/usage/cost-optimization) — Managing and reducing Vercel spend
- [ISR with On-Demand Revalidation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration) — ISR revalidation patterns
