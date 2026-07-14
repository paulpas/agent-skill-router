---
name: react-native-list-performance
description: Optimizes React Native FlatList and SectionList performance through windowing, item memoization, getItemLayout, and efficient rendering strategies for smooth scrolling.
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
  triggers: flatlist performance, react native list, list optimization, scroll performance, windowing, getItemLayout, flashlist
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-native-animation, react-native-navigation, react-native-ui-patterns
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native List Performance

Optimizes FlatList and SectionList rendering through windowed virtualization, fixed-size item layout measurements, memoized item components, and tuned batch rendering parameters. Achieves smooth 60fps scrolling even with thousands of items.

## TL;DR Checklist

- [ ] Use FlatList (not ScrollView with map) for any list over 20 items
- [ ] Extract list item components and wrap with React.memo
- [ ] Implement getItemLayout for fixed-height items
- [ ] Set windowSize (default 21) based on scroll smoothness vs. memory tradeoff
- [ ] Use stable, unique keyExtractor (never index)
- [ ] Profile scroll performance with built-in FPS monitor
- [ ] Consider FlashList for lists exceeding 500 items

---

## When to Use

Use this skill when:

- Rendering any dynamic list exceeding 20 items
- Building infinite-scroll feeds, chat threads, or data tables
- Diagnosing scroll jank or dropped frames in long lists
- Migrating from ScrollView + map() to virtualized lists
- Displaying variable-height items (comments, cards with dynamic content)
- Optimizing initial render time for lists with hundreds of items

---

## When NOT to Use

Avoid this skill for:

- Lists under 20 items with simple content — ScrollView is simpler and sufficient
- Static content that never changes — consider ScrollView for clarity
- Short forms or settings screens — FlatList overhead isn't justified
- Navigation-based lists (use React Navigation's built-in optimized rendering)

---

## Core Workflow

1. **Choose the Right List Component** — FlatList for homogeneous items, SectionList for sectioned data, FlashList for extreme performance needs.

2. **Extract and Memoize Item Components** — Move renderItem logic to a standalone component wrapped with React.memo.

   **Checkpoint:** Verify the item component doesn't create new objects/arrays on each render.

3. **Configure getItemLayout** — Provide fixed item heights to skip measurement.

   **Checkpoint:** Confirm all items are the same height before using getItemLayout.

4. **Tune Virtualization Parameters** — Adjust windowSize, maxToRenderPerBatch, initialNumToRender, and removeClippedSubviews.

5. **Profile** — Enable the FPS monitor and verify 60fps during rapid scrolling.

---

## Implementation Patterns

### Pattern 1: Proper FlatList Setup (BAD vs. GOOD)

```tsx
// ❌ BAD: Inline renderItem, no memo, index as key, no getItemLayout
<FlatList
  data={items}
  renderItem={({ item }) => (
    <View style={styles.item}>
      <Text>{item.name}</Text>
      <Text>{item.description}</Text>
    </View>
  )}
  keyExtractor={(_, index) => String(index)}
/>
```

```tsx
// ✅ GOOD: Memoized item component, stable key, getItemLayout
interface ListItemData {
  id: string;
  name: string;
  description: string;
}

const ListItem = React.memo(function ListItem({ item }: { item: ListItemData }) {
  return (
    <View style={styles.item}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.subtitle}>{item.description}</Text>
    </View>
  );
});

const ITEM_HEIGHT = 72; // Fixed height for all items

function OptimizedList({ items }: { items: ListItemData[] }) {
  const renderItem = useCallback(
    ({ item }: { item: ListItemData }) => <ListItem item={item} />,
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      windowSize={15}
      maxToRenderPerBatch={10}
      initialNumToRender={12}
      removeClippedSubviews={true}
    />
  );
}
```

### Pattern 2: Avoiding Inline Object Creations in renderItem

```tsx
// ❌ BAD: New style object created on every renderItem call
<FlatList
  data={items}
  renderItem={({ item }) => (
    <View style={{ padding: 16, backgroundColor: item.isActive ? '#eef' : '#fff' }}>
      <Text>{item.name}</Text>
    </View>
  )}
/>
```

```tsx
// ✅ GOOD: Styles extracted, conditional styling via computed value
const styles = StyleSheet.create({
  item: { padding: 16 },
  itemActive: { backgroundColor: '#eef' },
  itemInactive: { backgroundColor: '#fff' },
});

const ListItem = React.memo(function ListItem({ item }: { item: ItemData }) {
  return (
    <View style={[styles.item, item.isActive ? styles.itemActive : styles.itemInactive]}>
      <Text>{item.name}</Text>
    </View>
  );
});
```

### Pattern 3: Variable Height with getItemType

```tsx
// ✅ GOOD: Dynamic item types for variable-height items
type ListItemType = 'header' | 'message' | 'divider';

interface ChatItem {
  id: string;
  type: ListItemType;
  text?: string;
  sender?: string;
}

const ITEM_HEIGHTS: Record<ListItemType, number> = {
  header: 44,
  message: 80,
  divider: 24,
};

function ChatList({ messages }: { messages: ChatItem[] }) {
  const getItemLayout = useCallback(
    (data: ArrayLike<ChatItem> | null, index: number) => {
      const item = data?.[index];
      const length = ITEM_HEIGHTS[item?.type ?? 'message'];
      const offset = calculateOffset(data, index, ITEM_HEIGHTS);
      return { length, offset, index };
    },
    []
  );

  return (
    <FlatList
      data={messages}
      getItemLayout={getItemLayout}
      keyExtractor={(item) => item.id}
      renderItem={renderChatItem}
    />
  );
}

// Helper: precompute offsets for variable heights
function calculateOffset(
  data: ArrayLike<ChatItem> | null,
  index: number,
  heights: Record<string, number>
): number {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += heights[data?.[i]?.type ?? 'message'];
  }
  return offset;
}
```

### Pattern 4: FlashList for Extreme Performance

```tsx
// ✅ GOOD: FlashList for lists over 500 items — better memory and scroll performance
import { FlashList } from '@shopify/flash-list';

function LargeFeed({ posts }: { posts: Post[] }) {
  return (
    <FlashList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item) => item.id}
      estimatedItemSize={120}
      getItemType={(item) => item.type} // Enables type-based reuse
    />
  );
}
```

---

## Constraints

### MUST DO
- Use FlatList or FlashList for any dynamic list with more than 20 items
- Implement `getItemLayout` when all items share the same height
- Wrap list item components with `React.memo` to prevent unnecessary re-renders
- Use `useCallback` for renderItem to avoid re-creating the function on every render
- Use stable, unique keys in `keyExtractor` — never use the index
- Extract styles and static objects outside the component to avoid re-creation
- Set `removeClippedSubviews={true}` for lists with complex item layouts

### MUST NOT DO
- Use ScrollView with `map()` for lists over 20 items — lacks windowing
- Create new objects, arrays, or functions inside `renderItem`
- Use the array index as the list item key
- Set `windowSize` unnecessarily high (max 31) — consumes more memory
- Inline styles or objects in renderItem — they're recreated on every render
- Forget to memoize item components — they re-render on every parent update

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-animation` | Animate list items with Reanimated for smooth transitions |
| `react-native-navigation` | Navigate to list item detail screens with shared element transitions |
| `react-native-ui-patterns` | Responsive list layouts with Flexbox and useWindowDimensions |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Native FlatList Documentation](https://reactnative.dev/docs/flatlist)
- [React Native SectionList Documentation](https://reactnative.dev/docs/sectionlist)
- [React Native Performance Overview](https://reactnative.dev/docs/performance)
- [Shopify FlashList Documentation](https://shopify.github.io/flash-list/)
- [React Native FPS Monitor](https://reactnative.dev/docs/debugging#fps-monitor)
- [Optimizing FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [React.memo API Reference](https://react.dev/reference/react/memo)
