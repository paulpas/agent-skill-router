# Agent Skill Router Show and Tell Presentation

## Overview

The Agent Skill Router is an intelligent skill routing system that automatically selects and injects the right expertise into your AI's context. With 706 skills across 8 domains and built-in compression, the router delivers expert knowledge without manual commands.

## Key Features

### 🎯 Massive Skill Library
- **706 Skills** across 8 domains (Agent, CNCF, Coding, Go, Linux, Programming, Trading, Writing)
- Each skill is a self-contained Markdown document with specialized expertise
- Skills follow strict quality standards (minimum 3,000 bytes, no stub content)

### 🔄 Intelligent Auto-Routing
- **Semantic Search** — OpenAI embeddings + cosine similarity for candidate retrieval
- **LLM Ranking** — Intelligent selection and reasoning with gpt-4o-mini (or Anthropic/Claude)
- **Multi-factor Scoring** — Considers text similarity, historical success rate, skill availability
- **Automatic Trigger Matching** — Skills load when conversation contains their trigger keywords

### 🗜️ SkillCompressor Technology
- Reduces token overhead by 28-65%
- Preserves essential information while minimizing context usage
- Enables loading more relevant skills within token limits

### ⚡ High Performance
- **~10ms warm responses** — Cached skill lookups
- **~3.5s cold responses** — Includes embedding generation and LLM ranking
- **Multi-layer caching** — Optimized for repeated use patterns

### 🔌 MCP Integration
- Works seamlessly with OpenCode's `route_to_skill` tool
- Provides standardized API for skill routing operations
- Compatible with other MCP clients

### 🛠️ Developer Productivity Tools
- **Skill Generator** — Create new skills programmatically using local LLMs
- **Quality Fixer** — Detect and repair placeholder code in existing skills
- **Auto Skill Creation** — Generate complete, compliant skills from natural language descriptions using skill-generate.sh
- **Domain-specific wrappers** — Optimized fixers for different skill types

## How It Works

### The Routing Pipeline
```
User Message
     ↓
Intent Extraction (keyword/phrase analysis)
     ↓
Skills Index Lookup (substring + semantic matching)
     ↓
Confidence Scoring & Ranking
     ↓
Load Top Skill(s) → Validate → Inject Context
     ↓
Execute with Skill Constraints
     ↓
Log Outcome → Update System Metrics
```

### Skill Loading Process
1. **Trigger Detection** — System scans conversation for skill trigger keywords
2. **Candidate Retrieval** — Finds skills with matching triggers via semantic search
3. **LLM Ranking** — Uses LLM to score and rank candidates by relevance
4. **Context Injection** — Loads top skill(s) into AI's context window
5. **Constrained Execution** — AI operates with skill-specific guidelines

## Using Agent Skill Router via OpenCode

### Basic Usage Examples

#### 1. Code Review Assistance
When you ask OpenCode to review code, the router automatically loads relevant skills:

```
User: "review this Python code for security issues"
     ↓
Router loads: coding-code-review, coding-security-review skills
     ↓
AI responds with expert-level code review feedback
```

#### 2. Trading Strategy Development
For algorithmic trading tasks:

```
User: "implement a mean reversion strategy for crypto trading"
     ↓
Router loads: trading-strategy-mean-reversion, trading-risk-management skills
     ↓
AI generates strategy code with proper risk controls
```

#### 3. Kubernetes Deployment
For cloud-native tasks:

```
User: "deploy this application to Kubernetes with ingress"
     ↓
Router loads: cncf-kubernetes, cncf-ingress-nginx skills
     ↓
AI provides kubectl commands and YAML manifests
```

### Advanced Usage Patterns

#### Chaining Multiple Skills
Complex tasks can trigger multiple relevant skills:

```
User: "create a microservice with authentication and deploy to AWS"
     ↓
Router loads: 
   - coding-microservice-architecture
   - coding-authentication-patterns  
   - cncf-aws-ecs
   - cncf-docker-best-practices
     ↓
AI provides coordinated architecture and deployment guidance
```

#### Fallback and Confidence Scoring
The router handles uncertainty gracefully:

```
User: "help with data processing"  (ambiguous request)
     ↓
Router evaluates: 
   - coding-data-pipelines (confidence: 0.62)
   - programming-algorithms (confidence: 0.58)
   - trading-data-analysis (confidence: 0.45)
     ↓
Since top score < 0.65 threshold, applies fallback routing
     ↓
May ask clarifying questions or load multiple lower-confidence skills
```

### Skill Compression Benefits

#### Before Compression
- Loading 3 skills might use 8,000+ tokens
- Risk of exceeding context window limits
- Slower response times due to excessive context

#### After SkillCompressor
- Same 3 skills use only 3,000-5,000 tokens
- 40-60% reduction in context usage
- Faster responses and ability to load more relevant skills

## Real-World Examples

### Example 1: Improving Code Quality
```
User: "refactor this JavaScript function to be more readable"
     ↓
Router loads: coding-refactoring, coding-code-quality skills
     ↓
AI provides:
   - Specific refactoring suggestions
   - Before/after code examples
   - Explanation of readability improvements
   - Links to relevant coding standards
```

### Example 2: Setting Up Monitoring
```
User: "add Prometheus monitoring to my Go microservice"
     ↓
Router loads: 
   - cncf-prometheus
   - go-microservice-patterns
   - coding-monitoring-best-practices
     ↓
AI provides:
   - Prometheus configuration YAML
   - Go instrumentation code examples
   - ServiceMonitor CRD definitions
   - Alerting rules suggestions
```

### Example 3: Risk Management in Trading
```
User: "how do I manage position risk for my futures portfolio?"
     ↓
Router loads:
   - trading-risk-position-sizing
   - trading-risk-stop-loss
   - trading-risk-kill-switches
     ↓
AI provides:
   - Kelly criterion position sizing formula
   - ATR-based stop loss implementation
   - Emergency stop loss procedures
   - Python code examples with risk limits
```

## Getting Started

### Installation
```bash
git clone https://github.com/paulpas/agent-skill-router
cd agent-skill-router
./install-skill-router.sh  # Interactive setup
```

### Using with OpenCode
Once installed, the router works automatically:
1. Start OpenCode
2. Begin chatting naturally
3. Watch as relevant skills load automatically based on your conversation
4. Receive expert-level assistance without manual skill loading

### Custom Skill Creation
Create domain-specific expertise:
```bash
./scripts/skill-generate.sh "Create a skill about Rust async programming" \
    -d programming -n rust-async
```

## Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Expert Knowledge On Demand** | Instant access to specialized skills without memorization |
| **Reduced Cognitive Load** | AI handles expertise lookup; you focus on problem-solving |
| **Consistent Quality** | All responses adhere to skill-specific best practices |
| **Time Savings** | Eliminates manual research and skill selection |
| **Continuous Learning** | System improves routing accuracy over time |
| **Privacy-Focused** | Optional self-hosted LLM support for sensitive workloads |

## Conclusion

The Agent Skill Router transforms how AI assistants work by providing intelligent, automatic access to a vast library of domain expertise. By combining semantic search, LLM ranking, and skill compression, it delivers the right knowledge at the right time—making AI interactions more productive, accurate, and valuable.

Whether you're writing code, designing systems, analyzing data, or building trading strategies, the router ensures you have access to expert guidance exactly when you need it.