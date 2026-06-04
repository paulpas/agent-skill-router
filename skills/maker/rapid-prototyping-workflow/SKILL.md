---




name: rapid-prototyping-workflow
description: Implements rapid prototyping workflows (code mocks, breadboard hardware,
  physical models, wireframes) with decision matrices and build-test-learn cycles
  to validate concepts quickly.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: maker
  triggers: rapid prototyping, quick prototype, proof of concept, iterative design,
    mockup, wireframe, how do i quickly test an idea
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: digital-fabrication, maker-safety-practices




---




# Rapid Prototyping Workflow

Implements rapid prototyping workflows to go from raw idea to verified concept through structured build-test-learn cycles. Models select the right fidelity level, choose appropriate build methods (software mockups, hardware breadboards, physical models), run focused validation tests, and make data-driven go/no-go/pivot decisions.

## TL;DR Checklist

- [ ] Define what specifically you need to learn or validate before building anything
- [ ] Choose the lowest viable fidelity that can answer your core question
- [ ] Build only ONE primary user interaction path — no edge cases yet
- [ ] Write test scenarios BEFORE starting construction so success criteria are clear
- [ ] Test with at least 3 real users or measurable conditions, not just yourself
- [ ] Collect quantifiable data: time-on-task, error rate, completion rate, satisfaction score (1–5)
- [ ] Run the Go/No-Go/Pivot decision matrix against your test results
- [ ] Archive all raw test data and notes for the next iteration

---

## When to Use

Use this skill when:

- You have a new product or feature concept and need to validate the core idea before investing in full development
- A stakeholder asks "can we try this out quickly?" and you need to deliver something tangible within hours or days
- You are choosing between multiple design approaches and need empirical data from real usage
- An existing prototype needs focused validation on a specific interaction path or feature
- You need to demonstrate feasibility to investors, team members, or customers with minimal effort
- A hardware concept (gadget, enclosure, mechanical linkage) needs physical form before tooling investment

---

## When NOT to Use

Avoid this skill for:

- Production-ready implementation work where quality and reliability matter more than speed — use the appropriate domain engineering skill instead
- Exploring established patterns where a proven solution already exists — don't prototype something that has been solved a dozen times
- Situations requiring regulatory compliance validation — prototypes cannot substitute for certified testing (medical devices, aircraft controls, safety-critical systems)

---

## Core Workflow

### Step 1: Define the Prototype Goal

Identify the single most important question your prototype must answer. Every prototype should validate one core hypothesis.

**Questions to narrow scope:**
- What assumption are you most uncertain about? (user need, technical feasibility, usability, cost)
- If this prototype fails, what do you learn? If it succeeds, what do you learn?
- What is the minimum information needed to make a Go/No-Go/Pivot decision?

**Choose fidelity level:**
| Fidelity | Time Budget | Best For | Examples |
|----------|-------------|----------|----------|
| Low | 1–4 hours | Validating flow, layout, concept clarity | Paper sketches, sticky notes, whiteboard diagrams, index card storyboards |
| Medium | Half day to 2 days | Validating interaction, feel, basic functionality | Figma interactive wireframe, cardboard/foam physical model, code stub with hardcoded responses |
| High | 2–7 days | Validating performance, real-world conditions, user acceptance | Working software prototype with real data flows, assembled Arduino sensor circuit, CNC-machined rough part |

**Checkpoint:** Write your core hypothesis as a falsifiable statement. "Users will complete the checkout flow in under 90 seconds" is testable. "Users might like it" is not.

---

### Step 2: Select Build Method Based on Prototype Type

Match your prototype type to the most effective build method.

**Software prototypes:** Use code mocks with real API-like interfaces but hardcoded or simplified responses. FastAPI, Flask, or even a Python script with `requests` works well. Goal: make it feel real without building real backend logic.

**Hardware prototypes:** Breadboard + microcontroller (Arduino, ESP32, Raspberry Pi Pico) for sensor/actuator testing. Use existing breakout boards and shields — never solder until the circuit logic is validated.

**Physical models:** Cardboard, foam core, clay, or 3D-printed rough shapes. The goal is spatial validation: does it fit in a hand? Does it mount correctly? Would someone intuitively know where to press?

---

### Step 3: Build the Minimum Viable Prototype

Focus exclusively on the primary interaction path. Do not build error handling, edge cases, or polish. A broken prototype that reveals one insight is worth more than a polished prototype that hides problems.

**Build rules:**
- One core flow only: if it's an app, just the happy path. If it's a device, just the primary mode of operation.
- Hardcode responses: fake API calls, simulated sensor values, dummy UI states — anything that gets you to the interaction point faster.
- Use existing libraries and components: FastAPI templates, Arduino sensor libraries, cardboard measurement guides. No custom code unless it serves the core hypothesis.
- Build in timeboxes: 30-minute increments with a visible timer. When time is up, stop and evaluate what you have.

**Checkpoint:** Can someone use your prototype to answer your core hypothesis question within 2 minutes of first contact? If not, cut features until they can.

---

### Step 4: Define Test Scenarios Before Testing

Write test scenarios with specific success criteria before showing the prototype to anyone. Each scenario should produce measurable data.

**Test scenario structure:**
```json
{
  "scenario_id": "TS-001",
  "description": "User finds and configures their first sensor profile",
  "prerequisite": "Prototype is running on laptop, connected via USB",
  "instructions": [
    "Open the prototype application in a browser",
    "Create a new sensor profile with your chosen parameters",
    "Save the profile and view it in the list"
  ],
  "success_criteria": {
    "time_max_seconds": 90,
    "error_tolerance": 0,
    "satisfaction_minimum": 3
  },
  "metrics_to_capture": ["completion_time", "mistake_count", "help_requested"]
}
```

**Checkpoint:** Every scenario must have at least one quantitative measure. If you cannot count it or time it, rewrite the scenario.

---

### Step 5: Run Tests with Real Users or Conditions

Get at least 3 independent test runs. Three is the minimum where patterns start emerging; five gives you confidence in trends.

**Testing protocol:**
- **Observe without guiding.** Say "try to do X" and then stay silent. Note where they hesitate, what they click first, what confuses them.
- **Capture time-on-task** with a stopwatch or screen recording.
- **Record error rate** — how many wrong clicks, backtracks, or confused expressions occur per task.
- **Collect satisfaction score** immediately after each scenario: "On a scale of 1 to 5, how easy was that?"
- **Ask one open-ended question at the end:** "What would you change if this were real?"

**For hardware tests:** Run the assembled breadboard circuit through its intended operating conditions. Measure actual sensor values against expected ranges with a multimeter or serial monitor. Log anomalies — intermittent connections, noise, drift.

---

### Step 6: Analyze Results and Make Go/No-Go/Pivot Decision

Score each test scenario against your success criteria, then apply the decision matrix.

**Scoring rubric per scenario:**
| Score | Meaning | Action |
|-------|---------|--------|
| 4 — Exceeded | Performance well above target (e.g., 50s when target was 90s) | Proceed to next fidelity level; document what worked exceptionally well |
| 3 — Passed | Met or closely approached target criteria | Proceed but note specific friction points to address in next iteration |
| 2 — Borderline | Partially met criteria (e.g., average passed but some users failed) | Iterate on the problematic areas only; do not build new features yet |
| 1 — Failed | Did not meet minimum success threshold | Pivot: fundamentally reconsider the approach or abandon the hypothesis |

**Decision rules:**
- **Go to production planning** if all scenarios score 3+ AND at least one scenario scores 4. Total test time under 2 hours of engineer effort so far.
- **Iterate (build-test-learn cycle)** if any scenario scores 1 or 2. Identify the root cause from observation notes, build a targeted fix, and retest within 24 hours.
- **Pivot** if more than half the scenarios score 1 AND the core hypothesis is fundamentally wrong (e.g., users don't need this feature at all). Reassess before investing more time.
- **Kill gracefully** if the cost of further iteration exceeds the expected value by a 3:1 ratio. Document what you learned and archive for future reference.

---

## Implementation Patterns

### Pattern 1: Code-Based Mock Prototype (Python FastAPI)

A FastAPI-based mock that simulates a real backend with hardcoded responses, in-memory state, and realistic timing delays. Perfect for validating API interactions, data flows, and front-end integration without building actual business logic.

```python
"""
Mock prototype server for rapid UX/API validation.

Simulates a sensor management API with:
- In-memory "database" of mock readings
- Realistic response times (artificial latency)
- Hardcoded error scenarios for testing edge cases
- JSON endpoints matching expected production contract
"""

from __future__ import annotations

import asyncio
import random
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Domain models — match expected production contract
# ---------------------------------------------------------------------------

@dataclass
class SensorProfile:
    id: str
    name: str
    sensor_type: str  # "temperature", "humidity", "motion", "pressure"
    unit: str
    sample_rate_hz: int = Field(ge=1, le=1000)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SensorReading:
    profile_id: str
    value: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# In-memory mock "database"
# ---------------------------------------------------------------------------

class MockDatabase:
    """In-memory store simulating a production database."""

    def __init__(self) -> None:
        self.profiles: dict[str, SensorProfile] = {}
        self.readings: list[SensorReading] = []
        self._next_id: int = 1

    def create_profile(self, name: str, sensor_type: str, unit: str, sample_rate_hz: int) -> SensorProfile:
        """Create a new mock profile with auto-generated ID."""
        profile_id = f"sensor-{self._next_id:04d}"
        self._next_id += 1

        profile = SensorProfile(
            id=profile_id,
            name=name,
            sensor_type=sensor_type,
            unit=unit,
            sample_rate_hz=sample_rate_hz,
        )
        self.profiles[profile_id] = profile

        # Seed with realistic mock readings (last 10 minutes)
        base_value = self._generate_base_value(sensor_type)
        for offset_seconds in range(600, 0, -5):
            reading = SensorReading(
                profile_id=profile_id,
                value=round(base_value + random.uniform(-2.0, 2.0), 2),
                timestamp=datetime.now(timezone.utc).timestamp() - offset_seconds,
            )
            # Convert timestamp to datetime for the reading
            reading.timestamp = datetime.fromtimestamp(
                datetime.now(timezone.utc).timestamp() - offset_seconds, tz=timezone.utc
            )
            self.readings.append(reading)

        return profile

    def get_readings(self, profile_id: str, limit: int = 50) -> list[SensorReading]:
        """Return the most recent readings for a profile."""
        if profile_id not in self.profiles:
            raise KeyError(f"Profile '{profile_id}' not found")

        profile_readings = [r for r in self.readings if r.profile_id == profile_id]
        return sorted(profile_readings, key=lambda r: r.timestamp, reverse=True)[:limit]

    def delete_profile(self, profile_id: str) -> bool:
        """Remove a profile and all its readings."""
        if profile_id not in self.profiles:
            return False

        del self.profiles[profile_id]
        self.readings = [r for r in self.readings if r.profile_id != profile_id]
        return True

    @staticmethod
    def _generate_base_value(sensor_type: str) -> float:
        """Return realistic baseline values per sensor type."""
        bases: dict[str, float] = {
            "temperature": 22.0,
            "humidity": 45.0,
            "motion": 0.0,
            "pressure": 1013.0,
        }
        return bases.get(sensor_type, 50.0)


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Sensor API (Mock Prototype)",
    description="Rapid prototype mock for UX and integration testing",
    version="0.1.0-mock",
)

db = MockDatabase()


class CreateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    sensor_type: str = Field(..., pattern=r"^(temperature|humidity|motion|pressure)$")
    unit: str = Field(..., min_length=1)
    sample_rate_hz: int = Field(default=10, ge=1, le=1000)


@app.post("/api/v1/profiles", response_model=dict, status_code=201)
async def create_profile(req: CreateProfileRequest) -> dict:
    """Create a new sensor profile with artificial latency to simulate network."""
    await asyncio.sleep(0.08)  # ~80ms mock network delay
    profile = db.create_profile(req.name, req.sensor_type, req.unit, req.sample_rate_hz)

    return {
        "status": "created",
        "profile": asdict(profile),
        "_mock_note": "This is a prototype endpoint — real persistence not yet implemented",
    }


@app.get("/api/v1/profiles/{profile_id}/readings")
async def get_readings(
    profile_id: str,
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    """Return recent readings with configurable window."""
    await asyncio.sleep(0.04)  # ~40ms mock latency

    try:
        readings = db.get_readings(profile_id, limit=limit)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "profile_id": profile_id,
        "count": len(readings),
        "readings": [asdict(r) for r in readings],
    }


@app.delete("/api/v1/profiles/{profile_id}", status_code=200)
async def delete_profile(profile_id: str) -> dict:
    """Delete a profile and its readings."""
    removed = db.delete_profile(profile_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")

    return {"status": "deleted", "profile_id": profile_id}


@app.get("/health")
async def health_check() -> dict:
    """Health endpoint for prototype server monitoring."""
    return {
        "status": "running",
        "mode": "mock",
        "profiles_loaded": len(db.profiles),
        "readings_count": len(db.readings),
    }


# ---------------------------------------------------------------------------
# Automated test harness
# ---------------------------------------------------------------------------

def run_prototype_test_harness(base_url: str = "http://127.0.0.1:8000") -> dict:
    """Lightweight test harness — runs without external dependencies beyond httpx or requests.

    Uses only Python stdlib via urllib for zero-dependency testing.
    """
    import urllib.request
    import json
    from dataclasses import asdict

    results: list[dict] = []
    errors: list[str] = []

    def api_request(method: str, path: str, body: Optional[dict] = None) -> dict:
        url = f"{base_url}{path}"
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"} if data else {},
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode())
        except Exception as exc:
            errors.append(f"{method} {path}: {exc}")
            raise

    # Test 1: Health check
    print("TEST: Health endpoint")
    health = api_request("GET", "/health")
    assert health["status"] == "running" and health["mode"] == "mock"
    results.append({"test": "health_check", "passed": True, "response": health})
    print(f"  PASS — {json.dumps(health)}")

    # Test 2: Create a temperature profile
    print("\nTEST: Create sensor profile")
    create_body = {
        "name": "Lab Temperature",
        "sensor_type": "temperature",
        "unit": "Celsius",
        "sample_rate_hz": 5,
    }
    created = api_request("POST", "/api/v1/profiles", create_body)
    profile_id = created["profile"]["id"]
    assert created["status"] == "created"
    results.append({"test": "create_profile", "passed": True})
    print(f"  PASS — Created {profile_id}")

    # Test 3: Fetch readings
    print("\nTEST: Read readings")
    readings = api_request("GET", f"/api/v1/profiles/{profile_id}/readings", limit=10)
    assert readings["count"] <= 10 and readings["count"] > 0
    results.append({"test": "fetch_readings", "passed": True, "reading_count": readings["count"]})
    print(f"  PASS — Retrieved {readings['count']} readings")

    # Test 4: Delete profile
    print("\nTEST: Delete profile")
    deleted = api_request("DELETE", f"/api/v1/profiles/{profile_id}")
    assert deleted["status"] == "deleted"
    results.append({"test": "delete_profile", "passed": True})
    print(f"  PASS — Profile deleted")

    # Test 5: Delete non-existent profile (error handling)
    print("\nTEST: Delete non-existent profile (expect 404)")
    try:
        api_request("DELETE", "/api/v1/profiles/sensor-9999")
        results.append({"test": "delete_nonexistent", "passed": False, "error": "Should have raised 404"})
    except HTTPException as exc:
        if exc.status_code == 404:
            results.append({"test": "delete_nonexistent", "passed": True})
            print(f"  PASS — Correctly returned 404")
        else:
            results.append({"test": "delete_nonexistent", "passed": False, "error": f"Wrong code: {exc.status_code}"})

    summary = {
        "total": len([r for r in results if r.get("passed")]),
        "failed": len([r for r in results if not r.get("passed")]),
        "errors": errors,
        "all_passed": all(r.get("passed", False) for r in results),
    }

    print(f"\n{'='*50}")
    print(f"TEST SUMMARY: {summary['total']} passed, {summary['failed']} failed")
    if summary["errors"]:
        print(f"ERRORS: {summary['errors']}")

    return summary


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
```

---

### Pattern 2: Hardware Breadboard Prototype (Arduino)

An Arduino sketch for breadboard prototyping that reads simulated sensor values, provides serial diagnostics, and includes a self-test sequence on startup. Use this to validate sensor logic before committing to PCB design.

```cpp
/**
 * Breadboard Prototype Sketch — Sensor Validation
 * 
 * Reads from multiple sensor types (simulated via analog inputs),
 * outputs structured serial data for test harness consumption,
 * and performs a self-test on boot.
 * 
 * Hardware: Arduino Uno / Nano
 * - A0: Temperature sensor (simulate with potentiometer or TMP36)
 * - A1: Humidity sensor (simulate with voltage divider)
 * - A2: Motion detection (simulate with pushbutton to 5V)
 * - A3: Pressure sensor ADC output
 * 
 * Serial output format (JSON-like for easy parsing):
 * {"t":<timestamp_ms>,"temp":<value_c>,"humid":<value_pct>,"motion":<bool>,"press":<value_hpa>}
 */

#ifndef PROTOTYPE_SERIAL_BAUD
#define PROTOTYPE_SERIAL_BAUD 115200
#endif

// Pin definitions — easy to rewire on breadboard
constexpr uint8_t PIN_TEMP_A0 = A0;
constexpr uint8_t PIN_HUMID_A1 = A1;
constexpr uint8_t PIN_MOTION_D2 = 2;
constexpr uint8_t PIN_PRESSURE_A3 = A3;

// Sampling configuration
constexpr unsigned long SAMPLE_INTERVAL_MS = 5000;  // 5-second intervals for prototype speed
constexpr uint8_t SELF_TEST_READINGS = 5;            // Readings per self-test cycle

// Sensor calibration offsets (adjust for your specific components)
constexpr float TEMP_OFFSET_C = -1.2;
constexpr float HUMID_OFFSET_PCT = 3.0;

struct SensorReading {
  unsigned long timestamp_ms;
  float temperature_c;
  float humidity_pct;
  bool motion_detected;
  float pressure_hpa;
};

bool self_test_passed = true;

void setup() {
  Serial.begin(PROTOTYPE_SERIAL_BAUD);

  // Wait for serial connection (important for USB debugging)
  while (!Serial && millis() < 5000) {
    yield();
  }

  pinMode(PIN_MOTION_D2, INPUT_PULLUP);

  Serial.println("--- SENSOR PROTOTYPE: SELF-TEST START ---");
  run_self_test();

  if (self_test_passed) {
    Serial.println("SELF-TEST: PASSED — ready for data collection\n");
  } else {
    Serial.println("SELF-TEST: FAILED — check wiring and retry\n");
  }
}

void loop() {
  if (!self_test_passed) {
    // If self-test failed, blink LED and wait — no data output
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
    delay(800);
    return;
  }

  SensorReading reading = read_all_sensors();
  print_reading_json(reading);

  delay(SAMPLE_INTERVAL_MS - 100); // Account for processing time
}

SensorReading read_all_sensors() {
  SensorReading r{};
  r.timestamp_ms = millis();

  // Temperature: read ADC and convert (assuming TMP36 or potentiometer)
  int raw_temp = analogRead(PIN_TEMP_A0);
  float voltage_temp = raw_temp * (5.0 / 1023.0);
  // TMP36: 10mV per degree C, 0.5V offset => temp = (voltage - 0.5) * 100
  r.temperature_c = ((voltage_temp - 0.5) * 100.0) + TEMP_OFFSET_C;

  // Humidity: simulated via voltage divider on A1
  int raw_humid = analogRead(PIN_HUMID_A1);
  float humidity_raw = (raw_humid / 1023.0) * 100.0;
  r.humidity_pct = constrain(humidity_raw + HUMID_OFFSET_PCT, 0.0, 100.0);

  // Motion: digital input with pullup (active-low)
  int motion_state = digitalRead(PIN_MOTION_D2);
  r.motion_detected = (motion_state == LOW);

  // Pressure: ADC reading from pressure sensor module
  int raw_pressure = analogRead(PIN_PRESSURE_A3);
  float voltage_pressure = raw_pressure * (5.0 / 1023.0);
  // Convert to hPa based on sensor sensitivity (example: 0-5V maps to 800-1100 hPa)
  r.pressure_hpa = mapFloat(voltage_pressure, 0.0, 5.0, 800.0, 1100.0);

  return r;
}

void print_reading_json(const SensorReading& r) {
  // Compact JSON for easy parsing by test harness scripts
  Serial.printf("{\"t\":%lu,\"temp\":%.2f,\"humid\":%.1f,\"motion\":%s,\"press\":%.1f}\n",
    r.timestamp_ms,
    r.temperature_c,
    r.humidity_pct,
    r.motion_detected ? "true" : "false",
    r.pressure_hpa
  );
}

void run_self_test() {
  Serial.print("  Checking ADC channels... ");

  // Read all analog pins and verify they return values in expected range
  for (uint8_t pin = A0; pin <= A3; pin++) {
    int value = analogRead(pin);
    if (value < 0 || value > 1023) {
      Serial.printf("FAIL on pin A%d: raw=%d\n", pin - A0, value);
      self_test_passed = false;
      return;
    }
  }
  Serial.println("OK");

  // Check digital motion sensor
  Serial.print("  Checking motion sensor (D2)... ");
  int motion_raw = digitalRead(PIN_MOTION_D2);
  if (motion_raw != LOW && motion_raw != HIGH) {
    Serial.println("FAIL — pin not responding");
    self_test_passed = false;
    return;
  }
  Serial.printf("OK (raw=%d)\n", motion_raw);

  // Blink LED to confirm controller is alive
  Serial.print("  Checking LED indicator... ");
  for (int i = 0; i < SELF_TEST_READINGS; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }
  Serial.println("OK");

  // Check serial output
  Serial.print("  Checking serial communication... ");
  Serial.println("SELF-TEST SERIAL ECHO OK");
  delay(200);
  Serial.println("  Self-test complete.");
}

// Floating-point map for pressure conversion (Arduino's map() only works with ints)
float mapFloat(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
```

---

### Pattern 3: Physical Model Construction Guide

Cardboard and foam core models are the fastest way to validate spatial relationships, ergonomics, and assembly fit. This pattern provides measurement templates and construction rules for rapid physical prototyping.

```python
"""
Physical model measurement template generator.

Generates precise cutting templates for cardboard/foam core prototypes.
Outputs SVG files that can be cut with a utility knife on a self-healing mat
or sent to a laser cutter for clean edges.

Usage:
    python physical_model_template.py --type enclosure --width 120 --height 80 --depth 40 --wall 3
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class EnclosureTemplate:
    """Dimensions for a simple rectangular enclosure with snap-fit corners."""

    width_mm: float          # Outer width (X axis)
    height_mm: float         # Outer height (Z axis — panel depth)
    depth_mm: float          # Outer depth (Y axis)
    wall_thickness_mm: float = 3.0
    tab_width_mm: float = 8.0
    tab_height_mm: float = wall_thickness_mm * 2 + 2.0
    corner_radius_mm: float = 5.0

    def generate_svg(self) -> str:
        """Generate a flat-folded enclosure layout as SVG for cutting."""
        w = self.width_mm
        h = self.depth_mm
        t = self.wall_thickness_mm
        tab_w = self.tab_width_mm
        r = min(self.corner_radius_mm, t / 2)

        # Layout: bottom panel centered, side flaps extending outward
        # Top/bottom panels are (w - 2*t) x h
        inner_w = w - 2 * t
        flap_h = self.height_mm - t

        svg_parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {int(w + tab_w * 4)} {int(h * 3 + tab_h * 2)}" width="{int(w + tab_w * 4)}mm" height="{int(h * 3 + tab_h * 2)}mm">']
        svg_parts.append(f'  <desc>Enclosure template: {w}x{h}x{t}mm, wall={t}mm</desc>')

        # Material type label
        svg_parts.append(f'  <text x="10" y="20" font-family="monospace" font-size="10">Template: {w:.0f}x{self.height_mm:.0f}x{t:.0f}mm | Wall: {t}mm | Cut: utility knife or laser</text>')

        # Bottom panel
        bottom_y = h + tab_h
        svg_parts.append(
            f'  <rect x="{t}" y="{bottom_y}" width="{inner_w}" height="{h}" '
            f'rx="{r}" ry="{r}" fill="none" stroke="#333" stroke-width="0.5"/>'
        )

        # Left flap (height = panel depth minus wall)
        left_x = t - tab_w
        svg_parts.append(
            f'  <rect x="{left_x}" y="{bottom_y}" width="{tab_w}" height="{flap_h}" '
            f'fill="#e8f4e8" stroke="#333" stroke-width="0.5"/>'
        )

        # Right flap
        right_x = t + inner_w
        svg_parts.append(
            f'  <rect x="{right_x}" y="{bottom_y}" width="{tab_w}" height="{flap_h}" '
            f'fill="#e8f4e8" stroke="#333" stroke-width="0.5"/>'
        )

        # Top/bottom flaps (on the ends)
        top_flap_y = bottom_y - flap_h
        svg_parts.append(
            f'  <rect x="{t}" y="{top_flap_y}" width="{inner_w}" height="{tab_h}" '
            f'fill="#fff3e0" stroke="#333" stroke-width="0.5"/>'
        )

        bottom_flap_y = bottom_y + h
        svg_parts.append(
            f'  <rect x="{t}" y="{bottom_flap_y}" width="{inner_w}" height="{tab_h}" '
            f'fill="#fff3e0" stroke="#333" stroke-width="0.5"/>'
        )

        # Fold lines (dashed)
        svg_parts.append(f'  <line x1="{t}" y1="{bottom_y + flap_h/2 - tab_h/2}" x2="{t + inner_w}" y2="{bottom_y + flap_h/2 - tab_h/2}" stroke="#999" stroke-width="0.3" stroke-dasharray="4,2"/>')
        svg_parts.append(f'  <line x1="{t}" y1="{bottom_y + h - (flap_h - tab_h)/2}" x2="{t + inner_w}" y2="{bottom_y + h - (flap_h - tab_h)/2}" stroke="#999" stroke-width="0.3" stroke-dasharray="4,2"/>')

        # Dimension annotations
        svg_parts.append(f'  <text x="{t + inner_w/2}" y="{bottom_y + h + 15}" text-anchor="middle" font-size="8">{inner_w:.0f}mm</text>')
        svg_parts.append(f'  <text x="{left_x - 8}" y="{bottom_y + flap_h/2}" text-anchor="middle" font-size="8" transform="rotate(-90, {left_x - 8}, {bottom_y + flap_h/2})">{flap_h:.0f}mm</text>')

        svg_parts.append('</svg>')
        return '\n'.join(svg_parts)


def generate_template(
    shape: str = "enclosure",
    width_mm: float = 120.0,
    height_mm: float = 80.0,
    depth_mm: float = 40.0,
    wall_thickness_mm: float = 3.0,
) -> str:
    """Generate a physical prototype template in the specified shape format.

    Args:
        shape: One of 'enclosure', 'bracket', 'stand'.
        width_mm: Outer dimension along X axis.
        height_mm: Outer dimension along Z (panel depth).
        depth_mm: Outer dimension along Y (fold direction).
        wall_thickness_mm: Material thickness in mm (cardboard ~1.2mm, foam core 3mm).

    Returns:
        SVG string ready to print or send to laser cutter.
    """
    if shape == "enclosure":
        template = EnclosureTemplate(
            width_mm=width_mm,
            height_mm=height_mm,
            depth_mm=depth_mm,
            wall_thickness_mm=wall_thickness_mm,
        )
        return template.generate_svg()

    raise ValueError(f"Unsupported shape: {shape}. Use 'enclosure', 'bracket', or 'stand'.")


# Quick CLI-style usage example
if __name__ == "__main__":
    svg = generate_template(shape="enclosure", width_mm=120, height_mm=80, depth_mm=40)

    output_path = "prototype_enclosure_template.svg"
    with open(output_path, "w") as f:
        f.write(svg)

    print(f"Generated template written to: {output_path}")
    print(f"Template dimensions: 120x80x40mm with 3mm walls")
    print("Cut along solid lines, score (do NOT cut through) along dashed fold lines.")
```

---

### Pattern 4: Digital Fidelity Progression (Paper → Wireframe → Interactive Mockup)

A structured progression guide for moving from analog to digital prototypes. Each fidelity level answers different questions and should be validated before proceeding to the next.

**Progression decision matrix:**

| If your prototype passes this test... | Proceed to... | Skip... |
|---------------------------------------|---------------|---------|
| Paper sketch: users can identify all key screens in under 30 seconds | Interactive wireframe (Figma, Excalidraw) | Detailed visual mockup |
| Wireframe: users complete primary flow with <3 wrong clicks | Clickable prototype with transitions | Styled mockup with brand colors |
| Clickable prototype: average completion time within 20% of target | Code-based mock prototype (FastAPI pattern above) | Full feature implementation |

**Wireframe specification template:**
```python
"""
Wireframe specification — structured data defining each screen layout.
Convert to Figma components or hand off to design tools.
"""

from dataclasses import dataclass, field
from typing import Optional
import json


@dataclass
class UIElement:
    """A single UI element with position and interaction spec."""
    component_type: str  # "button", "input", "card", "label", "icon"
    label: str
    x_percent: float      # Horizontal position (0-100)
    y_percent: float      # Vertical position (0-100)
    width_percent: float  # Relative to parent container
    height_percent: float = 5.0
    interactions: list[str] = field(default_factory=list)


@dataclass
class ScreenSpec:
    """Complete screen specification for wireframe construction."""
    screen_id: str
    title: str
    elements: list[UIElement] = field(default_factory=list)
    navigation_links: list[tuple[str, str]] = field(default_factory=list)  # (from_element, to_screen_id)

    def to_json(self) -> str:
        data = {
            "screen_id": self.screen_id,
            "title": self.title,
            "elements": [vars(e) for e in self.elements],
            "navigation_links": list(self.navigation_links),
        }
        return json.dumps(data, indent=2)


def build_sample_flow() -> list[ScreenSpec]:
    """Build a minimal sensor dashboard wireframe flow for prototyping."""

    screen_home = ScreenSpec(
        screen_id="home",
        title="Sensor Dashboard",
        elements=[
            UIElement("label", "Dashboard", 5, 5, 90),
            UIElement("card", "Temperature", 10, 20, 35, 30, ["navigate to detail"]),
            UIElement("card", "Humidity", 55, 20, 35, 30, ["navigate to detail"]),
            UIElement("button", "+ Add Sensor", 40, 60, 20, 5, ["navigate to create_profile"]),
        ],
        navigation_links=[
            ("Temperature", "sensor_detail"),
            ("Humidity", "sensor_detail"),
            ("Add Sensor", "create_profile"),
        ],
    )

    screen_create = ScreenSpec(
        screen_id="create_profile",
        title="Create Sensor Profile",
        elements=[
            UIElement("label", "New Sensor", 5, 5, 90),
            UIElement("input", "Sensor Name", 10, 20, 80, 6),
            UIElement("input", "Location", 10, 32, 80, 6),
            UIElement("button", "Save Profile", 40, 55, 20, 6, ["navigate to home"]),
            UIElement("button", "Cancel", 60, 55, 20, 6, ["navigate to home"]),
        ],
        navigation_links=[
            ("Save Profile", "home"),
            ("Cancel", "home"),
        ],
    )

    return [screen_home, screen_create]


if __name__ == "__main__":
    flow = build_sample_flow()
    for screen in flow:
        print(screen.title)
        print("=" * len(screen.title))
        for elem in screen.elements:
            marker = "→" if elem.interactions else "  "
            print(f"  {marker} [{elem.component_type}] {elem.label}")
        print()
```

---

## Constraints

### MUST DO
- Write a falsifiable hypothesis statement before starting any build — if you can't measure the outcome, you're just crafting, not prototyping
- Choose the lowest viable fidelity that can answer your core question — paper is faster than code, code is faster than fabrication
- Build only ONE interaction path per prototype — no error handling, no settings pages, no "nice-to-have" features
- Define test scenarios with quantitative success criteria BEFORE showing the prototype to anyone
- Test with at least 3 independent users or measurable conditions — never validate against yourself alone
- Run the Go/No-Go/Pivot decision matrix after every test session using the scoring rubric in Step 6
- Archive all raw test data (timing, observations, quotes) for the next iteration's reference

### MUST NOT DO
- Build error handling, polish, or edge cases into a prototype — they hide the core problems you're trying to find
- Test with only yourself as the user — you know how it works and will unconsciously guide testers through problems
- Move to the next fidelity level without validating at the current one — each level has a specific validation gate
- Use a prototype to "prove" your idea is perfect — prototypes are for finding problems, not confirming hopes
- Invest more than 7 days in any single prototype iteration — if you haven't validated your core hypothesis by then, pivot
- Share unfinished intermediate work as the final result — stakeholders will judge the rough edges, not the underlying insight

---

## Output Template

When this skill is active, produce:

1. **Hypothesis Statement** — One falsifiable sentence describing what you're testing
2. **Fidelity Selection** — Chosen fidelity level with rationale from the decision matrix
3. **Build Artifact** — The actual prototype (code file, SVG template, Arduino sketch, or wireframe spec)
4. **Test Plan** — Numbered test scenarios with quantitative success criteria in JSON format
5. **Decision Outcome** — Go / Iterate / Pivot / Kill with specific score data backing the recommendation

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `digital-fabrication` | Turn validated prototypes into physical parts via 3D printing, laser cutting, or CNC milling |
| `maker-safety-practices` | Safe operating procedures for all fabrication methods used in prototyping |
| `rapid-prototyping-workflow` | This skill — the overarching workflow that selects and sequences all prototyping approaches |
