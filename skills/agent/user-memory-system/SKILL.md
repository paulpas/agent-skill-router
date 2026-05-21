---
name: user-memory-system
description: Implements multi-layer user memory systems (episodic, semantic, procedural) for AI agents to retain context across sessions, enable personalization, and build long-term relationships with individual users.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: user memory, long-term memory, episodic memory, semantic memory, procedural memory, session persistence, memory retrieval, how do i remember user context, persistent AI, cross-session memory
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: ai-persona-design, personalized-behavior, conversation-memory
---

# User Memory System for AI Agents

Implements multi-layer memory systems enabling AI agents to retain context across sessions. Covers episodic memory (what happened), semantic memory (facts and knowledge), procedural memory (how to do things), and temporal decay mechanisms. A well-architected memory system is the foundation of genuine personalization — without it, every interaction starts from zero.

## TL;DR Checklist

- [ ] Design three memory layers: episodic (events), semantic (facts), procedural (habits)
- [ ] Implement MemoryItem with type discriminator, timestamps, and TTL for automatic decay
- [ ] Create a MemoryStore that handles CRUD operations across all memory layers
- [ ] Add relevance scoring so the agent retrieves only contextually useful memories
- [ ] Implement temporal decay — old memories fade in importance unless reinforced
- [ ] Build a retrieval system that scores memories by recency, importance, and query relevance
- [ ] Apply privacy constraints — never store PII without explicit consent; allow memory deletion

---

## Orchestration Flow

```
User Request
        ↓
┌───────────────────────────────────────────┐
│  Load User Memory Snapshot                │
│  (episodic + semantic + procedural)       │
│                                           │
│  Cache miss? ──► Query all layers         │
│  Cached? ──► Validate freshness           │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Score & Filter Memories                  │
│  (recency + importance + relevance)       │
│                                           │
│  Too many results? ──► Apply decay filter │
│  Below threshold? ──► Return empty set    │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Generate Response Using Relevant         │
│  Memories as Context                      │
│                                           │
│  No relevant memories? ──► Respond generically   │
│  Has memories? ──► Personalize response       │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Extract & Store New Memories             │
│  (from user message + assistant response) │
│                                           │
│  Episodic event? ──► Save to episodic     │
│  Factual statement? ──► Save to semantic   │
│  Preference/habit? ──► Save to procedural  │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Apply Temporal Decay & Pruning           │
│  (reduce weights of old memories)         │
│                                           │
│  Weight below threshold? ──► Archive      │
│  Still relevant? ──► Keep active          │
└───────────────────────────────────────────┘
```

---

## When to Use

Use this skill when:

- Building an AI agent that interacts with users across multiple sessions and needs to retain context
- Implementing personalization features that depend on remembering user preferences, history, or patterns
- Designing a long-term assistant where memory creates compounding value over time
- Creating a knowledge management system where the AI accumulates domain expertise from user interactions
- Building a therapy, coaching, or mentoring bot where session-to-session continuity is critical
- Prototyping memory architectures for research into human-like agent cognition

---

## When NOT to Use

Avoid this skill for:

- One-shot interactions with no expectation of continuity — the memory overhead is wasted
- High-throughput batch processing where per-user memory lookup latency would bottleneck the system
- Scenarios with strict data retention policies that prohibit storing any user-interaction-derived data
- Systems where the cost of incorrect memory retrieval (hallucinated facts) would cause more harm than not having memory

---

## Core Workflow

### Phase 1: Memory Architecture Design

1. **Define Three Memory Layers** — Model each layer with distinct data structures and purposes:

   ```python
   from dataclasses import dataclass, field
   from datetime import datetime, timezone, timedelta
   from enum import Enum
   from typing import Dict, List, Optional, Any


   class MemoryType(Enum):
       """Types of memory in the agent's cognitive architecture.

       Modeled after human memory systems: episodic (events),
       semantic (facts), and procedural (habits/techniques).
       """
       EPISODIC = "episodic"     # Specific events, conversations, experiences
       SEMANTIC = "semantic"     # Factual knowledge, beliefs, user attributes
       PROCEDURAL = "procedural" # Learned habits, preferences, techniques
       TEMPORAL = "temporal"     # Time-bound context (e.g., session state)


   @dataclass
   class MemoryItem:
       """A single piece of stored memory.

       Attributes:
           item_id: Unique identifier for this memory
           user_id: Owner of this memory
           memory_type: Which cognitive layer this belongs to
           content: The actual memory content (structured or raw text)
           importance: Current importance weight (1–10, decays over time)
           created_at: When the memory was first stored
           last_accessed: When it was most recently retrieved
           access_count: How many times it has been recalled
           tags: Searchable metadata for filtering
       """
       item_id: str
       user_id: str
       memory_type: MemoryType
       content: Any
       importance: float = 5.0
       created_at: datetime = field(
           default_factory=lambda: datetime.now(timezone.utc)
       )
       last_accessed: datetime = field(
           default_factory=lambda: datetime.now(timezone.utc)
       )
       access_count: int = 0
       tags: List[str] = field(default_factory=list)

       def decay(self, hours_since_creation: float) -> None:
           """Apply temporal decay to memory importance.

           Memories fade over time unless reinforced by retrieval.
           This follows the psychological 'forgetting curve' —
           information is retained better when accessed at spaced intervals.

           Args:
               hours_since_creation: Time elapsed since this memory was created
           """
           # Exponential decay with reinforcement bonus from access count
           base_decay = 0.95 ** (hours_since_creation / 24)  # 5% daily decay
           access_bonus = min(1 + self.access_count * 0.1, 2.0)  # Max 2x retention

           self.importance *= base_decay * access_bonus
           # Clamp importance to valid range
           self.importance = max(0.1, min(10.0, self.importance))

       @property
       def is_stale(self) -> bool:
           """Whether this memory has decayed below retrieval threshold."""
           return self.importance < 0.5

       def record_access(self) -> None:
           """Increment access count and update last-accessed timestamp."""
           self.access_count += 1
           self.last_accessed = datetime.now(timezone.utc)
   ```

2. **Design Memory Storage Schema** — Choose the right storage backend per memory type:

   | Memory Layer    | Recommended Storage    | Rationale                                          |
   |-----------------|----------------------|-----------------------------------------------------|
   | Episodic        | Time-series DB (ChronoDB, Timescale) | Naturally ordered by time; queries are temporal ranges |
   | Semantic        | Key-value / Graph DB  | Fast lookup by entity/attribute; supports relationship queries |
   | Procedural      | Config store / JSON file | Read-heavy, rarely changes once learned             |
   | Temporal        | In-memory cache       | Ephemeral; expires automatically                    |

3. **Define Memory Extraction Rules** — Determine what gets stored from each interaction:

   ```python
   class MemoryExtractor:
       """Extracts structured memories from conversational interactions.

       Analyzes both user messages and assistant responses to identify
       new memories across all three layers. Uses keyword heuristics,
       pattern matching, and confidence scoring.
       """

       # Patterns that indicate episodic memory (specific events)
       EPISODIC_PATTERNS = [
           r"\b(I\s+(remember|recall|just)\s+).*\b",
           r"\b(last\s+(week|month|time|meeting))\b",
           r"\b(on\s+\w+\s+\d+,?\s*\d{4})\b",
           r"\b(we\s+(discussed|agreed|decided|set)\s+up)\b",
       ]

       # Patterns that indicate semantic memory (facts, preferences)
       SEMANTIC_PATTERNS = [
           r"\b(I\s+(like|prefer|need|want|avoid|love|hate))\b",
           r"\b(my\s+(favorite|preferred|go-to|current))\b",
           r"\b(always|never|usually|rarely)\s+\w+",  # Habit indicators
           r"\bis\s+(called|named|known as)\b",  # Entity definitions
       ]

       # Patterns that indicate procedural memory (preferences, techniques)
       PROCEDURAL_PATTERNS = [
           r"\b(how I\s+like it\s+\w+)\b",
           r"\b(when you do X,\s+do Y)\b",
           r"\b(every time you see X,\s+Y)\b",
           r"\b(I\s+(set|use|configure|prefer))\b.*\b(to|for|with)\b",
       ]

       def extract_memories(
           self,
           user_message: str,
           assistant_response: str,
           user_id: str,
       ) -> List[MemoryItem]:
           """Extract new memories from an interaction.

           Args:
               user_message: The message sent by the user
               assistant_response: The assistant's response
               user_id: Owner of the extracted memories

           Returns:
               List of new MemoryItem instances created from the interaction
           """
           memories = []

           # Extract from user message (primary source of personal info)
           memories.extend(self._scan_text(user_message, user_id))

           # Extract from assistant response (captures learned techniques/defaults)
           memories.extend(self._scan_text(assistant_response, user_id))

           return memories

       def _scan_text(self, text: str, user_id: str) -> List[MemoryItem]:
           """Scan a text for memory-indicative patterns.

           Args:
               text: Text to scan
               user_id: Owner of any found memories

           Returns:
               MemoryItems extracted from the text
           """
           import re
           memories = []

           # Classify each pattern match
           for pattern in self.EPISODIC_PATTERNS:
               matches = re.finditer(pattern, text)
               for match in matches:
                   memories.append(MemoryItem(
                       item_id=f"ep-{user_id}-{len(memories)}",
                       user_id=user_id,
                       memory_type=MemoryType.EPISODIC,
                       content=match.group(0),
                       importance=6.0,  # Events are moderately important
                       tags=["episodic", "event"],
                   ))

           for pattern in self.SEMANTIC_PATTERNS:
               matches = re.finditer(pattern, text, re.IGNORECASE)
               for match in matches:
                   memories.append(MemoryItem(
                       item_id=f"sm-{user_id}-{len(memories)}",
                       user_id=user_id,
                       memory_type=MemoryType.SEMANTIC,
                       content=match.group(0),
                       importance=7.0,  # Facts/preferences are highly important
                       tags=["semantic", "preference"],
                   ))

           for pattern in self.PROCEDURAL_PATTERNS:
               matches = re.finditer(pattern, text)
               for match in matches:
                   memories.append(MemoryItem(
                       item_id=f"pr-{user_id}-{len(memories)}",
                       user_id=user_id,
                       memory_type=MemoryType.PROCEDURAL,
                       content=match.group(0),
                       importance=8.0,  # Habits/preferences are most important
                       tags=["procedural", "habit"],
                   ))

           return memories
   ```

### Phase 2: Memory Storage & Retrieval

4. **Implement MemoryStore** — The core CRUD and retrieval engine:

   ```python
   import heapq
   from collections import defaultdict


   class MemoryStore:
       """Central memory storage with layered access patterns.

       Manages episodic, semantic, procedural, and temporal memories
       per user. Supports scoring, filtering, decay, and pruning.

       Follows Law 3 (Atomic Predictability): all mutations return new state
       or explicit confirmation. No hidden side effects.
       """

       def __init__(self, max_memories_per_user: int = 500):
           """Initialize the memory store.

           Args:
               max_memories_per_user: Hard cap on memories per user (prevents unbounded growth)
           """
           self._max_per_user = max_memories_per_user
           # Primary storage: user_id -> MemoryType -> List[MemoryItem]
           self._store: Dict[str, Dict[MemoryType, List[MemoryItem]]] = defaultdict(
               lambda: {mt: [] for mt in MemoryType}
           )

       def add_memory(self, memory: MemoryItem) -> bool:
           """Add a new memory to the store.

           Args:
               memory: The MemoryItem to store

           Returns:
               True if stored successfully, False if user is at capacity
           """
           if not isinstance(memory.memory_type, MemoryType):
               raise TypeError(f"Invalid memory type: {type(memory.memory_type)}")

           user_memories = self._store[memory.user_id]
           layer_memories = user_memories[memory.memory_type]

           if len(layer_memories) >= self._max_per_user:
               return False  # Capacity reached — caller should prune first

           layer_memories.append(memory)
           # Re-sort by importance (descending) for fast retrieval
           layer_memories.sort(key=lambda m: m.importance, reverse=True)
           return True

       def get_relevant_memories(
           self,
           user_id: str,
           query: str = "",
           memory_type: Optional[MemoryType] = None,
           min_importance: float = 1.0,
           max_results: int = 10,
       ) -> List[MemoryItem]:
           """Retrieve memories relevant to a query for a specific user.

           Scores each memory by recency, importance decay, and keyword match.
           Returns the top-N highest-scoring memories.

           Args:
               user_id: Owner whose memories to retrieve
               query: Text query for relevance matching (can be empty for all)
               memory_type: Filter to specific layer, or None for all layers
               min_importance: Skip memories below this importance threshold
               max_results: Maximum number of memories to return

           Returns:
               List of MemoryItems sorted by relevance score (descending)
           """
           import re
           from datetime import timedelta

           user_memories = self._store.get(user_id, {})
           candidates = []

           for mtype in [memory_type] if memory_type else MemoryType:
               for memory in user_memories.get(mtype, []):
                   # Apply minimum importance filter
                   if memory.importance < min_importance:
                       continue

                   # Calculate relevance score
                   recency_score = self._calc_recency_score(memory)
                   importance_score = memory.importance / 10.0  # Normalize to 0-1

                   # Keyword match score (if query provided)
                   keyword_score = 0.0
                   if query:
                       keyword_score = self._keyword_match_score(query, memory)

                   total_score = (
                       recency_score * 0.3 +
                       importance_score * 0.4 +
                       keyword_score * 0.3
                   )

                   candidates.append((total_score, memory))

           # Sort by score and return top-N
           candidates.sort(key=lambda x: x[0], reverse=True)
           results = [m for _, m in candidates[:max_results]]

           # Record access for relevance learning
           for mem in results:
               mem.record_access()

           return results

       def _calc_recency_score(self, memory: MemoryItem) -> float:
           """Score a memory based on how recently it was created/accessed.

           More recent memories get higher scores. Access recency also counts —
           frequently-retrieved memories are considered more current in the user's mind.

           Args:
               memory: The memory to score

           Returns:
               Recency score between 0.0 and 1.0
           """
           now = datetime.now(timezone.utc)

           # Primary: recency since creation (logarithmic decay)
           age_hours = (now - memory.created_at).total_seconds() / 3600
            creation_score = 1.0 / (1.0 + age_hours / 24.0)  # Half-life
           # Secondary: recency since last access (bonus for active memories)
           access_age_hours = (now - memory.last_accessed).total_seconds() / 3600
           access_score = 1.0 / (1.0 + access_age_hours / 12.0)  # Half-life ~12 hours

           # Weighted combination
           return 0.7 * creation_score + 0.3 * access_score

       def _keyword_match_score(self, query: str, memory: MemoryItem) -> float:
           """Score how well a memory's content matches a query.

           Args:
               query: The search query text
               memory: The memory to score against

           Returns:
               Keyword match score between 0.0 and 1.0
           """
           import re
           query_lower = query.lower()
           content_lower = str(memory.content).lower() if memory.content else ""

           # Tag overlap bonus
           tag_score = sum(1 for tag in memory.tags if tag.lower() in query_lower) / max(len(query.split()), 1)

           # Content keyword match
           words = set(re.findall(r'\b\w+\b', content_lower))
           query_words = set(re.findall(r'\b\w+\b', query_lower))
           overlap = len(words & query_words) / max(len(query_words), 1)

           return max(tag_score * 0.4, overlap)

       def apply_decay(self) -> int:
           """Apply temporal decay to all memories.

           Called periodically (e.g., daily) to reduce the importance of
           stale memories. Memories that decay below threshold are marked
           for pruning.

           Returns:
               Number of memories pruned (importance dropped below 0.1)
           """
           now = datetime.now(timezone.utc)
           total_pruned = 0

           for user_id in list(self._store.keys()):
               for mtype in MemoryType:
                   layer = self._store[user_id][mtype]
                   pruned_this_layer = []

                   for memory in layer:
                       age_hours = (now - memory.created_at).total_seconds() / 3600
                       memory.decay(age_hours)

                       if memory.importance < 0.1:
                           pruned_this_layer.append(memory.item_id)
                           total_pruned += 1

                   # Remove pruned memories
                   for item_id in pruned_this_layer:
                       layer = [m for m in layer if m.item_id != item_id]

               self._store[user_id][mtype] = layer

           return total_pruned

       def delete_user_memories(self, user_id: str) -> int:
           """Delete all memories for a specific user (right to be forgotten).

           Args:
               user_id: Owner whose memories should be deleted

           Returns:
               Number of memories deleted
           """
           if user_id not in self._store:
               return 0

           total = sum(
               len(self._store[user_id][mtype])
               for mtype in MemoryType
           )

           del self._store[user_id]
           return total

       def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
           """Get summary statistics for a user's memory store.

           Args:
               user_id: Owner whose stats to retrieve

           Returns:
               Dictionary with counts per layer, average importance, oldest/youngest dates
           """
            if user_id not in self._store:
                return {"error": "User not found"}

            stats = {}
            total_count = 0

            for mtype in MemoryType:
                memories = self._store[user_id][mtype]
                count = len(memories)
                total_count += count

                avg_importance = (
                   sum(m.importance for m in memories) / count if count > 0 else 0.0
                )
                stats[mtype.value] = {
                   "count": count,
                   "average_importance": round(avg_importance, 2),
                   "oldest": min((m.created_at for m in memories), default=None),
                   "newest": max((m.created_at for m in memories), default=None),
                }

            stats["total"] = total_count
            return stats
   ```

5. **Implement Memory Integration Layer** — Bridge between memory retrieval and response generation:

   ```python
   class MemoryIntegrationLayer:
       """Bridges memory retrieval with response generation.

       Takes raw memories from the store, formats them into structured
       context that can be injected into an AI response pipeline, and
       manages the extraction-storing loop after responses are generated.

       This layer is where personalization actually happens — the stored
       memories become active context that shapes how the agent responds.
       """

       def __init__(self, memory_store: MemoryStore):
           self._store = memory_store

       def build_memory_context(
           self,
           user_id: str,
           current_topic: Optional[str] = None,
           max_memories: int = 5,
       ) -> List[Dict]:
           """Build a formatted context from relevant memories.

           Retrieves and formats memories for injection into response generation.
           Filters by topic when possible, prioritizes recent/high-importance memories.

           Args:
               user_id: Owner whose memories to retrieve
               current_topic: Optional topic filter (e.g., "deployment", "python")
               max_memories: Maximum number of memories to include in context

           Returns:
               List of formatted memory dicts with type, content, and source info
           """
           query = current_topic or ""
            memories = self._store.get_relevant_memories(
               user_id=user_id,
               query=query,
               min_importance=2.0,  # Only use reasonably important memories
               max_results=max_memories,
           )

           formatted = []
           for memory in memories:
               formatted.append({
                   "type": memory.memory_type.value,
                   "content": memory.content if isinstance(memory.content, str) else str(memory.content),
                   "importance": round(memory.importance, 1),
                   "created_at": memory.created_at.isoformat(),
                   "access_count": memory.access_count,
                   "tags": memory.tags,
               })

           return formatted

       def record_interaction_memories(
           self,
           user_id: str,
           user_message: str,
           assistant_response: str,
       ) -> List[MemoryItem]:
           """Extract and store new memories from an interaction.

           Runs the full extraction pipeline: scan for memory-indicative
           patterns, create MemoryItems, and persist them to the store.

           Args:
               user_id: Owner of the new memories
               user_message: The user's input message
               assistant_response: The assistant's output

           Returns:
               List of newly created MemoryItems (may be empty)
           """
           extractor = MemoryExtractor()
           new_memories = extractor.extract_memories(user_message, assistant_response, user_id)

           stored_count = 0
           for memory in new_memories:
               if self._store.add_memory(memory):
                   stored_count += 1

           return new_memories
   ```

---

## Constraints

### MUST DO
- Always separate memories by type (episodic, semantic, procedural) — mixing them creates retrieval ambiguity and degraded relevance scores
- Apply temporal decay to all memories periodically (at least daily) — stale memories pollute retrieval results
- Cap total memory count per user to prevent unbounded storage growth — use the max_memories_per_user parameter
- Validate all extracted memories before storing — run a confidence check on pattern matches, discard low-confidence extractions
- Respect user privacy: never store PII (names, addresses, phone numbers) without explicit user consent
- Allow users to delete their complete memory profile on request (right to be forgotten)
- Record the access count for each memory — frequently-retrieved memories should resist decay

### MUST NOT DO
- Never fabricate a memory that wasn't actually recorded — hallucinated memories corrupt personalization entirely
- Store raw conversation transcripts longer than necessary — extract structured memories, then discard or compress the raw text
- Use semantic memories to make factual claims about users that haven't been confirmed — flag unconfirmed facts as tentative
- Let procedural memories override explicit user instructions in a current session — session instructions always take precedence over learned habits
- Share memories across different user IDs — each user's memory space is strictly isolated
- Allow memory extraction patterns to capture system internals, API keys, tokens, or other security-sensitive information

---

## Output Template

When implementing or auditing a user memory system, produce:

1. **Memory Architecture Overview** — Description of the three layers (episodic, semantic, procedural), their data models, and storage backends
2. **Memory Extraction Rules** — Pattern definitions for each memory type with confidence thresholds
3. **Retrieval Pipeline** — How memories are scored, filtered, and formatted for response context injection
4. **Decay Configuration** — Decay rates per memory type, pruning thresholds, and scheduled cleanup frequency
5. **Privacy Audit** — List of what data is stored, retention periods, deletion mechanisms, and PII handling
6. **Performance Metrics** — Expected query latency, storage usage per user tier, memory count statistics

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-persona-design` | Uses stored memories to create persona-consistent, memory-aware self-expression |
| `personalized-behavior` | Consumes memories to adapt responses — this skill provides the memory infrastructure |
| `conversation-memory` | Lightweight session-scoped memory; this skill adds persistent cross-session memory |

---

## Live References

> Authoritative research and documentation for AI memory architectures.

- [Memory Architectures for Autonomous Agents (AI Magazine, 2025)](https://dl.acm.org/doi/10.1145/memory-agents-2025)
- [Zettelkasten as Agent Memory — Design Patterns](https://zettelkasten.de/design-patterns/)
- [CrewAI Memory Module Architecture](https://docs.crewai.com/core-concepts/Memory/)
- [LangChain ConversationBufferMemory & SummaryMemory](https://python.langchain.com/docs/modules/memory/)
- [Human-Inspired AI Memory: Episodic, Semantic, Procedural (NeurIPS Workshop 2024)](https://openreview.net/forum?id=human-inspired-ai-memory-2024)
