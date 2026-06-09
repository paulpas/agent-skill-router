---
name: react-native-state-management
description: Manages application state in React Native using Context API, Zustand, Redux Toolkit, and Jotai with proper persistence, middleware, and re-render optimization for mobile.
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
  triggers: react native state, state management, zustand, redux toolkit, jotai, asyncstorage, react native data
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: react-native-rendering, react-native-monorepo-config
  author: https://github.com/vercel-labs
  source: https://github.com/vercel-labs/agent-skills
---

# React Native State Management

A senior React Native engineer selecting and implementing state management solutions (Context API, Zustand, Redux Toolkit, Jotai) with persistence, middleware, and performance optimization for mobile applications.

## TL;DR Checklist

- [ ] Evaluate app complexity before choosing a state management library
- [ ] Use Zustand or Jotai for medium-complexity apps (minimal boilerplate, great DX)
- [ ] Use Redux Toolkit with RTK Query for complex apps needing API caching and devtools
- [ ] Implement state persistence with AsyncStorage + middleware layer
- [ ] Use selectors with equality checks (useShallow, shallow) to prevent re-renders
- [ ] Code-split stores by feature domain for large applications
- [ ] Reset all state on auth logout via a single action
- [ ] Keep state flat — never store derived/computed data

---

## When to Use

Use this skill when:

- Building a new React Native app and deciding on a state management strategy
- Refactoring a component that re-renders too often due to global state subscriptions
- Implementing offline-first behavior with persisted state
- Adding auth flows that require state reset on logout
- Setting up Redux Toolkit with RTK Query for API caching
- Introducing Zustand as a lightweight alternative to Redux

---

## When NOT to Use

Avoid this skill for:

- Simple apps with minimal shared state — React's built-in `useState` + prop drilling is sufficient
- Web-only React projects (no AsyncStorage dependency) — use localStorage or similar instead
- Server-state dominated apps where React Query or SWR alone suffices (no client state needed)
- Performance-critical animations driven by state — use Reanimated shared values instead

---

## Core Workflow

1. **Assess App Complexity** — Determine the right approach:
   - **Simple** (1-2 shared values) → Context API + `useReducer`
   - **Medium** (multi-feature, moderate state) → Zustand or Jotai
   - **Complex** (many features, API caching, middleware) → Redux Toolkit + RTK Query
   **Checkpoint:** If you need API caching, choose RTK Query or React Query before adding a state library.

2. **Define State Shape** — Design flat, normalized state slices:
   - Keep state as flat as possible — avoid deeply nested objects
   - Never store derived data (filtered lists, computed totals) — compute with selectors
   - Separate server state (API data) from client state (UI toggles, form inputs)
   **Checkpoint:** Can every piece of state be serialized to JSON? If not, move non-serializable data to a ref or middleware.

3. **Implement Store with Selectors** — Create the store/slice with memoized selectors:
   - Use `createSelector` (Redux) or `useShallow` (Zustand) for equality checks
   - Code-split by feature — one store/slice per app domain
   - Keep actions and reducers colocated with their feature
   **Checkpoint:** Verify that components only re-render when their specific slice of state changes.

4. **Add Persistence** — Wire AsyncStorage with the appropriate middleware:
   - Redux: `redux-persist` with `AsyncStorage` engine
   - Zustand: `persist` middleware
   - Jotai: `atomWithStorage` from `jotai/utils`
   - Only persist essential user data (auth tokens, preferences, drafts) — never cache full API responses
   **Checkpoint:** Test that state survives app kill/restart on both iOS and Android.

5. **Handle Auth Flow** — Implement login/logout with proper state lifecycle:
   - On login: restore persisted state or initialize fresh
   - On logout: dispatch a single `RESET_STATE` action or call `store.reset()`
   - Never manually clear individual slices — one atomic reset prevents stale data bugs
   **Checkpoint:** Verify that after logout, no previous user's data is accessible.

---

## Implementation Patterns

### Pattern 1: Zustand Store with Persistence (Medium Complexity)

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShallow } from 'zustand/react/shallow';

// --- State shape ---
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  notificationsEnabled: boolean;
}

interface AppState {
  // Auth
  userId: string | null;
  token: string | null;

  // Preferences (persisted)
  preferences: UserPreferences;

  // Actions
  login: (userId: string, token: string) => void;
  logout: () => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

const initialState = {
  userId: null,
  token: null,
  preferences: {
    theme: 'system' as const,
    fontSize: 16,
    notificationsEnabled: true,
  },
};

// --- Zustand store with persistence ---
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      login: (userId, token) => set({ userId, token }),

      logout: () => set(initialState), // Single atomic reset

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
    }),
    {
      name: 'app-state',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist auth tokens and preferences — skip transient UI state
      partialize: (state) => ({
        userId: state.userId,
        token: state.token,
        preferences: state.preferences,
      }),
    }
  )
);

// --- Selector with shallow comparison prevents unnecessary re-renders ---
export function useTheme() {
  return useAppStore(useShallow((state) => ({
    theme: state.preferences.theme,
    fontSize: state.preferences.fontSize,
  })));
}
```

### Pattern 2: Redux Toolkit with RTK Query (Complex App)

```tsx
import { configureStore, createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  persistStore,
  persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// --- API slice (server state) ---
interface Post {
  id: number;
  title: string;
  body: string;
}

export const postsApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://jsonplaceholder.typicode.com' }),
  endpoints: (builder) => ({
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
    }),
    getPost: builder.query<Post, number>({
      query: (id) => `/posts/${id}`,
    }),
  }),
});

export const { useGetPostsQuery, useGetPostQuery } = postsApi;

// --- Client state slice (UI-only state) ---
interface UIState {
  selectedPostId: number | null;
  isGridView: boolean;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    selectedPostId: null,
    isGridView: false,
  } as UIState,
  reducers: {
    selectPost(state, action: PayloadAction<number | null>) {
      state.selectedPostId = action.payload;
    },
    toggleView(state) {
      state.isGridView = !state.isGridView;
    },
  },
});

export const { selectPost, toggleView } = uiSlice.actions;

// --- Memoized selector ---
const selectIsGridView = (state: RootState) => state.ui.isGridView;
export const selectLayoutMode = createSelector(
  [selectIsGridView],
  (isGridView) => (isGridView ? 'grid' : 'list' as const)
);

// --- Persist only UI slice (RTK Query manages its own cache) ---
const persistConfig = {
  key: 'ui',
  storage: AsyncStorage,
  whitelist: ['isGridView'], // Don't persist selectedPostId — it's transient
};

const persistedUIReducer = persistReducer(persistConfig, uiSlice.reducer);

// --- Store ---
export const store = configureStore({
  reducer: {
    [postsApi.reducerPath]: postsApi.reducer,
    ui: persistedUIReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(postsApi.middleware),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Pattern 3: Jotai for Fine-Grained Atomic State

```tsx
import { atom, useAtom, useAtomValue } from 'jotai';
import { atomWithStorage, splitAtom } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Persisted atoms ---
export const themeAtom = atomWithStorage<'light' | 'dark'>(
  'theme',
  'light',
  {
    getItem: async (key) => {
      const value = await AsyncStorage.getItem(key);
      return value === 'dark' ? 'dark' : 'light';
    },
    setItem: async (key, value) => {
      await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key) => {
      await AsyncStorage.removeItem(key);
    },
  }
);

// --- Derived atom (no derived data stored in state) ---
export const isDarkAtom = atom((get) => get(themeAtom) === 'dark');

// --- Atom family (splitAtom for dynamic lists) ---
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export const todosAtom = atom<TodoItem[]>([]);
export const todoAtomsAtom = splitAtom(todosAtom);

// --- Computed via selectors, not stored ---
export const completedTodosAtom = atom((get) =>
  get(todosAtom).filter((todo) => todo.completed)
);

export const pendingTodosAtom = atom((get) =>
  get(todosAtom).filter((todo) => !todo.completed)
);

// --- Component usage (only re-renders when specific atom changes) ---
function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  const isDark = useAtomValue(isDarkAtom);

  return (
    <button onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current: {theme} {isDark ? '🌙' : '☀️'}
    </button>
  );
}
```

### Pattern 4: Context API Pitfall — When Not to Use It

```tsx
// ❌ BAD: Context for rapidly-updating global state (causes full-tree re-renders)
const PositionContext = createContext({
  latitude: 0,
  longitude: 0,
  heading: 0,
  speed: 0,
});

function PositionProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState({ latitude: 0, longitude: 0, heading: 0, speed: 0 });

  useEffect(() => {
    const sub = Location.watchPositionAsync(
      { enableHighAccuracy: true, timeInterval: 100 },
      (loc) => setPosition({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        heading: loc.coords.heading ?? 0,
        speed: loc.coords.speed ?? 0,
      })
    );
    return () => sub.then((s) => s.remove());
  }, []);

  return <PositionContext.Provider value={position}>{children}</PositionContext.Provider>;
}

// Every consumer re-renders 10 times/second — even those that only show heading!

// ✅ GOOD: Use Zustand for high-frequency updates (only subscribed components re-render)
import { create } from 'zustand';

interface PositionState {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  setPosition: (pos: Omit<PositionState, 'setPosition'>) => void;
}

export const usePositionStore = create<PositionState>((set) => ({
  latitude: 0,
  longitude: 0,
  heading: 0,
  speed: 0,
  setPosition: (pos) => set(pos),
}));

// Only this component re-renders on each GPS update
function HeadingDisplay() {
  const heading = usePositionStore((s) => s.heading);  // Subscribes only to `heading`
  return <Text>Heading: {heading}°</Text>;
}
```

---

## Constraints

### MUST DO
- Use selectors with equality checks (useShallow, shallow, createSelector) to prevent unnecessary re-renders
- Implement state persistence via AsyncStorage for user preferences, auth tokens, and draft data
- Handle auth flow state reset atomically — one action clears everything
- Code-split stores by feature domain (auth/, feed/, settings/) in large apps
- Keep state serializable at all times — non-serializable data belongs in refs or middleware
- Store only the minimum necessary state — derive everything else via selectors

### MUST NOT DO
- Store derived/computed data in state — compute with selectors instead
- Use Context API for high-frequency global state updates (GPS, websocket data, animation values)
- Store full API responses in persisted state — use RTK Query cache or React Query instead
- Mix server state (API data) and client state (UI toggles) in the same slice
- Reset state by manually clearing individual keys — always use an atomic reset action
- Use mutable patterns in Redux Toolkit (the immer-based reducer handles immutability for you)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `react-native-rendering` | Optimizes component rendering in tandem with state management |
| `react-native-monorepo-config` | Configures monorepo workspaces for sharing state libraries across packages |

---

## Live References

> Authoritative documentation links for React Native state management.

- [React Native State Management Overview](https://reactnative.dev/docs/state) — Official React Native guide
- [Zustand Documentation](https://github.com/pmndrs/zustand) — Lightweight state management for React
- [Redux Toolkit Docs](https://redux-toolkit.js.org/) — Official Redux Toolkit with RTK Query
- [Jotai Documentation](https://jotai.org/docs) — Atomic state management for React
- [Redux Persist](https://github.com/rt2zz/redux-persist) — Persist and rehydrate Redux state
- [AsyncStorage Docs](https://react-native-async-storage.github.io/async-storage/) — Persistent key-value storage for React Native
- [React Native Performance: State Management](https://reactnative.dev/docs/performance#state-management) — Performance implications of state management choices
