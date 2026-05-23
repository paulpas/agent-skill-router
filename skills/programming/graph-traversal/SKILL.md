---
name: graph-traversal
description: Implements graph traversal algorithms (DFS recursive/iterative, BFS level-order,
  cycle detection, connected components) with working Python code for algorithmic
  problem solving.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: programming
  triggers: graph traversal, depth first search, DFS, breadth first search, BFS, connected
    components, shortest path unweighted, tree traversal, cycle detection, topological
    sort, graph algorithm, level order traversal
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  related-skills: algorithms, for-loop-iteration
------

# Graph Traversal Algorithms

Implements fundamental graph traversal techniques — DFS and BFS — with working Python code covering recursive and iterative variants, cycle detection, connected components, path finding, and topological sorting. These are the two foundational algorithms every developer should know cold.

## TL;DR Checklist

- [ ] Choose DFS for exploration (cycles, paths, SCCs), BFS for shortest path in unweighted graphs
- [ ] Always maintain a `visited` set to avoid infinite loops on cyclic graphs
- [ ] Use iterative variants (explicit stack/queue) when recursion depth could exceed limits
- [ ] For directed graph cycle detection, track both visited AND the current recursion stack
- [ ] BFS naturally produces shortest paths; DFS naturally produces deep exploration
- [ ] Handle disconnected graphs by iterating over all nodes as potential starting points

