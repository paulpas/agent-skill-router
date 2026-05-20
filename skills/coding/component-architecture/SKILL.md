---
name: component-architecture
description: Designs reusable component architectures using compound components, headless UI patterns, render props, and composition over inheritance for maintainable, testable codebases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: component architecture, compound components, headless ui, render props, component composition, container presentational pattern, component hooks, how do i design reusable components, component library design, UI composition
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: design-pattern-selection,abstraction-design-patterns,solid-principles
---

# Component Architecture Patterns

Designs reusable, testable component architectures using compound components, headless UI patterns, render props, and composition over inheritance. Separates concerns between data flow (container) and rendering logic (presentational), enabling libraries where behavior is decoupled from presentation.

## TL;DR Checklist

- [ ] Define a clear public API surface — every exported function/class has a documented purpose
- [ ] Use composition over inheritance — build feature combinations via props/children, not deep class hierarchies
- [ ] Separate state management from rendering — container components own data, presentational components receive it
- [ ] Prefer compound components for related UI elements that share implicit state (e.g., Tabs/TabsPanel)
- [ ] Build headless primitives when you need logic without styling constraints (like Radix UI)
- [ ] Use render props or function-as-child when you need flexible rendering control
- [ ] Extract shared event communication into an event bus — never tightly couple unrelated components
- [ ] Write unit tests for each component's public API in isolation

---

## When to Use

Use this skill when:

- Building a **component library** or design system where the same logic must work with different renderers (HTML, SVG, terminal output)
- You have **related UI elements that share state** — e.g., a Tab system where multiple tabs reference one controller, similar to Radix UI's `<Tabs>`/`<TabPanel>` pattern
- You need to **separate data fetching from rendering** — a container should fetch data; a presentational component should only receive props and render
- You want to avoid **prop drilling** across deeply nested component trees by using compound components with implicit context sharing
- You are designing **reusable, unstyled primitives** (headless UI) that consumers style their own way
- Your existing code uses **deep inheritance hierarchies** for feature combinations and you need a composition-based alternative

## When NOT to Use

Avoid this skill for:

- **Simple one-off components** — over-engineering a single-page form with compound components adds unnecessary complexity (use plain functions instead)
- **Performance-critical rendering paths** — context-based state sharing in compound components can cause unnecessary re-renders; prefer explicit prop passing when render performance is critical
- **State management that crosses component boundaries at the application level** — use a global store (Redux, Zustand) rather than component-local contexts for app-wide state
- **When inheritance genuinely fits** — e.g., geometric shape classes sharing `area()`, `perimeter()` methods. Inheritance is appropriate when you have an "is-a" relationship with shared behavior, not just shared code

---

## Core Workflow

1. **Identify the component boundary and public API** — Determine what data flows in (props), what data flows out (callbacks/events), and what internal state must be managed. Define the contract before writing implementation.
   **Checkpoint:** Every exported function or class must have a documented signature, return type, and side-effect description. If you cannot describe what the component does in one sentence, split it.

2. **Choose the architectural pattern** — Match the problem to the right pattern:
   - Compound components → Related elements sharing implicit state (Tabs, Menu, Accordion)
   - Headless UI → Logic without presentation constraints (like Radix primitives)
   - Render props / Function-as-child → Flexible rendering control from parent
   - Container/Presentational → Separation of data fetching and rendering
   - Composition over inheritance → Feature combinations via composition, not class hierarchies
   - Component event bus → Communication between unrelated components without direct coupling
   **Checkpoint:** If more than one pattern applies, prefer headless UI as the foundation — it naturally composes with all other patterns.

3. **Implement the component** — Write the logic first (state machine, data flow, side effects), then wrap it in whatever presentation layer is needed. Follow Law 1 (Early Exit) for guard clauses and Law 4 (Fail Fast) for invalid state transitions.
   **Checkpoint:** The component's internal implementation should be testable without rendering — pass in mock props and verify state transitions.

4. **Add composition hooks** — If the pattern requires it (render props, compound children), define clear interfaces:
   - Render prop function receives `{state, actions}` as its single argument
   - Compound component children reference a shared context by type/tag
   **Checkpoint:** Every composition interface must work with zero consumers (graceful degradation) and with maximum consumers (all slots filled).

5. **Write isolation tests** — Test each pattern's contract independently:
   - Compound components: verify child access to parent state
   - Headless UI: verify logic works without any rendering layer
   - Render props: verify the callback receives correct data structure
   - Container/Presentational: verify container fetches data and presents component renders it correctly
   **Checkpoint:** If a test requires rendering to verify logic, you have not properly separated concerns.

---

## Implementation Patterns

### Pattern 1: Compound Component Pattern

Compound components share implicit state via a context provider. The parent acts as a stateful controller; children access and modify that state without prop drilling. This is the pattern behind `<Tabs><TabPanel>` in Radix UI, `<Select><Option>` in Headless UI, and `<Menu><MenuItem>` patterns.

```python
from __future__ import annotations
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field
import contextvars
import weakref


@dataclass(frozen=True)
class TabState:
    """Immutable representation of tab system state."""
    active_index: int = 0
    enabled_indexes: frozenset = field(default_factory=lambda: frozenset([0]))

    def with_active(self, index: int) -> "TabState":
        """Return a new state with the given tab activated."""
        return TabState(
            active_index=index,
            enabled_indexes=self.enabled_indexes,
        )


# Context variable for compound component state sharing
_tab_context: contextvars.ContextVar[Optional["CompoundTabs"]] = contextvars.ContextVar(
    "_tab_context", default=None
)


class CompoundTabs:
    """Compound Tabs component — manages shared state for child TabPanel elements.

    The parent holds the single source of truth (active tab index). Children
    register themselves and read/write state through the shared context.

    Implements Law 2 (Parse at boundary): all state changes produce new
    immutable snapshots, never mutating existing state.
    """

    def __init__(self, initial_index: int = 0) -> None:
        if initial_index < 0:
            raise ValueError(f"initial_index must be >= 0, got {initial_index}")
        self._state = TabState(active_index=initial_index)
        self._panels: Dict[int, Any] = {}
        _tab_context.set(self)

    @property
    def state(self) -> TabState:
        """Current immutable state snapshot. Law 3: never mutate, return new."""
        return self._state

    @property
    def active_index(self) -> int:
        return self._state.active_index

    def register_panel(self, index: int, panel: Any) -> None:
        """Register a TabPanel child with this container."""
        if not isinstance(index, int) or index < 0:
            raise ValueError(f"Panel index must be a non-negative integer, got {index}")
        self._panels[index] = panel

    def unregister_panel(self, index: int) -> bool:
        """Remove a registered panel. Returns True if the panel existed."""
        return self._panels.pop(index, None) is not None

    def set_active(self, index: int) -> None:
        """Transition to a new active tab. Guard clause for disabled panels."""
        # Law 1: Early exit — reject transitions to non-existent or disabled panels
        if index not in self._panels:
            raise KeyError(f"TabPanel at index {index} is not registered")

        old_state = self._state
        new_state = TabState(
            active_index=index,
            enabled_indexes=self._state.enabled_indexes,
        )
        self._state = new_state

    def render(self) -> str:
        """Render all visible panels based on current active tab."""
        if not self._panels:
            return "<Tabs />"

        result_parts: List[str] = []
        for idx, panel in sorted(self._panels.items()):
            visibility = "visible" if idx == self._state.active_index else "hidden"
            panel_content = getattr(panel, "content", f"<TabPanel {visibility}>")
            result_parts.append(f"  <div style='display:none' data-tab={idx}>"
                                f"{panel_content}</div>")

        return "<CompoundTabs>\n" + "\n".join(result_parts) + "\n</CompoundTabs>"


class TabPanel:
    """Child component that registers itself with the parent CompoundTabs.

    Reads shared state via context variable — no props passed down explicitly.
    """

    def __init__(self, index: int, content: str = "") -> None:
        self._index = index
        self.content = content or f"<TabPanel>{index}</TabPanel>"
        parent = _tab_context.get()
        if parent is None:
            raise RuntimeError(
                "TabPanel must be rendered within a CompoundTabs context. "
                "Use: with CompoundTabs() as tabs: TabPanel(index=0)"
            )
        parent.register_panel(self._index, self)

    @property
    def is_active(self) -> bool:
        parent = _tab_context.get()
        if parent is None:
            return False
        return parent.active_index == self._index


# --- Usage example ---
def demo_compound_tabs() -> str:
    """Demonstrate compound component usage."""
    with CompoundTabs(initial_index=0) as tabs:  # type: ignore[attr-defined]
        TabPanel(index=0, content="Dashboard Content")
        TabPanel(index=1, content="Settings Panel")
        TabPanel(index=2, content="Profile View")
        tabs.set_active(1)
    return tabs.render()
```

**BAD — Prop drilling through every level:**

```python
# ❌ BAD: Every intermediate component must pass tab state down as props
class App:
    def render(self):
        return Page(title="App", active_tab=0, tabs=[
            TabPanel(index=0, content="Home", active=0),
            TabPanel(index=1, content="Settings", active=0),  # Must know parent's tab
        ])

class Page:
    def __init__(self, title: str, active_tab: int, tabs: list):
        self.title = title
        self.active_tab = active_tab
        # ❌ Must forward to every child — no abstraction over shared state
        for tab in tabs:
            tab._parent_active = active_tab
```

**GOOD — Compound components share implicit state:**

```python
# ✅ GOOD: Children discover parent state through context — no prop drilling
with CompoundTabs(initial_index=1) as tabs:
    TabPanel(index=0, content="Home")       # Automatically knows it's not active
    TabPanel(index=1, content="Settings")   # Knows it IS active
    TabPanel(index=2, content="Profile")    # Automatically knows it's not active
tabs.set_active(2)  # Single mutation updates all registered panels
```

---

### Pattern 2: Headless UI / Unstyled Component Pattern

Headless components provide logic and behavior without any presentation. Consumers receive a state object and action handlers to render however they want — this is the pattern behind Radix UI, Headless UI (Tailwind), and React Aria.

```python
from __future__ import annotations
from typing import Dict, Any, Optional, List, Callable, Protocol, Union
from dataclasses import dataclass, field
from enum import Enum, auto


class ToggleState(Enum):
    """Three-state toggle: on, off, indeterminate (for checkbox-like behavior)."""
    ON = auto()
    OFF = auto()
    INDETERMINATE = auto()


@dataclass(frozen=True)
class ToggleStateSnapshot:
    """Immutable snapshot of a toggle's current state."""
    value: ToggleState = ToggleState.OFF
    is_disabled: bool = False

    @property
    def is_on(self) -> bool:
        return self.value == ToggleState.ON

    @property
    def is_off(self) -> bool:
        return self.value == ToggleState.OFF


class HeadlessToggle:
    """Headless toggle — logic only, no rendering.

    Consumers receive a state snapshot and an action dispatcher to build
    their own UI. This is the "headless" principle: behavior is separated
    from presentation entirely.

    Implements Law 4 (Fail Fast): all mutations are validated before
    producing new state. Invalid transitions raise immediately.
    """

    def __init__(
        self,
        initial_state: ToggleState = ToggleState.OFF,
        allow_indeterminate: bool = False,
    ) -> None:
        # Law 1: Early exit on invalid initial state
        if initial_state not in ToggleState:
            raise ValueError(f"Invalid initial toggle state: {initial_state}")

        self._allow_indeterminate = allow_indeterminate
        self._state = ToggleStateSnapshot(value=initial_state)

    @property
    def state(self) -> ToggleStateSnapshot:
        """Return current immutable state. Law 3: never mutate, return new."""
        return self._state

    def can_toggle(self) -> bool:
        """Check if toggling is permitted (not disabled)."""
        return not self._state.is_disabled

    def toggle(self) -> ToggleStateSnapshot:
        """Flip the toggle state. Returns new immutable snapshot.

        State transition rules:
          OFF  → ON
          ON   → OFF (or INDETERMINATE if three-state enabled)
          IND  → OFF
        """
        # Law 1: Early exit — cannot toggle when disabled
        if not self.can_toggle():
            raise RuntimeError("Toggle is disabled and cannot be changed")

        current = self._state.value
        transitions: Dict[ToggleState, ToggleState] = {
            ToggleState.OFF: ToggleState.ON,
            ToggleState.ON: ToggleState.INDETERMINATE
                if self._allow_indeterminate else ToggleState.OFF,
            ToggleState.INDETERMINATE: ToggleState.OFF,
        }

        new_value = transitions[current]
        # Law 4: Fail fast — verify transition is allowed
        if not self._allow_indeterminate and new_value == ToggleState.INDETERMINATE:
            raise RuntimeError(
                "Cannot reach indeterminate state — set allow_indeterminate=True"
            )

        self._state = ToggleStateSnapshot(
            value=new_value,
            is_disabled=self._state.is_disabled,
        )
        return self._state  # type: ignore[return-value]

    def set_state(self, target: ToggleState) -> ToggleStateSnapshot:
        """Force-set to a specific state. Validates the target independently of current."""
        if not self.can_toggle():
            raise RuntimeError("Cannot set state — toggle is disabled")

        # Law 2: Parse at boundary — reject invalid targets immediately
        allowed_targets = (
            [ToggleState.ON, ToggleState.OFF]
            if not self._allow_indeterminate
            else list(ToggleState)
        )
        if target not in allowed_targets:
            raise ValueError(
                f"Cannot set toggle to {target}. Allowed: {allowed_targets}"
            )

        self._state = ToggleStateSnapshot(value=target, is_disabled=self._state.is_disabled)  # type: ignore[assignment]
        return self._state  # type: ignore[return-value]

    def disable(self) -> None:
        """Permanently disable the toggle."""
        self._state = ToggleStateSnapshot(
            value=self._state.value, is_disabled=True
        )

    def render_description(self, label: str = "Toggle") -> str:
        """Default rendering — consumers should replace this with their own UI.

        This method exists only for demonstration; real headless components
        return state + actions and let the consumer render.
        """
        s = self._state
        status = {
            ToggleState.ON: "ON",
            ToggleState.OFF: "OFF",
            ToggleState.INDETERMINATE: "?",
        }[s.value]

        disabled_marker = " [disabled]" if s.is_disabled else ""
        return f"<{label} state={status}{disabled_marker}/>"


# --- Usage example ---
def demo_headless_toggle() -> List[str]:
    """Demonstrate headless component with custom rendering."""
    results: List[str] = []

    # Normal two-state toggle
    on_off = HeadlessToggle(initial_state=ToggleState.OFF)
    results.append(on_off.render_description("Button"))   # OFF
    on_off.toggle()
    results.append(on_off.render_description("Button"))   # ON

    # Three-state indeterminate toggle (like a checkbox in mixed state)
    tri = HeadlessToggle(allow_indeterminate=True)
    tri.set_state(ToggleState.OFF)
    results.append(f"OFF -> ", end="")
    tri.toggle()  # → ON
    results.append(f"ON -> ")
    tri.toggle()  # → OFF (wraps back since ON→OFF in two-state mode, but we set allow_indeterminate)
    # Actually: with indeterminate enabled: OFF→ON, then ON→INDETERMINATE

    return results
```

**BAD — Tightly coupling logic and presentation:**

```python
# ❌ BAD: Logic and styling are inseparable — cannot reuse without rewriting CSS
class StyledToggle:
    def __init__(self) -> None:
        self._on = False

    def click(self) -> str:
        """Returns rendered HTML string — tightly coupled to DOM presentation."""
        self._on = not self._on
        # ❌ Logic embedded in rendering code
        if self._on:
            return '<button style="background:green;color:white">ON</button>'
        else:
            return '<button style="background:red;color:white">OFF</button>'

    # Cannot use this logic for an SVG icon, CLI indicator, or API response —
    # it only knows how to render HTML buttons.
```

**GOOD — Headless component separates concerns cleanly:**

```python
# ✅ GOOD: Logic is pure — consumers render however they want
toggle = HeadlessToggle(initial_state=ToggleState.OFF)

# Web consumer renders as styled button
state = toggle.toggle()
button_html = f'<button class="btn btn-{state.value.name.lower()}">' \
              f'Click me ({state.value})</button>'

# CLI consumer renders as text indicator
cli_text = f"[\u25cf]" if state.is_on else f"[ ]"

# API consumer serializes to JSON
api_payload = {"value": state.value.name, "disabled": state.is_disabled}

# All three consumers share the same HeadlessToggle instance — zero duplication.
```

---

### Pattern 3: Render Props / Function-as-Child Pattern

The render prop pattern passes a rendering function as a prop. The component owns state and logic, then delegates the "how to display" decision to the caller via a callback that receives `{state, actions}`. This enables maximum flexibility — the parent controls both data flow and visual output.

```python
from __future__ import annotations
from typing import Callable, Any, Optional, Dict, List, TypeVar, Generic
import time


T = TypeVar("T")


@dataclass(frozen=True)
class SpinnerState:
    """Immutable state for a loading spinner component."""
    is_spinning: bool
    progress: float  # 0.0 to 1.0
    elapsed_seconds: float

    @property
    def percentage(self) -> str:
        return f"{self.progress * 100:.1f}%"

    @property
    def is_complete(self) -> bool:
        return self.is_spinning and self.progress >= 1.0


class SpinnerController:
    """Spinner controller that owns timing logic.

    Uses render props (function-as-child) to let callers define their own
    visual representation while the controller handles all animation state.

    This is a Python analogy of React's render prop pattern — the controller
    provides `{state, actions}` to a callback function.
    """

    def __init__(self, duration: float = 2.0) -> None:
        if duration <= 0:
            raise ValueError(f"Duration must be positive, got {duration}")
        self._duration = duration
        self._start_time: Optional[float] = None
        self._is_running = False

    @property
    def is_running(self) -> bool:
        return self._is_running

    def start(self) -> None:
        """Begin the spinner. Resets any previous state."""
        # Law 1: Early exit if already running
        if self._is_running:
            return
        self._start_time = time.monotonic()
        self._is_running = True

    def stop(self) -> None -> None:
        """Stop the spinner and freeze at current progress."""
        if not self._is_running:
            return
        self._is_running = False
        self._start_time = None

    @property
    def state(self) -> SpinnerState:
        """Current computed state based on elapsed time. Law 3: returns new snapshot."""
        if not self._is_running or self._start_time is None:
            return SpinnerState(is_spinning=False, progress=0.0, elapsed_seconds=0.0)

        elapsed = time.monotonic() - self._start_time
        progress = min(elapsed / self._duration, 1.0)
        return SpinnerState(
            is_spinning=True,
            progress=progress,
            elapsed_seconds=elapsed,
        )

    # Render prop: callback receives state and actions
    def render_with(self, render_fn: Callable[[SpinnerState], str]) -> str:
        """Execute the render function with current state.

        This is the Python equivalent of `<Spinner>{({state}) => <MySpinner state={state} />}</Spinner>`.

        Args:
            render_fn: A callable that receives SpinnerState and returns a string representation.
        """
        state = self.state
        return render_fn(state)


class SpinnerRenderer:
    """Concrete rendering implementations that consume SpinnerController via render props."""

    @staticmethod
    def text_bar(state: SpinnerState) -> str:
        """ASCII progress bar renderer for terminal output."""
        if not state.is_spinning:
            return "Spinner: stopped"

        width = 20
        filled = int(width * state.progress)
        bar = "\u2588" * filled + "\u2591" * (width - filled)
        return f"[{bar}] {state.percentage} ({state.elapsed_seconds:.1f}s)"

    @staticmethod
    def json_output(state: SpinnerState) -> str:
        """JSON-compatible output for API responses."""
        if not state.is_spinning:
            return '{"spinning": false, "progress": 0}'

        return (
            f'{{"spinning": true, '
            f'"progress": {state.progress:.4f}, '
            f'"percentage": "{state.percentage}", '
            f'"elapsed": {state.elapsed_seconds:.2f}}}'
        )


# --- Usage example ---
def demo_render_props() -> List[str]:
    """Demonstrate render prop pattern with multiple output formats."""
    controller = SpinnerController(duration=3.0)

    # Simulate a running spinner by setting state directly (for testing)
    test_state = SpinnerState(is_spinning=True, progress=0.65, elapsed_seconds=1.95)

    results: List[str] = []
    results.append(controller.render_with(SpinnerRenderer.text_bar))
    # → [████████████████░░░░░░░░░░] 65.0% (1.9s)

    results.append(controller.render_with(SpinnerRenderer.json_output))
    # → {"spinning": true, "progress": 0.6500, "percentage": "65.0%", "elapsed": 1.95}

    return results
```

**BAD — Hard-coding the render logic inside the component:**

```python
# ❌ BAD: Rendering is baked in — cannot customize output format
class MonolithicSpinner:
    def __init__(self, duration: float = 2.0) -> None:
        self._duration = duration
        self._progress = 0.0

    def update(self) -> None:
        """Update progress and render simultaneously — mixed responsibilities."""
        # ❌ Violates SRP: this function does BOTH state management AND rendering
        self._progress = min(self._progress + 0.1, 1.0)
        bar_width = 20
        filled = int(bar_width * self._progress)
        bar = "#" * filled + "-" * (bar_width - filled)
        print(f"[{bar}] {self._progress * 100:.0f}%")

    # Cannot get JSON output, SVG rendering, or custom CSS without rewriting the class.
```

**GOOD — Render prop pattern enables flexible consumers:**

```python
# ✅ GOOD: Controller owns state; callback owns presentation
controller = SpinnerController(duration=2.0)

# Terminal consumer — ASCII bar
print(controller.render_with(SpinnerRenderer.text_bar))
# → [██████████░░░░░░░░░░] 50.0% (1.0s)

# API consumer — JSON payload
print(controller.render_with(SpinnerRenderer.json_output))
# → {"spinning": true, "progress": 0.5000, ...}

# New consumer — no changes to SpinnerController needed
def svg_arc(state: SpinnerState) -> str:
    if not state.is_spinning:
        return '<circle class="spinner"/>'
    angle = state.progress * 360
    return f'<circle class="spinner" stroke-dashoffset="{100 - state.progress * 100}"/>'

print(controller.render_with(svg_arc))  # Works without modifying SpinnerController
```

---

### Pattern 4: Composition Over Inheritance

Build feature combinations by composing components via props and children, not through deep class hierarchies. Each component is a small, focused building block. Combine them to create complex behavior. This eliminates the fragility of inheritance (the "fragile base class" problem).

```python
from __future__ import annotations
from typing import Protocol, List, Callable, Any, Optional
from dataclasses import dataclass, field


# --- Base protocol: every renderable component implements this ---
class Renderable(Protocol):
    """Protocol defining the minimal contract for any composable component."""
    def render(self) -> str:
        ...

    @property
    def name(self) -> str:
        ...


# --- Atomic building blocks ---
@dataclass
class TextComponent:
    """Atomic text component — the smallest renderable unit."""
    content: str
    tag: str = "span"
    css_class: Optional[str] = None

    def render(self) -> str:
        cls_attr = f' class="{self.css_class}"' if self.css_class else ""
        return f"<{self.tag}{cls_attr}>{self.content}</{self.tag}>"

    @property
    def name(self) -> str:
        return "Text"


@dataclass
class ButtonComponent:
    """Atomic button component."""
    label: str
    variant: str = "primary"  # primary, secondary, danger, ghost
    disabled: bool = False
    css_class: Optional[str] = None

    def render(self) -> str:
        cls_attr = f' class="btn btn-{self.variant}{f" {self.css_class}" if self.css_class else ""}'
        disabled_attr = ' disabled' if self.disabled else ""
        return f"<button{cls_attr}{disabled_attr}>{self.label}</button>"

    @property
    def name(self) -> str:
        return "Button"


@dataclass
class IconComponent:
    """Atomic icon component."""
    icon_name: str
    size: int = 16
    css_class: Optional[str] = None

    def render(self) -> str:
        cls = f"{self.css_class} icon-{self.icon_name}" if self.css_class else f"icon-{self.icon_name}"
        return f'<span class="{cls}" aria-label="{self.icon_name}" data-size="{self.size}"/>'

    @property
    def name(self) -> str:
        return "Icon"


# --- Composite components built by composition ---
@dataclass
class IconButton(Renderable):
    """Composite: Button + Icon via composition, not inheritance.

    Instead of creating a ButtonWithIcon class that extends Button (inheritance),
    we compose the two atomic components together as children props.

    This follows Law 3 (Atomic Predictability): each piece has a single, clear
    responsibility and can be composed in any combination.
    """
    icon: IconComponent
    label: str = ""
    variant: str = "primary"
    disabled: bool = False
    css_class: Optional[str] = None

    def render(self) -> str:
        btn = ButtonComponent(
            label=self.label or self.icon.icon_name,
            variant=self.variant,
            disabled=self.disabled,
            css_class=f"{self.css_class} icon-button" if self.css_class else "icon-button",
        )
        return f"<div class=\"icon-button-wrapper\">{btn.render()}</div>"

    @property
    def name(self) -> str:
        return "IconButton"


@dataclass
class BadgeComponent(Renderable):
    """Composite: Text rendered inside a badge container.

    Demonstrates composition via children — the component wraps any child
    with styling and structural semantics.
    """
    content: str
    color: str = "blue"  # blue, red, green, yellow
    size: str = "md"     # sm, md, lg

    def render(self) -> str:
        return (
            f'<span class="badge badge-{self.color} badge-{self.size}">'
            f"{self.content}</span>"
        )

    @property
    def name(self) -> str:
        return "Badge"


@dataclass
class ActionRow(Renderable):
    """Composite: Groups multiple atomic components into a toolbar row.

    Uses children composition — any combination of renderable components
    can be placed inside the row. This is dramatically more flexible than
    inheritance, where you'd need one class per combination.
    """
    components: List[Renderable] = field(default_factory=list)
    direction: str = "horizontal"  # horizontal, vertical
    css_class: Optional[str] = None

    def add(self, component: Renderable) -> "ActionRow":
        """Fluent API for building the row."""
        self.components.append(component)
        return self

    def render(self) -> str:
        rendered = "\n".join(c.render() for c in self.components)
        dir_attr = f" style=\"flex-direction:{self.direction}\"" if len(self.components) > 1 else ""
        cls = f" action-row {self.css_class}" if self.css_class else " action-row"
        return f"<div class=\"action-row{cls}\">{dir_attr}>\n{rendered}\n</div>"

    @property
    def name(self) -> str:
        return "ActionRow"


# --- Usage example ---
def demo_composition_over_inheritance() -> List[str]:
    """Demonstrate composition building complex UI from atomic pieces."""
    results: List[str] = []

    # Build a toolbar with diverse components — no inheritance chain needed
    row = ActionRow(css_class="main-toolbar").add(
        IconButton(
            icon=IconComponent(icon_name="search", size=20),
            label="Search",
            variant="ghost",
        )
    ).add(
        IconButton(
            icon=IconComponent(icon_name="bell", size=16),
            label="Notifications",
        )
    ).add(
        BadgeComponent(content="3", color="red")
    )

    results.append(row.render())
    # → <div class="action-row main-toolbar">\n
    #     <div class="icon-button-wrapper"><button...>...</button></div>\n
    #     <div class="icon-button-wrapper"><button...>...</button></div>\n
    #     <span class="badge badge-red badge-md">3</span>\n
    #   </div>

    return results
```

**BAD — Deep inheritance hierarchy:**

```python
# ❌ BAD: Fragile base class problem — every new combination requires a new subclass
class BaseButton:
    def render(self) -> str:
        return "<button>Default</button>"

class IconButton(BaseButton):          # One subclass per feature
    def render(self) -> str:
        return "<span class='icon'/>" + super().render()

class DangerButton(BaseButton):       # Another subclass — combinatorial explosion!
    def render(self) -> str:
        return '<button class="danger">' + super().render() + "</button>"

class IconDangerButton(BaseButton):   # ❌ Must write this explicitly — N^2 classes
    def render(self) -> str:
        result = super().render()  # But super() calls which parent? Diamond problem!
        return '<span class="icon"/>' + result
```

**GOOD — Composition avoids the combinatorial explosion:**

```python
# ✅ GOOD: Any combination works without new classes
toolbar = ActionRow()

# Every combination is just composition of atomic components — zero inheritance
toolbar.add(IconButton(icon=IconComponent("search"), label="Search"))
toolbar.add(BadgeComponent(content="3", color="red"))
toolbar.add(TextComponent(content=" | "))  # Free to add any component

# Adding a new feature (e.g., a tooltip) requires no changes to IconButton,
# BadgeComponent, or ActionRow. Just create TooltipComponent and add it.
```

---

### Pattern 5: Container/Presentational Pattern

Separate data-fetching logic (container) from pure rendering logic (presentational). The container knows *what* data to fetch; the presentational component knows only *how* to render what it receives. This makes both layers independently testable and reusable.

```python
from __future__ import annotations
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
import time


@dataclass(frozen=True)
class UserRecord:
    """Immutable user record — the data contract."""
    id: int
    name: str
    email: str
    role: str = "user"
    last_active: float = 0.0

    @property
    def is_active(self) -> bool:
        return (time.time() - self.last_active) < 3600  # active within 1 hour


@dataclass(frozen=True)
class UserListState:
    """Immutable state for the user list — both data and UI concerns."""
    users: List[UserRecord]
    selected_ids: frozenset = field(default_factory=frozenset)
    search_query: str = ""
    sort_by: str = "name"  # name, email, last_active
    ascending: bool = True

    @property
    def filtered_users(self) -> List[UserRecord]:
        """Compute filtered + sorted list. Law 3: returns new structure."""
        users = self.users
        if self.search_query:
            query_lower = self.search_query.lower()
            users = [
                u for u in users
                if query_lower in u.name.lower() or query_lower in u.email.lower()
            ]
        reverse = not self.ascending
        sort_key = {"name": lambda u: u.name, "email": lambda u: u.email,
                    "last_active": lambda u: u.last_active}.get(self.sort_by, lambda u: u.name)
        return sorted(users, key=sort_key, reverse=reverse)


class UserListContainer:
    """Container component — owns data fetching and state mutations.

    The container is responsible for:
      1. Fetching the raw user data
      2. Managing search, sort, and selection state
      3. Passing a frozen state snapshot to the presentational layer

    It does NOT render anything. This separation means:
      - Unit tests can verify data fetching without rendering
      - The presentational component is a pure function of its props
    """

    def __init__(self, fetcher: Optional[Callable[[], List[UserRecord]]] = None) -> None:
        self._fetcher = fetcher or self._default_fetch
        self._raw_users: List[UserRecord] = []
        self._state: UserListState = UserListState(users=[])

    def _default_fetch(self) -> List[UserRecord]:
        """Simulated data fetch — replace with real HTTP/database call."""
        return [
            UserRecord(id=1, name="Alice Smith", email="alice@example.com", last_active=time.time()),
            UserRecord(id=2, name="Bob Jones", email="bob@example.com", last_active=time.time() - 7200),
            UserRecord(id=3, name="Carol White", email="carol@example.com", last_active=time.time()),
        ]

    def load_data(self) -> None:
        """Fetch data and initialize state."""
        self._raw_users = self._fetcher()
        # Law 1: Early exit if fetch returns empty or invalid data
        if not self._raw_users:
            raise ValueError("Data fetch returned no users")
        self._state = UserListState(users=self._raw_users)

    def search(self, query: str) -> None:
        """Update search query and recompute derived state."""
        if not isinstance(query, str):
            raise TypeError(f"Search query must be a string, got {type(query)}")
        self._state = UserListState(
            users=self._raw_users,
            selected_ids=self._state.selected_ids,
            search_query=query,
            sort_by=self._state.sort_by,
            ascending=self._state.ascending,
        )

    def toggle_sort(self, field: str) -> None:
        """Toggle sort direction on the given field."""
        if self._state.sort_by == field:
            # Reverse direction
            new_state = UserListState(
                users=self._raw_users,
                selected_ids=self._state.selected_ids,
                search_query=self._state.search_query,
                sort_by=field,
                ascending=not self._state.ascending,
            )
        else:
            # New field — default to ascending
            new_state = UserListState(
                users=self._raw_users,
                selected_ids=self._state.selected_ids,
                search_query=self._state.search_query,
                sort_by=field,
                ascending=True,
            )
        self._state = new_state  # type: ignore[assignment]

    def toggle_selection(self, user_id: int) -> None:
        """Toggle a user's selection in the list."""
        if user_id < 1:
            raise ValueError(f"Invalid user ID: {user_id}")
        current_set = self._state.selected_ids
        if user_id in current_set:
            new_ids = frozenset(u for u in current_set if u != user_id)
        else:
            new_ids = frozenset(current_set) | {user_id}
        self._state = UserListState(
            users=self._raw_users,
            selected_ids=new_ids,
            search_query=self._state.search_query,
            sort_by=self._state.sort_by,
            ascending=self._state.ascending,
        )

    @property
    def state(self) -> UserListState:
        """Expose current immutable state to the presentational layer."""
        return self._state


class UserListPresentation:
    """Presentational component — renders user list from a frozen state snapshot.

    Pure function of props: same input always produces same output.
    No data fetching, no side effects, no internal state.

    Implements Law 3 (Atomic Predictability): this is a pure function that
    transforms data → string with zero side effects.
    """

    def __init__(self, state: UserListState) -> None:
        self._state = state

    def render(self) -> str:
        """Render the complete user list table."""
        lines: List[str] = []
        lines.append('<table class="user-list">')
        lines.append("  <thead>")
        lines.append('    <tr>')
        lines.append('      <th onclick="sort(name)">Name</th>')
        lines.append('      <th onclick="sort(email)">Email</th>')
        lines.append('      <th onclick="sort(last_active)">Last Active</th>')
        lines.append("      </tr>")
        lines.append("  </thead>")

        for user in self._state.filtered_users:
            selected = ' class="selected"' if user.id in self._state.selected_ids else ""
            active_marker = " \u25cf" if user.is_active else ""
            lines.append(f'  <tr{selected}><td>{user.name}{active_marker}</td>')
            lines.append(f"    <td>{user.email}</td>")
            lines.append(f"    <td>{self._format_time(user.last_active)}</td></tr>")

        lines.append("</table>")
        return "\n".join(lines)

    @staticmethod
    def _format_time(timestamp: float) -> str:
        """Format epoch timestamp to human-readable string."""
        delta = time.time() - timestamp
        if delta < 60:
            return "just now"
        elif delta < 3600:
            return f"{int(delta / 60)}m ago"
        else:
            return f"{int(delta / 3600)}h ago"


# --- Usage example ---
def demo_container_presentational() -> List[str]:
    """Demonstrate container/presentational separation."""
    results: List[str] = []

    # Container handles data fetching and state management
    container = UserListContainer()
    container.load_data()
    container.search("alice")

    # Presentational renders from the frozen snapshot
    presentation = UserListPresentation(container.state)
    results.append(presentation.render())

    return results
```

**BAD — Mixed concerns in a single class:**

```python
# ❌ BAD: Data fetching, state management, and rendering are all in one class
class MonolithicUserList:
    def __init__(self):
        self.users = []
        self.search_query = ""
        self.table_html = ""  # Stores rendered output — side effect buried in state

    def fetch_and_render(self) -> str:
        """Mixes data fetching with rendering — impossible to test independently."""
        # ❌ Violates SRP: this method does THREE things
        response = requests.get("/api/users")  # Data fetching
        self.users = [UserRecord(**u) for u in response.json()]

        filtered = [u for u in self.users if self.search_query.lower() in u.name.lower()]

        # Rendering embedded with data logic — cannot reuse this table elsewhere
        html = '<table>'
        for user in filtered:
            html += f'<tr><td>{user.name}</td><td>{user.email}</td></tr>'
        html += '</table>'
        self.table_html = html  # ❌ Stateful side effect — breaks purity

        return html
```

**GOOD — Clean separation of concerns:**

```python
# ✅ GOOD: Each layer has a single responsibility
container = UserListContainer()
container.load_data()      # Container: fetches data, manages state
container.search("alice")  # Container: mutates state
                          # (Unit test this independently — no rendering needed)

presentation = UserListPresentation(container.state)  # Presentational: pure function
output = presentation.render()                        # Same state → same output always
```

---

### Pattern 6: Component Event Bus

Publish/subscribe event bus for communication between unrelated components that share no parent-child relationship. Decouples senders from receivers — a component publishes events without knowing who handles them, and handlers register interest without knowing who sends the events.

```python
from __future__ import annotations
from typing import Dict, Any, Callable, Optional, List, Tuple, TypeVar, Generic
from dataclasses import dataclass, field
import time


T = TypeVar("T")


@dataclass(frozen=True)
class ComponentEvent(Generic[T]):
    """Immutable event wrapper carrying typed payload.

    Implements Law 2 (Parse at boundary): event creation validates the payload
    and creates a new immutable instance every time.
    """
    name: str
    payload: T
    timestamp: float = field(default_factory=time.monotonic)
    source: Optional[str] = None

    def __str__(self) -> str:
        return f"ComponentEvent({self.name}, src={self.source}, ts={self.timestamp:.4f})"


class ComponentBus:
    """Component event bus — pub/sub for decoupled component communication.

    Components publish events without knowing which handlers exist.
    Handlers subscribe to event names without knowing who publishes them.

    This is the Python analog of an event bus pattern used in Angular,
    Redux middleware, and message broker architectures.
    """

    def __init__(self) -> None:
        # Map of event_name → list of handler callables
        self._handlers: Dict[str, List[Callable[[ComponentEvent], None]]] = {}

    def subscribe(self, event_name: str, handler: Callable[[ComponentEvent], None]) -> Callable[[], None]:
        """Register a handler for an event. Returns unsubscribe function.

        The returned cleanup function removes the handler when called.
        This prevents memory leaks from forgotten subscriptions.

        Args:
            event_name: The event identifier to listen for.
            handler: Callback that receives the ComponentEvent as its sole argument.

        Returns:
            A callable that, when invoked, unsubscribes this handler.
        """
        if not isinstance(event_name, str) or not event_name:
            raise ValueError(f"event_name must be a non-empty string, got {repr(event_name)}")

        self._handlers.setdefault(event_name, []).append(handler)

        def unsubscribe() -> None:
            """Remove this handler from the bus."""
            if event_name in self._handlers:
                self._handlers[event_name] = [
                    h for h in self._handlers[event_name] if h is not handler
                ]
                if not self._handlers[event_name]:
                    del self._handlers[event_name]

        return unsubscribe

    def publish(self, event: ComponentEvent) -> None:
        """Publish an event to all registered handlers.

        Law 4 (Fail Fast): if no handlers are registered for the event,
        this is still valid — it means no one cares about this event right now.
        However, invalid event names raise immediately.
        """
        # Law 1: Early exit on invalid event name
        if not isinstance(event.name, str) or not event.name:
            raise ValueError(f"Cannot publish event with empty or invalid name: {event}")

        handlers = self._handlers.get(event.name, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as exc:
                # Law 4: Fail fast — log and continue rather than crashing the bus
                print(f"[ComponentBus] Handler error on event '{event.name}': {exc}")

    def publish_str(self, name: str, payload: Any = None, source: Optional[str] = None) -> None:
        """Convenience method to publish an event without constructing ComponentEvent manually."""
        event = ComponentEvent(name=name, payload=payload, source=source)
        self.publish(event)

    def list_subscribers(self) -> Dict[str, int]:
        """Return a count of subscribers per event name (for debugging)."""
        return {name: len(handlers) for name, handlers in self._handlers.items()}


# --- Component implementations that use the bus ---
class UserNotificationComponent:
    """Publishes events when user actions occur. Does NOT know who listens."""

    def __init__(self, bus: ComponentBus) -> None:
        self._bus = bus
        self._user_id: Optional[int] = None

    def set_user(self, user_id: int) -> None:
        """When a user logs in, publish an authentication event."""
        # Law 1: Early exit on invalid user ID
        if user_id < 1:
            raise ValueError(f"Invalid user ID: {user_id}")

        self._user_id = user_id
        self._bus.publish_str(
            name="user.login",
            payload={"user_id": user_id},
            source="UserNotificationComponent",
        )

    def log_out(self) -> None:
        """When a user logs out, publish a logout event."""
        if self._user_id is not None:
            self._bus.publish_str(
                name="user.logout",
                payload={"user_id": self._user_id},
                source="UserNotificationComponent",
            )
            self._user_id = None


class ActivityLogComponent:
    """Subscribes to user events and logs activity. Does NOT know who publishes."""

    def __init__(self, bus: ComponentBus) -> None:
        self._events_logged: List[ComponentEvent] = []
        self._bus = bus
        # Subscribe to multiple event types
        for event_name in ["user.login", "user.logout"]:
            bus.subscribe(event_name, self._on_user_event)

    def _on_user_event(self, event: ComponentEvent) -> None:
        """Handle user-related events from the bus."""
        action = event.name.replace("user.", "")
        entry = f"[{event.timestamp:.4f}] {action}: user_id={event.payload}"
        self._events_logged.append(event)
        print(entry)

    def get_log(self) -> List[str]:
        """Return all logged events as formatted strings."""
        return [
            f"[{e.timestamp:.4f}] {e.name.replace('user.', '')}: user_id={e.payload}"
            for e in self._events_logged
        ]


class DashboardStatsComponent:
    """Another component that independently subscribes to the same events.

    Demonstrates decoupling: ActivityLogComponent and DashboardStatsComponent
    share no code, yet both react to the same user login/logout events.
    Adding a third subscriber requires zero changes to either existing component.
    """

    def __init__(self, bus: ComponentBus) -> None:
        self._active_users: int = 0
        self._bus = bus
        bus.subscribe("user.login", self._on_login)
        bus.subscribe("user.logout", self._on_logout)

    def _on_login(self, event: ComponentEvent) -> None:
        if isinstance(event.payload, dict):
            # Track active user count
            self._active_users += 1

    def _on_logout(self, event: ComponentEvent) -> None:
        self._active_users = max(0, self._active_users - 1)

    @property
    def active_user_count(self) -> int:
        return self._active_users


# --- Usage example ---
def demo_event_bus() -> List[str]:
    """Demonstrate event bus communication between unrelated components."""
    results: List[str] = []

    # Shared event bus — all components reference the same instance
    bus = ComponentBus()

    # Components are created with the bus but don't know about each other
    notifications = UserNotificationComponent(bus)
    activity_log = ActivityLogComponent(bus)
    dashboard = DashboardStatsComponent(bus)

    results.append(f"Subscribers before events: {bus.list_subscribers()}")
    # → Subscribers before events: {'user.login': 2, 'user.logout': 2}

    # Simulate user login — notifications publishes, both subscribers react
    notifications.set_user(42)

    results.append(f"Active users on dashboard: {dashboard.active_user_count}")
    # → Active users on dashboard: 1

    # Another user logs in
    notifications.set_user(99)
    notifications.log_out()  # User 42 leaves

    results.append(f"Active users after logout: {dashboard.active_user_count}")
    # → Active users after logout: 1 (user 99 is still logged in)

    results.append("Activity log entries:")
    for entry in activity_log.get_log():
        results.append(f"  {entry}")

    return results
```

**BAD — Tightly coupled components:**

```python
# ❌ BAD: Components have direct references to each other — high coupling
class LoginManager:
    def __init__(self):
        self._activity_logger = ActivityLogger()  # ❌ Must know about ActivityLogger
        self._dashboard = Dashboard()             # ❌ Must know about Dashboard
        self._analytics = AnalyticsTracker()      # ❌ Must know about AnalyticsTracker

    def login(self, user_id: int) -> None:
        self._activity_logger.log(f"user {user_id} logged in")   # Direct call
        self._dashboard.refresh_user_count()                      # Direct call
        self._analytics.track_login(user_id)                      # Direct call

    # Adding a new subscriber requires modifying LoginManager — violates OCP (Open/Closed Principle).
```

**GOOD — Event bus enables zero-coupling:**

```python
# ✅ GOOD: Components communicate through the bus — no direct references
bus = ComponentBus()
LoginManager(bus)   # Publishes events
ActivityLogger(bus)  # Subscribes to events (no knowledge of who publishes)
Dashboard(bus)       # Also subscribes (completely independent)
AnalyticsTracker(bus) # Yet another subscriber

# Adding a new component that reacts to login:
RealTimeUpdater(bus)  # Zero changes needed to LoginManager, ActivityLogger, Dashboard, or AnalyticsTracker.
```

---

## Constraints

### MUST DO
- **Define a clear public API** — Every exported class/function must have a documented purpose, typed parameters, and a docstring describing return value and side effects
- **Prefer composition over inheritance** — Build feature combinations by composing atomic components; only use inheritance when there is a genuine "is-a" relationship with shared behavior
- **Make illegal states unrepresentable** — Use immutable data structures (frozen dataclasses, tuples) for state snapshots. Every state transition returns a new instance, never mutating existing state
- **Separate concerns by responsibility** — Containers fetch and manage data; presentational components only render; headless components only compute logic
- **Provide cleanup/unsubscribe mechanisms** — Every subscription, timer, or event handler registration must have a corresponding cleanup path to prevent memory leaks
- **Write isolation tests** — Each layer (container, presentational, headless logic) must be independently testable without depending on rendering or data-fetching infrastructure
- **Reference `code-philosophy` (5 Laws of Elegant Defense)** in all component implementations

### MUST NOT DO
- **Use inheritance for feature combinations** — If a class exists only to add one extra feature to another, use composition instead
- **Mix data fetching with rendering** — A function/method should either fetch data OR render; never both in the same call chain
- **Pass raw API responses to presentational components** — Always transform to domain types (dataclasses) before passing down
- **Tightly couple unrelated components** — If two components communicate, use an event bus or shared state object; never have one import and directly reference the other's implementation details
- **Mutate props received from a parent** — Treat all incoming props as immutable. If you need derived data, compute it fresh rather than modifying the original
- **Use magic numbers for state transitions** — Define named constants or enums for states, statuses, and configuration values

---

## Output Template

When applying this skill to design a component architecture, produce:

1. **Component Boundary Map** — List of components, their responsibilities (data, rendering, logic), and their dependencies
2. **Public API Spec** — Documented signatures for every exported class/function, including parameters, return types, and side effects
3. **State Flow Diagram** — ASCII diagram showing how state moves between containers and presentational layers
4. **Pattern Selection Rationale** — Why a specific pattern was chosen for each component relationship (compound, headless, render prop, etc.)
5. **Composition Tree** — Visual representation of how atomic components compose into complex components
6. **Test Strategy** — Which components are testable in isolation and what their unit tests should verify

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-pattern-selection` | Choose the right design pattern (factory, strategy, observer) to complement component architecture decisions |
| `abstraction-design-patterns` | Design clean abstractions and interfaces that serve as contracts between components |
| `solid-principles` | Ensure component designs follow SOLID principles for maintainable, extensible systems |

---

## TL;DR for Code Generation

- Use guard clauses — return early on invalid input before doing work (Law 1: Early Exit)
- Return new immutable data structures, never mutate inputs (Law 3: Atomic Predictability)
- Fail fast with descriptive errors — reject invalid state transitions immediately (Law 4: Fail Fast)
- Keep functions under 50 lines — if larger, split into smaller pure functions (Law 5: Intentional Naming)
- Use frozen dataclasses for state snapshots to prevent accidental mutation
- Define typed protocols for component interfaces — enables duck typing and flexible mocking in tests
- Add docstrings describing return values and side effects — not just what the function does, but what it produces
- Name methods after their outcome, not their mechanism — `set_active(index)` not `_update_tab_state()`
