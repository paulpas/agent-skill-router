---
name: react-native-ui-patterns
description: Implements responsive, accessible, and consistent UI components in React Native using Flexbox layouts, theme systems with dark mode support, platform-specific styling, and safe area handling.
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
  triggers: react native ui, react native styling, responsive layout, dark mode, flexbox, safe area, platform specific
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-native-animation, react-native-navigation, react-native-list-performance
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native UI Patterns

Implements responsive, accessible, and consistent UI in React Native using Flexbox layouts, a theme system with light and dark mode, platform-specific extensions, SafeAreaView for notches, KeyboardAvoidingView for forms, and Dynamic Type support for text accessibility.

## TL;DR Checklist

- [ ] Use Flexbox (flex, flexDirection, alignItems, justifyContent) for all layouts
- [ ] Implement a theme context with light and dark mode color palettes
- [ ] Use SafeAreaView to handle notches, status bars, and home indicators
- [ ] Support Dynamic Type via allowFontScaling with maxFontSizeMultiplier
- [ ] Use useWindowDimensions for responsive breakpoints
- [ ] Use Platform.select for OS-specific styling
- [ ] Ensure touch targets are at least 44pt with adequate hitSlop

---

## When to Use

Use this skill when:

- Building the layout foundation for a new React Native app
- Adding dark mode support to an existing application
- Creating a theme system with consistent spacing, typography, and colors
- Ensuring UI works across iPhone notch, Dynamic Island, and Android status bars
- Building responsive layouts that adapt to tablet and phone screens
- Making forms accessible with keyboard-avoiding behavior
- Implementing platform-specific designs for iOS and Android

---

## When NOT to Use

Avoid this skill for:

- Web-only React projects (use CSS media queries and CSS custom properties)
- Apps that don't need responsive layouts (fixed-size canvas apps)
- Prototypes where a single-platform look is acceptable
- Situations where theming is handled by a third-party UI library

---

## Core Workflow

1. **Set Up Theme System** — Define a theme object with colors, spacing scale, typography, and breakpoints. Provide it via React Context.

2. **Implement Responsive Layouts** — Use Flexbox properties with useWindowDimensions for adaptive breakpoints.

3. **Add Safe Area Support** — Wrap screens with SafeAreaView and configure edges.

4. **Support Dark Mode** — Use useColorScheme() to toggle between light and dark theme palettes.

5. **Handle Platform Differences** — Use Platform.select or platform-specific file extensions (.ios.tsx, .android.tsx).

6. **Add Accessibility** — Enable font scaling with maxFontSizeMultiplier caps, and set hitSlop on small touch targets.

---

## Implementation Patterns

### Pattern 1: Theme System with Dark Mode

```tsx
// ✅ GOOD: Full theme system with light/dark mode
interface Theme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    error: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: TextStyle;
    body: TextStyle;
    caption: TextStyle;
  };
}

const lightTheme: Theme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#666666',
    primary: '#007AFF',
    border: '#E0E0E0',
    error: '#FF3B30',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  typography: {
    h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    background: '#1A1A1A',
    surface: '#2C2C2C',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    primary: '#0A84FF',
    border: '#3A3A3A',
    error: '#FF453A',
  },
};

// Theme context
const ThemeContext = createContext<Theme>(lightTheme);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

// Usage in a component
function ThemedCard() {
  const theme = useContext(ThemeContext);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: 12,
      }}
    >
      <Text
        style={[
          theme.typography.body,
          { color: theme.colors.text },
        ]}
      >
        Themed content
      </Text>
    </View>
  );
}
```

### Pattern 2: Flexbox Responsive Layout (BAD vs. GOOD)

```tsx
// ❌ BAD: Hardcoded pixel values — breaks on different screen sizes
function BadLayout() {
  return (
    <View>
      <View style={{ width: 300, height: 200 }}> {/* Fixed width */}
        <Image source={logo} style={{ width: 200, height: 100 }} />
      </View>
      <View style={{ marginLeft: 20 }}>
        <Text style={{ fontSize: 14 }}>Description</Text>
      </View>
    </View>
  );
}
```

```tsx
// ✅ GOOD: Flexbox-based layout that adapts to any screen size
function ResponsiveCard({ item }: { item: CardItem }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={[styles.card, isTablet && styles.cardTablet]}>
      <Image source={item.image} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 3,
  },
  cardTablet: {
    padding: 24,
    marginHorizontal: 48,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  content: {
    flex: 1, // Takes remaining space
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
```

### Pattern 3: Platform-Specific Styling

```tsx
// ✅ GOOD: Platform.select for OS-specific values
import { Platform, PlatformOSType } from 'react-native';

const SHADOW_STYLES = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

// Platform-specific component via file extension:
// Card.ios.tsx
// Card.android.tsx
// These files auto-resolve at build time
```

```tsx
// ✅ GOOD: Helper function for platform-specific values
function getPlatformValue<T>(values: Partial<Record<PlatformOSType, T>>, fallback: T): T {
  return values[Platform.OS] ?? fallback;
}

// Usage
const hitSlop = getPlatformValue(
  { ios: { top: 10, bottom: 10, left: 10, right: 10 } },
  { top: 8, bottom: 8, left: 8, right: 8 }
);
```

### Pattern 4: SafeArea and Keyboard Avoiding

```tsx
// ✅ GOOD: SafeAreaView + KeyboardAvoidingView for form screens
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';

function LoginScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Welcome Back</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            autoComplete="password"
          />
          <TouchableOpacity style={styles.button} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### Pattern 5: Accessible Touch Targets

```tsx
// ✅ GOOD: Minimum 44pt touch target with hitSlop for close-spaced items
function IconButton({ icon, onPress, label }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={styles.iconButton}
    >
      <Icon name={icon} size={24} />
    </TouchableOpacity>
  );
}

// ✅ GOOD: Dynamic Type support with capped max font size
function AccessibleText({ children, style }: TextProps) {
  return (
    <Text
      style={style}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5} // Caps at 150% of base size
    >
      {children}
    </Text>
  );
}
```

---

## Constraints

### MUST DO
- Use Flexbox (flex, flexDirection, alignItems, justifyContent) for all layouts — never absolute positioning for page layout
- Support dark mode via `useColorScheme()` or a theme context that toggles color palettes
- Respect safe areas using `SafeAreaView` from react-native-safe-area-context
- Support Dynamic Type with `allowFontScaling={true}` and `maxFontSizeMultiplier={1.5}`
- Use a spacing scale from the theme object — never hardcode pixel values
- Provide `hitSlop` for touch targets smaller than 44pt (minimum recommended size)
- Use `KeyboardAvoidingView` with correct `behavior` prop per platform for form screens

### MUST NOT DO
- Hardcode pixel values for margins, padding, widths, or font sizes — use theme spacing scale
- Ignore safe areas on iPhone X+ or Android devices with display cutouts
- Use fixed widths — prefer flex percentages or the `flex` property
- Forget to set `accessibilityLabel` and `accessibilityRole` on interactive elements
- Use `position: absolute` for regular layout — reserve it for overlay/modal positioning
- Neglect shadow styles on iOS (shadowColor, shadowOffset, shadowOpacity, shadowRadius) or elevation on Android

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-animation` | Animate theme transitions and layout changes |
| `react-native-navigation` | Navigation theming, tab bar styling, screen transitions |
| `react-native-list-performance` | Responsive list item layouts with useWindowDimensions |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Native Flexbox Documentation](https://reactnative.dev/docs/flexbox)
- [React Native useWindowDimensions](https://reactnative.dev/docs/usewindowdimensions)
- [React Native Platform-Specific Code](https://reactnative.dev/docs/platform-specific-code)
- [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context)
- [React Native Accessibility Guide](https://reactnative.dev/docs/accessibility)
- [Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material Design 3: Dark Theme](https://m3.material.io/foundations/dark-theme)
