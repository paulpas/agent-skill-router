---




name: framework-orchestration-routing
description: Orchestrates task routing across multiple AI frameworks (LangChain, LlamaIndex,
  CrewAI, AutoGen, MCP) by selecting the optimal framework for each subtask and composing
  cross-framework workflows with proper context bridges.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: framework orchestration routing, FOR, langchain, llamaindex, crewai, auto gen, multi agent orchestration, cross framework workflow gen
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - diagrams
  related-skills: intelligent-skill-selection, confidence-based-selector, agent-architecture-patterns,
    workflow-patterns




---




# Framework Orchestration Routing (FOR)

Orchestrates task routing across multiple AI frameworks by selecting the optimal framework for each subtask and composing cross-framework workflows. When this skill is active, the model acts as a senior AI systems architect who evaluates framework capabilities against task requirements, designs cross-framework orchestration patterns, and implements context bridges between disparate systems.

## TL;DR Checklist

- [ ] Classify the task into a capability domain (RAG, multi-agent coordination, tool use, chaining)
- [ ] Map each subtask to the framework with strongest native support for that domain
- [ ] Design context bridge interfaces where frameworks exchange data
- [ ] Implement failure isolation — one framework's failure does not cascade to others
- [ ] Validate routing decisions against latency and cost constraints

---

## When to Use

Use this skill when:

- Architecting a system that must use multiple AI frameworks together (e.g., LangChain for tool execution + LlamaIndex for RAG)
- Selecting the best framework for a specific task type among available options (LangChain, LlamaIndex, CrewAI, AutoGen, MCP, custom)
- Designing cross-framework communication patterns where agents or chains need to share state
- Refactoring a monolithic framework-dependent system into a multi-framework architecture
- Evaluating whether to adopt a new AI framework for existing workflows

---

## When NOT to Use

Avoid this skill for:

- Single-framework projects — use `workflow-patterns` instead if you just need orchestration within one framework
- Selecting frameworks based purely on popularity without capability analysis — use `framework-selection-criteria` (coding domain) for structured decision matrices
- Implementing framework-specific internals — use the framework's own documentation, not this routing skill
- Simple sequential chains that fit comfortably in one framework — overhead of cross-framework routing outweighs benefits

---

## Core Workflow

```
┌─────────────┐
│  Task Input  │
└──────┬──────┘
       ↓
┌──────────────────────┐
│ Capability Classification    │
│ RAG | Multi-Agent | Tools  │
│     | Chaining | Parallel   │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Framework Scoring     │
│ (per subtask)         │
│ LangChain: ___/10     │
│ LlamaIndex: __/10     │
│ CrewAI: ____/10       │
│ AutoGen: ____/10      │
│ MCP: _____/10         │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Context Bridge Design  │
│ Define data contracts  │
│ between frameworks     │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Routing Implementation  │
│ Framework A → bridge   │
│        → Framework B   │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Failure Isolation     │
│ Circuit breakers per  │
│ framework boundary    │
└──────────────────────┘
```

1. **Classify Capability Domain** — Analyze the task and decompose it into subtasks. Classify each subtask into one or more capability domains:
   - **RAG/Knowledge Retrieval** — Querying structured/unstructured knowledge bases
   - **Multi-Agent Coordination** — Multiple autonomous agents collaborating
   - **Tool Execution** — Calling external APIs, running code, interacting with services
   - **Chain Composition** — Sequential or branching LLM call pipelines
   - **Parallel Processing** — Independent tasks that can run concurrently

   **Checkpoint:** Every subtask must map to at least one capability domain. If a subtask maps to zero domains, it is not an AI task and should be handled by conventional code.

2. **Score Frameworks Per Subtask** — For each subtask's capability domain, score each available framework from 1–10 based on:
   - Native support for the capability (does the framework have first-class primitives for this?)
   - Community maturity and documentation quality
   - Performance characteristics (latency, throughput, memory)
   - Integration cost (how many adapters/bridges needed vs. native support)
   - Production readiness (real-world usage patterns, known issues)

   ```python
   def score_framework(
       framework: str,
       capability_domain: str,
       requirements: Dict[str, float],
   ) -> float:
       """Score a framework against a capability domain with weighted requirements.
       
       Args:
           framework: Framework name (langchain, llamaindex, crewai, autogen, mcp)
           capability_domain: One of rag, multi-agent, tool-use, chaining, parallel
           requirements: Dict mapping requirement names to weights (0.0–1.0)
       
       Returns:
           Composite score from 0.0 to 10.0
       """
       scoring_matrix = {
           "langchain": {
               "rag": 6.5,        # Has RAG chains but not its own retrieval engine
               "multi-agent": 7.0, # CrewAgentExecutor and multi-chain orchestration
               "tool-use": 9.5,   # Best-in-class tool registry and execution
               "chaining": 9.0,   # First-mover advantage in chain composition
               "parallel": 7.5,   # Parallel chains with AsyncLLMChain
           },
           "llamaindex": {
               "rag": 9.5,        # Purpose-built for RAG with query engines
               "multi-agent": 6.0, # AgentQueryOptimizer exists but limited ecosystem
               "tool-use": 5.0,   # Tools supported but not a primary focus
               "chaining": 7.0,   # Query pipeline chains are framework-specific
               "parallel": 8.0,   # Async query execution is well-supported
           },
           "crewai": {
               "rag": 5.5,        # Can integrate RAG but not native
               "multi-agent": 9.5,# Purpose-built multi-agent orchestration
               "tool-use": 7.0,   # Tools integrated via LangChain foundation
               "chaining": 6.0,   # Crew-based workflow replaces manual chaining
               "parallel": 8.0,   # Parallel agent execution is a core feature
           },
           "autogen": {
               "rag": 5.0,        # No native RAG; must integrate externally
               "multi-agent": 9.0,# GroupChat and ConversableAgent patterns
               "tool-use": 7.5,   # Tool execution via assistant registration
               "chaining": 6.5,   # Conversation-based rather than chain-based
               "parallel": 8.5,   # Concurrent agent conversations supported
           },
           "mcp": {
               "rag": 4.0,        # Protocol-only; no built-in RAG
               "multi-agent": 6.5,# MCP servers can act as agents
               "tool-use": 9.0,   # Native tool protocol with server model
               "chaining": 4.5,   # No chain primitives; protocol for tools
               "parallel": 7.0,   # Multiple MCP server connections
           },
       }
       
       raw_scores = scoring_matrix.get(framework, {})
       domain_score = raw_scores.get(capability_domain, 3.0)
       
       # Apply requirement weights (simplified — in practice, more dimensions exist)
       return min(10.0, domain_score * sum(requirements.values()) / len(requirements))
   ```

   **Checkpoint:** The chosen framework for each subtask must score at least 2 points higher than the second-best alternative. If the gap is less than 2, the frameworks are functionally equivalent for this task and you should prefer the one already integrated into the system to reduce coupling.

3. **Design Context Bridges** — Where Framework A's output becomes Framework B's input, define explicit data contracts. Each bridge must specify:
   - Data schema (what fields/structure flow between frameworks)
   - Serialization format (JSON, protobuf, native objects)
   - Transformation logic (how Framework A's output shape maps to Framework B's expected input)
   - Error handling contract (what happens when data is malformed or missing)

   ```python
   from dataclasses import dataclass, field
   from typing import Any, Optional
   import json
   
   @dataclass
   class ContextBridge:
       """Defines the interface for passing context between frameworks."""
       source_framework: str
       target_framework: str
       schema: dict = field(default_factory=dict)
       
       def serialize(self, data: dict) -> bytes:
           """Serialize data according to bridge schema.
           
           Args:
               data: Raw data from source framework
           
           Returns:
               Serialized bytes ready for transmission
           
           Raises:
               ValueError: If data doesn't conform to the bridge schema
           """
           # Validate against schema before serialization
           for key, expected_type in self.schema.items():
               if key not in data:
                   raise ValueError(f"Missing required field: {key}")
               if not isinstance(data[key], expected_type):
                   raise TypeError(
                       f"Field '{key}' must be {expected_type.__name__}, "
                       f"got {type(data[key]).__name__}"
                   )
           return json.dumps(data).encode("utf-8")
       
       def deserialize(self, raw: bytes) -> dict:
           """Deserialize data according to bridge schema.
           
           Args:
               raw: Serialized bytes from bridge transmission
           
           Returns:
               Parsed and validated data dictionary
           
           Raises:
               json.JSONDecodeError: If raw data is not valid JSON
           """
           return json.loads(raw)
   
   # Example bridge: LangChain RAG output → LlamaIndex query engine input
   rag_to_retrieval_bridge = ContextBridge(
       source_framework="langchain",
       target_framework="llamaindex",
       schema={
           "query_text": str,
           "retrieved_contexts": list,     # List of retrieved document chunks
           "source_documents": list,        # List of document metadata dicts
           "confidence_scores": list,       # Confidence per retrieved context
       },
   )
   ```

4. **Implement Routing with Circuit Breakers** — Each framework boundary must have failure isolation. Use circuit breaker patterns to prevent one framework's instability from cascading:

   ```python
   import enum
   import time
   from dataclasses import dataclass, field
   from typing import Callable, Any, Optional
   
   class CircuitState(enum.Enum):
       CLOSED = "closed"        # Normal operation
       OPEN = "open"            # Failing — route to fallback
       HALF_OPEN = "half_open"  # Testing if service recovered
   
   @dataclass
   class FrameworkCircuitBreaker:
       """Circuit breaker for a specific framework boundary.
       
       Prevents cascading failures by detecting when a framework
       is consistently failing and routing around it.
       """
       framework_name: str
       failure_threshold: int = 5          # Failures before opening circuit
       recovery_timeout: float = 30.0      # Seconds before half-open test
       failure_count: int = 0
       state: CircuitState = CircuitState.CLOSED
       last_failure_time: Optional[float] = None
       
       def can_execute(self) -> bool:
           """Check if requests should be routed to this framework."""
           if self.state == CircuitState.CLOSED:
               return True
           
           if self.state == CircuitState.OPEN:
               if self.last_failure_time and (
                   time.time() - self.last_failure_time >= self.recovery_timeout
               ):
                   self.state = CircuitState.HALF_OPEN
                   return True
               return False  # Still in timeout period — route elsewhere
           
           # HALF_OPEN: Allow one test request
           return True
       
       def record_success(self) -> None:
           """Record a successful framework call."""
           if self.state == CircuitState.HALF_OPEN:
               self.state = CircuitState.CLOSED
           self.failure_count = 0
       
       def record_failure(self) -> None:
           """Record a failed framework call."""
           self.failure_count += 1
           self.last_failure_time = time.time()
           
           if self.failure_count >= self.failure_threshold:
               self.state = CircuitState.OPEN
   
   @dataclass
   class FrameworkRouter:
       """Routes tasks to the appropriate framework with circuit breaker protection."""
       bridges: list[ContextBridge] = field(default_factory=list)
       circuits: dict[str, FrameworkCircuitBreaker] = field(default_factory=dict)
       
       def route(
           self,
           task_type: str,
           subtask_frameworks: dict[str, float],
           input_data: Any,
       ) -> dict:
           """Route a subtask to the best available framework.
           
           Args:
               task_type: High-level task category
               subtask_frameworks: Framework name → score mapping
               input_data: Raw input for the subtask
           
           Returns:
               Dict with 'framework' used, 'result', and 'bridge_transfers'
           
           Raises:
               RuntimeError: If no framework can handle the subtask
           """
           # Sort frameworks by score (highest first)
           sorted_frameworks = sorted(
               subtask_frameworks.items(), key=lambda x: x[1], reverse=True
           )
           
           for framework_name, score in sorted_frameworks:
               if score < 5.0:
                   continue  # Skip frameworks below minimum viability threshold
               
               circuit = self.circuits.get(framework_name) or FrameworkCircuitBreaker(
                   framework_name=framework_name
               )
               self.circuits[framework_name] = circuit
               
               if not circuit.can_execute():
                   continue  # Circuit open — try next best framework
               
               try:
                   result = self._execute_with_framework(framework_name, input_data)
                   circuit.record_success()
                   
                   return {
                       "framework": framework_name,
                       "score": score,
                       "result": result,
                       "status": "success",
                   }
               except Exception as e:
                   circuit.record_failure()
                   continue  # Try next framework
           
           raise RuntimeError(
               f"No available framework for task '{task_type}'. "
               f"All frameworks scored below threshold or circuits open."
           )
       
       def _execute_with_framework(
           self, framework_name: str, input_data: Any
       ) -> Any:
           """Execute the subtask using the specified framework.
           
           In production, this dispatches to actual framework code.
           For this skill, it demonstrates the pattern structure.
           """
           # Framework-specific execution would go here
           # This is a dispatch pattern, not actual implementation
           executors = {
               "langchain": self._execute_langchain,
               "llamaindex": self._execute_llamaindex,
               "crewai": self._execute_crewai,
               "autogen": self._execute_autogen,
               "mcp": self._execute_mcp,
           }
           
           executor = executors.get(framework_name)
           if not executor:
               raise ValueError(f"No executor registered for framework: {framework_name}")
           
           return executor(input_data)
       
       def _execute_langchain(self, input_data: Any) -> Any:
           """LangChain execution path — best for tool use and chaining."""
           # Actual LangChain implementation would go here
           pass
   
       def _execute_llamaindex(self, input_data: Any) -> Any:
           """LlamaIndex execution path — best for RAG pipelines."""
           # Actual LlamaIndex implementation would go here
           pass
   
       def _execute_crewai(self, input_data: Any) -> Any:
           """CrewAI execution path — best for multi-agent coordination."""
           # Actual CrewAI implementation would go here
           pass
   
       def _execute_autogen(self, input_data: Any) -> Any:
           """AutoGen execution path — best for conversational multi-agent."""
           # Actual AutoGen implementation would go here
           pass
   
       def _execute_mcp(self, input_data: Any) -> Any:
           """MCP execution path — best for standardized tool protocols."""
           # Actual MCP implementation would go here
           pass
   ```

5. **Compose Cross-Framework Workflow** — After individual subtask routing is established, compose the full workflow. Define:
   - Execution order (sequential, fan-out/fan-in, or graph-based)
   - Shared state management (how frameworks access shared context)
   - Global error handling (what happens when any component fails mid-workflow)

   ```python
   from enum import Enum
   from typing import Protocol
   
   class WorkflowTopology(Enum):
       SEQUENTIAL = "sequential"       # Framework A → Framework B → Framework C
       FAN_OUT_FAN_IN = "fan_out_in"  # One router dispatches to N frameworks, then aggregates
       GRAPH = "graph"                 # Directed acyclic graph of framework dependencies
   
   class WorkflowComposer:
       """Composes individual framework routings into a complete workflow."""
       
       def compose_sequential(
           self, steps: list[tuple[str, dict, float]]
       ) -> dict:
           """Compose sequential workflow: Framework A output → Framework B input.
           
           Args:
               steps: List of (framework_name, subtask_config, score) tuples
           
           Returns:
               Complete workflow definition with bridge interfaces
           
           Example:
               steps = [
                   ("langchain", {"prompt": "analyze...", "tools": [...]}, 9.0),
                   ("llamaindex", {"query_engine_id": "rag_db"}, 8.5),
                   ("crewai", {"agents": ["summarizer", "reviewer"]}, 7.5),
               ]
           """
           workflow = {
               "topology": WorkflowTopology.SEQUENTIAL.value,
               "steps": [],
               "bridges": [],
               "global_timeout_seconds": 0,
           }
           
           total_time = 0
           for i, (framework, config, score) in enumerate(steps):
               step = {
                   "index": i,
                   "framework": framework,
                   "config": config,
                   "score": score,
                   "input_source": "previous_step" if i > 0 else "external_input",
               }
               workflow["steps"].append(step)
               
               # Add bridge between consecutive steps
               if i > 0:
                   previous_framework = steps[i - 1][0]
                   bridge = {
                       "from": previous_framework,
                       "to": framework,
                       "transform": f"output_to_{framework}_input",
                       "schema_version": "1.0.0",
                   }
                   workflow["bridges"].append(bridge)
           
               # Estimate step timeout (simplified)
               step_timeout = 30 if score < 7.0 else 15
               total_time += step_timeout
           
           workflow["global_timeout_seconds"] = int(total_time * 1.5)  # 50% headroom
           return workflow
   
       def compose_fan_out(
           self, 
           root_framework: str, 
           branches: list[tuple[str, dict, float]],
           aggregator: Callable[[list[dict]], Any],
       ) -> dict:
           """Compose fan-out/fan-in workflow.
           
           Args:
               root_framework: Framework that dispatches to all branches
               branches: List of (framework, config, score) for parallel execution
               aggregator: Function that merges results from all branches
           
           Returns:
               Fan-out/in workflow definition
           """
           return {
               "topology": WorkflowTopology.FAN_OUT_FAN_IN.value,
               "dispatcher": root_framework,
               "branches": [
                   {"framework": f, "config": c, "score": s} 
                   for f, c, s in branches
               ],
               "aggregator": aggregator.__name__,
               "max_parallel_branches": len(branches),
           }
   ```

---

## Implementation Patterns / Reference Guide

### Pattern 1: RAG Pipeline — LangChain + LlamaIndex Hybrid

Use this when you need LlamaIndex's superior retrieval quality combined with LangChain's tool ecosystem. The pattern: LlamaIndex handles document ingestion and semantic retrieval; LangChain handles tool execution and post-retrieval processing.

```python
# ┌─────────────────────────────────────────────────┐
# |  RAG Pipeline (LangChain + LlamaIndex Hybrid)   │
# │                                                 │
# |  Query → LlamaIndex Retrieval → Context Bridge  │
# |                  ↓                              │
# |          LangChain Tool Execution               │
# |                  ↓                              │
# |          LangChain Response Synthesis           │
# └─────────────────────────────────────────────────┘

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from langchain.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor

class HybridRAGPipeline:
    """Combines LlamaIndex retrieval with LangChain tool execution.
    
    Architecture decision rationale:
    - LlamaIndex for retrieval: purpose-built document indexing and 
      semantic search with advanced query transforms
    - LangChain for tools: maturest ecosystem for tool registration,
      execution, and agent loops
    """
    
    def __init__(self, doc_directory: str):
        # LlamaIndex: document ingestion and retrieval
        documents = SimpleDirectoryReader(doc_directory).load_data()
        self.retrieval_index = VectorStoreIndex.from_documents(documents)
        self.query_engine = self.retrieval_index.as_query_engine(
            similarity_top_k=5,
        )
    
    @tool
    def search_knowledge_base(query: str) -> str:
        """Search the knowledge base using LlamaIndex retrieval."""
        # This tool bridges LangChain's tool interface to 
        # LlamaIndex's query engine
        results = HybridRAGPipeline._bridge_query(query)
        return "\n\n".join(
            f"[{i}] {r.text}" for i, r in enumerate(results, 1)
        )
    
    @staticmethod
    def _bridge_query(user_query: str) -> list:
        """Bridge: LangChain tool → LlamaIndex query engine."""
        # In production: use ContextBridge class from Core Workflow
        results = HybridRAGPipeline.query_engine.query(user_query)
        return results
    
    def run(self, user_query: str) -> str:
        """Execute the full hybrid RAG pipeline."""
        tools = [self.search_knowledge_base]
        
        # LangChain agent handles tool calling and response generation
        prompt = """You are a research assistant. Use the search_knowledge_base 
        tool to find relevant information before answering. Always cite your 
        sources by referencing the result number [1], [2], etc."""
        
        # Note: Actual agent construction depends on LLM provider chosen
        # agent = create_tool_calling_agent(llm, tools, prompt)
        # executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        # return executor.invoke({"input": user_query})["output"]
        
        # Simplified execution flow:
        context = self._bridge_query(user_query)
        return f"Answer based on context:\n{context}"


# ❌ BAD: Monolithic framework dependency — everything in one framework
class BadMonolithicRAG:
    """Bad: Tries to do everything with a single framework's primitives,
    leading to reinvented wheels and missed optimizations."""
    
    def __init__(self, doc_directory: str):
        # Re-implementing document indexing that LlamaIndex already solves well
        self.custom_vector_store = self._build_custom_vector_db(doc_directory)
        self.custom_retriever = CustomBM25Retriever(self.custom_vector_store)
        # Plus LangChain for tools — but no clear boundary
    
    def _build_custom_vector_db(self, path: str):
        """Re-implementing vector indexing instead of using a purpose-built library."""
        pass


# ✅ GOOD: Clear framework boundaries with explicit bridges
class GoodHybridRAG(HybridRAGPipeline):
    """Good: Each framework handles what it does best. Bridges are 
    explicitly defined, typed, and versioned."""
    
    def __init__(self, doc_directory: str):
        super().__init__(doc_directory)
        # LlamaIndex owns retrieval entirely — no partial migration
        # LangChain owns tools entirely — clean abstraction boundary
```

### Pattern 2: Multi-Agent Orchestration — CrewAI + AutoGen Hybrid

Use this when you need CrewAI's structured agent role definitions combined with AutoGen's group chat coordination pattern. CrewAI defines agent capabilities and tools; AutoGen manages conversation flow between agents.

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class AgentRoleDefinition:
    """Defines an agent's role, capabilities, and tool access for CrewAI."""
    name: str
    role: str
    goal: str
    tools: list[str] = field(default_factory=list)
    allow_delegation: bool = False


@dataclass  
class GroupChatConfig:
    """Defines conversation flow for AutoGen's GroupChat."""
    max_rounds: int = 10
    speaker_selection_method: str = "auto"  # or "manual", "round_robin"
    allow_repeat_speaker: bool = True


class HybridMultiAgentOrchestrator:
    """Combines CrewAI agent definitions with AutoGen conversation orchestration.
    
    Architecture decision rationale:
    - CrewAI for agent role definitions: structured prompts, 
      goal-oriented behavior, tool integration
    - AutoGen for conversation flow: group chat patterns, 
      speaker selection, multi-turn coordination
    
    This pattern is optimal when agents need both strong individual 
    capability definitions (CrewAI's strength) and complex multi-turn 
    coordination with dynamic speaker changes (AutoGen's strength).
    """
    
    def __init__(self):
        self.agent_definitions: list[AgentRoleDefinition] = []
        self.chat_config = GroupChatConfig()
        self.message_history: list[dict] = []
    
    def register_agent(self, definition: AgentRoleDefinition) -> None:
        """Register an agent with CrewAI-style role definition."""
        if any(a.name == definition.name for a in self.agent_definitions):
            raise ValueError(f"Agent '{definition.name}' already registered")
        self.agent_definitions.append(definition)
    
    def create_conversation(
        self, 
        initial_message: str,
        participants: Optional[list[str]] = None,
    ) -> dict:
        """Create a group chat using AutoGen-style conversation flow.
        
        Args:
            initial_message: Starting message for the conversation
            participants: Agent names to include (defaults to all registered)
        
        Returns:
            Conversation config ready for execution
        """
        if participants is None:
            participants = [a.name for a in self.agent_definitions]
        
        active_agents = [
            a for a in self.agent_definitions if a.name in participants
        ]
        
        return {
            "participants": active_agents,
            "max_rounds": self.chat_config.max_rounds,
            "speaker_selection": self.chat_config.speaker_selection_method,
            "allow_repeat_speaker": self.chat_config.allow_repeat_speaker,
            "initial_message": initial_message,
        }
    
    def define_conversation_flow(self, flow_spec: dict) -> dict:
        """Define structured conversation flow using AutoGen GroupChat patterns.
        
        Args:
            flow_spec: Dict describing conversation transitions
        
        Example flow_spec:
            {
                "type": "conditional",
                "steps": [
                    {"from": None, "to": ["researcher"], "trigger": "initial"},
                    {"from": ["researcher"], "to": ["analyst"], "condition": "data_found"},
                    {"from": ["analyst"], "to": ["reviewer"], "condition": "analysis_ready"},
                    {"from": ["reviewer"], "to": [], "condition": "approved"},
                ]
            }
        """
        # Validate flow spec for cycles and completeness
        all_targets = set()
        for step in flow_spec.get("steps", []):
            if step["to"]:
                all_targets.update(step["to"])
        
        registered_agents = {a.name for a in self.agent_definitions}
        invalid_agents = all_targets - registered_agents
        
        if invalid_agents:
            raise ValueError(
                f"Flow references unregistered agents: {invalid_agents}"
            )
        
        return {
            "flow": flow_spec,
            "status": "validated",
        }
```

### Pattern 3: MCP Tool Protocol as Universal Bridge

Use this when connecting frameworks that don't natively communicate. MCP (Model Context Protocol) provides a standardized way for any framework to expose and consume tools, making it the universal bridge between heterogeneous systems.

```python
import json
from typing import Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class MCPTOOLDefinition:
    """MCP-style tool definition for cross-framework interoperability."""
    name: str
    description: str
    input_schema: dict
    
    def to_mcp_format(self) -> bytes:
        """Serialize to MCP protocol format.
        
        MCP tools use JSON-RPC 2.0 over any transport (stdio, HTTP, SSE).
        This method produces the tool registration message.
        """
        return json.dumps({
            "jsonrpc": "2.0",
            "method": "tools/list",
            "params": {
                "tools": [{
                    "name": self.name,
                    "description": self.description,
                    "inputSchema": self.input_schema,
                }],
            },
        }).encode("utf-8")


class MCPToolBridge:
    """Bridges any framework's native tools to the MCP protocol.
    
    This enables cross-framework tool sharing. For example:
    - LangChain tools → MCP → LlamaIndex can call them as tools
    - CrewAI agent capabilities → MCP → AutoGen agents can use them
    - Any custom tool server → MCP → any framework that supports MCP clients
    
    The bridge handles protocol conversion without requiring either 
    framework to natively support the other.
    """
    
    def __init__(self):
        self.tool_registry: dict[str, MCPTOOLDefinition] = {}
    
    def register_tool(self, tool_def: MCPTOOLDefinition) -> None:
        """Register a tool in the MCP bridge."""
        if tool_def.name in self.tool_registry:
            raise ValueError(f"Tool '{tool_def.name}' already registered")
        self.tool_registry[tool_def.name] = tool_def
    
    def list_tools(self) -> list[dict]:
        """List all registered tools in MCP format."""
        return [
            {
                "name": t.name,
                "description": t.description,
                "inputSchema": t.input_schema,
            }
            for t in self.tool_registry.values()
        ]
    
    async def call_tool(self, tool_name: str, arguments: dict) -> Any:
        """Call a registered tool and return result.
        
        In production, this would dispatch to the actual framework's 
        tool execution engine based on which framework owns the tool.
        """
        if tool_name not in self.tool_registry:
            raise KeyError(f"Unknown tool: {tool_name}")
        
        # Protocol-level validation
        tool_def = self.tool_registry[tool_name]
        for field_name, field_type in tool_def.input_schema.get("properties", {}).items():
            if field_name in arguments and not isinstance(
                arguments[field_name], 
                _get_python_type(field_type.get("$ref", "string"))
            ):
                raise TypeError(
                    f"Argument '{field_name}' type mismatch for tool '{tool_name}'"
                )
        
        # Dispatch to framework-specific executor
        return await self._dispatch(tool_name, arguments)
    
    async def _dispatch(self, tool_name: str, arguments: dict) -> Any:
        """Route tool call to the correct framework's executor."""
        # In production: look up which framework owns this tool
        # and dispatch through its native execution path
        pass


def _get_python_type(schema_ref: str) -> type:
    """Convert MCP schema type reference to Python type.
    
    Handles common MCP type references for runtime validation.
    """
    type_map = {
        "string": str,
        "number": float,
        "integer": int,
        "boolean": bool,
        "array": list,
        "object": dict,
    }
    # Handle $ref patterns like "#/$defs/SomeType"
    base_type = schema_ref.split("/")[-1] if "/" in schema_ref else schema_ref
    return type_map.get(base_type, str)  # Default to string for unknown types
```

---

## Constraints

### MUST DO
- Score each framework against every subtask's capability domain using the weighted scoring approach — never pick a framework based on familiarity alone
- Define explicit context bridges with typed schemas at every inter-framework boundary — implicit data passing between frameworks is a source of silent bugs
- Implement circuit breakers for every framework boundary in production systems — framework instability is a real operational risk that must be contained
- Keep the scoring matrix updated as new framework versions release — capability profiles change (e.g., LlamaIndex adding agent capabilities shifts its multi-agent score)
- Document the routing decision rationale with scores so future maintainers can understand why frameworks were chosen

### MUST NOT DO
- Mix framework internals at the implementation level — LangChain code must not directly call LlamaIndex internal APIs; always use the defined bridge interface
- Use more than 3 frameworks in a single workflow unless justified by capability analysis — each additional framework adds cognitive load, integration complexity, and operational surface area
- Create circular framework dependencies — Framework A must never depend on Framework B if Framework B also depends on Framework A through a different path
- Skip circuit breaker implementation because "frameworks are reliable" — even stable frameworks have outage windows, rate limits, and error states
- Route based on framework popularity or team preference alone — capability scoring must drive the decision

---

## Output Template

When implementing or reviewing framework orchestration routing, produce:

1. **Capability Classification** — Decomposition of the task into subtasks with assigned capability domains
2. **Framework Scoring Table** — All available frameworks scored (1–10) per capability domain with rationale
3. **Chosen Routing** — For each subtask, the selected framework with justification (must exceed 2-point margin or cite integration cost exception)
4. **Context Bridge Specifications** — Schema definitions for every inter-framework data boundary
5. **Circuit Breaker Configuration** — Per-framework failure thresholds and recovery timeouts
6. **Workflow Topology** — Sequential, fan-out/fan-in, or graph layout with execution order

---

## Related Skills

| Skill | Purpose |
|---|---|
| `intelligent-skill-selection` | Broader task-to-skill mapping beyond frameworks — use when selecting between AI skills rather than AI frameworks |
| `confidence-based-selector` | Confidence scoring mechanism that can feed into framework selection decisions |
| `agent-architecture-patterns` | Higher-level agent architecture patterns including hub-and-spoke, hierarchical, and peer-to-peer topologies |
| `workflow-patterns` | General workflow orchestration — use when all components live within a single framework |


---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [LangChain Documentation](<https://python.langchain.com/docs/get_started/introduction>)
- [LlamaIndex Documentation](<https://docs.llamaindex.ai/en/stable/>)
- [CrewAI Official Documentation](<https://docs.crewai.com/>)
- [Microsoft AutoGen Documentation](<https://microsoft.github.io/autogen/0.2/>)
- [Model Context Protocol (MCP) Specification](<https://modelcontextprotocol.io/>)
