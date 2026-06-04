---
name: ai-llm-orchestration
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Large Language Model orchestration for trading analysis with structured"
  output using instructor/pydantic'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-anomaly-detection, ai-explainable-ai
  role: implementation
  scope: implementation
  triggers: ai llm orchestration, ai-llm-orchestration, language, large, model
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"
---
# LLM Orchestration for Trading: The 5 Laws of AI-Powered Analysis

**Role:** AI Integration Engineer — applies to LLM provider selection, structured output generation, prompt engineering, and cost optimization for trading analysis systems.

**Philosophy:** AI as Assistant — LLMs are powerful but fallible tools. Treat outputs as hypotheses, not facts. Always validate, always reason, and always keep the model within your control.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** LLM responses are probabilistic. Invalid or malformed outputs require immediate handling.
- **Rule:** Validate LLM outputs at the boundary. Return early with clear error types if parsing or validation fails.
- **Practice:** `if not output.valid: return {status: 'error', reason: output.validation_error}`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A trading decision based on a malformed LLM response can cause catastrophic losses.
- **Rule:** Parse LLM outputs into typed structures using Pydantic/instructor. Once parsed, the data is trusted.
- **Why:** Eliminates defensive checks deep in trading logic. The parser guarantees validity.

### 3. The Law of Atomic Predictability
- **Concept:** LLM responses should be deterministic given the same prompt and temperature.
- **Rule:** Use fixed temperature for analysis prompts. Cache results for identical inputs with the same model.
- **Defense:** Always log the full prompt and parameters. Same input → same output, always.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** Silent LLM failures cause silent trading errors. A model saying "I don't know" is better than hallucinating.
- **Rule:** If LLM response is malformed, halt and alert immediately. Do not attempt to "guess" the correct output.
- **Result:** Trading systems only act on validated, structured outputs from the model.

### 5. The Law of Intentional Naming
- **Concept:** LLM roles and system prompts must be explicitly defined. No vague "assistant" prompts.
- **Rule:** Name each agent by its function: `MarketAnalyst`, `RiskAssessor`, `SignalGenerator`. Clear names → clear outputs.
- **Defense:** System prompt should start with "You are `Role`, a specialized trading AI assistant. Your purpose is..."


---

---

## Core Workflow

1. **Select LLM Provider and Model** — Choose between OpenAI (GPT-4o), Anthropic (Claude), or open-source (Mistral, Llama) based on latency requirements, cost constraints, and the complexity of trading analysis tasks. For structured output extraction, prefer models with strong JSON schema enforcement (GPT-4o, Claude Sonnet).
   **Checkpoint:** Verify that the selected model supports structured outputs (JSON mode or function calling) for your use case.

2. **Design Prompt Templates** — Create system prompts that define a clear role (e.g., "You are a quantitative risk analyst..."), specify output format using JSON schema, and include constraints (confidence bounds, required fields). Use Pydantic models as the ground truth for response validation.
   **Checkpoint:** Every prompt must include an explicit output schema definition. Never accept free-form text for structured trading decisions.

3. **Implement Structured Parsing with Instructor** — Use the `instructor` library to parse LLM responses into typed Pydantic models. This provides automatic validation, type coercion, and retry logic when the model returns malformed JSON.
   **Checkpoint:** Always run parsed outputs through a validation layer before passing them to trading logic.

4. **Add Safety Guards** — Implement output filtering that rejects or flags LLM recommendations outside predefined bounds (e.g., position size > 5% of portfolio, confidence < 0.3). Log all flagged outputs for human review.
   **Checkpoint:** Safety filters must run in-process before any action is taken based on the model's output.

5. **Implement Caching and Rate Limiting** — Cache LLM responses by prompt hash to reduce cost and latency. Implement token budget monitoring with automatic fallback to simpler prompts when approaching limits.
   **Checkpoint:** Cache keys should include system prompt, user message, model name, temperature, and max_tokens.

---

## Implementation Patterns

### Pattern 1: Structured Trading Analysis with Instructor

```python
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

import instructor
from openai import OpenAI
from pydantic import BaseModel, Field, PositiveFloat, field_validator


logger = logging.getLogger(__name__)


# --- Output Models (The Ground Truth) ---

class SignalStrength(str, Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MarketRegime(str, Enum):
    TRENDING_UP = "trending_up"
    TRENDING_DOWN = "trending_down"
    RANGING = "ranging"
    HIGH_VOLATILITY = "high_volatility"
    UNCERTAIN = "uncertain"


class TradingRecommendation(BaseModel):
    """Structured output from the LLM market analysis agent."""

    signal: SignalStrength = Field(
        description="Overall trading signal direction and strength",
    )
    confidence: PositiveFloat = Field(
        gt=0.0,
        le=1.0,
        description="Confidence in the recommendation (0.0 to 1.0)",
    )
    target_price: Optional[PositiveFloat] = Field(
        default=None,
        description="Suggested entry price or stop-loss level",
    )
    stop_loss: Optional[PositiveFloat] = Field(
        default=None,
        description="Recommended stop-loss price to limit downside risk",
    )
    risk_level: RiskLevel = Field(
        description="Overall risk assessment of the current position",
    )
    market_regime: MarketRegime = Field(
        description="Current identified market regime based on analysis",
    )
    reasoning: str = Field(
        description="Human-readable explanation of the analysis and recommendation",
    )
    key_factors: list[str] = Field(
        default_factory=list,
        description="List of 2-5 primary factors driving this recommendation",
    )

    @field_validator("confidence")
    @classmethod
    def validate_confidence_reasoning(cls, v: float) -> float:
        if v < 0.3:
            logger.warning(
                "Low confidence score (%.2f) — review recommended before execution", v
            )
        return v

    @field_validator("target_price", "stop_loss")
    @classmethod
    def validate_prices_not_crossed(cls, v: Optional[float], info) -> Optional[float]:
        data = info.data
        if v is not None and data.get("target_price") is not None:
            if data["signal"] in (SignalStrength.BUY, SignalStrength.STRONG_BUY):
                if v < data["target_price"]:
                    raise ValueError("Stop-loss cannot be above target price for buy signals")
        return v


# --- Agent Implementation ---

class TradingAnalysisAgent:
    """LLM-powered trading analysis agent with structured output enforcement."""

    SYSTEM_PROMPT_TEMPLATE = """You are {role}, a specialized quantitative analyst.
Your purpose is to analyze market conditions and produce actionable, risk-aware
trading recommendations.

Rules:
- Always provide a numerical confidence score between 0.0 and 1.0
- Never recommend positions exceeding 5% of total portfolio value
- Flag any recommendation where your confidence is below 0.4 for human review
- Base all analysis on the provided market data — do not hallucinate data points
- If you lack sufficient information to make a recommendation, return HOLD with reason

Market Data Context:
{context}

Return ONLY valid JSON matching the specified schema."""

    def __init__(
        self,
        model_name: str = "gpt-4o",
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ):
        self.client = instructor.from_openai(OpenAI())
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._cache: dict[str, TradingRecommendation] = {}

    def analyze(
        self,
        symbol: str,
        current_price: float,
        indicators: dict[str, float],
        market_context: str,
        risk_budget: PositiveFloat = 1.0,
        role: str = "Quantitative Market Analyst",
    ) -> TradingRecommendation:
        """Run structured analysis on a trading symbol and return a recommendation.

        Args:
            symbol: Trading pair identifier (e.g., 'BTC/USDT').
            current_price: Current market price of the asset.
            indicators: Technical indicators dict (RSI, MACD, ATR, etc.).
            market_context: Brief description of current market conditions.
            risk_budget: Maximum risk per trade as fraction of portfolio (0.01-0.05).
            role: Agent role definition for the system prompt.

        Returns:
            Validated TradingRecommendation model instance.

        Raises:
            ValidationError: If LLM response cannot be parsed into the schema.
        """
        context = self._build_context(symbol, current_price, indicators, market_context)
        prompt = self.SYSTEM_PROMPT_TEMPLATE.format(role=role, context=context)

        cache_key = hash(f"{prompt}{self.model_name}{self.temperature}")
        if cache_key in self._cache:
            logger.info("Cache hit for analysis of %s", symbol)
            return self._cache[cache_key]

        try:
            recommendation = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Analyze {symbol} with current price ${current_price}"},
                ],
                response_model=TradingRecommendation,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            self._apply_safety_guards(recommendation, risk_budget)
            self._cache[cache_key] = recommendation
            logger.info(
                "Analysis complete: %s → %s (confidence=%.2f)",
                symbol, recommendation.signal.value, recommendation.confidence,
            )
            return recommendation

        except instructor.exceptions.MissingValueError as e:
            logger.error("LLM failed to provide required field for %s: %s", symbol, e)
            raise

    def _build_context(
        self,
        symbol: str,
        current_price: float,
        indicators: dict[str, float],
        market_context: str,
    ) -> str:
        """Build the context string for the LLM prompt."""
        ind_lines = "\n".join(f"  - {k}: {v:.4f}" for k, v in indicators.items())
        return (
            f"Symbol: {symbol}\n"
            f"Current Price: ${current_price:,.2f}\n"
            f"Technical Indicators:\n{ind_lines}\n"
            f"Market Context: {market_context}"
        )

    def _apply_safety_guards(
        self, rec: TradingRecommendation, risk_budget: PositiveFloat
    ) -> None:
        """Apply pre-execution safety constraints to the recommendation."""
        if rec.confidence < 0.3:
            rec.signal = SignalStrength.HOLD
            logger.warning(
                "Safety guard triggered for %s: confidence %.2f below threshold — downgraded to HOLD",
                rec.signal, rec.confidence,
            )

        if rec.risk_level == RiskLevel.CRITICAL:
            rec.target_price = None
            rec.stop_loss = None
            logger.warning("Critical risk detected — clearing price targets for manual review")
```

### Pattern 2: Multi-Agent Orchestration with LangGraph

```python
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, MessagesState, END
from typing import TypedDict


class AnalysisState(TypedDict):
    """Shared state between LLM analysis agents."""
    messages: list
    symbol: str
    current_price: float
    indicators: dict[str, float]
    market_regime: str
    risk_assessment: dict
    final_recommendation: dict | None


def create_analysis_graph() -> StateGraph:
    """Build a multi-agent analysis pipeline using LangGraph.

    Pipeline flow:
      Market Regime Detection → Technical Analysis → Risk Assessment → Final Recommendation
    Each agent receives the shared state and contributes its specialty analysis.
    """

    # Define node functions (each is an LLM agent)
    def regime_detector(state: AnalysisState) -> AnalysisState:
        """Detect current market regime from price data and indicators."""
        system = "You are a Market Regime Analyst. Classify the market as TRENDING_UP, TRENDING_DOWN, RANGING, or HIGH_VOLATILITY."
        state["messages"].append(SystemMessage(content=system))
        # Call LLM with indicators → return regime classification
        # ... (LLM call implementation)
        state["market_regime"] = "ranging"  # placeholder — actual result from LLM
        return state

    def technical_analyst(state: AnalysisState) -> AnalysisState:
        """Perform technical analysis using identified regime."""
        system = f"You are a Technical Analyst. Market regime is {state['market_regime']}. Analyze indicators and suggest entry/exit levels."
        state["messages"].append(SystemMessage(content=system))
        return state

    def risk_assessor(state: AnalysisState) -> AnalysisState:
        """Assess risk level and position sizing constraints."""
        system = "You are a Risk Manager. Assess the risk level of the proposed trade and determine maximum position size."
        state["messages"].append(SystemMessage(content=system))
        return state

    # Build the graph
    graph_builder = StateGraph(AnalysisState)
    graph_builder.add_node("regime_detection", regime_detector)
    graph_builder.add_node("technical_analysis", technical_analyst)
    graph_builder.add_node("risk_assessment", risk_assessor)

    graph_builder.set_entry_point("regime_detection")
    graph_builder.add_edge("regime_detection", "technical_analysis")
    graph_builder.add_edge("technical_analysis", "risk_assessment")
    graph_builder.add_edge("risk_assessment", END)

    return graph_builder.compile()


# Usage:
# app = create_analysis_graph()
# initial_state: AnalysisState = {
#     "messages": [HumanMessage(content="Analyze BTC/USDT")],
#     "symbol": "BTC/USDT",
#     "current_price": 67500.0,
#     "indicators": {"rsi": 58.2, "macd": -120.5, "atr": 1850.0},
#     "market_regime": "",
#     "risk_assessment": {},
#     "final_recommendation": None,
# }
# result = app.invoke(initial_state)
```

## Constraints

### MUST DO
- Validate input feature distributions against training data baselines; flag drift exceeding 2 standard deviations
- Implement model versioning with reproducibility tags — every prediction must be traceable to the exact model artifact and config
- Include confidence intervals or probability estimates alongside all point predictions, never return raw scores without context
- Log all model inputs, outputs, and metadata to enable post-hoc analysis of prediction failures
- Implement feature computation consistently between training and inference — use the same transformation pipeline for both

### MUST NOT DO
- Do not train models on look-ahead biased features (e.g., using future prices or events in training data)
- Avoid deploying a new model version without shadow-testing against the current production model first
- Never retrain a model on a data window that includes regime changes without explicit regime-aware validation
- Do not use accuracy as the primary metric for imbalanced datasets — use precision/recall, F1, or AUC-ROC
- Avoid hardcoding feature names; load them from a schema or config file to prevent mismatches between training and inference


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [LangChain Getting Started](https://python.langchain.com/docs/get_started/introduction)
- [LangGraph for Multi-Agent Workflows](https://langchain-ai.github.io/langgraph/)
- [LLM Orchestration Patterns](https://learn.microsoft.com/azure/ai-studio/concepts/agentic-engineering-intro)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Building LLM-Powered Applications](https://python.langchain.com/docs/tutorials/)
