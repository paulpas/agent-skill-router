# OpenCode Skills

A curated collection of skills for [OpenCode](https://opencode.ai) AI sessions, organized by domain. Each skill is a self-contained `SKILL.md` file that injects specialized behavior, knowledge, and constraints into the AI's context — turning a general-purpose assistant into a focused expert for the task at hand. This repository is intended for engineers who want consistent, high-quality AI assistance across cloud-native infrastructure, algorithmic trading, software engineering patterns, agent orchestration, and algorithm reference.

---

## How It Works

A **skill** is a Markdown document stored at `skills/<domain>-<topic>/SKILL.md`. When loaded, its full content becomes part of the active model context, shaping how the AI responds to the current task. Skills carry structured YAML frontmatter that identifies their domain, role, and trigger keywords.

OpenCode loads skills in two ways:

| Loading Mode | Mechanism | When It Fires |
|---|---|---|
| **Manual** | User types `/skill <name>` in the OpenCode chat | Explicitly requested |
| **Auto-load** | `metadata.triggers` keyword match | Detected in conversation context |

Auto-loading is the primary mechanism: when your message contains a keyword listed in a skill's `triggers` field, that skill is automatically injected into context — no command required. Manual loading is available for any skill at any time via `/skill <name>`.

---

## Installation

### Global Installation (Recommended)

Clone the repository to your OpenCode global skills directory. All skills become available in every OpenCode session.

```bash
git clone https://github.com/paulpas/skills.git ~/.config/opencode/skills
```

### Project-Local Installation

Clone to a project's `.opencode/skills` directory to scope skills to that project only.

```bash
git clone https://github.com/paulpas/skills.git .opencode/skills
```

### Selective Installation (Symlinks)

To use only specific skills, symlink individual skill directories into either install location:

```bash
ln -s /path/to/skills/skills/cncf-prometheus ~/.config/opencode/skills/cncf-prometheus
ln -s /path/to/skills/skills/trading-risk-stop-loss ~/.config/opencode/skills/trading-risk-stop-loss
```

### Verification

After installation, skills are discovered automatically. Verify by:

1. Starting a new OpenCode session in your project directory
2. Mentioning a topic covered by a skill (e.g., "help me with prometheus metrics") — the matching skill auto-loads
3. Or load manually: type `/skill <skill-name>` in the OpenCode chat (e.g., `/skill cncf-prometheus`)

---

## Directory Structure

Skills follow a strict `<domain>-<topic>/SKILL.md` layout. The directory name is intentionally descriptive — you can identify a skill's purpose without consulting this file.

```
skills-repo/
├── skills/                         ← all skill definitions live here
│   ├── agent-confidence-based-selector/
│   │   └── SKILL.md
│   ├── cncf-prometheus/
│   │   ├── SKILL.md
│   │   └── references/             ← optional sub-documents
│   ├── coding-code-review/
│   │   └── SKILL.md
│   ├── trading-risk-stop-loss/
│   │   └── SKILL.md
│   └── programming-algorithms/
│       └── SKILL.md
├── agent-skill-routing-system/     ← HTTP routing service (not a skill)
├── README.md
├── SKILL_FORMAT_SPEC.md
├── reformat_skills.py
└── install-skill-router.sh
```

---

## Domain Prefixes

| Prefix | Description |
|---|---|
| `agent-*` | AI agent orchestration patterns (task decomposition, routing, planning) |
| `cncf-*` | CNCF cloud-native project reference (Kubernetes, Prometheus, Helm, etc.) |
| `coding-*` | Software engineering patterns (code review, TDD, FastAPI, Pydantic, etc.) |
| `trading-*` | Algorithmic trading implementation (risk management, execution, ML, backtesting) |
| `programming-*` | Algorithm and language reference material |

---

## Agent Orchestration

- [agent-confidence-based-selector](./agent-confidence-based-selector/SKILL.md) — Selects and executes the most appropriate skill based on confidence scores and relevance metrics, enabling intelligent skill routing for dynamic task resolution
- [agent-dependency-graph-builder](./agent-dependency-graph-builder/SKILL.md) — Builds and maintains dependency graphs for task execution, enabling visualization of task relationships, identification of bottlenecks, and optimization of execution order
- [agent-dynamic-replanner](./agent-dynamic-replanner/SKILL.md) — Dynamically adjusts execution plans based on real-time feedback, changing conditions, and emerging information, enabling adaptive problem solving in uncertain environments
- [agent-goal-to-milestones](./agent-goal-to-milestones/SKILL.md) — Translates high-level goals into actionable milestones and tasks that can be executed by specialized skills, enabling goal-directed problem solving with measurable progress tracking
- [agent-multi-skill-executor](./agent-multi-skill-executor/SKILL.md) — Orchestrates execution of multiple skill specifications in sequence, managing skill dependencies, result aggregation, and error recovery for complex multi-step operations
- [agent-parallel-skill-runner](./agent-parallel-skill-runner/SKILL.md) — Executes multiple skill specifications concurrently, managing parallel workers, synchronization, and result collection for performance-optimized multi-skill operations
- [agent-task-decomposition-engine](./agent-task-decomposition-engine/SKILL.md) — Decomposes complex tasks into smaller, manageable subtasks that can be executed by appropriate specialized skills, enabling problem-solving for complex multi-step operations

---

## CNCF Cloud Native

### Architecture & Best Practices

- [cncf-architecture-best-practices](./cncf-architecture-best-practices/SKILL.md) — Cloud Native Computing Foundation (CNCF) architecture best practices for production-grade Kubernetes deployments. Covers service mesh, CNI, GitOps, CI/CD, observability, security, networking, and scaling patterns across the CNCF landscape.
- [cncf-networking-osi](./cncf-networking-osi/SKILL.md) — OSI Model Networking for Cloud-Native - All 7 layers with CNCF project mappings, Kubernetes networking, and troubleshooting patterns.

### Application Definition & Build

- [cncf-argo](./cncf-argo/SKILL.md) — Argo in Cloud-Native Engineering - Kubernetes-Native Workflow, CI/CD, and Governance
- [cncf-artifact-hub](./cncf-artifact-hub/SKILL.md) — Artifact Hub in Cloud-Native Engineering - Repository for Kubernetes Helm, Falco, OPA, and more
- [cncf-backstage](./cncf-backstage/SKILL.md) — Backstage in Cloud-Native Engineering - Developer Portal for Microservices
- [cncf-buildpacks](./cncf-buildpacks/SKILL.md) — Buildpacks in Cloud-Native Engineering - Turn source code into container images without Dockerfiles
- [cncf-dapr](./cncf-dapr/SKILL.md) — Dapr in Cloud-Native Engineering - distributed application runtime
- [cncf-helm](./cncf-helm/SKILL.md) — Helm in Cloud-Native Engineering - The Kubernetes Package Manager
- [cncf-kubevela](./cncf-kubevela/SKILL.md) — KubeVela in Cloud-Native Engineering - application platform
- [cncf-kubevirt](./cncf-kubevirt/SKILL.md) — KubeVirt in Cloud-Native Engineering - virtualization on Kubernetes
- [cncf-operator-framework](./cncf-operator-framework/SKILL.md) — Operator Framework in Tools to build and manage Kubernetes operators with standardized patterns

### Container Runtime

- [cncf-containerd](./cncf-containerd/SKILL.md) — Containerd in Cloud-Native Engineering - An open and reliable container runtime
- [cncf-cri-o](./cncf-cri-o/SKILL.md) — CRI-O in Container Runtime - OCI-compliant container runtime for Kubernetes
- [cncf-krustlet](./cncf-krustlet/SKILL.md) — Krustlet in Kubernetes Runtime - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-lima](./cncf-lima/SKILL.md) — Lima in Container Runtime - cloud native architecture, patterns, pitfalls, and best practices

### Container Registry

- [cncf-dragonfly](./cncf-dragonfly/SKILL.md) — Dragonfly in Cloud-Native Engineering - P2P file distribution
- [cncf-harbor](./cncf-harbor/SKILL.md) — Harbor in Cloud-Native Engineering - container registry
- [cncf-zot](./cncf-zot/SKILL.md) — Zot in Container Registry - cloud native architecture, patterns, pitfalls, and best practices

### Networking & Service Mesh

- [cncf-calico](./cncf-calico/SKILL.md) — Calico in Cloud Native Security - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-cilium](./cncf-cilium/SKILL.md) — Cilium in Cloud Native Network - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-cni](./cncf-cni/SKILL.md) — Cni in Cloud-Native Engineering - Container Network Interface - networking for Linux containers
- [cncf-container-network-interface-cni](./cncf-container-network-interface-cni/SKILL.md) — Container Network Interface in Cloud Native Network - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-contour](./cncf-contour/SKILL.md) — Contour in Service Proxy - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-emissary-ingress](./cncf-emissary-ingress/SKILL.md) — Emissary-Ingress in Cloud-Native Engineering - Kubernetes ingress controller
- [cncf-envoy](./cncf-envoy/SKILL.md) — Envoy in Cloud-Native Engineering - Cloud-native high-performance edge/middle/service proxy
- [cncf-grpc](./cncf-grpc/SKILL.md) — gRPC in Remote Procedure Call - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-istio](./cncf-istio/SKILL.md) — Istio in Cloud-Native Engineering - Connect, secure, control, and observe services.
- [cncf-kong](./cncf-kong/SKILL.md) — Kong in API Gateway - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-kong-ingress-controller](./cncf-kong-ingress-controller/SKILL.md) — Kong Ingress Controller in Kubernetes - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-kuma](./cncf-kuma/SKILL.md) — Kuma in Service Mesh - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-linkerd](./cncf-linkerd/SKILL.md) — Linkerd in Service Mesh - cloud native architecture, patterns, pitfalls, and best practices

### Observability

- [cncf-cortex](./cncf-cortex/SKILL.md) — Cortex in Monitoring & Observability - distributed, horizontally scalable Prometheus system
- [cncf-fluentd](./cncf-fluentd/SKILL.md) — Fluentd unified logging layer for collecting, transforming, and routing log data in cloud-native environments
- [cncf-jaeger](./cncf-jaeger/SKILL.md) — Jaeger in Cloud-Native Engineering - distributed tracing
- [cncf-open-telemetry](./cncf-open-telemetry/SKILL.md) — OpenTelemetry in Observability - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-opentelemetry](./cncf-opentelemetry/SKILL.md) — OpenTelemetry in Observability framework for tracing, metrics, and logs with vendor-neutral APIs
- [cncf-prometheus](./cncf-prometheus/SKILL.md) — Prometheus in Cloud-Native Engineering - The Prometheus monitoring system and time series database.
- [cncf-thanos](./cncf-thanos/SKILL.md) — Thanos in High availability Prometheus solution with long-term storage

### Scheduling & Orchestration

- [cncf-crossplane](./cncf-crossplane/SKILL.md) — Crossplane in Platform Engineering - Kubernetes-native control plane for multi-cloud infrastructure
- [cncf-fluid](./cncf-fluid/SKILL.md) — Fluid in A Kubernetes-native data acceleration layer for data-intensive applications
- [cncf-karmada](./cncf-karmada/SKILL.md) — Karmada in Cloud-Native Engineering - multi-cluster orchestration
- [cncf-keda](./cncf-keda/SKILL.md) — KEDA in Cloud-Native Engineering - event-driven autoscaling
- [cncf-knative](./cncf-knative/SKILL.md) — Knative in Cloud-Native Engineering - serverless on Kubernetes
- [cncf-kubeflow](./cncf-kubeflow/SKILL.md) — Kubeflow in Cloud-Native Engineering - ML on Kubernetes
- [cncf-kubernetes](./cncf-kubernetes/SKILL.md) — Kubernetes in Cloud-Native Engineering - Production-Grade Container Scheduling and Management
- [cncf-volcano](./cncf-volcano/SKILL.md) — Volcano in Batch scheduling infrastructure for Kubernetes
- [cncf-wasmcloud](./cncf-wasmcloud/SKILL.md) — wasmCloud in WebAssembly-based distributed applications platform

### Security & Compliance

- [cncf-cert-manager](./cncf-cert-manager/SKILL.md) — cert-manager in Cloud-Native Engineering - Certificate Management for Kubernetes
- [cncf-falco](./cncf-falco/SKILL.md) — Falco in Cloud-Native Engineering - Cloud Native Runtime Security
- [cncf-in-toto](./cncf-in-toto/SKILL.md) — in-toto in Supply Chain Security - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-keycloak](./cncf-keycloak/SKILL.md) — Keycloak in Cloud-Native Engineering - identity and access management
- [cncf-kubescape](./cncf-kubescape/SKILL.md) — Kubescape in Cloud-Native Engineering - Kubernetes security
- [cncf-kyverno](./cncf-kyverno/SKILL.md) — Kyverno in Cloud-Native Engineering - policy engine
- [cncf-notary-project](./cncf-notary-project/SKILL.md) — Notary Project in Content Trust & Security - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-oathkeeper](./cncf-oathkeeper/SKILL.md) — Oathkeeper in Identity & Access - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-open-policy-agent-opa](./cncf-open-policy-agent-opa/SKILL.md) — Open Policy Agent in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-openfga](./cncf-openfga/SKILL.md) — OpenFGA in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-openfeature](./cncf-openfeature/SKILL.md) — OpenFeature in Feature Flagging - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-ory-hydra](./cncf-ory-hydra/SKILL.md) — ORY Hydra in Security & Compliance - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-ory-kratos](./cncf-ory-kratos/SKILL.md) — ORY Kratos in Identity & Access - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-spiffe](./cncf-spiffe/SKILL.md) — SPIFFE in Secure Product Identity Framework for Applications
- [cncf-spire](./cncf-spire/SKILL.md) — SPIRE in SPIFFE Implementation for Real-World Deployments
- [cncf-the-update-framework-tuf](./cncf-the-update-framework-tuf/SKILL.md) — The Update Framework (TUF) in Secure software update framework for protecting software deliveries

### Storage

- [cncf-cubefs](./cncf-cubefs/SKILL.md) — CubeFS in Storage - distributed, high-performance file system
- [cncf-longhorn](./cncf-longhorn/SKILL.md) — Longhorn in Cloud Native Storage - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-rook](./cncf-rook/SKILL.md) — Rook in Cloud-Native Storage Orchestration for Kubernetes

### Streaming & Messaging

- [cncf-cloudevents](./cncf-cloudevents/SKILL.md) — CloudEvents in Streaming & Messaging - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-nats](./cncf-nats/SKILL.md) — NATS in Cloud Native Messaging - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-strimzi](./cncf-strimzi/SKILL.md) — Strimzi in Kafka on Kubernetes - Apache Kafka for cloud-native environments

### Database & Key-Value

- [cncf-coredns](./cncf-coredns/SKILL.md) — Coredns in Cloud-Native Engineering - CoreDNS is a DNS server that chains plugins
- [cncf-etcd](./cncf-etcd/SKILL.md) — etcd in Cloud-Native Engineering - distributed key-value store
- [cncf-tikv](./cncf-tikv/SKILL.md) — TiKV in Distributed transactional key-value database inspired by Google Spanner
- [cncf-vitess](./cncf-vitess/SKILL.md) — Vitess in Database clustering system for horizontal scaling of MySQL

### CI/CD & GitOps

- [cncf-flux](./cncf-flux/SKILL.md) — Flux in Cloud-Native Engineering - GitOps for Kubernetes
- [cncf-openkruise](./cncf-openkruise/SKILL.md) — OpenKruise in Extended Kubernetes workload management with advanced deployment strategies
- [cncf-tekton](./cncf-tekton/SKILL.md) — Tekton in Cloud-Native Engineering - A cloud-native Pipeline resource.

### Automation & Edge

- [cncf-chaosmesh](./cncf-chaosmesh/SKILL.md) — Chaos Mesh in Cloud-Native Engineering - chaos engineering platform for Kubernetes
- [cncf-cloud-custodian](./cncf-cloud-custodian/SKILL.md) — Cloud Custodian in Cloud-Native Engineering - rules engine for cloud infrastructure management
- [cncf-flatcar-container-linux](./cncf-flatcar-container-linux/SKILL.md) — Flatcar Container Linux in Cloud-Native Engineering - container Linux
- [cncf-kubeedge](./cncf-kubeedge/SKILL.md) — KubeEdge in Cloud-Native Engineering - edge computing
- [cncf-kserve](./cncf-kserve/SKILL.md) — KServe in Cloud-Native Engineering - model serving
- [cncf-litmus](./cncf-litmus/SKILL.md) — Litmus in Chaos Engineering - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-metal3-io](./cncf-metal3-io/SKILL.md) — metal3.io in Bare Metal Provisioning - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-opencost](./cncf-opencost/SKILL.md) — OpenCost in Kubernetes Cost Monitoring - cloud native architecture, patterns, pitfalls, and best practices
- [cncf-openyurt](./cncf-openyurt/SKILL.md) — OpenYurt in Extending Kubernetes to edge computing scenarios

### Cost & Process

- [cncf-process-architecture](./cncf-process-architecture/SKILL.md) — Creates or updates ARCHITECTURE.md documenting the project's design, components, and technical decisions for CNCF projects
- [cncf-process-incident-response](./cncf-process-incident-response/SKILL.md) — Creates or updates an incident response plan covering detection, triage, communication, and post-incident review for CNCF projects
- [cncf-process-releases](./cncf-process-releases/SKILL.md) — Creates or updates RELEASES.md documenting the release process, versioning policy, and release cadence for CNCF projects
- [cncf-process-security-policy](./cncf-process-security-policy/SKILL.md) — Creates or updates SECURITY.md defining the vulnerability reporting process, disclosure timeline, and supported versions for CNCF projects

---

## Coding Patterns

- [coding-code-review](./coding-code-review/SKILL.md) — Analyzes code diffs and files to identify bugs, security vulnerabilities, code smells, and architectural concerns, producing a structured review report with prioritized, actionable feedback
- [coding-conviction-scoring](./coding-conviction-scoring/SKILL.md) — Conviction scoring for trade confidence and risk assessment
- [coding-data-normalization](./coding-data-normalization/SKILL.md) — Exchange data normalization layer: typed dataclasses for ticker/trade/orderbook, exchange-specific parsing, and symbol format standardization
- [coding-event-bus](./coding-event-bus/SKILL.md) — Async pub/sub event bus with typed events, mixed sync/async dispatch, and singleton initialization for trading systems
- [coding-event-driven-architecture](./coding-event-driven-architecture/SKILL.md) — Event-driven architecture for real-time trading systems: pub/sub patterns, event types, signal flow, strategy base, and common pitfalls
- [coding-fastapi-patterns](./coding-fastapi-patterns/SKILL.md) — FastAPI application structure with typed error hierarchy, global exception handlers, CORS middleware, request timing, and lifecycle events
- [coding-git-branching-strategies](./coding-git-branching-strategies/SKILL.md) — Git branching models including Git Flow, GitHub Flow, Trunk-Based Development, and feature flag strategies for CI/CD pipelines
- [coding-juice-shop](./coding-juice-shop/SKILL.md) — OWASP Juice Shop guide: Web application security testing with intentionally vulnerable Node.js/Express application for learning and practice
- [coding-markdown-best-practices](./coding-markdown-best-practices/SKILL.md) — Markdown best practices for OpenCode skills - syntax rules, common pitfalls, and coding practices for documentation consistency
- [coding-pydantic-config](./coding-pydantic-config/SKILL.md) — Pydantic-based configuration management with frozen models, nested hierarchy, TOML/env parsing, and module-level singleton
- [coding-pydantic-models](./coding-pydantic-models/SKILL.md) — Pydantic frozen data models for trading: enums, annotated constraints, field/model validators, and computed properties
- [coding-security-review](./coding-security-review/SKILL.md) — Security-focused code review identifying vulnerabilities like injection, XSS, insecure deserialization, and misconfigurations, with remediation guidance
- [coding-strategy-base](./coding-strategy-base/SKILL.md) — Abstract base strategy pattern with initialization guards, typed abstract methods, and conviction scoring integration
- [coding-test-driven-development](./coding-test-driven-development/SKILL.md) — Test-Driven Development (TDD) and Behavior-Driven Development (BDD) patterns with pytest, unit tests, mocking, and test pyramid principles
- [coding-websocket-manager](./coding-websocket-manager/SKILL.md) — WebSocket connection manager with state machine (connecting/connected/reconnecting/error), exponential backoff, and message routing

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

## Programming

- [programming-algorithms](./programming-algorithms/SKILL.md) — Comprehensive algorithm selection guide — choose, implement, and optimize algorithms based on time/space trade-offs, input characteristics, and problem constraints

---

## Contributing

To add a skill, create `skills/<domain>-<topic>/SKILL.md` following [SKILL_FORMAT_SPEC.md](./SKILL_FORMAT_SPEC.md). Run `python reformat_skills.py` to apply standard frontmatter.

---

See [SKILL_FORMAT_SPEC.md](./SKILL_FORMAT_SPEC.md) for the full skill authoring guide.
