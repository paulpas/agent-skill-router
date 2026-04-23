# Skills

A growing collection of OpenCode skills organized by domain. Each skill is a self-contained directory (`<prefix>-<topic>/SKILL.md`) — the directory name is intentionally descriptive so you can find what you need without consulting this file. New domains and skills are added over time.

## Quick Setup

To use these skills in OpenCode, install them to your OpenCode configuration directory.

### Global Installation (Recommended)

Copy or link skills to your global OpenCode config directory:

```bash
# Clone to global skills directory
git clone https://github.com/your-org/skills.git ~/.config/opencode/skills
```

### Project-Local Installation

For project-specific skills, install to `.opencode/skills`:

```bash
# Clone to project-local skills directory
git clone https://github.com/your-org/skills.git .opencode/skills
```

### Verification

After installation, verify skills are loading:

```bash
# List all available skills
ocx skill list

# Load a specific skill
ocx skill cncf-kubernetes

# Check which skills are currently loaded
ocx skill show
```

Skills are automatically discovered when you run `/skill` command in OpenCode.

---

## Categories

- [Trading AI & ML](#trading-ai--ml) (17 skills)
- [Trading Backtesting](#trading-backtesting) (6 skills)
- [Trading Data Pipelines](#trading-data-pipelines) (10 skills)
- [Trading Exchange Integration](#trading-exchange-integration) (10 skills)
- [Trading Execution Algorithms](#trading-execution-algorithms) (6 skills)
- [Trading Paper Trading](#trading-paper-trading) (6 skills)
- [Trading Risk Management](#trading-risk-management) (9 skills)
- [Trading Technical Analysis](#trading-technical-analysis) (13 skills)
- [Trading Fundamentals](#trading-fundamentals) (6 skills)
- [Coding Patterns](#coding-patterns) (9 skills)
- [CNCF Cloud Native](#cncf-cloud-native) (83 skills)

| Prefix | Count | Description |
|--------|-------|-------------|
| cncf-* | 83 | CNCF Cloud Native projects - 55 enriched with 300+ lines, 28 with 260-299 lines |

---

## CNCF Cloud Native

CNCF Cloud Native skills organized by domain. Each skill is a self-contained directory (`cncf-*` prefix) — the directory name indicates the specific CNCF project.

**[cncf-argo](./cncf-argo/SKILL.md)** — Argo in Continuous Integration & Delivery - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-artifact-hub](./cncf-artifact-hub/SKILL.md)** — Artifact Hub in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-backstage](./cncf-backstage/SKILL.md)** — Backstage in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-buildpacks](./cncf-buildpacks/SKILL.md)** — Buildpacks in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cert-manager](./cncf-cert-manager/SKILL.md)** — cert-manager in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-chaosmesh](./cncf-chaosmesh/SKILL.md)** — Chaos Mesh in Chaos Engineering - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cilium](./cncf-cilium/SKILL.md)** — Cilium in Cloud Native Network - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cloud-custodian](./cncf-cloud-custodian/SKILL.md)** — Cloud Custodian in Automation & Configuration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cloudevents](./cncf-cloudevents/SKILL.md)** — CloudEvents in Streaming & Messaging - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-containerd](./cncf-containerd/SKILL.md)** — containerd in Container Runtime - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-container-network-interface-cni](./cncf-container-network-interface-cni/SKILL.md)** — Container Network Interface in Cloud Native Network - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-contour](./cncf-contour/SKILL.md)** — Contour in Service Proxy - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-coredns](./cncf-coredns/SKILL.md)** — CoreDNS in Coordination & Service Discovery - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cortex](./cncf-cortex/SKILL.md)** — Cortex in Observability - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cri-o](./cncf-cri-o/SKILL.md)** — CRI-O in Container Runtime - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-crossplane](./cncf-crossplane/SKILL.md)** — Crossplane in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-cubefs](./cncf-cubefs/SKILL.md)** — CubeFS in Cloud Native Storage - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-dapr](./cncf-dapr/SKILL.md)** — Dapr in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-dragonfly](./cncf-dragonfly/SKILL.md)** — Dragonfly in Container Registry - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-emissary-ingress](./cncf-emissary-ingress/SKILL.md)** — Emissary-Ingress in API Gateway - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-envoy](./cncf-envoy/SKILL.md)** — Envoy in Service Proxy - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-etcd](./cncf-etcd/SKILL.md)** — etcd in Coordination & Service Discovery - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-falco](./cncf-falco/SKILL.md)** — Falco in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-flatcar-container-linux](./cncf-flatcar-container-linux/SKILL.md)** — Flatcar Container Linux in Certified Kubernetes - Distribution - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-fluentd](./cncf-fluentd/SKILL.md)** — Fluentd in Observability - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-fluid](./cncf-fluid/SKILL.md)** — Fluid in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-flux](./cncf-flux/SKILL.md)** — Flux in Continuous Integration & Delivery - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-grpc](./cncf-grpc/SKILL.md)** — gRPC in Remote Procedure Call - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-harbor](./cncf-harbor/SKILL.md)** — Harbor in Container Registry - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-helm](./cncf-helm/SKILL.md)** — Helm in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-in-toto](./cncf-in-toto/SKILL.md)** — in-toto in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-istio](./cncf-istio/SKILL.md)** — Istio in Service Mesh - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-jaeger](./cncf-jaeger/SKILL.md)** — Jaeger in Observability - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-karmada](./cncf-karmada/SKILL.md)** — Karmada in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-keda](./cncf-keda/SKILL.md)** — KEDA in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-keycloak](./cncf-keycloak/SKILL.md)** — Keycloak in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-knative](./cncf-knative/SKILL.md)** — Knative in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kserve](./cncf-kserve/SKILL.md)** — KServe in ML Serving - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kubeflow](./cncf-kubeflow/SKILL.md)** — Kubeflow in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kubeedge](./cncf-kubeedge/SKILL.md)** — KubeEdge in Automation & Configuration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kubescape](./cncf-kubescape/SKILL.md)** — Kubescape in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kubevela](./cncf-kubevela/SKILL.md)** — KubeVela in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kubevirt](./cncf-kubevirt/SKILL.md)** — KubeVirt in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kyverno](./cncf-kyverno/SKILL.md)** — Kyverno in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-kubernetes](./cncf-kubernetes/SKILL.md)** — Kubernetes in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-lima](./cncf-lima/SKILL.md)** — Lima in Container Runtime - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-linkerd](./cncf-linkerd/SKILL.md)** — Linkerd in Service Mesh - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-litmus](./cncf-litmus/SKILL.md)** — Litmus in Chaos Engineering - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-longhorn](./cncf-longhorn/SKILL.md)** — Longhorn in Cloud Native Storage - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-metal3-io](./cncf-metal3-io/SKILL.md)** — metal3-io in Automation & Configuration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-nats](./cncf-nats/SKILL.md)** — NATS in Streaming & Messaging - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-notary-project](./cncf-notary-project/SKILL.md)** — Notary Project in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-opencost](./cncf-opencost/SKILL.md)** — OpenCost in Continuous Optimization - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-openfeature](./cncf-openfeature/SKILL.md)** — OpenFeature in Feature Flagging - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-openfga](./cncf-openfga/SKILL.md)** — OpenFGA in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-openkruise](./cncf-openkruise/SKILL.md)** — OpenKruise in Continuous Integration & Delivery - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-open-policy-agent-opa](./cncf-open-policy-agent-opa/SKILL.md)** — Open Policy Agent in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-opentelemetry](./cncf-opentelemetry/SKILL.md)** — OpenTelemetry in Observability - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-openyurt](./cncf-openyurt/SKILL.md)** — OpenYurt in Automation & Configuration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-operator-framework](./cncf-operator-framework/SKILL.md)** — Operator Framework in Application Definition & Image Build - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-prometheus](./cncf-prometheus/SKILL.md)** — Prometheus in Observability - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-rook](./cncf-rook/SKILL.md)** — Rook in Cloud Native Storage - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-spiffe](./cncf-spiffe/SKILL.md)** — SPIFFE in Key Management - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-spire](./cncf-spire/SKILL.md)** — SPIRE in Key Management - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-strimzi](./cncf-strimzi/SKILL.md)** — Strimzi in Streaming & Messaging - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-thanos](./cncf-thanos/SKILL.md)** — Thanos in Observability - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-the-update-framework-tuf](./cncf-the-update-framework-tuf/SKILL.md)** — The Update Framework in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-tikv](./cncf-tikv/SKILL.md)** — TiKV in Database - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-vitess](./cncf-vitess/SKILL.md)** — Vitess in Database - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-volcano](./cncf-volcano/SKILL.md)** — Volcano in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

**[cncf-wasmcloud](./cncf-wasmcloud/SKILL.md)** — wasmCloud in Scheduling & Orchestration - cloud native architecture, patterns, pitfalls, and best practices

---

## Trading AI & ML

- [trading-ai-anomaly-detection](./trading-ai-anomaly-detection/SKILL.md) — Detect anomalous market behavior, outliers, and potential market manipulation
- [trading-ai-explainable-ai](./trading-ai-explainable-ai/SKILL.md) — Explainable AI for understanding and trusting trading model decisions
- [trading-ai-feature-engineering](./trading-ai-feature-engineering/SKILL.md) — Create actionable trading features from raw market data
- [trading-ai-hyperparameter-tuning](./trading-ai-hyperparameter-tuning/SKILL.md) — Optimize model configurations for trading applications
- [trading-ai-live-model-monitoring](./trading-ai-live-model-monitoring/SKILL.md) — Monitor production ML models for drift, decay, and performance degradation
- [trading-ai-llm-orchestration](./trading-ai-llm-orchestration/SKILL.md) — Large Language Model orchestration for trading analysis with structured output using instructor/pydantic
- [trading-ai-model-ensemble](./trading-ai-model-ensemble/SKILL.md) — Combine multiple models for improved prediction accuracy and robustness
- [trading-ai-multi-asset-model](./trading-ai-multi-asset-model/SKILL.md) — Model inter-asset relationships for portfolio and cross-asset strategies
- [trading-ai-news-embedding](./trading-ai-news-embedding/SKILL.md) — Process news text using NLP embeddings for trading signals
- [trading-ai-order-flow-analysis](./trading-ai-order-flow-analysis/SKILL.md) — Analyze order flow to detect market pressure and anticipate price moves
- [trading-ai-regime-classification](./trading-ai-regime-classification/SKILL.md) — Detect current market regime for adaptive trading strategies
- [trading-ai-reinforcement-learning](./trading-ai-reinforcement-learning/SKILL.md) — Reinforcement Learning for automated trading agents and policy optimization
- [trading-ai-sentiment-analysis](./trading-ai-sentiment-analysis/SKILL.md) — AI-powered sentiment analysis for news, social media, and political figures in trading
- [trading-ai-sentiment-features](./trading-ai-sentiment-features/SKILL.md) — Extract market sentiment from news, social media, and analyst reports
- [trading-ai-synthetic-data](./trading-ai-synthetic-data/SKILL.md) — Generate synthetic financial data for training and testing trading models
- [trading-ai-time-series-forecasting](./trading-ai-time-series-forecasting/SKILL.md) — Time series forecasting for price prediction and market analysis
- [trading-ai-volatility-prediction](./trading-ai-volatility-prediction/SKILL.md) — Forecast volatility for risk management and option pricing

---

## Trading Backtesting

- [trading-backtest-drawdown-analysis](./trading-backtest-drawdown-analysis/SKILL.md) — Maximum Drawdown, Recovery Time, and Value-at-Risk Analysis
- [trading-backtest-lookahead-bias](./trading-backtest-lookahead-bias/SKILL.md) — Preventing lookahead bias in backtesting through strict causality enforcement, time-based validation, and comprehensive detection frameworks.
- [trading-backtest-position-exits](./trading-backtest-position-exits/SKILL.md) — Exit strategies, trailing stops, and take-profit mechanisms for trading systems.
- [trading-backtest-position-sizing](./trading-backtest-position-sizing/SKILL.md) — Position Sizing Algorithms: Fixed Fractional, Kelly Criterion, and Volatility Adjustment
- [trading-backtest-sharpe-ratio](./trading-backtest-sharpe-ratio/SKILL.md) — Sharpe Ratio Calculation and Risk-Adjusted Performance Metrics
- [trading-backtest-walk-forward](./trading-backtest-walk-forward/SKILL.md) — Walk-Forward Optimization for Robust Strategy Validation

---

## Trading Data Pipelines

- [trading-data-alternative-data](./trading-data-alternative-data/SKILL.md) — Alternative data ingestion pipelines for trading signals including news, social media, and on-chain data sources
- [trading-data-backfill-strategy](./trading-data-backfill-strategy/SKILL.md) — Strategic data backfill for populating historical data in trading systems
- [trading-data-candle-data](./trading-data-candle-data/SKILL.md) — OHLCV candle data processing, timeframe management, and validation for trading algorithms
- [trading-data-enrichment](./trading-data-enrichment/SKILL.md) — Data enrichment techniques for adding context to raw trading data
- [trading-data-feature-store](./trading-data-feature-store/SKILL.md) — Feature storage and management for machine learning trading models
- [trading-data-lake](./trading-data-lake/SKILL.md) — Data lake architecture and management for trading data storage
- [trading-data-order-book](./trading-data-order-book/SKILL.md) — Order book data handling, spread calculation, liquidity measurement, and cross-exchange normalization
- [trading-data-stream-processing](./trading-data-stream-processing/SKILL.md) — Streaming data processing for real-time trading signals and analytics
- [trading-data-time-series-database](./trading-data-time-series-database/SKILL.md) — Time-series database queries and optimization for financial data
- [trading-data-validation](./trading-data-validation/SKILL.md) — Data validation and quality assurance for trading data pipelines

---

## Trading Exchange Integration

- [trading-exchange-ccxt-patterns](./trading-exchange-ccxt-patterns/SKILL.md) — Effective patterns for using CCXT library for exchange connectivity including error handling, rate limiting, and state management
- [trading-exchange-failover-handling](./trading-exchange-failover-handling/SKILL.md) — Automated failover and redundancy management for exchange connectivity
- [trading-exchange-health](./trading-exchange-health/SKILL.md) — Exchange system health monitoring and connectivity status tracking
- [trading-exchange-market-data-cache](./trading-exchange-market-data-cache/SKILL.md) — High-performance caching layer for market data with low latency and high throughput
- [trading-exchange-order-book-sync](./trading-exchange-order-book-sync/SKILL.md) — Order book synchronization and state management for accurate trading
- [trading-exchange-order-execution-api](./trading-exchange-order-execution-api/SKILL.md) — Order execution and management API for trading systems
- [trading-exchange-rate-limiting](./trading-exchange-rate-limiting/SKILL.md) — Rate Limiting Strategies and Circuit Breaker Patterns for Exchange API Integration
- [trading-exchange-trade-reporting](./trading-exchange-trade-reporting/SKILL.md) — Real-time trade reporting and execution analytics for monitoring and optimization
- [trading-exchange-websocket-handling](./trading-exchange-websocket-handling/SKILL.md) — Real-time market data handling with WebSockets including connection management, data aggregation, and robust error recovery
- [trading-exchange-websocket-streaming](./trading-exchange-websocket-streaming/SKILL.md) — Real-time market data streaming and processing

---

## Trading Execution Algorithms

- [trading-execution-order-book-impact](./trading-execution-order-book-impact/SKILL.md) — Order Book Impact Measurement and Market Microstructure Analysis
- [trading-execution-rate-limiting](./trading-execution-rate-limiting/SKILL.md) — Rate Limiting and Exchange API Management for Robust Trading Execution
- [trading-execution-slippage-modeling](./trading-execution-slippage-modeling/SKILL.md) — Slippage Estimation, Simulation, and Fee Modeling for Realistic Execution Analysis
- [trading-execution-twap](./trading-execution-twap/SKILL.md) — Time-Weighted Average Price algorithm for executing large orders with minimal market impact
- [trading-execution-twap-vwap](./trading-execution-twap-vwap/SKILL.md) — TWAP and VWAP Execution Algorithms: Institutional-Grade Order Execution
- [trading-execution-vwap](./trading-execution-vwap/SKILL.md) — Volume-Weighted Average Price algorithm for executing orders relative to market volume

---

## Trading Paper Trading

- [trading-paper-commission-model](./trading-paper-commission-model/SKILL.md) — Commission Model and Fee Structure Simulation
- [trading-paper-fill-simulation](./trading-paper-fill-simulation/SKILL.md) — Fill Simulation Models for Order Execution Probability
- [trading-paper-market-impact](./trading-paper-market-impact/SKILL.md) — Market Impact Modeling and Order Book Simulation
- [trading-paper-performance-attribution](./trading-paper-performance-attribution/SKILL.md) — Performance Attribution Systems for Trading Strategy Decomposition
- [trading-paper-realistic-simulation](./trading-paper-realistic-simulation/SKILL.md) — Realistic Paper Trading Simulation with Market Impact and Execution Fees
- [trading-paper-slippage-model](./trading-paper-slippage-model/SKILL.md) — Slippage Modeling and Execution Simulation

---

## Trading Risk Management

- [trading-risk-correlation-risk](./trading-risk-correlation-risk/SKILL.md) — Correlation breakdown and portfolio diversification risk
- [trading-risk-drawdown-control](./trading-risk-drawdown-control/SKILL.md) — Maximum drawdown control and equity preservation
- [trading-risk-kill-switches](./trading-risk-kill-switches/SKILL.md) — Implementing multi-layered kill switches at account, strategy, market, and infrastructure levels to prevent catastrophic losses and system failures
- [trading-risk-liquidity-risk](./trading-risk-liquidity-risk/SKILL.md) — Liquidity assessment and trade execution risk
- [trading-risk-position-sizing](./trading-risk-position-sizing/SKILL.md) — Calculating optimal position sizes using Kelly criterion, volatility adjustments, and edge-based sizing to maximize long-term growth while managing risk
- [trading-risk-stop-loss](./trading-risk-stop-loss/SKILL.md) — Stop loss strategies for risk management
- [trading-risk-stress-testing](./trading-risk-stress-testing/SKILL.md) — Stress test scenarios and portfolio resilience analysis
- [trading-risk-tail-risk](./trading-risk-tail-risk/SKILL.md) — Tail risk management and extreme event protection
- [trading-risk-value-at-risk](./trading-risk-value-at-risk/SKILL.md) — Value at Risk calculations for portfolio risk management

---

## Trading Technical Analysis

- [trading-technical-cycle-analysis](./trading-technical-cycle-analysis/SKILL.md) — Market cycles and periodic patterns in price movement
- [trading-technical-false-signal-filtering](./trading-technical-false-signal-filtering/SKILL.md) — False Signal Filtering Techniques for Robust Technical Analysis
- [trading-technical-indicator-confluence](./trading-technical-indicator-confluence/SKILL.md) — Indicator Confluence Validation Systems for Confirming Trading Signals
- [trading-technical-intermarket-analysis](./trading-technical-intermarket-analysis/SKILL.md) — Cross-market relationships and asset class correlations
- [trading-technical-market-microstructure](./trading-technical-market-microstructure/SKILL.md) — Order book dynamics and order flow analysis
- [trading-technical-momentum-indicators](./trading-technical-momentum-indicators/SKILL.md) — RSI, MACD, Stochastic oscillators and momentum analysis
- [trading-technical-price-action-patterns](./trading-technical-price-action-patterns/SKILL.md) — Analysis of candlestick and chart patterns for price movement prediction
- [trading-technical-regime-detection](./trading-technical-regime-detection/SKILL.md) — Market Regime Detection Systems for Adaptive Trading Strategies
- [trading-technical-statistical-arbitrage](./trading-technical-statistical-arbitrage/SKILL.md) — Pair trading and cointegration-based arbitrage strategies
- [trading-technical-support-resistance](./trading-technical-support-resistance/SKILL.md) — Technical levels where price tends to pause or reverse
- [trading-technical-trend-analysis](./trading-technical-trend-analysis/SKILL.md) — Trend identification, classification, and continuation analysis
- [trading-technical-volatility-analysis](./trading-technical-volatility-analysis/SKILL.md) — Volatility measurement, forecasting, and risk assessment
- [trading-technical-volume-profile](./trading-technical-volume-profile/SKILL.md) — Volume analysis techniques for understanding market structure

---

## Trading Fundamentals

- [trading-fundamentals-market-regimes](./trading-fundamentals-market-regimes/SKILL.md) — Market regime detection and adaptation for trading systems across changing market conditions.
- [trading-fundamentals-market-structure](./trading-fundamentals-market-structure/SKILL.md) — Market Structure and Trading Participants Analysis
- [trading-fundamentals-risk-management-basics](./trading-fundamentals-risk-management-basics/SKILL.md) — Position sizing, stop-loss implementation, and system-level risk controls to preserve capital
- [trading-fundamentals-trading-edge](./trading-fundamentals-trading-edge/SKILL.md) — Finding and maintaining competitive advantage in trading systems.
- [trading-fundamentals-trading-plan](./trading-fundamentals-trading-plan/SKILL.md) — Trading Plan Structure and Risk Management Framework
- [trading-fundamentals-trading-psychology](./trading-fundamentals-trading-psychology/SKILL.md) — Emotional discipline, cognitive bias awareness, and maintaining operational integrity in trading

---

## Coding Patterns

- [coding-code-review](./coding-code-review/SKILL.md) — Comprehensive code review methodology with severity classification and confidence thresholds
- [coding-conviction-scoring](./coding-conviction-scoring/SKILL.md) — Conviction scoring for trade confidence and risk assessment
- [coding-data-normalization](./coding-data-normalization/SKILL.md) — Data normalization patterns for consistent feature representation
- [coding-event-bus](./coding-event-bus/SKILL.md) — Event bus patterns for decoupled message handling
- [coding-event-driven-architecture](./coding-event-driven-architecture/SKILL.md) — Event-driven architecture patterns for scalable trading systems
- [coding-fastapi-patterns](./coding-fastapi-patterns/SKILL.md) — FastAPI patterns for building high-performance trading APIs
- [coding-git-branching-strategies](./coding-git-branching-strategies/SKILL.md) — Git branching strategies for collaborative development
- [coding-security-review](./coding-security-review/SKILL.md) — Security review checklists and vulnerability patterns
- [coding-test-driven-development](./coding-test-driven-development/SKILL.md) — Test-driven development practices for trading systems
