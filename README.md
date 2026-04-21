# Trading Bot Skills

A collection of 92 OpenCode skills for algorithmic trading, AI/ML integration, systematic trading systems, and coding patterns.

## Categories

- [AI Integration](#ai-integration) (17 skills)
- [Backtesting](#backtesting) (6 skills)
- [Coding Patterns](#coding-patterns) (9 skills)
- [Data Pipelines](#data-pipelines) (10 skills)
- [Exchange Integration](#exchange-integration) (10 skills)
- [Execution Algorithms](#execution-algorithms) (6 skills)
- [Paper Trading](#paper-trading) (6 skills)
- [Risk Engine](#risk-engine) (9 skills)
- [Technical Analysis](#technical-analysis) (13 skills)
- [Trading Fundamentals](#trading-fundamentals) (6 skills)

---

## AI Integration

**[ai-integration-anomaly-detection](./ai-integration-anomaly-detection/SKILL.md)** — Detect anomalous market behavior, outliers, and potential market manipulation

**[ai-integration-explainable-ai](./ai-integration-explainable-ai/SKILL.md)** — Explainable AI for understanding and trusting trading model decisions

**[ai-integration-feature-engineering](./ai-integration-feature-engineering/SKILL.md)** — Create actionable trading features from raw market data

**[ai-integration-hyperparameter-tuning](./ai-integration-hyperparameter-tuning/SKILL.md)** — Optimize model configurations for trading applications

**[ai-integration-live-model-monitoring](./ai-integration-live-model-monitoring/SKILL.md)** — Monitor production ML models for drift, decay, and performance degradation

**[ai-integration-llm-orchestration](./ai-integration-llm-orchestration/SKILL.md)** — Large Language Model orchestration for trading analysis with structured output using instructor/pydantic

**[ai-integration-model-ensemble](./ai-integration-model-ensemble/SKILL.md)** — Combine multiple models for improved prediction accuracy and robustness

**[ai-integration-multi-asset-model](./ai-integration-multi-asset-model/SKILL.md)** — Model inter-asset relationships for portfolio and cross-asset strategies

**[ai-integration-news-embedding](./ai-integration-news-embedding/SKILL.md)** — Process news text using NLP embeddings for trading signals

**[ai-integration-order-flow-analysis](./ai-integration-order-flow-analysis/SKILL.md)** — Analyze order flow to detect market pressure and anticipate price moves

**[ai-integration-regime-classification](./ai-integration-regime-classification/SKILL.md)** — Detect current market regime for adaptive trading strategies

**[ai-integration-reinforcement-learning-trading](./ai-integration-reinforcement-learning-trading/SKILL.md)** — Reinforcement Learning for automated trading agents and policy optimization

**[ai-integration-sentiment-analysis](./ai-integration-sentiment-analysis/SKILL.md)** — AI-powered sentiment analysis for news, social media, and political figures in trading

**[ai-integration-sentiment-features](./ai-integration-sentiment-features/SKILL.md)** — Extract market sentiment from news, social media, and analyst reports

**[ai-integration-synthetic-data](./ai-integration-synthetic-data/SKILL.md)** — Generate synthetic financial data for training and testing trading models

**[ai-integration-time-series-forecasting](./ai-integration-time-series-forecasting/SKILL.md)** — Time series forecasting for price prediction and market analysis

**[ai-integration-volatility-prediction](./ai-integration-volatility-prediction/SKILL.md)** — Forecast volatility for risk management and option pricing

---

## Backtesting

**[backtesting-drawdown-analysis](./backtesting-drawdown-analysis/SKILL.md)** — Maximum Drawdown, Recovery Time, and Value-at-Risk Analysis

**[backtesting-lookahead-bias](./backtesting-lookahead-bias/SKILL.md)** — Preventing lookahead bias in backtesting through strict causality enforcement, time-based validation, and comprehensive detection frameworks.

**[backtesting-position-exits](./backtesting-position-exits/SKILL.md)** — Exit strategies, trailing stops, and take-profit mechanisms for trading systems.

**[backtesting-position-sizing](./backtesting-position-sizing/SKILL.md)** — Position Sizing Algorithms: Fixed Fractional, Kelly Criterion, and Volatility Adjustment

**[backtesting-sharpe-ratio](./backtesting-sharpe-ratio/SKILL.md)** — Sharpe Ratio Calculation and Risk-Adjusted Performance Metrics

**[backtesting-walk-forward](./backtesting-walk-forward/SKILL.md)** — Walk-Forward Optimization for Robust Strategy Validation

---

## Coding Patterns

**[coding-conviction-scoring](./coding-conviction-scoring/SKILL.md)** — Multi-factor conviction scoring engine combining technical, momentum, trend, volatility, and volume signals with configurable weights

**[coding-data-normalization](./coding-data-normalization/SKILL.md)** — Exchange data normalization layer: typed dataclasses for ticker/trade/orderbook, exchange-specific parsing, and symbol format standardization

**[coding-event-bus](./coding-event-bus/SKILL.md)** — Async pub/sub event bus with typed events, mixed sync/async dispatch, and singleton initialization for trading systems

**[coding-event-driven-architecture](./coding-event-driven-architecture/SKILL.md)** — Event-driven architecture for real-time trading systems: pub/sub patterns, event types, signal flow, strategy base, and common pitfalls

**[coding-fastapi-patterns](./coding-fastapi-patterns/SKILL.md)** — FastAPI application structure with typed error hierarchy, global exception handlers, CORS middleware, request timing, and lifecycle events

**[coding-pydantic-config](./coding-pydantic-config/SKILL.md)** — Pydantic-based configuration management with frozen models, nested hierarchy, TOML/env parsing, and module-level singleton

**[coding-pydantic-models](./coding-pydantic-models/SKILL.md)** — Pydantic frozen data models for trading: enums, annotated constraints, field/model validators, and computed properties

**[coding-strategy-base](./coding-strategy-base/SKILL.md)** — Abstract base strategy pattern with initialization guards, typed abstract methods, and conviction scoring integration

**[coding-websocket-manager](./coding-websocket-manager/SKILL.md)** — WebSocket connection manager with state machine (connecting/connected/reconnecting/error), exponential backoff, and message routing

---

## Data Pipelines

**[data-pipelines-alternative-data](./data-pipelines-alternative-data/SKILL.md)** — Alternative data ingestion pipelines for trading signals including news, social media, and on-chain data sources

**[data-pipelines-backfill-strategy](./data-pipelines-backfill-strategy/SKILL.md)** — Strategic data backfill for populating historical data in trading systems

**[data-pipelines-candle-data](./data-pipelines-candle-data/SKILL.md)** — OHLCV candle data processing, timeframe management, and validation for trading algorithms

**[data-pipelines-data-enrichment](./data-pipelines-data-enrichment/SKILL.md)** — Data enrichment techniques for adding context to raw trading data

**[data-pipelines-data-lake](./data-pipelines-data-lake/SKILL.md)** — Data lake architecture and management for trading data storage

**[data-pipelines-data-validation](./data-pipelines-data-validation/SKILL.md)** — Data validation and quality assurance for trading data pipelines

**[data-pipelines-feature-store](./data-pipelines-feature-store/SKILL.md)** — Feature storage and management for machine learning trading models

**[data-pipelines-order-book](./data-pipelines-order-book/SKILL.md)** — Order book data handling, spread calculation, liquidity measurement, and cross-exchange normalization

**[data-pipelines-stream-processing](./data-pipelines-stream-processing/SKILL.md)** — Streaming data processing for real-time trading signals and analytics

**[data-pipelines-time-series-database](./data-pipelines-time-series-database/SKILL.md)** — Time-series database queries and optimization for financial data

---

## Exchange Integration

**[exchange-integration-ccxt-patterns](./exchange-integration-ccxt-patterns/SKILL.md)** — Effective patterns for using CCXT library for exchange connectivity including error handling, rate limiting, and state management

**[exchange-integration-exchange-health](./exchange-integration-exchange-health/SKILL.md)** — Exchange system health monitoring and connectivity status tracking

**[exchange-integration-failover-handling](./exchange-integration-failover-handling/SKILL.md)** — Automated failover and redundancy management for exchange connectivity

**[exchange-integration-market-data-cache](./exchange-integration-market-data-cache/SKILL.md)** — High-performance caching layer for market data with low latency and high throughput

**[exchange-integration-order-book-sync](./exchange-integration-order-book-sync/SKILL.md)** — Order book synchronization and state management for accurate trading

**[exchange-integration-order-execution-api](./exchange-integration-order-execution-api/SKILL.md)** — Order execution and management API for trading systems

**[exchange-integration-rate-limiting](./exchange-integration-rate-limiting/SKILL.md)** — Rate Limiting Strategies and Circuit Breaker Patterns for Exchange API Integration

**[exchange-integration-trade-reporting](./exchange-integration-trade-reporting/SKILL.md)** — Real-time trade reporting and execution analytics for monitoring and optimization

**[exchange-integration-websocket-handling](./exchange-integration-websocket-handling/SKILL.md)** — Real-time market data handling with WebSockets including connection management, data aggregation, and robust error recovery

**[exchange-integration-websocket-streaming](./exchange-integration-websocket-streaming/SKILL.md)** — Real-time market data streaming and processing

---

## Execution Algorithms

**[execution-algorithms-order-book-impact](./execution-algorithms-order-book-impact/SKILL.md)** — Order Book Impact Measurement and Market Microstructure Analysis

**[execution-algorithms-rate-limiting](./execution-algorithms-rate-limiting/SKILL.md)** — Rate Limiting and Exchange API Management for Robust Trading Execution

**[execution-algorithms-slippage-modeling](./execution-algorithms-slippage-modeling/SKILL.md)** — Slippage Estimation, Simulation, and Fee Modeling for Realistic Execution Analysis

**[execution-algorithms-twap](./execution-algorithms-twap/SKILL.md)** — Time-Weighted Average Price algorithm for executing large orders with minimal market impact

**[execution-algorithms-twap-vwap](./execution-algorithms-twap-vwap/SKILL.md)** — TWAP and VWAP Execution Algorithms: Institutional-Grade Order Execution

**[execution-algorithms-vwap](./execution-algorithms-vwap/SKILL.md)** — Volume-Weighted Average Price algorithm for executing orders relative to market volume

---

## Paper Trading

**[paper-trading-commission-model](./paper-trading-commission-model/SKILL.md)** — Commission Model and Fee Structure Simulation

**[paper-trading-fill-simulation](./paper-trading-fill-simulation/SKILL.md)** — Fill Simulation Models for Order Execution Probability

**[paper-trading-market-impact](./paper-trading-market-impact/SKILL.md)** — Market Impact Modeling and Order Book Simulation

**[paper-trading-performance-attribution](./paper-trading-performance-attribution/SKILL.md)** — Performance Attribution Systems for Trading Strategy Decomposition

**[paper-trading-realistic-simulation](./paper-trading-realistic-simulation/SKILL.md)** — Realistic Paper Trading Simulation with Market Impact and Execution Fees

**[paper-trading-slippage-model](./paper-trading-slippage-model/SKILL.md)** — Slippage Modeling and Execution Simulation

---

## Risk Engine

**[risk-engine-correlation-risk](./risk-engine-correlation-risk/SKILL.md)** — Correlation breakdown and portfolio diversification risk

**[risk-engine-drawdown-control](./risk-engine-drawdown-control/SKILL.md)** — Maximum drawdown control and equity preservation

**[risk-engine-kill-switches](./risk-engine-kill-switches/SKILL.md)** — Implementing multi-layered kill switches at account, strategy, market, and infrastructure levels to prevent catastrophic losses and system failures

**[risk-engine-liquidity-risk](./risk-engine-liquidity-risk/SKILL.md)** — Liquidity assessment and trade execution risk

**[risk-engine-position-sizing](./risk-engine-position-sizing/SKILL.md)** — Calculating optimal position sizes using Kelly criterion, volatility adjustments, and edge-based sizing to maximize long-term growth while managing risk

**[risk-engine-stop-loss](./risk-engine-stop-loss/SKILL.md)** — Stop loss strategies for risk management

**[risk-engine-stress-testing](./risk-engine-stress-testing/SKILL.md)** — Stress test scenarios and portfolio resilience analysis

**[risk-engine-tail-risk](./risk-engine-tail-risk/SKILL.md)** — Tail risk management and extreme event protection

**[risk-engine-value-at-risk](./risk-engine-value-at-risk/SKILL.md)** — Value at Risk calculations for portfolio risk management

---

## Technical Analysis

**[technical-analysis-cycle-analysis](./technical-analysis-cycle-analysis/SKILL.md)** — Market cycles and periodic patterns in price movement

**[technical-analysis-false-signal-filtering](./technical-analysis-false-signal-filtering/SKILL.md)** — False Signal Filtering Techniques for Robust Technical Analysis

**[technical-analysis-indicator-confluence](./technical-analysis-indicator-confluence/SKILL.md)** — Indicator Confluence Validation Systems for Confirming Trading Signals

**[technical-analysis-intermarket-analysis](./technical-analysis-intermarket-analysis/SKILL.md)** — Cross-market relationships and asset class correlations

**[technical-analysis-market-microstructure](./technical-analysis-market-microstructure/SKILL.md)** — Order book dynamics and order flow analysis

**[technical-analysis-momentum-indicators](./technical-analysis-momentum-indicators/SKILL.md)** — RSI, MACD, Stochastic oscillators and momentum analysis

**[technical-analysis-price-action-patterns](./technical-analysis-price-action-patterns/SKILL.md)** — Analysis of candlestick and chart patterns for price movement prediction

**[technical-analysis-regime-detection](./technical-analysis-regime-detection/SKILL.md)** — Market Regime Detection Systems for Adaptive Trading Strategies

**[technical-analysis-statistical-arbitrage](./technical-analysis-statistical-arbitrage/SKILL.md)** — Pair trading and cointegration-based arbitrage strategies

**[technical-analysis-support-resistance](./technical-analysis-support-resistance/SKILL.md)** — Technical levels where price tends to pause or reverse

**[technical-analysis-trend-analysis](./technical-analysis-trend-analysis/SKILL.md)** — Trend identification, classification, and continuation analysis

**[technical-analysis-volatility-analysis](./technical-analysis-volatility-analysis/SKILL.md)** — Volatility measurement, forecasting, and risk assessment

**[technical-analysis-volume-profile](./technical-analysis-volume-profile/SKILL.md)** — Volume analysis techniques for understanding market structure

---

## Trading Fundamentals

**[trading-fundamentals-market-regimes](./trading-fundamentals-market-regimes/SKILL.md)** — Market regime detection and adaptation for trading systems across changing market conditions.

**[trading-fundamentals-market-structure](./trading-fundamentals-market-structure/SKILL.md)** — Market Structure and Trading Participants Analysis

**[trading-fundamentals-risk-management-basics](./trading-fundamentals-risk-management-basics/SKILL.md)** — Position sizing, stop-loss implementation, and system-level risk controls to preserve capital

**[trading-fundamentals-trading-edge](./trading-fundamentals-trading-edge/SKILL.md)** — Finding and maintaining competitive advantage in trading systems.

**[trading-fundamentals-trading-plan](./trading-fundamentals-trading-plan/SKILL.md)** — Trading Plan Structure and Risk Management Framework

**[trading-fundamentals-trading-psychology](./trading-fundamentals-trading-psychology/SKILL.md)** — Emotional discipline, cognitive bias awareness, and maintaining operational integrity in trading

---
