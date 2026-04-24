---
name: trading-ai-llm-orchestration
description: Large Language Model orchestration for trading analysis with structured
  output using instructor/pydantic
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai llm orchestration, ai-llm-orchestration, language, large, model
  related-skills: trading-ai-anomaly-detection, trading-ai-explainable-ai, trading-technical-cycle-analysis,
    trading-technical-false-signal-filtering
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

## Implementation Guidelines

### Structure and Patterns to Follow

1. **Agent System**: Define clear LLM agent roles with system prompts
2. **Structured Output**: Use Pydantic models for all LLM responses
3. **Prompt Templates**: Reusable, versioned prompt templates
4. **Caching Layer**: Cache LLM responses for identical inputs
5. **Error Handling**: Typed errors for different LLM failure modes

### Common Data Structures

```python
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class MarketSentiment(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"
    VERY_BULLISH = "very_bullish"
    VERY_BEARISH = "very_bearish"


class TradingDecision(str, Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    EXIT = "exit"


class LLMProvider(str, Enum):
    OPENAI_GPT4O = "openai-gpt-4o"
    OPENAI_GPT4 = "openai-gpt-4"
    ANTHROPIC_CLAUDE3 = "anthropic-claude-3"
    ANTHROPIC_CLAUDE3_5 = "anthropic-claude-3-5"
    GROQ_LLAMA3 = "groq-llama3"
    OLLAMA_LLAMA3 = "ollama-llama3"
    OLLAMA_GEMMA = "ollama-gemma"


class LLMResponseMetadata(BaseModel):
    """Metadata about LLM response"""
    provider: LLMProvider
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    temperature: float
    timestamp: datetime


class AgentResponse(BaseModel):
    """Standard response from any trading agent"""
    content: str
    metadata: LLMResponseMetadata
    success: bool = True
    error: Optional[str] = None
```

---

## Code Examples

### Example 1: Structured LLM Output with Instructor and Pydantic

```python
"""
Structured LLM Output: Using instructor with Pydantic for type-safe AI responses
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import instructor
from openai import OpenAI
import anthropic
from groq import Groq
from typing_extensions import Annotated
import asyncio


# Define trading-specific Pydantic models for structured output


class MarketAnalysis(BaseModel):
    """Structured market analysis response"""
    ticker: str
    sentiment: str = Field(..., pattern="^(very_bullish|bullish|neutral|bearish|very_bearish)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    key_factors: List[str] = Field(..., min_items=1)
    price_targets: Dict[str, float] = Field(
        ...,
        description="Short, mid, and long-term price targets"
    )
    risk_level: str = Field(..., pattern="^(low|medium|high|very_high)$")
    analysis_timestamp: datetime = Field(default_factory=datetime.utcnow)


class TradingSignal(BaseModel):
    """Structured trading signal response"""
    ticker: str
    action: str = Field(..., pattern="^(buy|sell|hold|exit)$")
    entry_price: Optional[float] = Field(None, ge=0.0)
    exit_price: Optional[float] = Field(None, ge=0.0)
    stop_loss: Optional[float] = Field(None, ge=0.0)
    take_profit: Optional[float] = Field(None, ge=0.0)
    position_size: Optional[float] = Field(None, ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = Field(..., min_length=50)
    signal_timestamp: datetime = Field(default_factory=datetime.utcnow)


class RiskAssessment(BaseModel):
    """Structured risk assessment response"""
    ticker: str
    volatility_risk: str = Field(..., pattern="^(low|medium|high|very_high)$")
    liquidity_risk: str = Field(..., pattern="^(low|medium|high|very_high)$")
    systemic_risk: str = Field(..., pattern="^(low|medium|high|very_high)$")
    overall_risk_score: float = Field(..., ge=0.0, le=10.0)
    risk_factors: List[str] = Field(..., min_items=1)
    position_limits: Dict[str, float] = Field(
        ...,
        description="Max position size as percentage of portfolio"
    )
    assessment_timestamp: datetime = Field(default_factory=datetime.utcnow)


# Initialize instructors for different providers


def create_openai_client(api_key: str) -> instructor.Instructor:
    """Create OpenAI client with instructor"""
    client = OpenAI(api_key=api_key)
    return instructor.from_openai(client)


def create_anthropic_client(api_key: str) -> instructor.Instructor:
    """Create Anthropic client with instructor"""
    client = anthropic.Anthropic(api_key=api_key)
    return instructor.from_anthropic(client)


def create_groq_client(api_key: str) -> instructor.Instructor:
    """Create Groq client with instructor"""
    client = Groq(api_key=api_key)
    return instructor.from_openai(client)


# Define system prompts for different agents


SYSTEM_PROMPTS = {
    "market_analyst": """You are a Professional Market Analyst AI assistant.
Your purpose is to analyze market data and provide trading recommendations.

CRITICAL RULES:
- Never guess or hallucinate data
- Base recommendations on factual market data
- Be conservative with confidence scores
- Always explain your reasoning clearly
- Consider both technical and fundamental factors
- Highlight risks explicitly

When analyzing a market:
1. Review price action and volume patterns
2. Consider macroeconomic factors
3. Evaluate market sentiment
4. Identify key support/resistance levels
5. Assess risk/reward profile

Provide your analysis in a clear, concise manner with actionable insights.""",

    "risk_assessor": """You are a Professional Risk Assessor AI assistant.
Your purpose is to evaluate trading risks and set position limits.

CRITICAL RULES:
- Be extremely conservative with risk ratings
- Always err on the side of caution
- Consider volatility, liquidity, and systemic risks
- Set position limits that preserve capital
- Flag any red flags immediately

Risk factors to consider:
- Price volatility (historical and implied)
- Trading volume and liquidity
- Market maker spread
- Order book depth
- News and events
- Correlation with other positions

Provide risk assessment with clear position size recommendations.""",

    "signal_generator": """You are a Professional Trading Signal Generator AI assistant.
Your purpose is to generate precise trading signals based on analysis.

CRITICAL RULES:
- Only generate signals with high confidence
- Specify exact entry, exit, and stop-loss prices
- Calculate position sizes based on risk parameters
- Include detailed reasoning for each signal
- Never recommend trades without clear risk management

Signal format:
- Action: buy/sell/hold/exit
- Entry price: specific level for entry
- Exit price: profit target
- Stop loss: risk limit
- Position size: percentage of portfolio
- Confidence: 0.0-1.0 based on analysis quality

Provide signals with surgical precision and clear risk parameters.""",
}


# Create agents with structured output


class TradingAgent:
    """Base class for trading LLM agents"""
    
    def __init__(
        self,
        provider: LLMProvider,
        api_key: str,
        model: Optional[str] = None,
        temperature: float = 0.1
    ):
        self.provider = provider
        self.model = model or self._default_model(provider)
        self.temperature = temperature
        self.client = self._create_client(api_key)
    
    def _default_model(self, provider: LLMProvider) -> str:
        """Get default model for provider"""
        defaults = {
            LLMProvider.OPENAI_GPT4O: "gpt-4o",
            LLMProvider.OPENAI_GPT4: "gpt-4",
            LLMProvider.ANTHROPIC_CLAUDE3: "claude-3-5-sonnet-20240620",
            LLMProvider.ANTHROPIC_CLAUDE3_5: "claude-3-5-sonnet-20240620",
            LLMProvider.GROQ_LLAMA3: "llama3-70b-8192",
            LLMProvider.OLLAMA_LLAMA3: "llama3",
            LLMProvider.OLLAMA_GEMMA: "gemma2",
        }
        return defaults.get(provider, "gpt-4o")
    
    def _create_client(self, api_key: str):
        """Create appropriate client based on provider"""
        providers = {
            LLMProvider.OPENAI_GPT4O: create_openai_client,
            LLMProvider.OPENAI_GPT4: create_openai_client,
            LLMProvider.ANTHROPIC_CLAUDE3: create_anthropic_client,
            LLMProvider.ANTHROPIC_CLAUDE3_5: create_anthropic_client,
            LLMProvider.GROQ_LLAMA3: create_groq_client,
        }
        
        if self.provider in providers:
            return providers[self.provider](api_key)
        
        raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Any
    ) -> Optional[Any]:
        """
        Generate structured response from LLM
        
        Args:
            system_prompt: System prompt defining agent role
            user_prompt: User input/prompt
            response_model: Pydantic model for structured output
        
        Returns:
            Structured response or None if error
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self.temperature,
                response_model=response_model,
            )
            
            return response
            
        except Exception as e:
            print(f"LLM API error: {e}")
            return None


class MarketAnalyst(TradingAgent):
    """Market analysis agent"""
    
    def __init__(self, api_key: str, provider: LLMProvider = LLMProvider.OPENAI_GPT4O):
        super().__init__(provider, api_key)
        self.system_prompt = SYSTEM_PROMPTS["market_analyst"]
    
    async def analyze_market(
        self,
        ticker: str,
        price_data: Dict[str, Any],
        news_data: List[str],
        technical_indicators: Dict[str, Any]
    ) -> Optional[MarketAnalysis]:
        """
        Analyze market for a specific ticker
        
        Args:
            ticker: Stock/crypto ticker symbol
            price_data: Price and volume data
            news_data: Recent news items
            technical_indicators: Technical analysis results
        
        Returns:
            MarketAnalysis with sentiment, factors, and price targets
        """
        user_prompt = f"""Analyze the market for {ticker} based on the following data:

Price Data:
{price_data}

News Data:
{news_data}

Technical Indicators:
{technical_indicators}

Please provide a comprehensive market analysis including:
1. Overall sentiment (very_bullish, bullish, neutral, bearish, very_bearish)
2. Key factors driving the market
3. Price targets (short-term, mid-term, long-term)
4. Risk level assessment

Respond in JSON format matching the MarketAnalysis schema."""
        
        return await self.generate_response(
            self.system_prompt,
            user_prompt,
            MarketAnalysis
        )


class RiskAssessor(TradingAgent):
    """Risk assessment agent"""
    
    def __init__(self, api_key: str, provider: LLMProvider = LLMProvider.OPENAI_GPT4O):
        super().__init__(provider, api_key)
        self.system_prompt = SYSTEM_PROMPTS["risk_assessor"]
    
    async def assess_risk(
        self,
        ticker: str,
        price_data: Dict[str, Any],
        order_book: Dict[str, Any],
        news_impact: float
    ) -> Optional[RiskAssessment]:
        """
        Assess risk for a trading position
        
        Args:
            ticker: Stock/crypto ticker symbol
            price_data: Price history and volatility data
            order_book: Order book data for liquidity assessment
            news_impact: Recent news impact score
        
        Returns:
            RiskAssessment with risk ratings and position limits
        """
        user_prompt = f"""Assess the risk for trading {ticker} based on the following data:

Price Data (Volatility, Historical Performance):
{price_data}

Order Book Data (Liquidity, Spread):
{order_book}

News Impact Score: {news_impact}

Please provide a comprehensive risk assessment including:
1. Volatility risk rating (low, medium, high, very_high)
2. Liquidity risk rating (low, medium, high, very_high)
3. Systemic risk rating (low, medium, high, very_high)
4. Overall risk score (0-10)
5. Specific risk factors
6. Position size limits as percentage of portfolio

Respond in JSON format matching the RiskAssessment schema."""
        
        return await self.generate_response(
            self.system_prompt,
            user_prompt,
            RiskAssessment
        )


class SignalGenerator(TradingAgent):
    """Trading signal generator agent"""
    
    def __init__(self, api_key: str, provider: LLMProvider = LLMProvider.OPENAI_GPT4O):
        super().__init__(provider, api_key)
        self.system_prompt = SYSTEM_PROMPTS["signal_generator"]
    
    async def generate_signal(
        self,
        ticker: str,
        market_analysis: MarketAnalysis,
        risk_assessment: RiskAssessment,
        portfolio_params: Dict[str, Any]
    ) -> Optional[TradingSignal]:
        """
        Generate trading signal based on analysis and risk
        
        Args:
            ticker: Stock/crypto ticker symbol
            market_analysis: Market analysis results
            risk_assessment: Risk assessment results
            portfolio_params: Portfolio parameters for position sizing
        
        Returns:
            TradingSignal with action, prices, and position details
        """
        user_prompt = f"""Generate a trading signal for {ticker} based on:

Market Analysis:
Sentiment: {market_analysis.sentiment}
Confidence: {market_analysis.confidence}
Price Targets: {market_analysis.price_targets}

Risk Assessment:
Overall Risk Score: {risk_assessment.overall_risk_score}/10
Position Limits: {risk_assessment.position_limits}

Portfolio Parameters:
{portfolio_params}

Please generate a precise trading signal including:
1. Action: buy, sell, hold, or exit
2. Entry price (specific level)
3. Exit price (profit target)
4. Stop loss (risk limit)
5. Position size (percentage of portfolio)
6. Confidence score

Respond in JSON format matching the TradingSignal schema. Be conservative with confidence scores."""
        
        return await self.generate_response(
            self.system_prompt,
            user_prompt,
            TradingSignal
        )


# Usage example


async def main():
    # Initialize agents
    api_key = "your-api-key"  # Replace with actual API key
    
    analyst = MarketAnalyst(api_key, provider=LLMProvider.OPENAI_GPT4O)
    risk_assessor = RiskAssessor(api_key, provider=LLMProvider.OPENAI_GPT4O)
    signal_generator = SignalGenerator(api_key, provider=LLMProvider.OPENAI_GPT4O)
    
    # Analyze market
    market_data = {
        "current_price": 150.00,
        "volume": 1000000,
        " volatility": 0.25,
    }
    
    news_items = [
        "Company announces new product line",
        "Q4 earnings beat expectations",
    ]
    
    indicators = {
        "rsi": 55,
        "macd": "bullish",
        "sma_50": 145.00,
        "sma_200": 130.00,
    }
    
    analysis = await analyst.analyze_market(
        ticker="AAPL",
        price_data=market_data,
        news_data=news_items,
        technical_indicators=indicators
    )
    
    if analysis:
        print(f"Market Analysis for {analysis.ticker}:")
        print(f"Sentiment: {analysis.sentiment}")
        print(f"Confidence: {analysis.confidence}")
        print(f"Key Factors: {analysis.key_factors}")
        print(f"Price Targets: {analysis.price_targets}")
        print(f"Risk Level: {analysis.risk_level}")
    
    # Assess risk
    order_book = {
        "spread": 0.50,
        "depth": 5000,
    }
    
    risk = await risk_assessor.assess_risk(
        ticker="AAPL",
        price_data=market_data,
        order_book=order_book,
        news_impact=0.3
    )
    
    if risk:
        print(f"\nRisk Assessment for {risk.ticker}:")
        print(f"Overall Risk Score: {risk.overall_risk_score}/10")
        print(f"Position Limit: {risk.position_limits}")
    
    # Generate signal
    portfolio = {
        "total_value": 100000,
        "max_position": 0.1,  # 10%
        "risk_tolerance": "moderate",
    }
    
    signal = await signal_generator.generate_signal(
        ticker="AAPL",
        market_analysis=analysis,
        risk_assessment=risk,
        portfolio_params=portfolio
    )
    
    if signal:
        print(f"\nTrading Signal for {signal.ticker}:")
        print(f"Action: {signal.action}")
        print(f"Entry: ${signal.entry_price}, Exit: ${signal.exit_price}, Stop: ${signal.stop_loss}")
        print(f"Position Size: {signal.position_size * 100}%")
        print(f"Confidence: {signal.confidence}")
        print(f"Reasoning: {signal.reasoning}")


if __name__ == "__main__":
    asyncio.run(main())

```

### Example 2: LLM Provider Selection and Cost Optimization

```python
"""
LLM Provider Selection: Choose the right model for the right task
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import aiohttp
import time
import hashlib
import json


class TaskType(Enum):
    """Types of trading tasks"""
    MARKET_ANALYSIS = "market_analysis"
    RISK_ASSESSMENT = "risk_assessment"
    SIGNAL_GENERATION = "signal_generation"
    NEWS_SUMMARY = "news_summary"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    TECHNICAL_ANALYSIS = "technical_analysis"
    FUNDAMENTAL_ANALYSIS = "fundamental_analysis"
    REGULATORY_REVIEW = "regulatory_review"


class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI_GPT4O = "openai-gpt-4o"
    OPENAI_GPT4 = "openai-gpt-4"
    OPENAI_GPT35 = "openai-gpt-3.5-turbo"
    ANTHROPIC_CLAUDE3_5 = "anthropic-claude-3-5-sonnet"
    ANTHROPIC_CLAUDE3 = "anthropic-claude-3-opus"
    GROQ_LLAMA3_70B = "groq-llama3-70b"
    OLLAMA_LLAMA3 = "ollama-llama3"
    OLLAMA_GEMMA = "ollama-gemma2"


class ModelCost(BaseModel):
    """Model pricing information"""
    provider: LLMProvider
    model: str
    prompt_tokens_per_million: float = 0.0
    completion_tokens_per_million: float = 0.0
    context_window: int = 128000
    max_output_tokens: int = 4096
    description: str = ""


# Model cost database (updated for 2024-2025 pricing)


MODEL_COSTS: Dict[LLMProvider, ModelCost] = {
    LLMProvider.OPENAI_GPT4O: ModelCost(
        provider=LLMProvider.OPENAI_GPT4O,
        model="gpt-4o",
        prompt_tokens_per_million=5.00,
        completion_tokens_per_million=15.00,
        context_window=128000,
        max_output_tokens=16384,
        description="OpenAI's flagship model with high reasoning capability",
    ),
    LLMProvider.OPENAI_GPT4: ModelCost(
        provider=LLMProvider.OPENAI_GPT4,
        model="gpt-4",
        prompt_tokens_per_million=30.00,
        completion_tokens_per_million=60.00,
        context_window=8192,
        max_output_tokens=8192,
        description="OpenAI GPT-4 for complex reasoning tasks",
    ),
    LLMProvider.OPENAI_GPT35: ModelCost(
        provider=LLMProvider.OPENAI_GPT35,
        model="gpt-3.5-turbo",
        prompt_tokens_per_million=0.50,
        completion_tokens_per_million=1.50,
        context_window=16385,
        max_output_tokens=4096,
        description="Fast, cost-effective model for simple tasks",
    ),
    LLMProvider.ANTHROPIC_CLAUDE3_5: ModelCost(
        provider=LLMProvider.ANTHROPIC_CLAUDE3_5,
        model="claude-3-5-sonnet",
        prompt_tokens_per_million=3.00,
        completion_tokens_per_million=15.00,
        context_window=200000,
        max_output_tokens=8192,
        description="Anthropic's fast, affordable model with good reasoning",
    ),
    LLMProvider.ANTHROPIC_CLAUDE3: ModelCost(
        provider=LLMProvider.ANTHROPIC_CLAUDE3,
        model="claude-3-opus",
        prompt_tokens_per_million=15.00,
        completion_tokens_per_million=75.00,
        context_window=200000,
        max_output_tokens=4096,
        description="Anthropic's most capable model",
    ),
    LLMProvider.GROQ_LLAMA3_70B: ModelCost(
        provider=LLMProvider.GROQ_LLAMA3_70B,
        model="llama3-70b-8192",
        prompt_tokens_per_million=0.59,
        completion_tokens_per_million=0.79,
        context_window=8192,
        max_output_tokens=4096,
        description="Fast, affordable Llama 3 70B model",
    ),
    LLMProvider.OLLAMA_LLAMA3: ModelCost(
        provider=LLMProvider.OLLAMA_LLAMA3,
        model="llama3",
        prompt_tokens_per_million=0.00,
        completion_tokens_per_million=0.00,
        context_window=8192,
        max_output_tokens=2048,
        description="Local Llama 3 model (no API costs)",
    ),
    LLMProvider.OLLAMA_GEMMA: ModelCost(
        provider=LLMProvider.OLLAMA_GEMMA,
        model="gemma2",
        prompt_tokens_per_million=0.00,
        completion_tokens_per_million=0.00,
        context_window=8192,
        max_output_tokens=2048,
        description="Local Gemma 2 model (no API costs)",
    ),
}


class ProviderSelector:
    """Selects optimal LLM provider based on task requirements"""
    
    def __init__(self, budget_per_month: float = 100.0):
        self.budget = budget_per_month
        self.provider_config = {
            LLMProvider.OPENAI_GPT4O: {"api_key": None, "rate_limit": 100},
            LLMProvider.OPENAI_GPT4: {"api_key": None, "rate_limit": 50},
            LLMProvider.OPENAI_GPT35: {"api_key": None, "rate_limit": 1000},
            LLMProvider.ANTHROPIC_CLAUDE3_5: {"api_key": None, "rate_limit": 100},
            LLMProvider.ANTHROPIC_CLAUDE3: {"api_key": None, "rate_limit": 20},
            LLMProvider.GROQ_LLAMA3_70B: {"api_key": None, "rate_limit": 30},
            LLMProvider.OLLAMA_LLAMA3: {"api_key": None, "rate_limit": float('inf')},
            LLMProvider.OLLAMA_GEMMA: {"api_key": None, "rate_limit": float('inf')},
        }
    
    def estimate_cost(
        self,
        task_type: TaskType,
        provider: LLMProvider,
        prompt_tokens: int = 1000,
        completion_tokens: int = 500
    ) -> float:
        """
        Estimate API cost for a task
        
        Args:
            task_type: Type of trading task
            provider: LLM provider
            prompt_tokens: Estimated prompt tokens
            completion_tokens: Estimated completion tokens
        
        Returns:
            Estimated cost in USD
        """
        cost_info = MODEL_COSTS[provider]
        
        prompt_cost = (prompt_tokens / 1_000_000) * cost_info.prompt_tokens_per_million
        completion_cost = (completion_tokens / 1_000_000) * cost_info.completion_tokens_per_million
        
        return prompt_cost + completion_cost
    
    def select_provider(
        self,
        task_type: TaskType,
        priority: str = "balanced"  # "cost", "speed", "quality"
    ) -> LLMProvider:
        """
        Select optimal provider for a task
        
        Args:
            task_type: Type of trading task
            priority: Optimization priority
        
        Returns:
            Selected LLM provider
        """
        # Define task requirements
        task_requirements = {
            TaskType.MARKET_ANALYSIS: {"min_quality": "high", "max_tokens": 2000},
            TaskType.RISK_ASSESSMENT: {"min_quality": "high", "max_tokens": 1500},
            TaskType.SIGNAL_GENERATION: {"min_quality": "high", "max_tokens": 1000},
            TaskType.NEWS_SUMMARY: {"min_quality": "medium", "max_tokens": 500},
            TaskType.SENTIMENT_ANALYSIS: {"min_quality": "low", "max_tokens": 500},
            TaskType.TECHNICAL_ANALYSIS: {"min_quality": "medium", "max_tokens": 1000},
            TaskType.FUNDAMENTAL_ANALYSIS: {"min_quality": "high", "max_tokens": 2000},
            TaskType.REGULATORY_REVIEW: {"min_quality": "high", "max_tokens": 3000},
        }
        
        requirements = task_requirements[task_type]
        
        # Filter providers by requirements
        available_providers = []
        
        for provider, config in self.provider_config.items():
            cost_info = MODEL_COSTS[provider]
            
            # Check if provider can handle task
            if cost_info.max_output_tokens >= requirements["max_tokens"]:
                estimated_cost = self.estimate_cost(task_type, provider)
                
                # Check budget
                if estimated_cost < (self.budget / 1000):  # Rough budget check
                    available_providers.append({
                        "provider": provider,
                        "cost": estimated_cost,
                        "quality": self._get_quality_score(provider, requirements["min_quality"]),
                    })
        
        if not available_providers:
            # Fall back to cheapest available
            return LLMProvider.OPENAI_GPT35
        
        # Sort by priority
        if priority == "cost":
            available_providers.sort(key=lambda x: x["cost"])
        elif priority == "speed":
            # Groq and OpenAI 3.5 are faster
            speed_scores = {
                LLMProvider.GROQ_LLAMA3_70B: 10,
                LLMProvider.OPENAI_GPT35: 8,
                LLMProvider.OLLAMA_LLAMA3: 6,
                LLMProvider.OPENAI_GPT4O: 4,
                LLMProvider.OPENAI_GPT4: 3,
                LLMProvider.ANTHROPIC_CLAUDE3_5: 5,
                LLMProvider.ANTHROPIC_CLAUDE3: 2,
                LLMProvider.OLLAMA_GEMMA: 5,
            }
            available_providers.sort(
                key=lambda x: -speed_scores.get(x["provider"], 5)
            )
        else:  # balanced
            available_providers.sort(key=lambda x: x["cost"] / x["quality"])
        
        return available_providers[0]["provider"]
    
    def _get_quality_score(
        self,
        provider: LLMProvider,
        min_quality: str
    ) -> float:
        """Get quality score for provider"""
        quality_scores = {
            LLMProvider.OPENAI_GPT4O: 10,
            LLMProvider.ANTHROPIC_CLAUDE3: 9,
            LLMProvider.OPENAI_GPT4: 8,
            LLMProvider.ANTHROPIC_CLAUDE3_5: 7,
            LLMProvider.OLLAMA_LLAMA3: 6,
            LLMProvider.GROQ_LLAMA3_70B: 6,
            LLMProvider.OLLAMA_GEMMA: 5,
            LLMProvider.OPENAI_GPT35: 4,
        }
        
        score = quality_scores.get(provider, 5)
        
        if min_quality == "high":
            return max(0, score - 2)  # Penalize lower quality
        elif min_quality == "medium":
            return max(0, score - 1)
        else:  # low
            return score
    
    def get_cost_report(
        self,
        tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate cost report for a list of tasks
        
        Args:
            tasks: List of task configurations
        
        Returns:
            Cost report with per-provider breakdown
        """
        cost_report = {}
        
        for task in tasks:
            provider = task.get("provider")
            task_type = task.get("task_type")
            prompt_tokens = task.get("prompt_tokens", 1000)
            completion_tokens = task.get("completion_tokens", 500)
            
            cost = self.estimate_cost(task_type, provider, prompt_tokens, completion_tokens)
            
            if provider not in cost_report:
                cost_report[provider] = {"total": 0, "tasks": 0}
            
            cost_report[provider]["total"] += cost
            cost_report[provider]["tasks"] += 1
        
        # Add averages
        for provider, data in cost_report.items():
            data["average"] = data["total"] / data["tasks"]
            data["provider_name"] = MODEL_COSTS[provider].model
        
        return cost_report


# Usage example


def usage_example():
    selector = ProviderSelector(budget_per_month=100.0)
    
    # Get provider for different tasks
    market_provider = selector.select_provider(
        TaskType.MARKET_ANALYSIS,
        priority="balanced"
    )
    print(f"Market Analysis Provider: {market_provider.value}")
    
    news_provider = selector.select_provider(
        TaskType.NEWS_SUMMARY,
        priority="cost"
    )
    print(f"News Summary Provider: {news_provider.value}")
    
    # Estimate costs
    cost = selector.estimate_cost(TaskType.MARKET_ANALYSIS, LLMProvider.OPENAI_GPT4O)
    print(f"Estimated Market Analysis Cost: ${cost:.4f}")
    
    # Generate cost report
    tasks = [
        {"task_type": TaskType.MARKET_ANALYSIS, "provider": LLMProvider.OPENAI_GPT4O},
        {"task_type": TaskType.NEWS_SUMMARY, "provider": LLMProvider.GROQ_LLAMA3_70B},
        {"task_type": TaskType.SENTIMENT_ANALYSIS, "provider": LLMProvider.OPENAI_GPT35},
    ]
    
    report = selector.get_cost_report(tasks)
    print(f"Cost Report: {json.dumps(report, indent=2)}")


if __name__ == "__main__":
    usage_example()

```

### Example 3: LLM Response Caching and Error Handling

```python
"""
LLM Response Caching: Avoid redundant API calls and handle errors gracefully
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import hashlib
import json
import time
import functools


class CacheStrategy(Enum):
    """Caching strategies"""
    NO_CACHE = "no_cache"
    MEMORY = "memory"
    REDIS = "redis"
    FILE = "file"


class LLMCacheEntry(BaseModel):
    """Cache entry for LLM responses"""
    cache_key: str
    prompt_hash: str
    provider: str
    model: str
    response: str
    tokens_used: int
    timestamp: datetime
    expires_at: Optional[datetime] = None


class LLMCache:
    """Caching layer for LLM responses"""
    
    def __init__(self, strategy: CacheStrategy = CacheStrategy.MEMORY, max_size: int = 1000):
        self.strategy = strategy
        self.max_size = max_size
        
        if strategy == CacheStrategy.MEMORY:
            self._cache: Dict[str, LLMCacheEntry] = {}
            self._lru_order: List[str] = []
        elif strategy == CacheStrategy.REDIS:
            import redis
            self.redis = redis.Redis(host='localhost', port=6379, db=0)
        elif strategy == CacheStrategy.FILE:
            import os
            self.cache_dir = "llm_cache"
            os.makedirs(self.cache_dir, exist_ok=True)
    
    def generate_cache_key(
        self,
        provider: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0
    ) -> str:
        """Generate cache key from request parameters"""
        key_data = {
            "provider": provider,
            "model": model,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "temperature": temperature,
        }
        
        key_json = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_json.encode()).hexdigest()[:32]
    
    def get_prompt_hash(self, prompt: str) -> str:
        """Generate hash of prompt for quick comparison"""
        return hashlib.sha256(prompt.encode()).hexdigest()[:16]
    
    def get(self, cache_key: str) -> Optional[LLMCacheEntry]:
        """Get cached response"""
        if self.strategy == CacheStrategy.MEMORY:
            entry = self._cache.get(cache_key)
            if entry:
                # Update LRU order
                if cache_key in self._lru_order:
                    self._lru_order.remove(cache_key)
                self._lru_order.append(cache_key)
                
                # Check expiration
                if entry.expires_at and datetime.now() > entry.expires_at:
                    self.delete(cache_key)
                    return None
                
                return entry
        
        elif self.strategy == CacheStrategy.REDIS:
            data = self.redis.get(f"llm_cache:{cache_key}")
            if data:
                return LLMCacheEntry.parse_raw(data)
        
        elif self.strategy == CacheStrategy.FILE:
            import os
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
            if os.path.exists(cache_file):
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    return LLMCacheEntry(**data)
        
        return None
    
    def set(
        self,
        cache_key: str,
        entry: LLMCacheEntry,
        ttl: Optional[timedelta] = None
    ):
        """Store response in cache"""
        if ttl:
            entry.expires_at = datetime.now() + ttl
        
        if self.strategy == CacheStrategy.MEMORY:
            # Evict oldest entries if at capacity
            while len(self._cache) >= self.max_size:
                oldest_key = self._lru_order.pop(0) if self._lru_order else None
                if oldest_key:
                    del self._cache[oldest_key]
            
            self._cache[cache_key] = entry
            self._lru_order.append(cache_key)
        
        elif self.strategy == CacheStrategy.REDIS:
            self.redis.setex(
                f"llm_cache:{cache_key}",
                int(ttl.total_seconds()) if ttl else 3600,
                entry.json()
            )
        
        elif self.strategy == CacheStrategy.FILE:
            import os
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
            with open(cache_file, 'w') as f:
                json.dump(entry.dict(), f)
    
    def delete(self, cache_key: str):
        """Delete entry from cache"""
        if self.strategy == CacheStrategy.MEMORY:
            if cache_key in self._cache:
                del self._cache[cache_key]
            if cache_key in self._lru_order:
                self._lru_order.remove(cache_key)
        
        elif self.strategy == CacheStrategy.REDIS:
            self.redis.delete(f"llm_cache:{cache_key}")
        
        elif self.strategy == CacheStrategy.FILE:
            import os
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
            if os.path.exists(cache_file):
                os.remove(cache_file)
    
    def clear(self):
        """Clear all cache entries"""
        if self.strategy == CacheStrategy.MEMORY:
            self._cache.clear()
            self._lru_order.clear()
        
        elif self.strategy == CacheStrategy.REDIS:
            self.redis.flushdb()
        
        elif self.strategy == CacheStrategy.FILE:
            import shutil
            shutil.rmtree(self.cache_dir)
            os.makedirs(self.cache_dir, exist_ok=True)
    
    def stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        if self.strategy == CacheStrategy.MEMORY:
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
            }
        # For other strategies, return placeholder
        return {"size": 0, "max_size": self.max_size}


class LLMError(Exception):
    """Base exception for LLM errors"""
    pass


class RateLimitError(LLMError):
    """Rate limit exceeded error"""
    pass


class InvalidResponseError(LLMError):
    """Invalid LLM response error"""
    pass


class TimeoutError(LLMError):
    """LLM API timeout error"""
    pass


class LLMClient:
    """LLM client with caching and error handling"""
    
    def __init__(
        self,
        provider: str,
        model: str,
        api_key: str,
        cache: Optional[LLMCache] = None,
        retry_max_attempts: int = 3,
        timeout: int = 30,
        temperature: float = 0.0
    ):
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.cache = cache
        self.retry_max_attempts = retry_max_attempts
        self.timeout = timeout
        self.temperature = temperature
        
        self._request_count = 0
        self._cache_hits = 0
        self._cache_misses = 0
    
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        response_parser: Optional[Callable] = None,
        **kwargs
    ) -> Optional[str]:
        """
        Generate response from LLM with caching and retry logic
        
        Args:
            system_prompt: System prompt defining agent role
            user_prompt: User input/prompt
            response_parser: Optional function to parse response
            **kwargs: Additional parameters (temperature, max_tokens, etc.)
        
        Returns:
            LLM response string or None if error
        """
        # Generate cache key
        cache_key = self.cache.generate_cache_key(
            provider=self.provider,
            model=self.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=self.temperature
        )
        
        # Try cache first
        if self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                self._cache_hits += 1
                return cached.response
        
        self._cache_misses += 1
        
        # Generate response with retry logic
        last_error = None
        for attempt in range(self.retry_max_attempts):
            try:
                response = await self._call_llm_api(
                    system_prompt,
                    user_prompt,
                    **kwargs
                )
                
                # Parse response if parser provided
                if response_parser:
                    response = response_parser(response)
                
                # Cache response
                if self.cache:
                    cache_entry = LLMCacheEntry(
                        cache_key=cache_key,
                        prompt_hash=self.cache.get_prompt_hash(user_prompt),
                        provider=self.provider,
                        model=self.model,
                        response=response,
                        tokens_used=0,  # Would need token counting
                        timestamp=datetime.now()
                    )
                    self.cache.set(cache_key, cache_entry, ttl=timedelta(hours=1))
                
                self._request_count += 1
                return response
                
            except RateLimitError as e:
                # Wait and retry
                wait_time = (attempt + 1) * 2  # Exponential backoff
                await asyncio.sleep(wait_time)
                last_error = e
                
            except TimeoutError as e:
                # Timeout, retry immediately
                last_error = e
                
            except InvalidResponseError as e:
                # Invalid response, don't retry
                raise e
                
            except Exception as e:
                last_error = e
        
        print(f"LLM API error after {self.retry_max_attempts} attempts: {last_error}")
        return None
    
    async def _call_llm_api(
        self,
        system_prompt: str,
        user_prompt: str,
        **kwargs
    ) -> str:
        """Call LLM API (placeholder for actual implementation)"""
        # This would contain the actual API calls to OpenAI, Anthropic, etc.
        # For demo purposes, we'll simulate a response
        
        import random
        
        # Simulate API call
        await asyncio.sleep(0.1)
        
        # Simulate random rate limit error
        if random.random() < 0.05:
            raise RateLimitError("Rate limit exceeded")
        
        # Simulate timeout
        if random.random() < 0.02:
            raise TimeoutError("API timeout")
        
        # Return simulated response
        return f"Response to: {user_prompt[:50]}..."
    
    def get_stats(self) -> Dict[str, int]:
        """Get client statistics"""
        return {
            "total_requests": self._request_count,
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "cache_hit_rate": self._cache_hits / max(1, self._cache_hits + self._cache_misses),
        }


# Usage example


async def main():
    # Create cache
    cache = LLMCache(strategy=CacheStrategy.MEMORY, max_size=100)
    
    # Create client
    client = LLMClient(
        provider="openai",
        model="gpt-4",
        api_key="your-api-key",
        cache=cache,
        retry_max_attempts=3,
        temperature=0.0
    )
    
    # Generate responses
    response1 = await client.generate_response(
        system_prompt="You are a helpful assistant.",
        user_prompt="What is the current market sentiment for BTC?"
    )
    print(f"Response 1: {response1}")
    
    # Second call should use cache
    response2 = await client.generate_response(
        system_prompt="You are a helpful assistant.",
        user_prompt="What is the current market sentiment for BTC?"
    )
    print(f"Response 2 (cached): {response2}")
    
    # Check stats
    stats = client.get_stats()
    print(f"Client stats: {stats}")
    
    # Clear cache when needed
    # cache.clear()


if __name__ == "__main__":
    asyncio.run(main())

```

---

## Adherence Checklist

Before completing your LLM orchestration system, verify:
- [ ] **Guard Clauses**: Are all LLM response validations at the top of parsing functions?
- [ ] **Parsed State**: Is all LLM output parsed into typed Pydantic models at the boundary?
- [ ] **Purity**: Do generation functions return new responses without mutation?
- [ ] **Fail Loud**: Do invalid responses throw clear `InvalidResponseError` exceptions?
- [ ] **Readability**: Are agent roles explicitly named: `MarketAnalyst`, `RiskAssessor`, `SignalGenerator`?

---

## Common Mistakes to Avoid

### ❌ Mistake 1: No Response Validation
```python
# BAD: Accepts any response without validation
def analyze_market(prompt):
    response = llm.generate(prompt)
    return json.loads(response)  # May fail or return invalid data

# GOOD: Validates with Pydantic model
def analyze_market(prompt, model: str = "gpt-4"):
    client = create_client(model)
    response = client.generate(prompt, response_model=MarketAnalysis)
    return response  # Guaranteed valid by Pydantic
```

### ❌ Mistake 2: Hardcoded Prompts
```python
# BAD: Prompts scattered throughout code
def generate_signal():
    prompt = "Analyze market and generate signal..."  # Hardcoded
    return llm.generate(prompt)

# GOOD: Centralized prompt templates
MARKET_ANALYSIS_PROMPT = """You are MarketAnalyst. Analyze market conditions:
{price_data}

News:
{news_data}

Technical Indicators:
{indicators}

Provide analysis in JSON format."""
```

### ❌ Mistake 3: No Caching
```python
# BAD: No caching = wasted API costs
async def get_analysis(ticker):
    response = await llm.generate(f"Analyze {ticker}")
    return response

# GOOD: Caching for identical requests
async def get_analysis(ticker, cache):
    cache_key = cache.generate_key(ticker)
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    response = await llm.generate(...)
    cache.set(cache_key, response, ttl=timedelta(hours=1))
    return response
```

### ❌ Mistake 4: No Error Handling
```python
# BAD: Silently fails on LLM errors
def analyze_market(prompt):
    try:
        return llm.generate(prompt)
    except:
        return None  # Silent failure!

# GOOD: Typed exceptions with logging
def analyze_market(prompt):
    try:
        return llm.generate(prompt)
    except RateLimitError as e:
        logger.error(f"Rate limit exceeded: {e}")
        raise
    except InvalidResponseError as e:
        logger.error(f"Invalid response: {e}")
        raise
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise
```

### ❌ Mistake 5: No Provider Selection
```python
# BAD: Always uses expensive model
def analyze_market(prompt):
    return llm.generate(prompt, model="gpt-4o")  # Always expensive!

# GOOD: Selects provider based on task
def analyze_market(prompt, task_type):
    provider = provider_selector.select_provider(task_type, "balanced")
    return llm.generate(prompt, model=provider.model)
```

---

## References

1. **Instructor Library** - https://github.com/jxml/instructor - Structured output with LLMs
2. **Pydantic Documentation** - https://docs.pydantic.dev/latest/ - Data validation
3. **OpenAI API Pricing** - https://openai.com/api/pricing/ - GPT-4 and GPT-3.5 pricing
4. **Anthropic Pricing** - https://www.anthropic.com/pricing - Claude model pricing
5. **Groq API** - https://console.groq.com/docs/ - Fast inference with Llama models