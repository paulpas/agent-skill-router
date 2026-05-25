---
name: template-method-pattern
description: Implements the GoF Template Method pattern for defining algorithm skeletons in Python ABCs with customizable hook methods, comparing inheritance-based templating vs composition-based strategy selection.
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: template method pattern, abstract base class algorithm, hook method python, how do i define algorithm skeleton, subclass customization, inheritance-based extension, strategy vs template method
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: single-responsibility, dry-principles, open-closed-principle, design-patterns-and-principles
---

# Template Method Pattern

Senior Python engineer implementing the Template Method pattern for defining algorithm skeletons in abstract base classes with customizable hook methods. This skill makes the model decide between inheritance-based templating (Template Method) and composition-based selection (Strategy), building shallow hierarchies where subclasses provide only the variable steps while the invariant algorithm structure lives in the base class.

## TL;DR Checklist

- [ ] Define an ABC with a `final` template method that calls abstract/hook methods in a fixed sequence
- [ ] Use `@abstractmethod` for steps that every subclass must implement (required hooks)
- [ ] Use concrete methods with default behavior for optional customization points (optional hooks)
- [ ] Mark the template method as `final` to prevent subclasses from changing the algorithm structure
- [ ] Prefer Strategy pattern when the entire algorithm needs to swap; use Template Method only when the skeleton is fixed but some steps vary

---

## When to Use

Use this skill when:

- Multiple classes share the same overall algorithm but differ in one or more steps
- You want to eliminate duplicated algorithm structure across subclasses (DRY principle)
- The invariant parts of an algorithm (order of operations, error handling flow) should be centralized in a base class
- You need to define extension points (hooks) where subclasses can optionally inject behavior
- Building data processing pipelines, ETL steps, or report generation where the workflow is fixed but content varies

---

## When NOT to Use

Avoid this skill for:

- When algorithms differ significantly — use Strategy pattern instead of forcing similarity through inheritance
- Deep inheritance hierarchies (> 3 levels) — template methods in deep trees make behavior hard to trace
- When you need to swap algorithm steps at runtime per instance — use Strategy, not subclassing
- When subclasses should be able to reorder or skip steps — Template Method locks the sequence

---

## Core Workflow

1. **Identify the Invariant Algorithm Skeleton** — Analyze the common steps across related algorithms. The invariant steps (always run, always in the same order) belong in the base class template method. Variable steps are hooks that subclasses override. **Checkpoint:** List all steps; if more than 60% of steps are identical across implementations, Template Method is appropriate.

2. **Define the ABC with Final Template Method** — Create an ABC where the template method calls hook methods in a fixed order. Mark it as `final` to prevent subclasses from altering the algorithm structure. Required steps use `@abstractmethod`; optional hooks have default behavior (no-op or raise NotImplementedError). **Checkpoint:** The template method must be the only public method on the ABC; all other methods are protected/internal.

3. **Classify Hooks: Required vs Optional** — Step methods that every subclass MUST implement → `@abstractmethod`. Steps where subclasses may optionally customize → concrete method with sensible default (often pass or a no-op). **Checkpoint:** Test each abstract method by attempting to instantiate the ABC; it must fail if any abstract method is unimplemented.

4. **Implement Concrete Subclasses** — Each subclass overrides only the hooks it needs. The base class template handles control flow, error handling, and step sequencing. Keep subclasses shallow: they should override 1-3 hooks, not rewrite the entire algorithm. **Checkpoint:** Every concrete subclass must pass the same end-to-end test suite that the abstract class defines.

5. **Handle the Fragile Base Class Problem** — If base class changes break subclasses consistently, prefer composition (Strategy) over inheritance. Document all hook methods with clear contracts so subclasses know what to expect. **Checkpoint:** Changing a hook's signature or default behavior should be a breaking change that requires subclass updates — document this explicitly.

---

## Implementation Patterns

### Pattern 1: ABC-Based Template Method (Core Structure)

This is the canonical Template Method in Python using `abc.ABC` with `@abstractmethod` for required steps and concrete methods as optional hooks.

```python
from abc import ABC, abstractmethod
import logging
from typing import Any


logger = logging.getLogger(__name__)


class ReportGenerator(ABC):
    """Abstract base class defining the report generation algorithm skeleton.

    The template method generate_report() is final — subclasses cannot change
    the order of steps or skip required phases. They can only customize
    individual steps through hook methods.
    """

    def generate_report(self) -> str:
        """Final template method: defines the fixed algorithm structure.

        Steps execute in this exact order:
        1. validate_input() — ensure data is ready
        2. fetch_data() — gather the data to report on
        3. transform_data() — apply business transformations (optional hook)
        4. render_sections() — build report sections
        5. finalize_report() — apply formatting and return result

        Returns:
            The rendered report as a string.
        """
        self.validate_input()
        data = self.fetch_data()
        transformed = self.transform_data(data)
        sections = self.render_sections(transformed)
        return self.finalize_report(sections)

    # -- Required hooks (must be implemented by subclasses) --

    @abstractmethod
    def validate_input(self) -> None:
        """Validate that inputs are ready. Must be implemented.

        Raises:
            ValueError: If required data is missing or invalid.
        """
        ...

    @abstractmethod
    def fetch_data(self) -> dict[str, list[dict]]:
        """Fetch the raw data for this report type. Must be implemented.

        Returns:
            Dictionary mapping data categories to lists of records.
        """
        ...

    # -- Optional hooks (have default behavior) --

    def transform_data(self, data: dict[str, list[dict]]) -> dict[str, list[dict]]:
        """Transform raw data into report-ready format.

        Default implementation returns data unchanged — subclasses override
        to apply domain-specific transformations.

        Args:
            data: Raw data dictionary from fetch_data().

        Returns:
            Transformed data ready for rendering.
        """
        return data

    def render_sections(self, data: dict[str, list[dict]]) -> list[tuple[str, str]]:
        """Render the report as a list of (section_title, section_content) pairs.

        Default implementation produces a basic text format. Subclasses override
        for custom rendering (HTML, PDF, markdown).

        Args:
            data: Transformed data from transform_data().

        Returns:
            List of (title, content) tuples representing report sections.
        """
        sections: list[tuple[str, str]] = []
        for category, records in data.items():
            title = category.replace("_", " ").title()
            content = "\n".join(str(record) for record in records)
            sections.append((title, content))
        return sections

    def finalize_report(self, sections: list[tuple[str, str]]) -> str:
        """Combine all sections into the final report string.

        Default implementation joins sections with horizontal rules.

        Args:
            sections: List of (title, content) pairs from render_sections().

        Returns:
            The complete rendered report string.
        """
        parts = ["=" * 60, "REPORT", "=" * 60]
        for title, content in sections:
            parts.append(f"\n--- {title} ---\n")
            parts.append(content)
        return "\n".join(parts)


# Concrete subclasses — each only overrides what differs
class SalesReport(ReportGenerator):
    """Generates a formatted sales summary report."""

    def validate_input(self) -> None:
        if not hasattr(self, "region"):
            raise ValueError("SalesReport requires 'region' attribute")

    def fetch_data(self) -> dict[str, list[dict]]:
        # In production: query database for sales data
        return {
            "revenue": [
                {"month": "Jan", "amount": 15000},
                {"month": "Feb", "amount": 18000},
                {"month": "Mar", "amount": 22000},
            ],
            "orders": [
                {"order_id": "ORD-001", "items": 3},
                {"order_id": "ORD-002", "items": 7},
            ],
        }

    def transform_data(
        self, data: dict[str, list[dict]]
    ) -> dict[str, list[dict]]:
        """Add computed fields to sales data."""
        revenue = data["revenue"]
        total = sum(r["amount"] for r in revenue)
        revenue.append({"month": "TOTAL", "amount": total})  # type: ignore[arg-type]
        return data

    def render_sections(
        self, data: dict[str, list[dict]]
    ) -> list[tuple[str, str]]:
        """Custom HTML-style rendering for sales reports."""
        sections: list[tuple[str, str]] = []
        for category, records in data.items():
            title = category.replace("_", " ").title()
            if category == "revenue":
                amounts = [r["amount"] for r in records]
                content = f"Total Revenue: ${sum(amounts):,.2f}"
            else:
                content = "\n".join(f"  {k}: {v}" for r in records for k, v in r.items())
            sections.append((title, content))
        return sections


class InventoryReport(ReportGenerator):
    """Generates an inventory status report with stock level alerts."""

    def __init__(self, warehouse_id: str) -> None:
        self.warehouse_id = warehouse_id

    def validate_input(self) -> None:
        if not self.warehouse_id:
            raise ValueError("InventoryReport requires non-empty warehouse_id")

    def fetch_data(self) -> dict[str, list[dict]]:
        return {
            "stock": [
                {"sku": "SKU-001", "name": "Widget A", "qty": 150},
                {"sku": "SKU-002", "name": "Widget B", "qty": 3},
                {"sku": "SKU-003", "name": "Gadget C", "qty": 87},
            ],
        }

    def render_sections(
        self, data: dict[str, list[dict]]
    ) -> list[tuple[str, str]]:
        """Render with stock level warnings."""
        sections: list[tuple[str, str]] = []
        for category, records in data.items():
            title = category.replace("_", " ").title()
            lines: list[str] = []
            for rec in records:
                status = ""
                if rec.get("qty", 0) < 5:
                    status = " ⚠ LOW STOCK"
                lines.append(f"  {rec['sku']} | {rec['name']} | Qty: {rec['qty']}{status}")
            sections.append((title, "\n".join(lines)))
        return sections
```

### Pattern 2: ETL Pipeline with Hook-Based Customization (BAD vs. GOOD)

The BAD approach duplicates the entire ETL pipeline code in every subclass. The GOOD approach uses Template Method to centralize the invariant flow while allowing step customization via hooks.

```python
# ❌ BAD — Entire pipeline duplicated in each class, violating DRY
class CSVETL:
    def run(self):
        source = open("input.csv")  # hardcoded path, no error handling
        raw_rows = source.readlines()
        parsed = [row.strip().split(",") for row in raw_rows[1:]]
        transformed = [(r[0].upper(), float(r[1])) for r in parsed]
        records = [{"name": t[0], "value": t[1]} for t in transformed]
        with open("output.json", "w") as f:
            import json
            json.dump(records, f)
        source.close()


class JSONETL:
    def run(self):  # Same flow duplicated — just different I/O format
        import json
        with open("input.json") as source:
            raw = json.load(source)
        parsed = [item for item in raw["items"]]
        transformed = [(p["name"].upper(), float(p["value"])) for p in parsed]
        records = [{"name": t[0], "value": t[1]} for t in transformed]
        with open("output.json", "w") as f:
            json.dump(records, f)


# ✅ GOOD — Template Method centralizes the pipeline; subclasses only customize I/O
class ETLPipeline(ABC):
    """Template method defining the invariant ETL pipeline structure.

    All ETL pipelines follow: source → parse → transform → sink.
    Each step is a hook that subclasses customize.
    """

    def run(self) -> dict[str, int]:
        """Final template method — the ETL pipeline skeleton.

        Returns:
            Statistics dict with records_in, records_out, and duration_ms.
        """
        import time
        start = time.perf_counter()

        self._validate_source()
        raw_data = self._open_source()
        parsed = self._parse(raw_data)
        transformed = self._transform(parsed)
        self._write_output(transformed)
        records_out = len(transformed)

        duration_ms = (time.perf_counter() - start) * 1000
        return {"records_in": records_out, "records_out": records_out, "duration_ms": round(duration_ms, 2)}

    def _validate_source(self) -> None:
        """Validate that the source is accessible. Overridable hook."""
        if not self._source_path:
            raise ValueError(f"Source path required for {type(self).__name__}")

    @abstractmethod
    def _open_source(self) -> Any:
        """Open and return a handle to the data source. Must be implemented."""
        ...

    @abstractmethod
    def _parse(self, raw_data: Any) -> list[dict]:
        """Parse raw data into structured records. Must be implemented."""
        ...

    def _transform(self, parsed: list[dict]) -> list[dict]:
        """Transform parsed records. Optional hook — default is identity transform."""
        # Subclasses override to apply business logic
        return [
            {k.upper() if isinstance(k, str) else k: v for k, v in record.items()}
            for record in parsed
        ]

    @abstractmethod
    def _write_output(self, data: list[dict]) -> None:
        """Write transformed records to the output sink. Must be implemented."""
        ...


class CSVPipeline(ETLPipeline):
    """CSV-specific ETL pipeline with custom transform step."""

    def __init__(self, source_path: str = "input.csv") -> None:
        self._source_path = source_path

    def _open_source(self) -> list[str]:
        with open(self._source_path, "r", encoding="utf-8") as f:  # noqa: SIM115
            return f.readlines()

    def _parse(self, raw_data: list[str]) -> list[dict]:
        """Parse CSV rows into dicts using the first row as headers."""
        headers = raw_data[0].strip().split(",")
        records = []
        for line in raw_data[1:]:
            values = line.strip().split(",")
            if len(values) == len(headers):
                records.append(dict(zip(headers, values)))
        return records

    def _transform(self, parsed: list[dict]) -> list[dict]:
        """Uppercase all string keys and convert 'amount' to float."""
        transformed = []
        for record in parsed:
            new_record = {}
            for k, v in record.items():
                key = k.upper() if isinstance(k, str) else k
                if k.lower() == "amount":
                    try:
                        v = float(v)  # type: ignore[assignment]
                    except (ValueError, TypeError):
                        pass
                new_record[key] = v
            transformed.append(new_record)
        return transformed

    def _write_output(self, data: list[dict]) -> None:
        import json
        with open("output.json", "w", encoding="utf-8") as f:  # noqa: SIM115
            json.dump(data, f, indent=2)


class JSONPipeline(ETLPipeline):
    """JSON-specific ETL pipeline."""

    def __init__(self, source_path: str = "input.json") -> None:
        self._source_path = source_path

    def _open_source(self) -> Any:
        import json
        with open(self._source_path, "r", encoding="utf-8") as f:  # noqa: SIM115
            return json.load(f)

    def _parse(self, raw_data: Any) -> list[dict]:
        if isinstance(raw_data, list):
            return raw_data
        elif isinstance(raw_data, dict):
            for key in ("items", "records", "data"):
                if key in raw_data:
                    return raw_data[key]
        raise ValueError("JSON source must be a list or dict with known key")

    def _write_output(self, data: list[dict]) -> None:
        import json
        with open("output.json", "w", encoding="utf-8") as f:  # noqa: SIM115
            json.dump(data, f, indent=2)
```

### Pattern 3: When to Prefer Strategy Over Template Method

This section shows the boundary between Template Method and Strategy — knowing when inheritance is the wrong choice.

```python
from abc import ABC, abstractmethod


# ✅ GOOD — Use Strategy when algorithms are fundamentally different
class SortStrategy(ABC):
    """Algorithm that can be swapped at runtime per-instance."""

    @abstractmethod
    def sort(self, data: list) -> list:
        ...


class QuickSort(SortStrategy):
    def sort(self, data: list) -> list:
        return sorted(data)  # Simplified — real quicksort would partition in-place


class MergeSort(SortStrategy):
    def sort(self, data: list) -> list:
        if len(data) <= 1:
            return data
        mid = len(data) // 2
        left = self.sort(data[:mid])
        right = self.sort(data[mid:])
        return sorted(left + right)


# Strategy is preferred here because:
# 1. Sorting algorithms are fundamentally different approaches, not variants of the same skeleton
# 2. You may want to switch sorting strategy per-call or per-instance
# 3. Adding a new algorithm (BubbleSort, HeapSort) doesn't require modifying existing classes


# ❌ BAD — Using Template Method when Strategy is more appropriate
class BadSortingPipeline(ABC):
    """Wrong pattern: forces all sorts through one class hierarchy."""

    def run_sort(self, data: list) -> list:
        # This template method implies there's a shared skeleton
        # But quicksort, mergesort, and bubblesort have no shared steps!
        self._validate(data)
        result = self._sort_impl(data)  # The ENTIRE algorithm is different
        return self._post_process(result)

    def _validate(self, data: list) -> None:
        pass

    @abstractmethod
    def _sort_impl(self, data: list) -> list: ...

    def _post_process(self, data: list) -> list:
        return data


# ✅ GOOD — Strategy cleanly separates the concern
class DataPipeline:
    """Uses composition (Strategy) to swap algorithms at runtime."""

    def __init__(self, sort_strategy: SortStrategy | None = None) -> None:
        self._sorter = sort_strategy or QuickSort()

    def process(self, data: list) -> list:
        validated = [item for item in data if item is not None]
        sorted_data = self._sorter.sort(validated)
        return sorted_data


# Usage — switch sorting strategy without changing DataPipeline class:
# pipeline = DataPipeline(QuickSort())
# pipeline.process([3, 1, 4, 1, 5])
#
# # Later, swap to mergesort without any code changes to DataPipeline:
# pipeline._sorter = MergeSort()