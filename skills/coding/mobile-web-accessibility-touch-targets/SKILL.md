---
name: mobile-web-accessibility-touch-targets
description: "Implements mobile web accessibility with proper touch target sizing (44/48pt minimum), gesture alternatives, viewport configuration for zoom, orientation support, and screen reader testing methodology for VoiceOver/TalkBack."
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - patterns
    - guidance
  triggers: mobile accessibility, touch targets, VoiceOver, TalkBack, gesture alternatives, viewport meta, touch events, screen reader testing
  related-skills: wcag-21-aa-fundamentals, keyboard-navigation-focus-management
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - desktop-only
    - brainstorming
    - backend
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Mobile Web Accessibility: Touch Targets & Screen Reader Testing

Implements touch-accessible web experiences with proper target sizing (WCAG 2.5.8: 24px minimum, 44/48pt recommended), gesture alternatives for swipe/pinch, viewport meta configuration, orientation support, and mobile screen reader testing (VoiceOver on iOS, TalkBack on Android). Load when building mobile-first interfaces, ensuring accessibility for touch devices, or testing with mobile screen readers.

## TL;DR Checklist

- [ ] Touch targets: minimum 44×44px (CSS pixels) or 24×24px with 8px spacing
- [ ] 8px gap minimum between adjacent touch targets
- [ ] Provide gesture alternatives: single-tap for swipe/pinch/long-press
- [ ] Viewport meta: `viewport-fit=cover, user-scalable=yes` (never disable zoom)
- [ ] Test reflow at 320px width (mobile landscape on small phone)
- [ ] Support device orientation (portrait/landscape/reverse)
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)
- [ ] Text resizable to 200% without loss of functionality
- [ ] Touch events and pointer events both supported

---

## When to Use

Use this skill when:

- Building responsive mobile interfaces
- Ensuring touch targets meet WCAG 2.5.8 requirements
- Implementing gesture-based interactions (swipe, pinch, drag)
- Testing with mobile screen readers (VoiceOver/TalkBack)
- Optimizing for small screens (320px width)
- Supporting multiple device orientations

---

## When NOT to Use

Avoid this skill for:

- Desktop-only experiences (use general accessibility skills)
- Touch event technical reference (use MDN/browser docs)
- Mobile UI design (use design/UX skills)
- iOS/Android native app development (different platforms)

---

## Core Workflow

1. **Size Touch Targets** — Ensure all interactive elements 44×44px minimum (CSS pixels)
2. **Add Spacing** — Maintain 8px gap between adjacent targets
3. **Configure Viewport** — Set viewport meta for zoom support and reflow
4. **Support Gestures** — Provide single-tap alternatives to swipe/pinch
5. **Test Orientation** — Verify portrait/landscape work correctly
6. **Test with Screen Readers** — VoiceOver (iOS), TalkBack (Android)
7. **Test at 320px** — Verify mobile landscape small phone works
8. **Test Text Resizing** — 200% text scale without overflow/loss

---

## Touch Target Sizing

### Minimum Size Requirement

WCAG 2.1 SC 2.5.5 (Enhanced, AAA): **44×44 CSS pixels** minimum.
WCAG 2.2 SC 2.5.8 (AA): **24×24 CSS pixels** minimum, but with **8px gap** between adjacent targets.

**Recommendation for AA compliance (most common):**
- **44×44px minimum** (no gap math needed)
- **48×48px recommended** (larger on mobile)
- **8px gap** between adjacent targets

### Implementation

```css
/* ✅ GOOD: Touch target sizing -->
button,
[role="button"],
input[type="checkbox"],
input[type="radio"] {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Form inputs -->
input[type="text"],
input[type="email"],
input[type="password"],
textarea,
select {
  min-height: 44px;
  padding: 8px 12px;
}

/* Icon buttons with implicit padding -->
.icon-button {
  min-height: 48px;
  min-width: 48px;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Toolbar with spacing between items -->
.toolbar {
  display: flex;
  gap: 8px; /* Minimum gap between adjacent targets */
}

/* ❌ BAD: Too small for touch -->
button { height: 32px; width: 32px; }

/* ❌ BAD: No gap between targets -->
.nav-item {
  display: inline-block;
  width: 40px;
  /* Adjacent items touch — hard to target */
}
```

### Touch Target Calculator

For elements smaller than 44px, use 8px gap:

```
Target 1: 32px
Target 2: 32px
Gap: 8px
Total space: 32 + 8 + 32 = 72px (or stack vertically)
```

For multiple adjacent targets:

```html
<!-- ✅ GOOD: Spaced buttons for touch -->
<div style="display: flex; gap: 8px;">
  <button>Action 1</button>
  <button>Action 2</button>
  <button>Action 3</button>
</div>

<!-- ✅ GOOD: Icon buttons with implicit padding -->
<div style="display: flex; gap: 4px;">
  <button style="padding: 12px;">
    <svg><!-- icon --></svg>
  </button>
  <button style="padding: 12px;">
    <svg><!-- icon --></svg>
  </button>
</div>

<!-- ❌ BAD: Targets too close -->
<div style="display: flex;">
  <button style="padding: 2px;">A</button>
  <button style="padding: 2px;">B</button>
</div>
```

---

## Viewport Configuration

### Viewport Meta Tag

```html
<!-- ✅ GOOD: Allow user zoom, support full-width layouts -->
<meta name="viewport" content="
  width=device-width,
  initial-scale=1,
  viewport-fit=cover,
  user-scalable=yes,
  maximum-scale=5
">

<!-- ❌ BAD: Disable zoom (violates WCAG) -->
<meta name="viewport" content="
  width=device-width,
  initial-scale=1,
  user-scalable=no,
  maximum-scale=1
">
```

### Viewport Properties Explained

| Property | Value | Purpose |
|----------|-------|---------|
| `width` | `device-width` | Match device width (responsive) |
| `initial-scale` | `1` | Don't pre-zoom (let user decide) |
| `viewport-fit` | `cover` | Use notch/safe area (iPhone X+) |
| `user-scalable` | `yes` | Allow pinch-to-zoom (required) |
| `maximum-scale` | `5` | Allow zoom to 500% minimum |

---

## Responsive Design at Small Viewports

### Testing at 320px Width

```css
/* Mobile-first approach -->
@media (min-width: 320px) {
  /* Base styles: single column, full-width buttons */
  body { font-size: 16px; }
  button { width: 100%; }
  .card { width: 100%; }
}

@media (min-width: 640px) {
  /* Tablet: two-column layout */
  .grid { display: grid; grid-template-columns: 1fr 1fr; }
}

@media (min-width: 1024px) {
  /* Desktop: wider layout */
  .grid { grid-template-columns: repeat(3, 1fr); }
}

/* Ensure no horizontal scrolling at any width -->
* {
  max-width: 100%;
  overflow-x: hidden; /* Last resort, fix layout instead */
}
```

### Orientation Support

```css
/* Detect portrait vs landscape */
@media (orientation: portrait) {
  /* Portrait-specific styles */
  .sidebar { display: block; }
}

@media (orientation: landscape) {
  /* Landscape-specific styles */
  .sidebar { display: none; } /* Or sidebar layout */
}

/* Safe area support (notches on modern phones) */
@supports (padding: max(0px)) {
  body {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
    padding-top: max(16px, env(safe-area-inset-top));
  }
}
```

---

## Gesture Implementation Patterns

### Pattern 1: Swipe-to-Dismiss with Tap Alternative

```typescript
import { useState, useRef, useEffect } from 'react';

interface SwipeDismissProps {
  onDismiss: () => void;
  children: React.ReactNode;
}

export function SwipeDismiss({ onDismiss, children }: SwipeDismissProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    // Swipe left > 100px to dismiss
    if (diff > 100) {
      onDismiss();
    }
  };

  return (
    <div
      ref={ref}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="swipe-container"
    >
      <div className="swipe-content">{children}</div>
      
      {/* Tap to dismiss alternative (required for accessibility) */}
      <button
        className="dismiss-button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}

// Usage
export function NotificationDemo() {
  const [show, setShow] = useState(true);

  return (
    show && (
      <SwipeDismiss onDismiss={() => setShow(false)}>
        <p>Swipe left or tap X to dismiss</p>
      </SwipeDismiss>
    )
  );
}
```

### Pattern 2: Pinch-to-Zoom Alternative

```typescript
import { useState, useRef } from 'react';

interface PinchZoomProps {
  children: React.ReactNode;
}

export function PinchZoom({ children }: PinchZoomProps) {
  const [scale, setScale] = useState(1);
  const startDistanceRef = useRef(0);

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      startDistanceRef.current = getDistance(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && startDistanceRef.current > 0) {
      const currentDistance = getDistance(e.touches);
      const scaleChange = currentDistance / startDistanceRef.current;
      
      // Limit zoom between 1x and 3x
      const newScale = Math.min(3, Math.max(1, scale * scaleChange));
      setScale(newScale);
      startDistanceRef.current = currentDistance;
    }
  };

  const handleTouchEnd = () => {
    startDistanceRef.current = 0;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="pinch-container"
      style={{ transform: `scale(${scale})` }}
    >
      {children}
      
      {/* Zoom buttons for non-touch or accessibility */}
      <div className="zoom-controls">
        <button onClick={() => setScale(Math.max(1, scale - 0.1))} aria-label="Zoom out">
          −
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(Math.min(3, scale + 0.1))} aria-label="Zoom in">
          +
        </button>
      </div>
    </div>
  );
}
```

### Pattern 3: Long-Press with Tap Alternative

```typescript
import { useState, useRef } from 'react';

interface LongPressProps {
  onLongPress: () => void;
  onTap: () => void;
  duration?: number;
  children: React.ReactNode;
}

export function LongPressButton({
  onLongPress,
  onTap,
  duration = 500,
  children,
}: LongPressProps) {
  const timerRef = useRef<NodeJS.Timeout>();
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, duration);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isPressed) {
      onTap();
    }
    setIsPressed(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`long-press-button ${isPressed ? 'pressed' : ''}`}
    >
      {children}
      
      {/* Explicit button for non-touch/accessibility */}
      <button onClick={onLongPress} aria-label="Show more options">
        ⋮
      </button>
    </div>
  );
}
```

---

## Mobile Screen Reader Testing

### VoiceOver (iOS)

**Enable:** Settings → Accessibility → VoiceOver (toggle on)

**Essential gestures:**
- **Single tap**: Select/focus element
- **Two-finger Z**: Undo
- **Two-finger double-tap**: Activate selected element
- **Swipe up/down**: Navigate by heading/landmark/etc.
- **Flick right/left**: Next/previous item
- **Rotor**: Swipe up then right/left to navigate by type

**Testing checklist:**
- [ ] All interactive elements focusable (two-finger double-tap activates)
- [ ] Form labels announced
- [ ] Error messages announced as alerts
- [ ] Headings form logical outline
- [ ] Landmarks (nav, main, footer) navigate correctly
- [ ] Focus order logical

**Test commands:**
```bash
# Simulate VoiceOver focus for visual inspection
# (when VoiceOver on, iOS announces everything)
# Test actual device for authentic experience
```

### TalkBack (Android)

**Enable:** Settings → Accessibility → TalkBack (toggle on)

**Essential gestures:**
- **Single tap**: Focus element
- **Double tap**: Activate focused element
- **Swipe left/right**: Next/previous item
- **Swipe down/up**: Depends on reading control mode
- **Two-finger tap**: Toggle reading/pause
- **Swipe down then right**: Open reading controls

**Testing checklist:**
- [ ] Touch exploration works (touch anywhere, TalkBack announces)
- [ ] Button/link activation works (double-tap to activate)
- [ ] Form inputs readable and writable
- [ ] Page structure clear (headings, sections announced)
- [ ] No info conveyed by color alone

### Testing Methodology

1. **Enable screen reader** (VoiceOver or TalkBack)
2. **Close eyes or use external screen reader** (more authentic)
3. **Navigate entire page** using screen reader only
4. **Verify announcements**:
   - Element names (button "Submit", heading "Contact Us")
   - Element types (button, link, heading)
   - Element states (selected, disabled, required)
   - Form field associations (label + input = one unit)
5. **Test interactive features** (forms, menus, dialogs)
6. **Verify no screen reader only content** (all content accessible)

---

## Touch Event Patterns

### Pattern: Touch Events with Mouse Fallback

```typescript
interface TouchableProps {
  onPress: () => void;
  children: React.ReactNode;
}

export function Touchable({ onPress, children }: TouchableProps) {
  return (
    <button
      onClick={onPress}  // Mouse/pointer support
      onTouchEnd={onPress}  // Touch support
      className="touchable"
    >
      {children}
    </button>
  );
}
```

### Pattern: Pointer Events (Modern Approach)

```typescript
interface PointerTouchProps {
  onPointerDown: () => void;
  onPointerUp: () => void;
  children: React.ReactNode;
}

export function PointerTouch({
  onPointerDown,
  onPointerUp,
  children,
}: PointerTouchProps) {
  return (
    <button
      onPointerDown={onPointerDown}  // Unifies mouse/touch/pen
      onPointerUp={onPointerUp}
      className="pointer-touchable"
    >
      {children}
    </button>
  );
}
```

---

## Constraints

### MUST DO

- Ensure all touch targets minimum 44×44px (CSS pixels)
- Maintain 8px gap between adjacent interactive elements
- Never disable user zoom (viewport `user-scalable=yes`)
- Support device rotation (portrait/landscape)
- Test text resize to 200% without loss of functionality
- Provide single-tap alternative to swipe/pinch/long-press
- Test with VoiceOver (iOS) and TalkBack (Android)
- Ensure minimum 16px font size for readable text
- Support orientation lock notification (Safari iOS)

### MUST NOT DO

- Set `user-scalable=no` (disables accessibility zoom)
- Use `maximum-scale=1` (prevents zoom)
- Create targets smaller than 44×44px without spacing
- Implement gesture-only interactions without fallbacks
- Assume touch behavior works same as mouse
- Skip mobile screen reader testing
- Ignore safe area on notched devices
- Leave app unresponsive on landscape/portrait switch

---

## Mobile Accessibility Checklist

**Layout & Sizing:**
- [ ] Touch targets 44×44px minimum
- [ ] 8px spacing between adjacent targets
- [ ] No horizontal scrolling at 320px width
- [ ] Reflows correctly at 200% text zoom
- [ ] Safe area respected (notches, home indicators)

**Interaction:**
- [ ] All gestures have single-tap alternatives
- [ ] Swipe → button or menu
- [ ] Pinch-zoom → zoom buttons
- [ ] Long-press → tap + hold visual or button
- [ ] Touch events trigger on `touchend`, not `touchstart`

**Screen Reader (VoiceOver/TalkBack):**
- [ ] All content discoverable
- [ ] Forms labeled and grouped
- [ ] Errors announced as alerts
- [ ] Focus order logical
- [ ] Landmarks navigate structure

**Zoom & Text:**
- [ ] User can zoom to 200% minimum
- [ ] Text resizable in browser settings
- [ ] No fixed viewport scales
- [ ] Content doesn't overflow when zoomed

---

## Testing Tools

| Tool | Platform | Purpose |
|------|----------|---------|
| **VoiceOver** | iOS/macOS | Apple screen reader (built-in) |
| **TalkBack** | Android | Google screen reader (built-in) |
| **axe DevTools** | Chrome/Firefox | Accessibility audit on mobile |
| **WAVE** | Firefox | Visual accessibility feedback |
| **Chrome DevTools** | Chrome | Device emulation, touch simulation |
| **Lighthouse** | Chrome | Mobile accessibility audit |

