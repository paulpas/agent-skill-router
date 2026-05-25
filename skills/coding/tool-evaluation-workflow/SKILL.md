---
name: tool-evaluation-workflow
description: Applies a structured evaluation framework to select tools, libraries,
  and frameworks based on technical fit, community health, security posture, performance
  benchmarks, and total cost of ownership for software projects.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: tool evaluation, library selection, framework comparison, proof of concept,
    technology assessment, how do i evaluate tools, build vs buy decision, dependency
    management
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: implementation
  scope: implementation
  output-format: analysis
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: dependency-inversion-principle, refactoring-techniques, modular-design
------
# Tool and Framework Evaluation Workflow

Applies a structured evaluation framework to select tools, libraries, and frameworks for project adoption. This skill makes the model define measurable criteria, score candidates against weighted dimensions, execute focused proof-of-concept tests, review security posture, and produce a data-driven recommendation with documented trade-offs and migration planning.

## TL;DR Checklist

- [ ] Document every requirement as testable/verifiable — no vague preferences like "good performance"
- [ ] Build shortlist with at least 3 candidates including one wild card (unconventional but viable option)
- [ ] Score each candidate on weighted criteria totaling 100%, using evidence not opinion
- [ ] Execute proof-of-concept for top 2 candidates exercising the core use case under realistic conditions
- [ ] Review security: CVE history, license compatibility (OSI), supply chain risks — no copyleft conflicts
- [ ] Produce evaluation report with scored comparison, risk assessment, and phased rollout plan

---

## When to Use

Use this skill when:

- Choosing between competing web frameworks, ORMs, or serialization libraries for a new project
- Selecting a database driver or cache layer where the decision affects long-term architecture
- Adopting a monitoring/observability stack (Prometheus vs. Datadog vs. OpenTelemetry-native)
- Deciding whether to build an internal solution or adopt an external library/framework
- Re-evaluating an existing tool due to security incidents, abandoned maintenance, or performance degradation

## When NOT to Use

Avoid this skill for:

- **When requirements are already clear and one tool dominates** — If benchmarks and constraints eliminate all but one candidate, document the choice directly without a formal evaluation process
- **Temporary or hack projects** — Proof-of-concept evaluations have overhead (1-2 weeks minimum); if the project's lifespan is measured in days, skip structured evaluation
- **When the team has deep expertise in one specific tool** — Existing competence is a valid criterion; do not re-evaluate tools simply because newer alternatives exist
- **When leadership has already decided** — Evaluation skills support decision-making, they do not override organizational direction without evidence of risk

---

## Core Workflow

### Step 1: Define Evaluation Scope and Stakeholder Requirements

Document all requirements using two categories: **Functional** (what the tool must do) and **Non-functional** (how well it must do it). Every requirement must be testable or verifiable — subjective preferences are not requirements.

**Checkpoint:** Review every requirement with the question "How will we verify this in a proof-of-concept?" If no verification path exists, convert it to an observation or discard it.

Functional requirements examples:
- Must support JSON and Protocol Buffers serialization formats
- Must provide async/await support for non-blocking I/O
- Must integrate with existing authentication system (OAuth2/OIDC)

Non-functional requirements examples:
- P95 latency under 50ms for API endpoint serving cached data
- Memory footprint under 100MB per process under steady-state load
- Must support Go 1.21+ and compile within 30 seconds

Stakeholder categories to document:
| Stakeholder | Concerns | Weight |
|---|---|---|
| Backend Engineers | API ergonomics, type safety, error handling | 35% |
| DevOps / SRE | Deployment model, monitoring, resource usage | 25% |
| Security Team | CVE history, license compliance, data handling | 20% |
| Product / Business | Time-to-market, vendor lock-in risk, cost | 15% |
| Data Team | Query expressiveness, migration tooling | 5% |

**Checkpoint:** Every requirement must have a measurable threshold. "Handles moderate traffic" is not measurable — "sustains 10k RPS with P95 < 100ms on 2 vCPU instances" is.

### Step 2: Build the Candidate Shortlist

Gather tools meeting minimum criteria: active maintenance (release within last 6 months), license compatibility (permissive OSI-approved for commercial use, or acceptable copyleft), and platform support (operating system, language version).

**Minimum shortlist composition:**
- At least 3 candidates
- At least one wild card option — a less conventional choice that may score poorly on some criteria but excel on others (e.g., an edge runtime for what was assumed to be a server-side problem)
- One incumbent if the project involves migration from an existing tool

**Screening checklist per candidate:**
```
☐ Released within last 6 months (or has LTS branch with recent patches)
☐ License is OSI-approved and compatible with project licensing model
☐ Supports required runtime/platform (Go 1.21+, Linux/Windows, arm64/x86_64)
☐ Has documented migration path or upgrade guide (for incumbent replacements)
```

**Checkpoint:** If screening eliminates all but one candidate, the evaluation is over — document the direct choice. If no candidates pass screening, expand the search criteria or reconsider the problem statement.

### Step 3: Apply Weighted Scoring Matrix

Define criteria categories with specific weights totaling 100%. Score each candidate 1-5 on every criterion, where the score must be justified with evidence.

**Default criteria weights:**

| Category | Weight | Description |
|---|---|---|
| Technical Fit | 30% | API design, type safety, documentation quality, integration ease |
| Community Health | 20% | Release frequency, issue resolution time, contributor diversity |
| Security Posture | 20% | CVE history, license compatibility, supply chain hygiene |
| Performance | 15% | Benchmark results, resource utilization, scalability characteristics |
| Operational Cost | 15% | Learning curve, team familiarity, monitoring/ops complexity |

**Scoring scale (1-5):**

| Score | Meaning | Evidence Required |
|---|---|---|
| 1 | Does not meet minimum threshold | Fails one or more must-have criteria |
| 2 | Below expectations | Meets basic requirements but has notable gaps |
| 3 | Meets expectations | Solid option with no major concerns |
| 4 | Above expectations | Notable strengths in this category |
| 5 | Exceeds expectations | Best-in-class; documented benchmark or case study |

**Technical Fit sub-criteria:**
- API design and ergonomics (1-2 week spike to build a feature)
- Type system support and compile-time guarantees
- Documentation quality (completeness, examples, searchability)
- Error handling approach (sentinel errors vs panics vs error codes)
- Testing tooling and mocking capabilities

**Community Health metrics:**
- Release frequency (weekly/daily = 5 points, monthly = 3, quarterly or less = 1)
- Issue resolution time (median < 7 days = 5, < 30 days = 3, > 90 days = 1)
- Contributor count (> 20 unique contributors in last year = 5, 5-20 = 3, < 5 = 1)
- GitHub stars growth trend (last 12 months, not absolute number)

**Checkpoint:** Cross-validate scores between evaluators. If two people score independently, variance on any criterion should be ≤ 1 point. Larger variance means the scoring evidence is insufficient or the criterion needs clarification.

### Step 4: Execute Focused Proof-of-Concept

For the top 2 candidates (by weighted score), build a minimal integration test exercising the core use case under realistic conditions. The PoC must be equivalent in scope for both candidates — same feature, same data volume, same edge cases.

**PoC requirements:**
- Use production-equivalent data volumes (real database schemas, not toy examples)
- Test at least one error path and one edge case per candidate
- Measure performance metrics consistently: latency percentiles, memory RSS, CPU utilization
- Document time-to-first-working-result for each candidate (how long until the team had a working implementation)

**Checkpoint:** The PoC must test the actual integration point where the tool enters your system — not an isolated unit in isolation. If you evaluate a web framework by testing only its router without database access, the benchmark is not representative.

### Step 5: Conduct Security and Compliance Review

This step is non-negotiable for any tool entering production. No amount of technical fit or community enthusiasm overrides security concerns.

**Security review checklist:**

| Check | Action | Threshold |
|---|---|---|
| CVE scanning | Run `govulncheck` / `npm audit` / `pip-audit` on the candidate and its transitive dependencies | Zero critical or high CVEs |
| License compatibility | Verify OSI license class; check copyleft propagation risk | MIT, Apache-2.0, BSD = green. GPL/LGPL = red flag for proprietary projects |
| Supply chain verification | Review dependency graph depth; count transitive dependencies | > 50 direct + transitive deps = requires deeper review |
| Data handling audit | Review what data the tool sends externally (telemetry, crash reports, license checks) | No unexpected network calls to third-party endpoints |
| Maintenance continuity | Check maintainer bus factor and financial backing | Single maintainer with no corporate backing = elevated risk |
| History of incidents | Search for security advisories in the project's issue tracker over last 24 months | More than 2 security advisories in 24 months = elevated risk |

**Checkpoint:** No tool with critical open CVEs or a copyleft license that conflicts with your project's licensing model can be recommended. This is a hard gate — technical score does not override it.

### Step 6: Produce Evaluation Report

Compile all findings into a structured report with recommendation, risk assessment, and rollout plan. The report should be readable by engineers (technical detail), SREs (operational concerns), and decision-makers (cost/risk summary).

**Required report sections:**
1. Executive Summary — One paragraph: what was evaluated, which tool won, key rationale
2. Requirements Traceability — Every requirement mapped to the winning tool's capability
3. Scoring Matrix — Full scores table with evidence annotations
4. Proof-of-Concept Results — Quantitative benchmark comparison with methodology notes
5. Security Review — CVE scan results, license analysis, supply chain summary
6. Risk Assessment — Top 3 risks for the recommended tool with mitigation plans
7. Migration/Adoption Plan — Phased rollout timeline if replacing an incumbent
8. Rejected Alternatives — Brief rationale for each non-selected candidate

**Checkpoint:** If the report does not include at least one specific risk for the recommended tool, it is incomplete. Every decision has trade-offs; hiding them creates false confidence.

---

## Evaluation Framework Details

### Weighted Scoring Matrix Template

Use this template to score all candidates systematically:

```
┌─────────────────────────┬──────────┬──────────────────────────────────────────────┐
│ CRITERION               │ WEIGHT   │ CANDIDATE A (X)                              │
├─────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ Technical Fit           │ 30%      │ Score: __ / Justification: __                │
│ ── API ergonomics       │          │                                              │
│ ── Type safety          │          │                                              │
│ ── Docs quality         │          │                                              │
│ Community Health        │ 20%      │ Score: __ / Justification: __                │
│ ── Release frequency    │          │                                              │
│ ── Issue resolution     │          │                                              │
│ Security Posture        │ 20%      │ Score: __ / Justification: __                │
│ ── CVE history          │          │                                              │
│ ── License compatibility│          │                                              │
│ Performance             │ 15%      │ Score: __ / Justification: __                │
│ ── Benchmarks           │          │                                              │
│ ── Resource usage       │          │                                              │
│ Operational Cost         │ 15%      │ Score: __ / Justification: __                │
│ ── Learning curve       │          │                                              │
│ ── Team familiarity     │          │                                              │
├─────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ WEIGHTED TOTAL           │ 100%     │ ______ / 5.0                                 │
└─────────────────────────┴──────────┴──────────────────────────────────────────────┘
```

### Proof-of-Concept Benchmark Template

Execute equivalent benchmarks for each candidate using a consistent methodology. The template below is in Go (the language-agnostic approach applies to any language):

**Test structure:**
1. Warm-up phase: 100 iterations, results discarded
2. Measurement phase: 1000 iterations, collect latency and memory metrics
3. Teardown: clean resources, close connections
4. Repeat 3 times; report median of medians

### Security Review Automation

Run automated security tooling before manual review. Results from these tools form the evidence base for the Security Posture criterion:

```bash
# Go ecosystem
govulncheck ./...        # Checks for known vulnerabilities in dependencies
go vet ./...             # Static analysis for common mistakes

# JavaScript/TypeScript ecosystem
npm audit --production   # CVE scanning for npm dependencies
npx license-checker      # License compatibility verification

# Python ecosystem
pip-audit                # CVE scanning for pip dependencies
safety check -r requirements.txt  # Alternative vulnerability scanner
```

---

## Proof-of-Concept Template

The following Go code provides a reusable benchmarking framework for comparing two tool candidates under identical conditions. Use this as the foundation for any PoC performance comparison.

```go
package evaluation

import (
	"context"
	"fmt"
	"math"
	"sort"
	"testing"
	"time"
)

// Candidate represents a tool/library being evaluated in a proof-of-concept.
type Candidate struct {
	Name      string
	Version   string
	Implementation func(ctx context.Context) (Operation, error)
}

// Operation is the interface that all candidates must implement for benchmarking.
// The specific operations differ per evaluation — this example uses data serialization.
type Operation interface {
	// Serialize produces output bytes from structured data.
	Serialize(data any) ([]byte, error)
	// Deserialize reconstructs structured data from input bytes.
	Deserialize(input []byte) (any, error)
}

// BenchmarkResult holds aggregated performance metrics for a candidate.
type BenchmarkResult struct {
	Name            string
	MedianLatency   time.Duration
	P95Latency      time.Duration
	P99Latency      time.Duration
	AvgMemoryBytes  int64
	TotalIterations int
	ErrorCount      int
}

// RunBenchmark executes a serialization/deserialization benchmark for a candidate
// and returns aggregated performance metrics. It performs warm-up, measures over
// many iterations, and tracks memory allocation per operation.
func RunBenchmark(ctx context.Context, c Candidate, iterations int) (BenchmarkResult, error) {
	result := BenchmarkResult{
		Name:            c.Name,
		TotalIterations: iterations,
	}

	op, err := c.Implementation(ctx)
	if err != nil {
		return result, fmt.Errorf("candidate %s: setup operation: %w", c.Name, err)
	}

	testData := map[string]any{
		"user_id":   12345,
		"email":     "user@example.com",
		"metadata":  map[string]string{"role": "admin", "region": "us-east"},
		"created_at": time.Now().Format(time.RFC3339),
	}

	latencies := make([]time.Duration, 0, iterations)
	var totalAlloc int64

	// Warm-up phase: discard first N iterations to stabilize measurements.
	warmupCount := min(100, iterations/10)
	for i := 0; i < warmupCount; i++ {
		_, _ = op.Serialize(testData)
	}

	// Measurement phase: collect latency and memory for remaining iterations.
	buf := make([]byte, 0, 4096)
	for i := 0; i < iterations-warmupCount; i++ {
		start := time.Now()

		output, err := op.Serialize(testData)
		if err != nil {
			result.ErrorCount++
			continue
		}

		_, err = op.Deserialize(output)
		if err != nil {
			result.ErrorCount++
			continue
		}

		elapsed := time.Since(start)
		latencies = append(latencies, elapsed)
		buf = buf[:cap(buf)] // Reset without allocation for next iteration
		totalAlloc += int64(len(output))
	}

	if len(latencies) == 0 {
		return result, fmt.Errorf("candidate %s: no successful iterations", c.Name)
	}

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })

	result.MedianLatency = percentile(latencies, 50)
	result.P95Latency = percentile(latencies, 95)
	result.P99Latency = percentile(latencies, 99)
	result.AvgMemoryBytes = totalAlloc / int64(len(latencies))

	return result, nil
}

// percentile computes the given percentile from a sorted slice of durations.
func percentile(sorted []time.Duration, p float64) time.Duration {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(math.Ceil(p/100*float64(len(sorted)))) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}

// CompareResults prints a formatted comparison table for benchmark results from
// multiple candidates. Results must be sorted by name for consistent output.
func CompareResults(results []BenchmarkResult) string {
	var sb strings.Builder
	sb.WriteString("┌──────────┬──────────────────┬──────────────────┬──────────────────┬─────────────┐\n")
	sb.WriteString("│ Name     │ Median Latency   │ P95 Latency      │ P99 Latency      │ Avg Bytes   │\n")
	sb.WriteString("├──────────┼──────────────────┼──────────────────┼──────────────────┼─────────────┤\n")

	for _, r := range results {
		sb.Fprintf("│ %-8s │ %16s │ %16s │ %16s │ %11d │\n",
			r.Name,
			r.MedianLatency.String(),
			r.P95Latency.String(),
			r.P99Latency.String(),
			r.AvgMemoryBytes,
		)
	}
	sb.WriteString("└──────────┴──────────────────┴──────────────────┴──────────────────┴─────────────┘\n")

	if results[0].ErrorCount > 0 || results[1].ErrorCount > 0 {
		sb.WriteString("\n⚠ Warnings:\n")
		for _, r := range results {
			if r.ErrorCount > 0 {
				sb.Fprintf("  - %s: %d errors out of %d iterations (%.1f%% failure rate)\n",
					r.Name, r.ErrorCount, r.TotalIterations,
					float64(r.ErrorCount)/float64(r.TotalIterations)*100)
			}
		}
	}

	return sb.String()
}
```

### Evaluation Scoring Calculator

The following Go code provides a calculator for computing weighted scores with validation and audit trails. It ensures criteria weights sum to exactly 100% and records justification for every score.

```go
package evaluation

import (
	"fmt"
	"strings"
)

// Criterion defines a single evaluation criterion with its weight and category.
type Criterion struct {
	Name        string
	Category    string // "Technical Fit", "Community Health", etc.
	Weight      float64 // 0.0 to 1.0, must sum to 1.0 across all criteria
	Description string // What this criterion measures
}

// ScoredCandidate holds the raw scores and justifications for one candidate.
type ScoredCandidate struct {
	Name       string
	CriterionScores []CriterionScore
}

// CriterionScore records the score and evidence-based justification for one criterion.
type CriterionScore struct {
	Criterion    string
	Score        int       // 1-5 scale
	Justification string   // Evidence or rationale
}

// WeightedScorer computes weighted scores across candidates with full validation.
type WeightedScorer struct {
	criteria []Criterion
}

// NewWeightedScorer creates a scorer and validates that weights sum to 1.0.
func NewWeightedScorer(criteria []Criterion) (*WeightedScorer, error) {
	total := 0.0
	for _, c := range criteria {
		if c.Weight < 0 || c.Weight > 1 {
			return nil, fmt.Errorf("criterion %q: weight must be 0-1, got %f", c.Name, c.Weight)
		}
		total += c.Weight
	}
	if total > 1.0+1e-9 || total < 1.0-1e-9 {
		return nil, fmt.Errorf("criterion weights must sum to 1.0, got %.4f", total)
	}
	return &WeightedScorer{criteria: criteria}, nil
}

// ScoreCandidate computes the weighted total for a candidate. Scores must include
// entries for every criterion; missing criteria default to score 0 (disqualified).
func (s *WeightedScorer) ScoreCandidate(cand ScoredCandidate) (float64, error) {
	scoreMap := make(map[string]int)
	for _, cs := range cand.CriterionScores {
		if cs.Score < 1 || cs.Score > 5 {
			return 0, fmt.Errorf("candidate %s: score for %q must be 1-5, got %d",
				cand.Name, cs.Criterion, cs.Score)
		}
		scoreMap[cs.Criterion] = cs.Score
	}

	var weightedTotal float64
	for _, c := range s.criteria {
		score, ok := scoreMap[c.Name]
		if !ok {
			return 0, fmt.Errorf("candidate %s: missing score for criterion %q", cand.Name, c.Name)
		}
		weightedTotal += c.Weight * float64(score) / 5.0
	}

	return weightedTotal, nil
}

// Summary produces a formatted comparison table of scored candidates.
func (s *WeightedScorer) Summary(candidates []ScoredCandidate) (string, error) {
	var sb strings.Builder

	// Header row: show all criteria names.
	sb.WriteString("┌───────────┬")
	for _, c := range s.criteria {
		sb.WriteString(fmt.Sprintf("─%12s─┬", "Score"))
	}
	sb.WriteString("─┐\n")

	// Criteria headers with weights.
	sb.WriteString("│ Candidate │")
	for _, c := range s.criteria {
		sb.WriteString(fmt.Sprintf(" %8s (%d%%) │", c.Name, int(c.Weight*100)))
	}
	sb.WriteString("\n├───────────┼")
	for range s.criteria {
		sb.WriteString("────────────┼")
	}
	sb.WriteString("┤\n")

	// Score rows and totals.
	type scoredCandidate struct {
		name    string
		total   float64
		scores  []int
	}
	var results []scoredCandidate

	for _, cand := range candidates {
		var scores []int
		var total float64
		for _, c := range s.criteria {
			score := 0
			for _, cs := range cand.CriterionScores {
				if cs.Criterion == c.Name {
					score = cs.Score
					break
				}
			}
			scores = append(scores, score)
			total += c.Weight * float64(score) / 5.0
		}
		results = append(results, scoredCandidate{cand.Name, total, scores})
	}

	for _, r := range results {
		sb.WriteString(fmt.Sprintf("│ %-9s │", r.name))
		for _, sc := range r.scores {
			sb.WriteString(fmt.Sprintf("%6d/5    │", sc))
		}
		sb.WriteString("\n")
	}

	sb.WriteString("├───────────┼")
	for range s.criteria {
		sb.WriteString("────────────┼")
	}
	sb.WriteString("┤\n")

	sb.WriteString(fmt.Sprintf("│ %-9s │", "TOTAL"))
	for _, r := range results {
		sb.WriteString(fmt.Sprintf("%8.2f    │", r.total))
	}
	sb.WriteString("\n")

	return sb.String(), nil
}
```

### BAD Evaluation vs GOOD Evaluation Comparison

Understanding what constitutes a bad evaluation is as important as knowing the right process. This section contrasts common anti-patterns with the correct approach.

```go
// ❌ BAD — Common evaluation mistakes (what NOT to do)

// 1. Recency bias: scoring higher because a tool was released recently, not because
//    it performs better on measured criteria.
badRecencyScore := func(name string) int {
    if name == "NewFramework2025" {
        return 5 // Arbitrary boost for recency — no evidence
    }
    return 3
}

// 2. Single-criterion evaluation: deciding based on one metric (e.g., GitHub stars).
func evaluateByStars(gitHubStars int) string {
    if githubStars > 10000 {
        return "This is the best tool" // Ignores security, license, performance
    }
    return "Not competitive"
}

// 3. Opinion-only scoring: assigning scores without evidence or benchmark data.
func opinionScore() []CriterionScore {
    return []CriterionScore{
        {Criterion: "Performance", Score: 4, Justification: "Feels fast to me"}, // ❌ Not verifiable
        {Criterion: "API Quality", Score: 5, Justification: "I like the API"},   // ❌ Personal preference
    }
}

// ✅ GOOD — Evidence-based evaluation (the correct approach)

// 1. Weighted multi-criteria scoring with evidence requirements.
func evidenceBasedScoring(candidate string) []CriterionScore {
    scores := map[string]int{
        "Performance":     benchmarkMedian(candidate) < 50 * time.Millisecond ? 4 : 2,
        "Type Safety":     hasGenerics(candidate) && hasCompileTimeChecks(candidate) ? 5 : 3,
        "CVE History":     criticalCVEs(candidate) == 0 ? 5 : 1,
        "License Fit":     isOSIPermissive(candidate) ? 5 : 2, // Copyleft in proprietary project
    }
    return scoresToCriterionScores(scores) // Converts map to CriterionScore slice
}

// 2. PoC-based validation: measuring real integration performance, not benchmarks.
func runPoCCandidate(ctx context.Context, c Candidate) BenchmarkResult {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
    defer cancel()
    result, err := RunBenchmark(ctx, c, 5000) // 5k iterations under realistic load
    if err != nil {
        return BenchmarkResult{Name: c.Name, ErrorCount: 1}
    }
    return result
}

// 3. Security gate: hard rejection criteria that no amount of technical fit can override.
func securityGate(c Candidate) error {
    // Check CVEs via govulncheck or equivalent.
    vulns, err := ScanVulnerabilities(c)
    if err != nil {
        return fmt.Errorf("security scan failed: %w", err)
    }
    for _, v := range vulns {
        if v.Severity == "CRITICAL" {
            return fmt.Errorf("REJECTED: %s has critical CVE %s", c.Name, v.ID)
        }
    }

    // Check license compatibility (OSI classification).
    license := GetLicense(c)
    if !isOSIPermissive(license) && !isOSICopyleftCompatible(license, "proprietary") {
        return fmt.Errorf("REJECTED: %s has incompatible license %s", c.Name, license)
    }

    // Check supply chain: dependency depth and maintainer bus factor.
    if transitiveDeps(c) > 50 {
        return fmt.Errorf("ELEVATED RISK: %s has %d transitive dependencies (threshold: 50)",
            c.Name, transitiveDeps(c))
    }

    return nil // Passes security gate — can be recommended pending other criteria
}
```

---

## Common Pitfalls in Tool Evaluation

### 1. Recency Bias

New tools receive inflated scores simply because they are recent. Fresh releases often have incomplete documentation, fewer production deployments, and unresolved edge cases that older tools have already encountered. Countermeasure: weight "years of production use" as a criterion alongside release recency.

### 2. Single-Dimension Evaluation

Choosing a tool based on one metric — GitHub stars, benchmark speed, or API elegance — ignores the multi-dimensional nature of software engineering decisions. A fast library with GPL license is not faster if it cannot be used in your project. Countermeasure: always use weighted scoring across at least five categories.

### 3. Ignoring Upgrade Costs

The cost of upgrading a tool in the future (data migration, API changes, breaking version bumps) is rarely evaluated during selection. Tools with frequent major-version releases without deprecation periods create ongoing maintenance burden. Countermeasure: review the project's semver adherence — tools that release major versions for minor feature additions are higher-risk.

### 4. Benchmarking in Isolation

Benchmarks run on toy data with no real-world constraints (connection pooling, network latency, disk I/O) produce misleading results. A library that sorts a 100-element slice in 1μs may perform identically to its competitor when both are backed by the same slow database. Countermeasure: PoC benchmarks must use production-equivalent data and infrastructure.

### 5. Overweighting Team Familiarity

While team expertise is a valid concern, it should not dominate the evaluation. Selecting an older tool because "we know it" creates long-term technical debt — security vulnerabilities go unfixed, performance ceilings are reached, and hiring becomes harder as the ecosystem moves on. Countermeasure: cap "Team Familiarity" weight at 15%. New tools can be learned.

### 6. Ignoring Supply Chain Depth

Tools with hundreds of transitive dependencies carry compounding risk — every dependency is a potential CVE, license conflict, or maintenance burden. A tool with 5 direct deps and 20 total deps may be safer than a "minimal" tool with 1 dep and 200 transitive ones. Countermeasure: audit the full dependency graph, not just direct dependencies.

---

## Constraints

### MUST DO

- Require every evaluation criterion to have a measurable threshold — reject any requirement that cannot be verified in a proof-of-concept or code review
- Maintain criteria weights that sum to exactly 1.0 (100%) with validation; use the WeightedScorer implementation above for computational correctness
- Run automated security scanning (`govulncheck`, `npm audit`, `pip-audit`) on every candidate before manual review — never skip this step
- Include at least one wild card option in the shortlist to prevent groupthink and ensure unconventional viable options are considered
- Document rejected alternatives with explicit reasoning — every option scoring above 60% of the winner must have a documented rejection rationale
- Conduct cross-evaluator score validation: if two people score independently, variance on any criterion should be ≤ 1 point
- Report at least one specific risk for the recommended tool — omitting risks creates false confidence and hides trade-offs

### MUST NOT DO

- Do not score based on subjective impressions without evidence ("feels fast," "nice API") — every score must cite concrete data
- Do not weight all criteria equally — equal weighting means no criterion actually matters; assign weights based on documented project requirements
- Do not skip the security review step regardless of how well a tool scores technically — a perfect technical fit with a critical CVE is rejected automatically
- Do not select a GPL/LGPL licensed tool for proprietary software without explicit legal review — copyleft licenses propagate to linked code
- Do not let team familiarity override security or architectural concerns — existing expertise is an operational advantage, not an architectural justification
- Do not evaluate tools in isolation — PoC benchmarks must use production-equivalent data volumes, connection pools, and real-world error conditions
- Do not make the evaluation decision in a single meeting — require at least 2 independent evaluations before presenting to stakeholders

---

## Output Template

When this skill is active, produce the following output:

1. **Requirements Summary** — Table of all documented requirements (functional + non-functional) with measurable thresholds and stakeholder weight attribution
2. **Candidate Shortlist** — List of evaluated tools with screening results (maintenance status, license compatibility, platform support)
3. **Weighted Scoring Matrix** — Full scores table showing candidate × criterion intersections with evidence annotations for every score
4. **Proof-of-Concept Results** — Benchmark comparison table (latency percentiles, memory usage, error rates) with methodology notes describing data volumes and test conditions
5. **Security Review** — CVE scan results per candidate, license analysis with OSI classification, supply chain depth assessment
6. **Risk Assessment** — Top 3 risks for the recommended tool with specific mitigation actions and responsible roles
7. **Recommendation** — Clear statement of the selected tool with primary rationale tied to weighted scoring evidence
8. **Migration/Adoption Plan** — Phased rollout timeline (pilot → staged rollout → full adoption) if replacing an incumbent; onboarding tasks for new tools

---

## Related Skills

| Skill | Purpose |
|---|---|
| `dependency-inversion-principle` | Designs abstraction layers around the selected tool to minimize coupling and enable future replacement with minimal changes |
| `refactoring-techniques` | Provides systematic migration strategies when replacing an incumbent tool with the selected alternative |
| `modular-design` | Defines module boundaries before evaluation so criteria can be aligned with architectural concerns rather than feature checklists |
| `software-testing-strategy` | Ensures the proof-of-concept includes representative test coverage that validates both correctness and performance characteristics |

---

## Industry Standards Reference

When conducting security reviews and license analysis, reference these industry standards:

- **OWASP Software Component Verification Standard (SCVS)** — https://owasp.org/www-project-software-component-verification-standard/
  - Defines verification levels for software components; use SCVS-L1 for standard libraries, SCVS-L2 for framework-level dependencies
- **OSI License Classification** — https://opensource.org/licenses/alphabetical
  - Permissive (MIT, Apache-2.0, BSD): safe for proprietary use
  - Weak copyleft (LGPL, MPL): restricted to library modifications only
  - Strong copyleft (GPL, AGPL): propagates to linked code; generally incompatible with proprietary software
- **Semantic Versioning (semver 2.0.0)** — https://semver.org/
  - Tools adhering strictly to semver produce predictable breaking-change signals
  - Flag tools that release major versions for non-breaking changes as higher-risk
- **NVD CVE Severity Scoring** — https://nvd.nist.gov/vuln-metrics/cvss
  - CVSS 9.0-10.0 = Critical (automatic rejection)
  - CVSS 7.0-8.9 = High (requires remediation plan before recommendation)
  - CVSS 4.0-6.9 = Medium (document and monitor)
