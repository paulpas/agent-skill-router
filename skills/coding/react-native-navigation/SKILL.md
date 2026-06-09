---
name: react-native-navigation
description: Implements navigation in React Native using React Navigation with type-safe TypeScript configuration, deep linking, screen lifecycle management, and performance optimization.
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
  triggers: react navigation, react native navigation, stack navigator, tab navigator, deep linking, screen navigation, navigation typescript
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-native-animation, react-native-list-performance, react-native-ui-patterns
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native Navigation

Implements type-safe navigation in React Native using React Navigation 7 with stack, tab, and drawer navigators. Covers deep linking configuration, screen lifecycle hooks, auth flow handling, and navigation performance optimization.

## TL;DR Checklist

- [ ] Define typed param lists with RootStackParamList for every navigator
- [ ] Use useFocusEffect for data fetching on screen focus (not useEffect alone)
- [ ] Memoize screen components with React.memo to prevent re-renders
- [ ] Configure deep linking scheme for push notification and URL navigation
- [ ] Handle Android back button behavior explicitly
- [ ] Preload critical screens with lazy: false
- [ ] Keep navigator nesting to 4 levels maximum

---

## When to Use

Use this skill when:

- Setting up navigation architecture for a new React Native app
- Adding type-safe navigation with TypeScript param lists
- Implementing deep linking for push notifications and universal links
- Handling authentication flow with conditional navigation
- Optimizing screen transitions and preventing unnecessary re-renders
- Managing navigation lifecycle events (focus, blur) for data fetching
- Configuring tab navigation with badge counts and icons

---

## When NOT to Use

Avoid this skill for:

- Single-screen apps that don't need navigation
- Web-only React apps (use React Router instead)
- Prototypes where navigation is not the primary concern
- Apps already using a different navigation library (e.g., expo-router)

---

## Core Workflow

1. **Define Navigation Structure** — Choose Stack, Tab, or Drawer for each navigation region.

2. **Create Type-Safe Param Lists** — Define TypeScript types for each navigator's route parameters.

3. **Configure Screen Options** — Set headers, gestures, animations per screen.

4. **Set Up Deep Linking** — Map URL paths to screens for push notifications and universal links.

5. **Handle Auth Flow** — Conditionally render auth screens vs. main app screens based on auth state.

6. **Optimize Performance** — Memoize screens, preload critical routes, avoid re-creating navigation options.

---

## Implementation Patterns

### Pattern 1: Type-Safe Navigation Setup

```tsx
// ✅ GOOD: Full TypeScript type safety for all navigation params
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Define all route parameters — undefined means no params
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  ProductDetail: { productId: string; title: string };
  Settings: { section?: 'notifications' | 'privacy' };
  Checkout: { orderId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: { userId: string } | undefined;
};

// Typed navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
    </Stack.Navigator>
  );
}
```

### Pattern 2: useFocusEffect for Data Fetching (BAD vs. GOOD)

```tsx
// ❌ BAD: useEffect alone — doesn't re-fetch when returning to the screen
function ProductListScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  return <ProductList data={products} />;
}
```

```tsx
// ✅ GOOD: useFocusEffect re-fetches every time the screen gains focus
import { useFocusEffect } from '@react-navigation/native';

function ProductListScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchProducts().then((data) => {
        if (isActive) setProducts(data);
      });

      return () => {
        isActive = false; // Cleanup if unmounted during fetch
      };
    }, [])
  );

  return <ProductList data={products} />;
}
```

### Pattern 3: Deep Linking Configuration

```tsx
// ✅ GOOD: Comprehensive deep linking setup
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Search: 'search/:query?',
          Profile: 'profile/:userId?',
        },
      },
      ProductDetail: 'product/:productId',
      Settings: 'settings/:section?',
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
    },
  },
};

// Subscribe to incoming links for push notifications
function App() {
  const navigationRef = useNavigation<NavigationProp<RootStackParamList>>();

  const handleDeepLink = useCallback(
    (url: string) => {
      const parsed = parse(url);
      if (parsed.pathname === '/promotion') {
        navigationRef.navigate('ProductDetail', {
          productId: parsed.query.productId,
          title: parsed.query.title,
        });
      }
    },
    []
  );

  useEffect(() => {
    // Handle URL from push notification tap
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle cold start URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

### Pattern 4: Auth Flow with Conditional Navigation

```tsx
// ✅ GOOD: Conditional navigation based on auth state
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // Authenticated screens
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ headerShown: true, headerBackTitle: 'Back' }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Group>
      ) : (
        // Auth screens — navigator resets when isAuthenticated changes
        <Stack.Group screenOptions={{ animationTypeForReplace: 'pop' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
```

---

## Constraints

### MUST DO
- Use TypeScript for type-safe navigation param lists in all navigators
- Configure deep linking with `NavigationContainer linking` prop for push notifications and URLs
- Use `useFocusEffect` for data fetching and subscriptions that must re-run on screen focus
- Memoize screen components with `React.memo` to prevent unnecessary re-renders
- Handle Android's hardware back button with `useBackHandler` or navigation state persistence
- Preload critical screens using `lazy: false` in the navigator config
- Keep navigator nesting to a maximum of 4 levels (deep nesting causes re-render issues)

### MUST NOT DO
- Re-create `screenOptions` objects on every render — extract to a constant or use useMemo
- Put navigation logic directly in components — use custom hooks (useAuthNavigation)
- Use `navigation.navigate` for screens not defined in the current navigator's param list
- Forget to type `useNavigation`, `useRoute`, and `useFocusEffect` with the correct param list type
- Nest navigators more than 4 levels deep — performance degrades significantly
- Ignore back navigation handling on Android (must handle hardware back button)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-animation` | Shared element transitions and screen animation configuration |
| `react-native-list-performance` | Optimized list screens within navigation stacks |
| `react-native-ui-patterns` | Tab bar icons, dark mode for navigation, SafeAreaView handling |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [React Navigation 7 Documentation](https://reactnavigation.org/docs/getting-started/)
- [TypeScript with React Navigation](https://reactnavigation.org/docs/typescript/)
- [Deep Linking Configuration](https://reactnavigation.org/docs/deep-linking/)
- [Screen Lifecycle: useFocusEffect](https://reactnavigation.org/docs/use-focus-effect/)
- [Authentication Flows](https://reactnavigation.org/docs/auth-flow/)
- [React Navigation Performance](https://reactnavigation.org/docs/navigation-container/#theme)
- [React Navigation Native Stack Navigator](https://reactnavigation.org/docs/native-stack-navigator/)
