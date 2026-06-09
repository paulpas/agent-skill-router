---
name: react-native-animation
description: Implements smooth, performant animations in React Native using Reanimated for UI thread animations, Animated API with native driver, gesture-driven interactions, and layout animations.
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
  triggers: react native animation, reanimated, native animation, gesture animation, layout animation, ui thread animation, animated api
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-native-list-performance, react-native-navigation, react-native-ui-patterns
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native Animation

Implements performant animations in React Native using Reanimated 3 for UI thread execution, the Animated API with native driver for simpler cases, gesture-driven interactions via react-native-gesture-handler, and LayoutAnimation for implicit transitions. Keeps animations running at 60fps without blocking the JS thread.

## TL;DR Checklist

- [ ] Use Reanimated (useSharedValue + useAnimatedStyle) for all interactive animations
- [ ] Set useNativeDriver: true for transform/opacity animations with Animated API
- [ ] Never animate layout properties (width, height, top, left) on the JS thread
- [ ] Use LayoutAnimation for implied layout changes (add/remove items)
- [ ] Clean up all animation refs and listeners on component unmount
- [ ] Use InteractionManager.runAfterInteractions for deferred non-critical work

---

## When to Use

Use this skill when:

- Building gesture-driven interactions (drag, pinch, swipe, rotate)
- Implementing shared element transitions between screens
- Creating micro-interactions (button press, card flip, list reorder)
- Animating component mount/unmount with enter/exit transitions
- Adding scroll-driven animations (parallax, header collapse, progress bars)
- Building skeleton loading animations or shimmer effects

---

## When NOT to Use

Avoid this skill for:

- Simple opacity or transform transitions — use Animated API (lighter weight)
- CSS-animatable properties in React Native Web (prefer CSS animations)
- Navigation transitions already handled by React Navigation
- Layout changes that don't require animation (use plain state toggles)
- Situations where InteractionManager is sufficient for deferring work

---

## Core Workflow

1. **Choose Animation Library** — Reanimated for complex/interactive animations (UI thread), Animated API for simple declarative animations with native driver.

2. **Set Up Shared/Animated Values** — useSharedValue (Reanimated) or useRef(new Animated.Value()) for Animated API.

3. **Define Animated Styles** — useAnimatedStyle (Reanimated) or interpolate values to style props.

4. **Trigger with Timing/Spring/Gestures** — Apply withTiming/withSpring for declarative curves, or attach to gesture handlers.

5. **Wire Up Gesture Handlers** — Use react-native-gesture-handler PanGestureHandler, PinchGestureHandler, etc. with Reanimated worklets.

6. **Clean Up** — Cancel running animations, remove listeners, and reset refs on unmount.

---

## Implementation Patterns

### Pattern 1: Reanimated with Gesture Handler (Fade-In Card)

```tsx
// ✅ GOOD: Reanimated on UI thread — smooth 60fps
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

function AnimatedCard() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  // Mount animation
  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  // Press animation with spring
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const onGestureEvent = (event: GestureEvent) => {
    if (event.nativeEvent.state === State.BEGAN) {
      scale.value = withSpring(0.96);
    } else if (event.nativeEvent.state === State.END) {
      scale.value = withSpring(1);
    }
  };

  return (
    <TapGestureHandler onHandlerStateChange={onGestureEvent}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text>Animated Card Content</Text>
      </Animated.View>
    </TapGestureHandler>
  );
}
```

### Pattern 2: Animated API with Native Driver (BAD vs. GOOD)

```tsx
// ❌ BAD: Animating layout property on JS thread — janky
const animatedValue = useRef(new Animated.Value(0)).current;

const startBadAnimation = () => {
  Animated.timing(animatedValue, {
    toValue: 100,
    duration: 300,
    useNativeDriver: false, // Layout props require JS thread
  }).start();
};

return (
  <Animated.View style={{ width: animatedValue }}> // width = JS thread
    <Text>Bad — animates width on JS thread</Text>
  </Animated.View>
);
```

```tsx
// ✅ GOOD: Animating transform on native thread — smooth 60fps
const translateX = useRef(new Animated.Value(0)).current;
const opacity = useRef(new Animated.Value(1)).current;

const startGoodAnimation = () => {
  Animated.parallel([
    Animated.timing(translateX, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true, // transform supports native driver
    }),
    Animated.timing(opacity, {
      toValue: 0.5,
      duration: 300,
      useNativeDriver: true, // opacity supports native driver
    }),
  ]).start();
};

return (
  <Animated.View
    style={{
      opacity,
      transform: [{ translateX }],
    }}
  >
    <Text>Good — animates transform on native thread</Text>
  </Animated.View>
);
```

### Pattern 3: LayoutAnimation for Implicit Transitions

```tsx
// ✅ GOOD: LayoutAnimation handles the implied layout change smoothly
import { LayoutAnimation, Platform, UIManager } from 'react-native';

// Required for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ExpandableSection({ title, children }: ExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setIsExpanded((prev) => !prev);
  };

  return (
    <View>
      <TouchableOpacity onPress={toggleExpand}>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
      {isExpanded && <View>{children}</View>}
    </View>
  );
}
```

### Pattern 4: InteractionManager for Deferred Work

```tsx
// ✅ GOOD: Defer non-critical work until after animations complete
function ProfileScreen({ userId }: { userId: string }) {
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // This runs after all animations and transitions complete
      loadAnalytics(userId).then(() => setAnalyticsLoaded(true));
    });

    return () => task.cancel();
  }, [userId]);

  return (
    <View>
      <ProfileHeader userId={userId} />
      {analyticsLoaded ? (
        <AnalyticsCharts userId={userId} />
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
```

---

## Constraints

### MUST DO
- Use Reanimated (useSharedValue, useAnimatedStyle) for complex animations on the UI thread
- Set `useNativeDriver: true` for transform and opacity animations when using Animated API
- Use `LayoutAnimation.configureNext` for implied layout changes (add/remove elements)
- Use `InteractionManager.runAfterInteractions` to defer data fetching and analytics
- Animate only `transform` (translateX, translateY, scale, rotate) and `opacity` for native-driver support
- Cancel running animations and remove event listeners on component unmount

### MUST NOT DO
- Animate layout properties (width, height, top, left) on the JS thread — use `transform: [{ translateX }]`
- Create a new `Animated.Value` on every render — store in ref or use useSharedValue
- Block the UI thread with heavy computation during active animations
- Forget to clean up animation refs, listener subscriptions, or gesture handlers on unmount
- Use `useNativeDriver: false` unless animating non-transform/non-opacity properties
- Apply Reanimated worklets to callbacks that touch JS state — worklets run on the UI thread

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-list-performance` | Animate list item enter/exit with Reanimated layout transitions |
| `react-native-navigation` | Shared element transitions and screen animations |
| `react-native-ui-patterns` | Animated theme toggles and responsive layout transitions |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Native Reanimated 3 Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Animated API Reference](https://reactnative.dev/docs/animated)
- [React Native LayoutAnimation](https://reactnative.dev/docs/layoutanimation)
- [InteractionManager](https://reactnative.dev/docs/interactionmanager)
- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [React Native Performance: Using Native Driver](https://reactnative.dev/docs/animations#using-the-native-driver)
- [Reanimated Shared Value Transitions](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue)
