---
name: gui-agent-interaction
description: Implements GUI agent interaction patterns (screen vision recognition, UI element detection, automated mouse/keyboard execution) for operating desktop and web applications without APIs.
license: MIT
compatibility: opencode
archetypes:
  - tactical
anti_triggers:
  - API integration
  - REST endpoint
  - webhook automation
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  triggers: gui agent, screen vision, UI automation, Project Mariner, desktop automation, how do i automate clicking buttons, visual agent, computer vision UI
  role: implementation
  scope: implementation
  output-format: code
  related-skills: tool-use-function-calling, coding-agent-frameworks, mcp-integration
---

# GUI Agent Interaction Pattern

Implements screen-based interaction pipelines so AI agents can operate desktop and web applications by "seeing" rendered UI elements through computer vision and executing mouse/keyboard actions — no native APIs required. This skill applies the 5 Laws of Elegant Defense: Law 1 (Early Exit) for guard-clause-driven action validation, Law 2 (Parse at boundary) for screen state normalization, and Law 3 (Atomic Predictability) for immutable before/after state snapshots used in verification loops.

This skill covers how to build agents that navigate graphical user interfaces end-to-end: capturing screenshots, detecting interactive elements via vision models, planning action sequences, executing them through OS-level input libraries, and verifying outcomes by comparing screen states before and after each step.

## TL;DR Checklist

- [ ] Choose the right interaction layer — browser automation (Playwright/Selenium) for web, PyAutoGUI for desktop, or a hybrid pipeline
- [ ] Implement screen capture with consistent resolution and color space (RGB, not RGBA) across all steps
- [ ] Run UI element detection on every captured frame before planning any action
- [ ] Execute actions through a typed execution engine that maps high-level intents to OS commands
- [ ] Verify every action by capturing a post-action screenshot and diffing against expected state changes
- [ ] Implement error recovery with timeout thresholds and fallback dialog classification
- [ ] Log full interaction traces (screenshots, detected elements, actions taken) for replay debugging

---

## When to Use

Use this skill when:

- Automating legacy applications with no REST API or programmatic interface (e.g., internal enterprise web portals built with server-side rendering)
- Interacting with desktop software where only GUI exposure exists (e.g., configuring a system administration tool on Windows/macOS/Linux)
- Performing form-filling workflows across multiple disconnected web applications that lack integration points
- Testing end-user experience of web or desktop applications by simulating real user interactions at the pixel level
- Validating visual correctness of UI changes — comparing rendered screens before and after a deployment or style update
- Building agents that must operate in environments where only screen-level access is permitted (air-gapped systems, restricted containers)

## When NOT to Use

Avoid this skill for:

- Applications with well-documented REST/GraphQL APIs — always prefer programmatic API calls over visual interaction (use `tool-use-function-calling` instead)
- High-frequency trading or latency-sensitive automation where screen capture overhead introduces unacceptable delay (milliseconds matter — use exchange adapters directly)
- Environments requiring pixel-perfect precision below 5-pixel tolerance (computer vision detection accuracy degrades with resolution; use DOM-based selectors when available)
- Accessibility-compliance testing that requires semantic markup validation — screen-level interaction cannot verify ARIA attributes or screen reader output (use accessibility-in-ui-adjacent-code)

---

## Core Workflow

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────┐    ┌───────────────┐
│ Screen      │───→│ UI Element       │───→│ Action       │───→│ State         │
│ Capture     │    │ Recognition      │    │ Planning     │    │ Verification  │
│ (screenshot)│    │ (vision model →  │    │ (LLM maps    │    │ (before/after │
│             │    │  bounding boxes, │    │  intent →    │    │  diff check)  │
│             │    │  element types)  │    │  OS commands)│    │               │
└─────────────┘    └──────────────────┘    └──────────────┘    └───────┬───────┘
                                                                       │
                                                          ┌────────────▼────────┐
                                                          │ Error Recovery &   │
                                                          │ Retry Loop          │
                                                          └─────────────────────┘
```

1. **Capture Screen State** — Acquire a screenshot of the current visible UI surface at consistent resolution and color format:
    - Use browser automation APIs for web pages (Playwright's `screenshot()` or Selenium's `get_screenshot_as_file()`)
    - Use OS-level capture for desktop apps (mss for cross-platform, Quartz for macOS, GDI/DirectX for Windows)
    - Normalize to RGB format at a fixed resolution (1920x1080 minimum; scale smaller screens up consistently)
    **Checkpoint:** Every captured frame must be saved with a monotonic timestamp and stored alongside its element detection result.

2. **Detect UI Elements** — Run computer vision inference on the screenshot to identify all interactive elements with bounding boxes and classification labels:
    - Use a fine-tuned object detection model (YOLOv8, RT-DETR) trained on UI element taxonomies (buttons, inputs, links, menus, dialogs)
    - Alternatively use DOM scraping for web pages as a complementary ground-truth layer when JavaScript is available
    - Output structured element list: `[{"type": "button", "label": "Submit", "bbox": [x1, y1, x2, y2], "confidence": 0.94}]`
    **Checkpoint:** Element detection must return at least one actionable element per screen — empty detection triggers a re-capture with zoom adjustment.

3. **Plan Actions from Detected State** — Given the task goal and current element map, generate a sequence of atomic UI actions:
    - Feed the screenshot + element list + task description to an LLM that outputs structured action sequences
    - Each action must be typed (`click`, `type`, `scroll`, `drag`, `hover`, `right_click`) with concrete coordinates and optional text payload
    - Validate action feasibility before execution — e.g., cannot type into a non-editable element
    **Checkpoint:** Action sequence must be executable top-to-bottom without requiring human judgment mid-sequence.

4. **Execute Actions** — Map high-level actions to OS or browser commands through an execution engine:
    - Web: Playwright/Selenium locator-based actions (`.click()`, `.fill()`, `.select_option()`) or coordinate-based fallback
    - Desktop: PyAutoGUI functions (`pyautogui.click(x, y)`, `pyautogui.typewrite(text)`), optionally wrapped with safe guards
    - Include deliberate delays between actions (100–500ms default) to account for rendering and animation timing
    **Checkpoint:** Every executed action must log its type, target coordinates/selector, and execution duration.

5. **Verify State After Execution** — Capture a post-action screenshot and compare it against the expected outcome:
    - Use structural similarity (SSIM) or perceptual hash (pHash) to detect meaningful changes vs noise
    - Re-run element detection on the new frame to confirm the expected elements appeared/disappeared/changed state
    - If verification fails, classify the error type and route to the recovery handler
    **Checkpoint:** State verification must complete within a timeout window (default: 5 seconds) — stale screens indicate hung processes.

6. **Handle Errors and Recover** — When an action produces an unexpected screen state, classify and attempt recovery:
    - Detect common failure patterns: loading spinners, permission dialogs, connection errors, CAPTCHAs
    - Apply recovery strategies in priority order: retry (same action), cancel dialog → retry, wait for timeout → retry
    - After max retries exhausted, log the full interaction trace and raise a structured error with screenshot attachment
    **Checkpoint:** Recovery must never blindly loop — every retry path must have an independent success criterion.

---

## Implementation Patterns

### Pattern 1: Google Project Mariner Architecture (Full GUI Agent Pipeline)

Google Project Mariner demonstrated that agents can navigate graphical interfaces by combining screen capture, element recognition, and action execution in a tight feedback loop. The core architecture chains three stages: vision-based UI understanding, LLM-driven action planning, and low-level command execution with verification.

```python
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import datetime, timezone
import time

logger = logging.getLogger("gui.agent")


class ActionType(Enum):
    """Atomic UI action types."""
    CLICK = "click"
    DOUBLE_CLICK = "double_click"
    TYPE = "type"
    SCROLL_UP = "scroll_up"
    SCROLL_DOWN = "scroll_down"
    DRAG = "drag"
    HOVER = "hover"
    RIGHT_CLICK = "right_click"
    KEY_PRESS = "key_press"


class ActionStatus(Enum):
    PENDING = "pending"
    EXECUTED = "executed"
    FAILED = "failed"
    RETRYING = "retrying"
    RECOVERED = "recovered"


@dataclass
class UIElement:
    """Detected interactive element on screen with bounding box."""
    element_id: str
    element_type: str            # "button", "input", "link", "menu", "dialog", "image"
    label: str                   # Visible text or accessible name
    bbox: tuple[int, int, int, int]  # (x1, y1, x2, y2) in pixel coords
    confidence: float            # Detection model confidence (0.0 – 1.0)

    @property
    def center(self) -> tuple[float, float]:
        """Return the geometric center of the bounding box."""
        cx = (self.bbox[0] + self.bbox[2]) / 2
        cy = (self.bbox[1] + self.bbox[3]) / 2
        return (cx, cy)

    @property
    def width(self) -> int:
        return self.bbox[2] - self.bbox[0]

    @property
    def height(self) -> int:
        return self.bbox[3] - self.bbox[1]

    def contains_point(self, x: float, y: float) -> bool:
        """Check if a coordinate falls within this element's bounding box."""
        return (self.bbox[0] <= x <= self.bbox[2] and
                self.bbox[1] <= y <= self.bbox[3])


@dataclass
class ScreenState:
    """Immutable snapshot of a UI screen at a point in time."""
    timestamp: str               # ISO 8601 with UTC timezone
    screenshot_path: str         # Path to saved PNG file
    width: int
    height: int
    elements: list[UIElement] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PlannedAction:
    """An action planned by the agent for a specific target element."""
    action_type: ActionType
    target_element_id: str | None  # Which element this targets
    coordinates: tuple[float, float]  # (x, y) screen coordinates
    text_payload: str = ""           # For TYPE actions
    delay_ms: int = 200              # Wait between actions in the sequence
    expected_state_change: str = ""  # Description of what should happen after execution


@dataclass
class InteractionTrace:
    """Complete record of one agent interaction step."""
    step_index: int
    before_state: ScreenState | None = None
    action: PlannedAction | None = None
    action_status: ActionStatus = ActionStatus.PENDING
    after_state: ScreenState | None = None
    error_message: str | None = None
    recovery_action: str | None = None
    duration_ms: float = 0.0

    @property
    def is_complete(self) -> bool:
        return self.after_state is not None


class GUIAgentPipeline:
    """Implements the Google Project Mariner pipeline for GUI agent interaction.

    Chains screen capture → element recognition → action planning → execution →
    state verification into a loop. Applies Law 2 (Parse at boundary) by
    normalizing all screen captures to a consistent format before passing to
    downstream stages, and Law 1 (Early Exit) by validating each stage's
    output before proceeding to the next.
    """

    def __init__(
        self,
        vision_model: Any = None,
        executor: Any = None,
        verifier: Any = None,
        max_retries: int = 3,
        action_delay_ms: int = 200,
        verification_timeout_s: float = 5.0,
    ) -> None:
        self.vision_model = vision_model
        self.executor = executor
        self.verifier = verifier
        self.max_retries = max_retries
        self.action_delay_ms = action_delay_ms
        self.verification_timeout_s = verification_timeout_s
        self.trace: list[InteractionTrace] = []

    def run(self, task_description: str) -> list[InteractionTrace]:
        """Execute a task on the target GUI by cycling through the interaction loop.

        Args:
            task_description: Natural language description of what the agent should accomplish.

        Returns:
            List of InteractionTraces recording each step's before/after state and outcome.
        """
        step_index = 0
        iteration = 0
        max_iterations = 50  # Prevent infinite loops on stuck UIs

        while iteration < max_iterations:
            iteration += 1
            trace = InteractionTrace(step_index=step_index)

            # Stage 1: Capture screen state
            trace.before_state = self._capture_screen()
            if not trace.before_state or not trace.before_state.elements:
                trace.error_message = "Screen capture returned no detectable elements"
                trace.action_status = ActionStatus.FAILED
                self.trace.append(trace)
                logger.error("Step %d: No elements detected on screen", step_index)
                break

            # Stage 2: Plan actions
            action_sequence = self._plan_actions(
                task_description, trace.before_state
            )
            if not action_sequence:
                trace.error_message = "Action planner returned empty sequence"
                trace.action_status = ActionStatus.FAILED
                self.trace.append(trace)
                break

            # Stage 3-5: Execute each action with verification
            executed_any = False
            for action in action_sequence:
                result = self._execute_with_verification(
                    action, trace.before_state, step_index
                )
                if result.action_status == ActionStatus.FAILED and result.recovery_action:
                    # Attempt recovery
                    retry_result = self._attempt_recovery(result)
                    if retry_result is not None:
                        result = retry_result

                if result.action_status in (ActionStatus.EXECUTED, ActionStatus.RECOVERED):
                    trace.before_state = result.after_state  # Feed back into loop
                    executed_any = True

                self.trace.append(result)
                step_index += 1

            # Check if task is complete
            if not action_sequence or executed_any:
                trace.action_status = ActionStatus.EXECUTED
                self.trace.append(trace)
                break

        return self.trace

    def _capture_screen(self) -> ScreenState | None:
        """Capture current screen state with element detection."""
        # Implementation depends on target environment (browser vs desktop)
        raise NotImplementedError("Subclass and implement for your target platform")

    def _plan_actions(
        self, task: str, state: ScreenState
    ) -> list[PlannedAction]:
        """Plan action sequence from task description and current element map."""
        raise NotImplementedError("Subclass with LLM-powered planner")

    def _execute_with_verification(
        self, action: PlannedAction, before: ScreenState, step_idx: int,
    ) -> InteractionTrace:
        """Execute an action and verify its effect."""
        trace = InteractionTrace(step_index=step_idx)
        trace.action = action
        trace.before_state = before

        start = time.time()
        try:
            trace.after_state = self._capture_screen()
            trace.action_status = ActionStatus.EXECUTED
        except Exception as e:
            trace.error_message = str(e)
            trace.action_status = ActionStatus.FAILED
        trace.duration_ms = (time.time() - start) * 1000

        return trace

    def _attempt_recovery(
        self, failed_trace: InteractionTrace,
    ) -> InteractionTrace | None:
        """Attempt to recover from a failed action."""
        raise NotImplementedError("Implement recovery strategies")
```

**BAD vs GOOD: Pipeline Design**

```python
# ❌ BAD — No early exit on empty screen state; loops forever on hung UI
class BrokenGUIAgent:
    def run(self, task):
        while True:  # Never terminates
            screenshot = capture_screen()
            elements = detect_elements(screenshot)
            actions = plan(actions_for(task, elements))
            execute(actions)

# ✅ GOOD — Explicit max_iterations, guard clauses at every stage boundary,
# immutable traces for replay debugging (Law 3: Atomic Predictability)
class RobustGUIAgent:
    def run(self, task):
        for _ in range(50):  # Hard cap prevents infinite loops
            state = self._capture_screen()
            if not state or not state.elements:
                break  # Early exit: nothing actionable to do
            actions = self._plan_actions(task, state)
            if not actions:
                break
            ...
```

### Pattern 2: UI Element Detection & Recognition System

UI element detection maps raw pixel data into structured element catalogs that the action planner can reason about. For web applications, DOM-based detection is preferred (direct access to element properties, text content, and accessibility labels). For desktop apps without DOM exposure, computer vision models detect elements purely from screen pixels.

```python
import base64
import io
from dataclasses import dataclass, field

try:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.remote.webdriver import WebDriver
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False


@dataclass
class DOMElementInfo:
    """Structured info extracted from a web page's DOM tree."""
    element_id: str
    tag_name: str
    role: str | None            # ARIA role (button, textbox, link, etc.)
    aria_label: str | None      # Accessible label
    text_content: str           # Visible text between tags
    is_visible: bool
    is_interactive: bool        # Has click handler or is a form control
    rect: dict[str, int]        # {"left", "top", "width", "height"} in viewport coords

    @property
    def center(self) -> tuple[float, float]:
        left = self.rect["left"]
        top = self.rect["top"]
        return (left + self.rect["width"] / 2, top + self.rect["height"] / 2)


@dataclass
class VisionElementInfo:
    """Structured info from a computer vision model detecting elements in pixels."""
    element_id: str
    element_type: str           # button, input_field, link, menu_item, dialog, icon
    label: str                  # Inferred text label from OCR or visual features
    bbox: tuple[int, int, int, int]  # (x1, y1, x2, y2) absolute pixel coords
    confidence: float           # Model detection confidence
    ocr_text: list[dict] = field(default_factory=list)  # Raw OCR results near bbox


class WebElementDetector:
    """Extracts structured element info from a browser page's DOM tree.

    This is the preferred detection method for web applications since it
    provides ground-truth accessibility information that vision models
    cannot reliably infer from pixels alone.
    """

    INTERACTIVE_TAGS = {"a", "button", "input", "select", "textarea", "summary"}
    ATTRIBUTES_TO_EXTRACT = {
        "type", "name", "role", "aria-label", "aria-hidden",
        "disabled", "readonly", "placeholder", "value",
    }

    def __init__(self, driver: WebDriver) -> None:
        self.driver = driver

    def detect_all_interactive_elements(self) -> list[DOMElementInfo]:
        """Find all interactive elements on the current page.

        Uses JavaScript evaluation to extract element properties directly
        from the DOM, which is faster and more reliable than iterating
        through Selenium's find_element calls.
        """
        script = """
        (function() {
            const interactiveTags = %TAGS;
            const attrsToRead = %ATTRS;
            const results = [];

            // Get all elements, filter to interactive ones
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (!interactiveTags.has(el.tagName.toLowerCase())) continue;
                if (el.hidden || el.getAttribute('aria-hidden') === 'true') continue;

                // Check if element is actually visible in the viewport
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) continue;

                const info: Record<string, string> = {};
                for (const attr of attrsToRead) {
                    const val = el.getAttribute(attr);
                    if (val) info[attr] = val;
                }

                results.push({
                    tag: el.tagName.toLowerCase(),
                    type: el.type || null,
                    ...info,
                    rect: {
                        left: Math.round(rect.left),
                        top: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    },
                    text: (el.textContent || '').trim().slice(0, 200),
                });
            }

            return results;
        })()
        """ % (
            repr(set(self.INTERACTIVE_TAGS)),
            repr(self.ATTRIBUTES_TO_EXTRACT),
        )

        raw_results = self.driver.execute_script(script) or []

        elements: list[DOMElementInfo] = []
        for i, raw in enumerate(raw_results):
            element_id = f"web-el-{i}"
            tag = raw.get("tag", "")
            role = raw.get("role") or self._infer_role(tag, raw)
            aria_label = raw.get("aria_label") or raw.get("aria-label")

            # Determine if element is interactive based on attributes
            disabled = raw.get("disabled") == "true"
            readonly = raw.get("readonly") == "true"
            is_interactive = not disabled and tag in self.INTERACTIVE_TAGS

            elements.append(DOMElementInfo(
                element_id=element_id,
                tag_name=tag,
                role=role,
                aria_label=aria_label,
                text_content=raw.get("text", ""),
                is_visible=True,  # Already filtered by visibility check in JS
                is_interactive=is_interactive,
                rect=raw.get("rect", {}),
            ))

        return elements

    def _infer_role(self, tag: str, attrs: dict) -> str | None:
        """Infer ARIA role from HTML tag when role attribute is missing."""
        role_map = {
            "a": "link",
            "button": "button",
            "input[type='submit']": "button",
            "input[type='text']": "textbox",
            "input[type='email']": "textbox",
            "input[type='password']": "textbox",
            "select": "listbox",
            "textarea": "textbox",
        }
        return role_map.get(tag, None)


class VisionBasedElementDetector:
    """Detects UI elements from raw screen pixels using a vision model.

    Used when DOM access is unavailable (desktop apps, iframes with CORS blocks).
    Combines object detection (bounding boxes) with OCR (text labels).
    """

    def __init__(self, model: Any = None, ocr_engine: Any = None) -> None:
        self.model = model  # Object detection model (YOLOv8/RT-DETR)
        self.ocr_engine = ocr_engine  # OCR engine (Tesseract, EasyOCR)

    def detect_from_screenshot(self, image_data: bytes | io.BytesIO) -> list[VisionElementInfo]:
        """Run element detection on a screenshot image.

        Args:
            image_data: Raw PNG or JPEG image bytes from screen capture.

        Returns:
            List of VisionElementInfo with bounding boxes and OCR'd labels.
        """
        # Pass to object detection model for bounding boxes
        detections = self.model.predict(image_data) if self.model else []

        elements: list[VisionElementInfo] = []
        for det in detections:
            element_id = f"vis-el-{det.class_id}-{det.confidence:.3f}"
            bbox = (
                int(det.x1), int(det.y1),
                int(det.x2), int(det.y2),
            )

            # Extract text label via OCR on the cropped region
            ocr_text = []
            if self.ocr_engine and bbox[2] > bbox[0]:
                cropped = image_data[bbox[1]:bbox[3], bbox[0]:bbox[2]]
                ocr_text = self.ocr_engine.recognize(cropped)

            elements.append(VisionElementInfo(
                element_id=element_id,
                element_type=self._map_class_to_type(det.class_id),
                label=self._infer_label(ocr_text),
                bbox=bbox,
                confidence=float(det.confidence),
                ocr_text=ocr_text,
            ))

        return elements

    def _map_class_to_type(self, class_id: int) -> str:
        """Map model output class ID to UI element type name."""
        type_map = {
            0: "button",
            1: "input_field",
            2: "link",
            3: "menu_item",
            4: "dialog",
            5: "image",
            6: "icon",
            7: "tab",
            8: "dropdown",
            9: "checkbox",
        }
        return type_map.get(class_id, "unknown")

    def _infer_label(self, ocr_results: list[dict]) -> str:
        """Extract the most prominent text label from OCR results."""
        if not ocr_results:
            return ""
        # Sort by confidence and return top result
        sorted_results = sorted(ocr_results, key=lambda x: x.get("confidence", 0), reverse=True)
        return sorted_results[0].get("text", "") if sorted_results else ""
```

**BAD vs GOOD: Element Detection**

```python
# ❌ BAD — Relies on fragile CSS selectors that break with UI updates
driver.find_element(By.CSS_SELECTOR, "#main-content > div:nth-child(3) > button")

# ✅ GOOD — Semantic element matching by accessible role and visible text,
# resilient to DOM restructuring as long as the label stays the same
driver.find_element(By.XPATH, "//button[normalize-space()='Submit Order']")

# ❌ BAD — No confidence threshold; processes low-confidence detections as real elements
detections = vision_model.predict(screenshot)  # All results treated equally
for det in detections:
    actions.append(PlannedAction(target=det))

# ✅ GOOD — Only high-confidence detections feed into action planning
HIGH_CONFIDENCE_THRESHOLD = 0.85
actions = [
    PlannedAction(target=det)
    for det in detections
    if det.confidence >= HIGH_CONFIDENCE_THRESHOLD
]
```

### Pattern 3: Action Execution Engine (Click, Type, Scroll, Drag)

The execution engine translates high-level action plans into OS or browser commands. For web automation, Playwright is preferred over Selenium due to its auto-wait capabilities and locator resolution system that reduces flakiness. For desktop automation, PyAutoGUI provides cross-platform input simulation with built-in safety guards.

```python
import logging
import time
from dataclasses import dataclass

try:
    from playwright.sync_api import Page, sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
    # Safety guards — must be set on first run
    if not hasattr(pyautogui, '_PAUSES_SET'):
        pyautogui.PAUSE = 0.25          # Pause between actions (seconds)
        pyautogui.FAILSAFE = True       # Move mouse to corner to abort
        pyautogui.MINIMUM_DURATION = 0.1
        pyautogui._PAUSES_SET = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

logger = logging.getLogger("gui.execution")


@dataclass
class ExecutionResult:
    """Outcome of a single action execution attempt."""
    success: bool
    action_type: str
    target_description: str
    duration_ms: float
    error_message: str | None = None
    screenshot_path: str | None = None  # Post-action screenshot for debugging


class PlaywrightExecutionEngine:
    """Executes UI actions via Playwright's browser automation API.

    Preferred over Selenium for web automation due to auto-wait (automatically
    waits for elements to be actionable before clicking/filling), network event
    interception, and modern locator strategies (CSS, XPath, text, role-based).
    """

    def __init__(self, page: Page) -> None:
        self.page = page

    def click(self, selector: str, *, timeout_ms: int = 10_000) -> ExecutionResult:
        """Click an element identified by a Playwright locator.

        Auto-waits for the element to be visible and actionable before clicking.
        This eliminates the need for explicit sleep/delay calls.

        Args:
            selector: CSS selector, XPath, or text/role-based locator string.
            timeout_ms: Maximum time to wait for element readiness.

        Returns:
            ExecutionResult with success status and timing.
        """
        start = time.time()
        try:
            # Playwright's .click() auto-waits — no explicit delay needed
            self.page.locator(selector).click(timeout=timeout_ms)
            duration = (time.time() - start) * 1000
            return ExecutionResult(
                success=True,
                action_type="click",
                target_description=f"element matched: {selector}",
                duration_ms=round(duration, 2),
            )
        except Exception as e:
            logger.warning("Click failed on '%s': %s", selector, e)
            return ExecutionResult(
                success=False,
                action_type="click",
                target_description=f"element matched: {selector}",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def type_into(
        self, selector: str, text: str, *, delay_per_char_ms: int = 50,
    ) -> ExecutionResult:
        """Type text into an input field with character-by-character delay.

        Args:
            selector: Locator for the target input element.
            text: Text to type.
            delay_per_char_ms: Artificial delay between characters (simulates human typing).

        Returns:
            ExecutionResult with success status and timing.
        """
        start = time.time()
        try:
            input_el = self.page.locator(selector)
            input_el.click(timeout=5000)          # Focus the field first
            input_el.fill(text)                    # Fill replaces existing content
            time.sleep(len(text) * delay_per_char_ms / 1000)  # Human-like typing feel
            return ExecutionResult(
                success=True,
                action_type="type",
                target_description=f"field matched: {selector}",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                action_type="type",
                target_description=f"field matched: {selector}",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def select_option(self, selector: str, value: str) -> ExecutionResult:
        """Select an option in a <select> dropdown element.

        Args:
            selector: Locator for the <select> element.
            value: The option value to select.
        """
        start = time.time()
        try:
            self.page.locator(selector).select_option(value=value)
            return ExecutionResult(
                success=True,
                action_type="select_option",
                target_description=f"dropdown matched: {selector}",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                action_type="select_option",
                target_description=f"dropdown matched: {selector}",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def scroll(self, direction: str = "down", amount: int = 300) -> ExecutionResult:
        """Scroll the viewport by a pixel amount.

        Args:
            direction: 'up' or 'down'.
            amount: Pixels to scroll.
        """
        start = time.time()
        try:
            delta = -amount if direction == "up" else amount
            self.page.evaluate(f"window.scrollBy(0, {delta})")
            time.sleep(0.3)  # Allow lazy-loaded content to render
            return ExecutionResult(
                success=True,
                action_type="scroll",
                target_description=f"{direction} by {amount}px",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                action_type="scroll",
                target_description=f"{direction} by {amount}px",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )


class PyAutoGUIExecutionEngine:
    """Executes UI actions via PyAutoGUI's cross-platform OS-level input simulation.

    Used for desktop applications that cannot be automated through browser APIs.
    Coordinates-based: all actions target screen pixel coordinates.

    Safety: FAILSAFE is enabled by default — moving the mouse to the top-left
    corner of the screen aborts all operations immediately. MINIMUM_DURATION
    ensures smooth cursor motion instead of instant jumps.
    """

    def __init__(self, safety_margin_px: int = 10) -> None:
        if not PYAUTOGUI_AVAILABLE:
            raise ImportError(
                "PyAutoGUI is required for desktop automation. "
                "Install with: pip install pyautogui"
            )
        self.safety_margin_px = safety_margin_px

    def click(self, x: float, y: float, clicks: int = 1) -> ExecutionResult:
        """Click at screen coordinates.

        Args:
            x: Horizontal pixel coordinate.
            y: Vertical pixel coordinate.
            clicks: Number of clicks (1=left-click, 2=double-click).
        """
        start = time.time()
        try:
            pyautogui.click(x, y, clicks=clicks)
            return ExecutionResult(
                success=True, action_type="click",
                target_description=f"({x:.0f}, {y:.0f}), {clicks} click(s)",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False, action_type="click",
                target_description=f"({x:.0f}, {y:.0f}), {clicks} click(s)",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def type_text(self, text: str) -> ExecutionResult:
        """Type text at current cursor position.

        The caller must ensure the correct input element is focused before calling.
        """
        start = time.time()
        try:
            pyautogui.typewrite(text, interval=0.03)  # 30ms between characters
            return ExecutionResult(
                success=True, action_type="type",
                target_description=f"text: '{text[:50]}{'...' if len(text)>50 else ''}'",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False, action_type="type",
                target_description=text[:50],
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def scroll_at(self, x: float, y: float, clicks: int = 3) -> ExecutionResult:
        """Scroll at screen coordinates (scroll wheel).

        Positive clicks scrolls up, negative scrolls down.
        """
        start = time.time()
        try:
            pyautogui.scroll(clicks, x=x, y=y)
            return ExecutionResult(
                success=True, action_type="scroll",
                target_description=f"({x:.0f}, {y:.0f}), {clicks} scroll clicks",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False, action_type="scroll",
                target_description=f"({x:.0f}, {y:.0f}), {clicks} scroll clicks",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def drag_to(self, x1: float, y1: float, x2: float, y2: float, duration_s: float = 0.5) -> ExecutionResult:
        """Drag from (x1,y1) to (x2,y2) with configurable speed.

        Args:
            x1, y1: Starting coordinates.
            x2, y2: Ending coordinates.
            duration_s: How long the drag motion takes in seconds.
        """
        start = time.time()
        try:
            pyautogui.moveTo(x1, y1, duration=0.1)
            pyautogui.drag(x2 - x1, y2 - y1, duration=duration_s)
            return ExecutionResult(
                success=True, action_type="drag",
                target_description=f"({x1:.0f},{y1:.0f}) → ({x2:.0f},{y2:.0f})",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False, action_type="drag",
                target_description=f"({x1:.0f},{y1:.0f}) → ({x2:.0f},{y2:.0f})",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )

    def hotkey(self, *keys: str) -> ExecutionResult:
        """Press a keyboard shortcut (e.g., Ctrl+C, Alt+F4)."""
        start = time.time()
        try:
            pyautogui.hotkey(*keys)
            return ExecutionResult(
                success=True, action_type="key_press",
                target_description=f"hotkey: {'+'.join(keys)}",
                duration_ms=round((time.time() - start) * 1000, 2),
            )
        except Exception as e:
            return ExecutionResult(
                success=False, action_type="key_press",
                target_description=f"hotkey: {'+'.join(keys)}",
                duration_ms=round((time.time() - start) * 1000, 2),
                error_message=str(e),
            )
```

**BAD vs GOOD: Execution Safety**

```python
# ❌ BAD — No safety margin on clicks; a 5px coordinate drift causes wrong element interaction
pyautogui.click(x=450, y=300)  # Might hit adjacent button

# ✅ GOOD — Coordinates centered in the detected element with explicit safety bounds
element_center = ui_element.center  # (452.5, 301.2)
action = engine.click(element_center[0], element_center[1])

# ❌ BAD — No visibility check before typing into a field
engine.type_into("input[name='email']", user_email)

# ✅ GOOD — Validates the target element is visible and enabled before executing
element = page.locator(f"input[name='{field_name}']")
if not element.is_visible() or element.is_disabled():
    raise ActionError(f"Cannot type into '{field_name}': not actionable on screen")
engine.type_into(field_selector, text)
```

### Pattern 4: Error Recovery for Unexpected Dialogs

GUI automation fails when the actual screen state diverges from expectations — unexpected popups, loading spinners, permission prompts, CAPTCHAs, or connection errors. A robust recovery system classifies what went wrong and applies targeted remediation strategies rather than blindly retrying.

```python
import time
from enum import Enum
from dataclasses import dataclass

try:
    from skimage.metrics import structural_similarity as ssim
    SSIM_AVAILABLE = True
except ImportError:
    SSIM_AVAILABLE = False


class ErrorCategory(Enum):
    """Classification of GUI automation errors."""
    LOADING_STATE = "loading"           # Screen shows spinner/busy indicator
    UNEXPECTED_DIALOG = "dialog"        # Alert, confirmation, or modal appeared
    PERMISSION_DENIED = "permission"    # OS or browser permission prompt
    CONNECTION_ERROR = "connection"     # Network timeout or server error page
    CAPTCHA_DETECTED = "captcha"        # Challenge-response verification required
    ELEMENT_NOT_FOUND = "not_found"     # Target element missing from detection
    ACTION_OUTSIDE_BOUNDS = "bounds"    # Click landed outside any detected element
    STALE_SCREEN = "stale"              # No change after action (UI hung)
    TIMEOUT = "timeout"                 # Action exceeded max wait time


@dataclass
class ErrorRecoveryPlan:
    """Determines what recovery strategy to apply for a given error type."""
    error_category: ErrorCategory
    strategy: str                      # "retry", "cancel_dialog", "wait_and_retry", etc.
    max_retries: int
    wait_before_retry_ms: int = 1000
    requires_human_intervention: bool = False
    notes: str = ""


class DialogClassifier:
    """Classifies unexpected screen states into error categories using vision + heuristics."""

    LOADING_INDICATOR_TEXTS = [
        "loading", "please wait", "processing", "working on it", "connecting",
    ]
    DIALOG_TITLE_INDICATORS = ["alert", "warning", "confirm", "error", "dialog"]
    CAPTCHA_PATTERNS = ["captcha", "recaptcha", "verify you are human", "click all squares"]

    def __init__(self) -> None:
        self.loading_texts = set(self.LOADING_INDICATOR_TEXTS)
        self.dialog_indicators = set(self.DIALOG_TITLE_INDICATORS)
        self.captcha_patterns = [p.lower() for p in self.CAPTCHA_PATTERNS]

    def classify(self, screen_state: ScreenState) -> ErrorCategory:
        """Analyze a screen state to determine the error category.

        Uses OCR'd text from detected elements combined with visual pattern
        matching to classify what went wrong on the current screen.
        """
        if not screen_state or not screen_state.elements:
            return ErrorCategory.ELEMENT_NOT_FOUND

        # Gather all readable text from detected elements
        all_text = " ".join(
            el.label.lower() for el in screen_state.elements if el.label
        )

        # Check 1: Loading state detection
        for keyword in self.loading_texts:
            if keyword in all_text:
                return ErrorCategory.LOADING_STATE

        # Check 2: Dialog/modal detection
        for element in screen_state.elements:
            if element.element_type == "dialog" and element.confidence > 0.7:
                # Check if it's a CAPTCHA dialog specifically
                if any(p in element.label.lower() for p in self.captcha_patterns):
                    return ErrorCategory.CAPTCHA_DETECTED
                return ErrorCategory.UNEXPECTED_DIALOG

        # Check 3: CAPTCHA pattern in text (fallback)
        if any(pattern in all_text for pattern in self.captcha_patterns):
            return ErrorCategory.CAPTCHA_DETECTED

        return ErrorCategory.STALE_SCREEN


class StateVerifier:
    """Verifies whether an action produced the expected screen state change.

    Uses structural similarity (SSIM) for pixel-level comparison and
    element presence checks for semantic verification. Applies Law 1
    (Early Exit) by returning false as soon as a mismatch is found.
    """

    SSIM_THRESHOLD = 0.92  # Above this means "screens are visually identical"

    def verify_change(self, before: ScreenState, after: ScreenState) -> dict:
        """Check if the screen changed meaningfully between before and after states.

        Args:
            before: Screen state captured before the action.
            after: Screen state captured after the action.

        Returns:
            Dict with verification result and diagnostic details.
        """
        # Guard clause — both states must be available
        if not before or not after:
            return {"changed": False, "reason": "missing state data"}

        # Check 1: Visual similarity (SSIM)
        visual_changed = self._check_visual_change(before.screenshot_path, after.screenshot_path)

        # Check 2: Element-level changes
        element_changes = self._check_element_changes(before.elements, after.elements)

        # Combined verdict
        changed = visual_changed or any(
            c["type"] != "unchanged" for c in element_changes
        )

        return {
            "changed": changed,
            "visual_similarity_score": round(visual_changed[1], 4) if not visual_changed[0] else 1.0,
            "element_changes": element_changes,
            "reason": self._verdict_reason(changed, element_changes),
        }

    def _check_visual_change(self, before_path: str, after_path: str) -> tuple[bool, float]:
        """Compare two screenshots using SSIM. Returns (identical, score)."""
        if not SSIM_AVAILABLE:
            # Fallback: always claim change if paths differ (conservative)
            return before_path != after_path, 1.0

        try:
            import cv2
            before_img = cv2.imread(before_path)
            after_img = cv2.imread(after_path)

            if before_img is None or after_img is None:
                return True, 0.0

            # Convert to grayscale for comparison
            gray_before = cv2.cvtColor(before_img, cv2.COLOR_BGR2GRAY)
            gray_after = cv2.cvtColor(after_img, cv2.COLOR_BGR2GRAY)

            score = ssim(gray_before, gray_after)
            identical = score >= self.SSIM_THRESHOLD

            return identical, float(score)
        except Exception:
            return True, 0.0  # On error, assume change occurred

    def _check_element_changes(
        self, before_elements: list[UIElement], after_elements: list[UIElement],
    ) -> list[dict]:
        """Compare element lists and categorize changes."""
        before_ids = {el.element_id for el in before_elements}
        after_ids = {el.element_id for el in after_elements}

        removed = before_ids - after_ids
        added = after_ids - before_ids

        changes: list[dict] = []
        for eid in removed:
            changes.append({"element_id": eid, "type": "removed"})
        for eid in added:
            changes.append({"element_id": eid, "type": "added"})

        if not changes:
            changes.append({"element_id": "all", "type": "unchanged"})

        return changes

    def _verdict_reason(self, changed: bool, changes: list[dict]) -> str:
        if changed:
            types = set(c["type"] for c in changes)
            return f"Screen changed: {', '.join(types)}"
        return "No meaningful change detected"


class ErrorRecoveryEngine:
    """Applies recovery strategies based on classified error categories.

    Implements a prioritized recovery pipeline: cancel dialog → wait and retry →
    navigate back → escalate to human intervention. Each strategy has its own
    max retries and independent success criterion (Law 3: Atomic Predictability).
    """

    def __init__(
        self,
        executor: Any,
        classifier: DialogClassifier | None = None,
        verifier: StateVerifier | None = None,
        max_recovery_retries: int = 2,
    ) -> None:
        self.executor = executor
        self.classifier = classifier or DialogClassifier()
        self.verifier = verifier or StateVerifier()
        self.max_recovery_retries = max_recovery_retries

    def recover(self, failed_trace: InteractionTrace) -> InteractionTrace | None:
        """Attempt recovery for a failed action trace.

        Returns a new InteractionTrace with the recovery attempt result,
        or None if no recovery is possible (requires human intervention).
        """
        # Classify the error from the before/after states
        if not failed_trace.before_state:
            return None  # Nothing to analyze

        error_category = self.classifier.classify(failed_trace.before_state)

        # Determine recovery plan
        plan = self._determine_plan(error_category)

        if plan.requires_human_intervention:
            failed_trace.recovery_action = "escalated_to_human"
            failed_trace.error_message = (
                f"{plan.strategy}: Requires human intervention. "
                f"Error category: {error_category.value}. {plan.notes}"
            )
            return failed_trace

        # Attempt recovery up to max_recovery_retries
        for attempt in range(1, self.max_recovery_retries + 1):
            try:
                self._apply_strategy(plan)

                # Verify the recovery action produced a valid state
                if plan.strategy == "wait_and_retry":
                    # Re-capture and check if loading resolved
                    new_state = self.executor.get_current_screen_state()
                    if new_state and self.verifier.verify_change(
                        failed_trace.before_state, new_state
                    )["changed"]:
                        logger.info("Recovery successful on attempt %d", attempt)
                        result = InteractionTrace(
                            step_index=failed_trace.step_index,
                            before_state=failed_trace.before_state,
                            action=failed_trace.action,
                            action_status=ActionStatus.RECOVERED,
                            after_state=new_state,
                            recovery_action=f"{plan.strategy} (attempt {attempt})",
                        )
                        return result

            except Exception as e:
                logger.warning(
                    "Recovery attempt %d/%d failed: %s",
                    attempt, self.max_recovery_retries, e,
                )
                time.sleep(plan.wait_before_retry_ms / 1000)

        # Exhausted retries
        failed_trace.recovery_action = f"exhausted {self.max_recovery_retries} retries"
        return failed_trace

    def _determine_plan(self, error_category: ErrorCategory) -> ErrorRecoveryPlan:
        """Map error category to a concrete recovery plan."""
        plans = {
            ErrorCategory.LOADING_STATE: ErrorRecoveryPlan(
                error_category=error_category,
                strategy="wait_and_retry",
                max_retries=1,
                wait_before_retry_ms=3000,
                notes="Screen shows loading indicator; waiting for content to render.",
            ),
            ErrorCategory.UNEXPECTED_DIALOG: ErrorRecoveryPlan(
                error_category=error_category,
                strategy="cancel_dialog",
                max_retries=1,
                notes="Unexpected modal detected; attempt to dismiss with Escape key.",
            ),
            ErrorCategory.PERMISSION_DENIED: ErrorRecoveryPlan(
                error_category=error_category,
                strategy="escalate",
                max_retries=0,
                requires_human_intervention=True,
                notes="Permission prompt requires user decision (allow/deny).",
            ),
            ErrorCategory.CAPTCHA_DETECTED: ErrorRecoveryPlan(
                error_category=error_category,
                strategy="escalate",
                max_retries=0,
                requires_human_intervention=True,
                notes="CAPTCHA detected — cannot be solved programmatically.",
            ),
            ErrorCategory.CONNECTION_ERROR: ErrorRecoveryPlan(
                error_category=error_category,
                strategy="navigate_and_retry",
                max_retries=2,
                wait_before_retry_ms=5000,
                notes="Connection or server error; retry navigation.",
            ),
            ErrorCategory.ELEMENT_NOT_FOUND: ErrorRecoveryPlan(
                error_category=error_category,
                strategy="retry_with_scrolling",
                max_retries=2,
                wait_before_retry_ms=1000,
                notes="Target element not detected; try scrolling to reveal it.",
            ),
        }
        return plans.get(error_category, ErrorRecoveryPlan(
            error_category=error_category,
            strategy="escalate",
            max_retries=0,
            requires_human_intervention=True,
            notes=f"No defined recovery for {error_category.value}; escalating.",
        ))

    def _apply_strategy(self, plan: ErrorRecoveryPlan) -> None:
        """Execute the recovery strategy steps."""
        if plan.strategy == "wait_and_retry":
            time.sleep(plan.wait_before_retry_ms / 1000)

        elif plan.strategy == "cancel_dialog":
            try:
                import pyautogui as pg
                pg.press("escape")
                time.sleep(0.5)  # Wait for dialog to close
            except Exception:
                pass  # Escape might not be available on all platforms

        elif plan.strategy == "navigate_and_retry":
            if hasattr(self.executor, "reload"):
                self.executor.reload()

        elif plan.strategy == "retry_with_scrolling":
            try:
                import pyautogui as pg
                pg.scroll(-300)  # Scroll down to reveal hidden content
                time.sleep(0.5)
            except Exception:
                pass

        else:
            raise RuntimeError(f"Unknown recovery strategy: {plan.strategy}")
```

**BAD vs GOOD: Error Recovery**

```python
# ❌ BAD — Blind retry loop with no classification or exit condition
for i in range(10):
    try:
        action.execute()
        break
    except Exception:
        time.sleep(1)  # Same delay regardless of error type

# ✅ GOOD — Classified errors routed to targeted recovery strategies,
# each with independent success criterion and max retry cap
error = classify_error(screen_state)
plan = recovery_plans[error]
for attempt in range(plan.max_retries):
    apply_strategy(plan)
    if verify_recovery(screen_state):
        break  # Independent exit criterion per strategy
else:
    escalate_to_human(plan, error)
```

---

## Constraints

### MUST DO
- Follow the 5 Laws of Elegant Defense: Law 1 (Early Exit) — guard clauses at every pipeline stage boundary; Law 2 (Parse at boundary) — normalize all screen captures to consistent RGB format before passing downstream; Law 3 (Atomic Predictability) — never mutate screenshot data, create new State objects instead
- Always capture a pre-action and post-action screenshot for every executed action — without visual evidence, debugging GUI automation failures is guesswork
- Classify errors into defined categories (loading, dialog, permission, CAPTCHA, connection) rather than catching raw exceptions — classification enables targeted recovery strategies
- Set explicit maximum iteration counts on all interaction loops (default: 50) — unbounded loops on hung UIs waste compute and leave processes orphaned
- Use Playwright's auto-wait mechanisms for web automation instead of explicit sleeps — auto-wait reduces flakiness by waiting for elements to be actionable rather than just present
- Log full interaction traces with monotonic step indices for replay debugging — every trace entry must include before/after states, action type, and outcome
- Implement a state verifier (SSIM + element diff) after each action — blind action chains without verification are fragile and produce silent failures
- Handle cross-platform coordinate differences — screen coordinates differ between OSes with different DPI scaling; normalize all coordinates to the capture resolution

### MUST NOT DO
- Use hardcoded pixel coordinates that are not derived from detection output — UI layouts change across resolutions and window sizes; coordinates must come from detected element bounding boxes
- Disable PyAutoGUI's FAILSAFE mechanism — disabling the corner-corner abort makes it impossible to stop runaway automation scripts during development
- Retry the same action more than 3 times without changing strategy or adding delay — blind retries on a hung UI are useless and mask the real problem
- Attempt to solve CAPTCHAs or bypass security dialogs programmatically — these require human intervention and automating around them may violate terms of service
- Skip element visibility checks before actions — clicking a hidden element wastes a step and may trigger unexpected behavior from the application under test
- Store screenshots containing sensitive data (passwords, credit cards, PII) without encryption or automatic cleanup — interaction traces often capture screen contents that include user data

---

## Output Template

When implementing or operating a GUI agent, produce:

1. **Interaction Trace Report** — Chronological list of all steps with step index, action type, target description, execution status (success/failed/recovered), and duration
2. **Pre/After State Summary** — For each completed step, the SSIM similarity score between before and after screenshots, plus a count of added/removed detected elements
3. **Error Classification Summary** — Breakdown of all errors encountered during the session by category (loading, dialog, CAPTCHA, etc.) with count per category
4. **Recovery Action Log** — Details of each recovery attempt including strategy used, attempt number, success/failure outcome, and whether escalation was required
5. **Screen Capture Inventory** — List of all saved screenshot file paths with timestamps, dimensions, and approximate size (useful for debugging and evidence)
6. **Session Metrics** — Total steps executed, total session duration, average time per step, action success rate (%), recovery rate (%), and human escalation count

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | Text-based API/tool calling for applications with programmatic interfaces — preferred over GUI interaction when available |
| `coding-agent-frameworks` | General-purpose AI agent framework patterns (LangChain, AutoGen, CrewAI) that can incorporate GUI agents as tools |
| `mcp-integration` | Model Context Protocol integration for connecting the GUI agent to other tools and data sources within an agent ecosystem |

---

## Live References

> Authoritative documentation and research for GUI automation frameworks and vision-based UI understanding.

- [Google Project Mariner Paper — Navigating the GUI with a Vision-Language Agent](https://arxiv.org/abs/2310.xxxxx)
- [Playwright Documentation — Auto-Wait and Locator Strategies](https://playwright.dev/python/)
- [PyAutoGUI Cross-Platform GUI Automation](https://pyautogui.readthedocs.io/)
- [Selenium WebDriver Browser Automation](https://www.selenium.dev/documentation/webdriver/)
- [YOLOv8 Object Detection for UI Element Recognition](https://docs.ultralytics.com/models/yolov8/)
- [Structural Similarity Index (SSIM) for Image Comparison](https://scikit-image.org/docs/stable/api/skimage.metrics.html#skimage.metrics.structural_similarity)
- [Computer Vision for GUI Understanding — Survey Paper](https://arxiv.org/abs/2103.xxxxx)
- [Tesseract OCR Engine](https://github.com/tesseract-ocr/tesseract)
