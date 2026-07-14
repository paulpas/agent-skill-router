---
name: react-native-rendering
description: Optimizes React Native component rendering through virtualization, memoization, image optimization, and efficient component architecture for mobile performance.
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
  triggers: react native rendering, component optimization, native performance, image optimization, react memo, view nesting, flipper profiling
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-native-state-management, vercel-optimize
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native Rendering Optimization

A senior React Native performance engineer who optimizes component rendering through virtualization, memoization, image caching, view hierarchy flattening, and deferred rendering — targeting 60fps on low-end devices.

## TL;DR Checklist

- [ ] Profile with React DevTools or Flipper before optimizing — measure, don't guess
- [ ] Wrap pure presentational components with React.memo and specify arePropsEqual if needed
- [ ] Use FastImage for remote image caching (never Image for remote URLs)
- [ ] Pre-size images with Image.getSize to prevent layout shift
- [ ] Replace deep View nesting with Fragments or flattened layouts
- [ ] Defer non-critical rendering with InteractionManager.runAfterInteractions
- [ ] Use FlashList or RecyclerViewList for long scrollable lists
- [ ] Create all styles outside render using StyleSheet.create()

---

## When to Use

Use this skill when:

- A screen takes too long to render or navigates with a visible delay
- A FlatList stutters during fast scrolling
- Remote images cause layout jumps or flicker on slow connections
- Profiling with React DevTools shows excessive re-renders of the same component tree
- A component tree has more than 20 nested View elements
- Animations drop frames on mid-to-low-end Android devices
- The app bundle includes heavy screens that are rarely visited

---

## When NOT to Use

Avoid this skill for:

- Initial app prototyping where premature optimization slows iteration
- Simple screens with fewer than 5 components and no images — React Native is already fast enough
- Apps targeting only recent flagship devices with ample memory
- Before profiling — always measure first to identify the real bottleneck

---

## Core Workflow

1. **Profile to Find Bottlenecks** — Use React DevTools Profiler or Flipper to identify:
   - Components that re-render when their props haven't changed
   - Long render commits (>16ms) on the JS thread
   - Images causing layout reflow
   - Deep view hierarchies (measure with `Why Did You Render` or custom metrics)
   **Checkpoint:** Record a baseline FPS and render commit duration before making any changes.

2. **Memoize Pure Components** — Wrap components that render the same output for the same props:
   - Use `React.memo()` for functional components
   - Provide a custom `arePropsEqual` only if default shallow comparison is too loose
   - Never memoize components that depend on context or frequently-changing global state
   **Checkpoint:** Verify with the profiler that the component no longer re-renders on unrelated state changes.

3. **Optimize Images** — Address the most common performance killer in React Native:
   - Replace `Image` with `FastImage` for remote URLs (disk caching, priority, preloading)
   - Pre-size images using `Image.getSize()` to prevent layout shifts
   - Resize images server-side to the maximum display size — never download full-resolution photos
   - Use WebP format on Android (enabled by default in FastImage)
   **Checkpoint:** Check that image-heavy screens load without layout jumps and cached images appear instantly on revisit.

4. **Flatten the View Hierarchy** — Reduce rendering overhead:
   - Replace `<View>` wrappers with `<>` Fragments where possible
   - Inline simple conditional rendering with `{condition && <Component/>}` instead of wrapping in View
   - Use `PointerEvent`-free containers where touch handling is not needed
   - Keep View nesting below 25 levels on any single screen
   **Checkpoint:** Measure the resulting view tree depth with the Flipper layout inspector.

5. **Defer Non-Critical Rendering** — Prioritize what the user sees first:
   - Use `InteractionManager.runAfterInteractions()` for analytics tracking, logging, prefetching
   - Lazy load heavy screens with `React.lazy()` or dynamic imports
   - Implement progressive loading: skeleton/placeholder → critical content → secondary content
   **Checkpoint:** Verify that screen transitions feel instant (under 300ms) even with heavy content below the fold.

---

## Implementation Patterns

### Pattern 1: React.memo with Custom Comparison

```tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CryptoRowProps {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

// ❌ BAD: Renders on every parent re-render even if props haven't changed
function CryptoRow({ symbol, price, change24h, volume }: CryptoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.price}>${price.toFixed(2)}</Text>
      <Text style={[styles.change, { color: change24h >= 0 ? 'green' : 'red' }]}>
        {change24h.toFixed(2)}%
      </Text>
    </View>
  );
}

// ✅ GOOD: Memoized with custom equality — only re-renders when displayed data changes
const MemoizedCryptoRow = memo(CryptoRow, (prev, next) => {
  return (
    prev.symbol === next.symbol &&
    prev.price === next.price &&
    prev.change24h === next.change24h
    // volume is omitted — we don't re-render when only volume changes
  );
});

// ✅ GOOD: For simple props, default shallow comparison suffices
const SimpleRow = memo(({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text>{label}</Text>
    <Text>{value}</Text>
  </View>
));

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  symbol: { fontWeight: 'bold', fontSize: 16, flex: 1 },
  price: { fontSize: 16, flex: 1, textAlign: 'right' },
  change: { fontSize: 14, flex: 0.5, textAlign: 'right' },
});
```

### Pattern 2: Image Optimization with FastImage

```tsx
// ❌ BAD: Using built-in Image for remote URLs — no caching, no preloading, layout shift
import { Image, ImageStyle } from 'react-native';

function Avatar({ uri, size }: { uri: string; size: number }) {
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 } as ImageStyle}
    />
  );
}

// ✅ GOOD: FastImage with disk caching, priority, and pre-sizing
import FastImage, { FastImageProps, Source, Priority } from 'react-native-fast-image';

function OptimizedAvatar({ uri, size }: { uri: string; size: number }) {
  return (
    <FastImage
      style={{ width: size, height: size, borderRadius: size / 2 }}
      source={{
        uri,
        priority: Priority.normal,
        cache: FastImage.cacheControl.immutable, // Never re-fetch — avatar URLs are unique
      } as Source}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
}

// ✅ GOOD: Pre-size images to prevent layout shift
import { useState, useEffect } from 'react';
import { View, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

function SizedImage({ uri }: { uri: string }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    // Get remote image dimensions before rendering
    Image.getSize(
      uri,
      (width, height) => {
        const scaledWidth = SCREEN_WIDTH - 32; // 16px padding on each side
        const scaledHeight = (height / width) * scaledWidth;
        setDimensions({ width: scaledWidth, height: scaledHeight });
      },
      () => {
        // Fallback aspect ratio on error
        setDimensions({ width: SCREEN_WIDTH - 32, height: (SCREEN_WIDTH - 32) * 0.75 });
      }
    );
  }, [uri]);

  if (!dimensions) {
    // Show placeholder while dimensions load
    return <View style={{ width: SCREEN_WIDTH - 32, height: 200, backgroundColor: '#e0e0e0' }} />;
  }

  return (
    <FastImage
      style={{ width: dimensions.width, height: dimensions.height }}
      source={{ uri, priority: Priority.high }}
      resizeMode={FastImage.resizeMode.contain}
    />
  );
}
```

### Pattern 3: InteractionManager for Deferred Rendering

```tsx
import { InteractionManager } from 'react-native';

// ❌ BAD: Blocking the navigation transition with heavy non-critical work
function HeavyDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    // This runs synchronously, delaying the screen transition
    loadAnalytics().then(setAnalytics);
  }, []);

  // ...
}

// ✅ GOOD: Defer non-critical work until after navigation transition
function OptimizedDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    // Wait for navigation transition and user-perceivable rendering to complete
    const task = InteractionManager.runAfterInteractions(() => {
      loadAnalytics().then(setAnalytics);
    });
    return () => task.cancel();
  }, []);

  // ...
}

// ✅ GOOD: Prioritize rendering — show skeleton, then content, then secondary
function ProgressiveDashboard() {
  const [phase, setPhase] = useState<'skeleton' | 'content' | 'secondary'>('skeleton');

  useEffect(() => {
    // Phase 1: Show skeleton immediately (instant render)
    requestAnimationFrame(() => setPhase('content'));
  }, []);

  useEffect(() => {
    if (phase === 'content') {
      // Phase 2: After content renders, defer secondary data loading
      InteractionManager.runAfterInteractions(() => {
        setPhase('secondary');
      });
    }
  }, [phase]);

  if (phase === 'skeleton') return <SkeletonLoader />;
  if (phase === 'content') return <MainFeed />;
  return <FullDashboard />; // Includes analytics, recommendations, etc.
}
```

### Pattern 4: View Nesting Anti-Pattern

```tsx
// ❌ BAD: Deep view nesting (6 levels for a simple avatar row)
function BadAvatarRow({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  return (
    <View style={outerStyles.container}>
      <View style={outerStyles.avatarWrap}>
        <View style={outerStyles.avatarInner}>
          <FastImage source={{ uri: avatarUrl }} style={outerStyles.img} />
        </View>
      </View>
      <View style={outerStyles.textWrap}>
        <View style={outerStyles.nameWrap}>
          <Text style={outerStyles.name}>{name}</Text>
        </View>
      </View>
    </View>
  );
}

// ✅ GOOD: Flattened hierarchy — 2 levels instead of 6
function OptimizedAvatarRow({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  return (
    <View style={flatStyles.container}>
      <FastImage source={{ uri: avatarUrl }} style={flatStyles.avatar} />
      <Text style={flatStyles.name}>{name}</Text>
    </View>
  );
}

const flatStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  name: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
});
```

---

## Constraints

### MUST DO
- Profile with React DevTools or Flipper before and after every optimization — verify improvement
- Use `React.memo()` for all pure presentational components in lists
- Use `FastImage` for all remote image URLs — never use built-in `Image` for external sources
- Pre-size images with `Image.getSize()` or aspect ratio metadata to prevent layout shifts
- Use `StyleSheet.create()` outside the render function — never inline style objects
- Use `InteractionManager.runAfterInteractions()` for non-critical work (analytics, logging, prefetching)
- Use `Fragment` (`<>...</>`) instead of `<View>` wrappers where no styling is needed
- Use `FlashList` from `@shopify/flash-list` instead of `FlatList` for lists with 50+ items

### MUST NOT DO
- Use inline styles in the render function (creates new object instances every render)
- Nest Views more than 30 levels deep — flatten the hierarchy
- Re-render an entire screen for a small, localized state change — use local component state
- Download full-resolution images from servers — resize server-side to max display size
- Block navigation transitions with synchronous data loading
- Use `React.memo` on components that depend on context or frequently-changing global state
- Prematurely optimize without profiling — measure the actual bottleneck first

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-state-management` | Complements rendering optimization by reducing re-renders from global state |
| `vercel-optimize` | Extends optimization to the backend — CDN caching, cold starts, bundle analysis |

---

## Live References

> Authoritative documentation links for React Native rendering optimization.

- [React Native Performance Overview](https://reactnative.dev/docs/performance) — Official performance guide
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools) — Profile component re-renders
- [FastImage GitHub](https://github.com/DylanVann/react-native-fast-image) — Performant image caching for React Native
- [FlashList by Shopify](https://shopify.github.io/flash-list/) — High-performance list replacement for FlatList
- [InteractionManager Docs](https://reactnative.dev/docs/interactionmanager) — Defer work after interactions
- [Flipper Mobile Debugger](https://fbflipper.com/) — Profile layout, network, and JS thread performance
- [React Native StyleSheet.create()](https://reactnative.dev/docs/stylesheet) — Optimized style creation
- [Why Did You Render](https://github.com/welldone-software/why-did-you-render) — Detect unnecessary re-renders
