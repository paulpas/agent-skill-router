# Agentic Skill Routing System

Production-grade agentic skill orchestration system for OpenCode with intelligent skill routing, execution planning, and observability.

## Overview

The Agentic Skill Routing System is a sophisticated orchestration platform that:

- **Intelligently Routes Tasks**: Uses semantic embedding matching and LLM ranking to select the most appropriate skills for any task
- **Generates Execution Plans**: Creates optimized sequential, parallel, or hybrid execution plans
- **Executes with Safety**: Validates inputs, applies retry logic, and supports fallback strategies
- **Provides Observability**: Structured logging with full task tracing and performance metrics

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                             │
│                        (Task Description)                       │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Safety Layer                             │
│  • Prompt Injection Detection                                   │
│  • Schema Validation                                            │
│  • Skill Allowlist Enforcement                                  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Embedding Service                           │
│  • Generates vector embeddings for tasks                        │
│  • Batch embedding processing                                   │
│  • Caching support                                              │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Vector Database                             │
│  • Semantic skill search                                        │
│  • Cosine similarity matching                                   │
│  • Index persistence                                            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       LLM Ranker                                │
│  • Ranks top-K candidates                                       │
│  • Provides reasoning for rankings                              │
│  • Assigns confidence scores                                    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Deterministic Filter                        │
│  • Max skills constraint (≤5)                                   │
│  • Category constraints                                         │
│  • Latency budget enforcement                                   │
│  • Minimum score threshold                                      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Execution Planner                           │
│  • Strategy selection (sequential/parallel/hybrid)             │
│  • Dependency resolution                                        │
│  • Step optimization                                            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Execution Engine                            │
│  • Skill orchestration                                          │
│  • Retry logic (max 2 retries)                                  │
│  • Fallback support                                             │
│  • Timeout management                                           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MCP Bridge                                │
│  • Shell Command Tool                                           │
│  • File Operations Tool                                         │
│  • HTTP Request Tool                                            │
│  • Kubectl Tool (optional)                                      │
│  • Log Fetch Tool                                               │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Observability Layer                         │
│  • Structured JSON logs                                         │
│  • Task ID correlation                                          │
│  • Performance metrics                                          │
│  • Error tracking                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
cd agent-skill-routing-system

# Install dependencies
npm install

# Build the project
npm run build

# Or run directly with ts-node
npm run dev
```

## Configuration

### Default Configuration

```json
{
  "skillsDirectory": "./samples/skill-definitions",
  "embedding": {
    "model": "text-embedding-3-small",
    "dimensions": 1536,
    "batchSize": 100
  },
  "llm": {
    "model": "gpt-4o-mini",
    "maxCandidates": 10,
    "temperature": 0.1,
    "maxTokens": 1000
  },
  "execution": {
    "maxRetries": 2,
    "timeoutMs": 30000,
    "parallelConcurrency": 5,
    "fallbackEnabled": true
  },
  "safety": {
    "maxSkillsInPlan": 5,
    "enablePromptInjectionFilter": true,
    "requireSchemaValidation": true,
    "skillAllowlist": []
  },
  "observability": {
    "level": "info",
    "includePayloads": false,
    "logDirectory": "./logs"
  }
}
```

### Environment Variables

```bash
# OpenAI API Key (required for embeddings and LLM ranking)
OPENAI_API_KEY=sk-...

# Server port
PORT=3000

# Log level
LOG_LEVEL=info
```

## API Endpoints

### POST /route

Route a task to the most appropriate skills.

**Request:**
```json
{
  "task": "Execute a 100 BTC order with TWAP algorithm over 30 minutes",
  "context": {
    "user_id": "user_123",
    "priority": "high"
  },
  "constraints": {
    "categories": ["trading-execution"],
    "maxSkills": 3,
    "latencyBudgetMs": 5000
  }
}
```

**Response:**
```json
{
  "taskId": "req_abc123",
  "selectedSkills": [
    {
      "name": "trading-execution-twap",
      "score": 0.95,
      "role": "primary"
    }
  ],
  "executionPlan": {
    "strategy": "sequential",
    "steps": [...]
  },
  "confidence": 0.92,
  "reasoningSummary": "TWAP algorithm matches the task requirements",
  "candidatePool": ["trading-execution-twap", "trading-execution-iceberg"],
  "routingScores": {
    "trading-execution-twap": 0.95
  },
  "latencyMs": 1250
}
```

### POST /execute

Execute a skill plan with the provided inputs.

**Request:**
```json
{
  "task": "Execute a 100 BTC sell order via TWAP",
  "taskId": "req_abc123",
  "inputs": {
    "symbol": "BTC/USD",
    "quantity": 100,
    "duration": 30,
    "side": "sell",
    "exchange": "binance"
  },
  "skills": ["trading-execution-twap"]
}
```

**Response:**
```json
{
  "taskId": "req_abc123",
  "task": "Execute a 100 BTC sell order via TWAP",
  "status": "success",
  "results": [
    {
      "skillName": "trading-execution-twap",
      "status": "success",
      "output": {
        "averagePrice": 42356.78,
        "executedQuantity": 100
      },
      "latencyMs": 45234,
      "retries": 0
    }
  ],
  "totalLatencyMs": 45624,
  "confidence": 0.92
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-23T10:00:00.000Z",
  "version": "1.0.0"
}
```

### GET /stats

Get system statistics.

**Response:**
```json
{
  "skills": {
    "totalSkills": 42,
    "categories": 12,
    "tags": 35
  },
  "mcpTools": {
    "totalTools": 5,
    "enabledTools": ["shell", "file", "http", "kubectl", "log_fetch"]
  }
}
```

## Skill Definition Format

Skills are defined as TypeScript modules or YAML files:

### TypeScript Skill Definition

```typescript
import { SkillMetadata } from '../core/types.js';

export const mySkill: SkillMetadata = {
  name: 'skill-name',
  category: 'category-name',
  description: 'What this skill does',
  tags: ['tag1', 'tag2'],
  version: '1.0.0',
  author: 'Author Name',
  input_schema: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    },
    required: ['param1']
  },
  output_schema: {
    type: 'object',
    properties: {
      result: { type: 'string' }
    }
  },
  performance: {
    averageLatencyMs: 1000,
    successRate: 0.99,
    lastUpdated: '2024-01-01'
  }
};
```

### YAML Skill Definition

```yaml
metadata:
  name: "skill-name"
  category: "category-name"
  description: "What this skill does"
  tags:
    - "tag1"
    - "tag2"
  version: "1.0.0"
  author: "Author Name"

input_schema:
  type: "object"
  properties:
    param1:
      type: "string"
  required:
    - "param1"

output_schema:
  type: "object"
  properties:
    result:
      type: "string"

performance:
  averageLatencyMs: 1000
  successRate: 0.99
  lastUpdated: "2024-01-01"
```

## MCP Tools

The system provides the following MCP (Model Context Protocol) tools:

### Shell Command Tool

Execute shell commands with security validation.

```json
{
  "command": "ls -la ./src"
}
```

### File Operations Tool

Read, write, and manage files with path traversal protection.

```json
{
  "operation": "read",
  "filepath": "config.json"
}
```

### HTTP Request Tool

Make HTTP requests with security filtering.

```json
{
  "url": "https://api.example.com/data",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "key": "value"
  }
}
```

### Kubectl Tool (Optional)

Execute Kubernetes commands.

```json
{
  "command": "get pods -n production"
}
```

### Log Fetch Tool

Retrieve and filter logs from files.

```json
{
  "pattern": "logs/*.log",
  "options": {
    "level": "error",
    "maxResults": 100
  }
}
```

## Safety Features

### Prompt Injection Filtering

The system detects and blocks:
- Prompt injection attempts
- Command injection patterns
- SQL injection patterns
- Social engineering attempts

### Schema Validation

All skill inputs are validated against their schemas before execution.

### Skill Allowlist

Optional allowlist ensures only approved skills can be executed.

## Observability

### Log Format

```json
{
  "timestamp": "2024-01-23T10:00:00.000Z",
  "taskId": "req_abc123",
  "level": "info",
  "category": "Router",
  "message": "Routing task completed",
  "data": {
    "selectedSkills": 1,
    "confidence": 0.92
  }
}
```

### Metrics Tracked

- Task routing latency
- Skill selection confidence scores
- Execution success/failure rates
- Retry counts
- Tool execution times

## Project Structure

```
agent-skill-routing-system/
├── src/
│   ├── core/
│   │   ├── types.ts              # Core type definitions
│   │   ├── SkillRegistry.ts      # Skill loading and management
│   │   ├── Router.ts             # Main routing orchestration
│   │   ├── ExecutionEngine.ts    # Skill execution engine
│   │   ├── ExecutionPlanner.ts   # Plan generation
│   │   └── SafetyLayer.ts        # Security filtering
│   ├── mcp/
│   │   ├── MCPBridge.ts          # MCP tools manager
│   │   ├── types.ts              # MCP types
│   │   └── tools/
│   │       ├── ShellCommandTool.ts
│   │       ├── FileTool.ts
│   │       ├── HTTPTool.ts
│   │       ├── KubectlTool.ts
│   │       └── LogFetchTool.ts
│   ├── embedding/
│   │   ├── EmbeddingService.ts   # Vector embeddings
│   │   └── VectorDatabase.ts     # Skill search
│   ├── llm/
│   │   ├── LLMRanker.ts          # LLM-based ranking
│   │   └── prompt.ts             # Prompt templates
│   ├── observability/
│   │   └── Logger.ts             # Structured logging
│   └── index.ts                  # Entry point
├── samples/
│   ├── skill-definitions/
│   │   ├── cncf-kubernetes.ts
│   │   ├── cncf-kubernetes.yaml
│   │   ├── trading-execution-twap.ts
│   │   └── trading-execution-twap.yaml
│   └── examples/
│       ├── routing-example.json
│       └── execution-example.json
├── config/
│   ├── default.json
│   └── skills.json
├── logs/                          # Log files (created at runtime)
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run check
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Building

```bash
npm run build
```

### Starting Server

```bash
npm start
# or for development
npm run dev
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY config/ ./config/
COPY samples/ ./samples/

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-skill-router
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-skill-router
  template:
    metadata:
      labels:
        app: agent-skill-router
    spec:
      containers:
      - name: router
        image: agent-skill-router:latest
        ports:
        - containerPort: 3000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## License

MIT

## Author

OpenCode
